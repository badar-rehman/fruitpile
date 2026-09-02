import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { bus } from '../core/events';
import { clamp01, easeOutBack } from '../core/math';
import { createFruitMesh } from '../render/fruit/builders';
import type { PhysicsWorld } from '../physics/world';
import { MAX_TIER, TIERS } from './tiers';

export interface Fruit {
  id: number;
  tier: number;
  radius: number;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Object3D;
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  currPos: THREE.Vector3;
  currQuat: THREE.Quaternion;
  squash: number;
  squashVel: number;
  popIn: number; // 0..1 spawn animation progress, 1 = finished
  airborne: boolean;
  lastSpeed: number;
  offSince: number;
  alive: boolean;
  doomed: boolean; // fell off, playing its exit
  doomTimer: number;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/**
 * Owns every fruit in play: physics bodies, meshes, merging, and the
 * fall-off-the-plate fail check. Presentation listens via the event bus.
 */
export class Pile {
  readonly fruits: Fruit[] = [];
  private nextId = 1;
  private time = 0;
  private chainCount = 0;
  private lastMergeTime = -99;
  private colliderIndex = new Map<number, Fruit>();

  biggestTier = 0;
  strikes = 0;
  readonly discovered = new Set<number>();

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly layer: THREE.Group,
  ) {}

  get count(): number {
    return this.fruits.length;
  }

  get chain(): number {
    return this.time - this.lastMergeTime < CONFIG.merge.chainWindow ? this.chainCount : 0;
  }

  spawn(
    tier: number,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    options: { popIn?: boolean; ccd?: boolean } = {},
  ): Fruit {
    const data = TIERS[Math.min(tier, MAX_TIER)];
    const body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setLinearDamping(CONFIG.physics.linearDamping)
        .setAngularDamping(CONFIG.physics.angularDamping)
        .setCcdEnabled(options.ccd ?? false),
    );

    const collider = this.physics.world.createCollider(
      RAPIER.ColliderDesc.ball(data.radius)
        .setFriction(CONFIG.physics.friction)
        .setRestitution(CONFIG.physics.restitution)
        .setDensity(1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );

    const mesh = createFruitMesh(tier);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    this.layer.add(mesh);

    const fruit: Fruit = {
      id: this.nextId++,
      tier,
      radius: data.radius,
      body,
      collider,
      mesh,
      prevPos: position.clone(),
      prevQuat: new THREE.Quaternion(),
      currPos: position.clone(),
      currQuat: new THREE.Quaternion(),
      squash: 0,
      squashVel: 0,
      popIn: options.popIn ? 0 : 1,
      airborne: true,
      lastSpeed: velocity.length(),
      offSince: 0,
      alive: true,
      doomed: false,
      doomTimer: 0,
    };

    this.fruits.push(fruit);
    this.colliderIndex.set(collider.handle, fruit);

    if (tier > this.biggestTier) this.biggestTier = tier;
    if (!this.discovered.has(tier)) {
      this.discovered.add(tier);
      bus.emit('newTier', { tier });
    }
    return fruit;
  }

  /** One fixed physics step plus merge/fall resolution. */
  step(dt: number): void {
    this.time += dt;

    for (const fruit of this.fruits) {
      fruit.prevPos.copy(fruit.currPos);
      fruit.prevQuat.copy(fruit.currQuat);
      const v = fruit.body.linvel();
      fruit.lastSpeed = Math.hypot(v.x, v.y, v.z);
    }

    this.physics.world.step(this.physics.events);
    this.physics.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      this.onContact(h1);
      this.onContact(h2);
    });

    for (const fruit of this.fruits) {
      const t = fruit.body.translation();
      const r = fruit.body.rotation();
      fruit.currPos.set(t.x, t.y, t.z);
      fruit.currQuat.set(r.x, r.y, r.z, r.w);
      // CCD is only worth its cost while a fruit is flying fast.
      if (fruit.lastSpeed < 3 && fruit.body.isCcdEnabled()) fruit.body.enableCcd(false);
    }

    this.resolveMerges();
    this.checkFalls(dt);
  }

  private onContact(handle: number): void {
    const fruit = this.colliderIndex.get(handle);
    if (!fruit || !fruit.alive || fruit.doomed) return;
    const impact = clamp01(fruit.lastSpeed / 7);
    if (fruit.airborne && impact > 0.06) {
      fruit.airborne = false;
      fruit.squash = Math.max(fruit.squash, impact * CONFIG.juice.landSquash);
      // Fruit Mountain's signature feel: a thrown fruit stays roughly where it
      // lands instead of skating across the dish.
      const v = fruit.body.linvel();
      fruit.body.setLinvel(
        { x: v.x * CONFIG.landing.horizontalKeep, y: v.y, z: v.z * CONFIG.landing.horizontalKeep },
        true,
      );
      const w = fruit.body.angvel();
      fruit.body.setAngvel(
        { x: w.x * CONFIG.landing.spinKeep, y: w.y * CONFIG.landing.spinKeep, z: w.z * CONFIG.landing.spinKeep },
        true,
      );
      bus.emit('land', { tier: fruit.tier, position: fruit.currPos.clone(), impact });
    }
  }

  /**
   * Distance-based merging rather than contact events: it also catches fruit
   * that settles into a neighbour without a fresh contact, so chains always
   * finish resolving.
   */
  private resolveMerges(): void {
    const byTier = new Map<number, Fruit[]>();
    for (const fruit of this.fruits) {
      if (!fruit.alive || fruit.doomed) continue;
      const list = byTier.get(fruit.tier);
      if (list) list.push(fruit);
      else byTier.set(fruit.tier, [fruit]);
    }

    let merges = 0;
    const consumed = new Set<number>();

    for (const [tier, list] of byTier) {
      if (list.length < 2) continue;
      for (let i = 0; i < list.length && merges < CONFIG.merge.maxPerStep; i++) {
        const a = list[i];
        if (consumed.has(a.id)) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (consumed.has(b.id)) continue;
          const reach = (a.radius + b.radius) * CONFIG.merge.contactSlack;
          if (a.currPos.distanceToSquared(b.currPos) > reach * reach) continue;

          consumed.add(a.id);
          consumed.add(b.id);
          this.merge(a, b, tier);
          merges++;
          break;
        }
      }
    }
  }

  private merge(a: Fruit, b: Fruit, tier: number): void {
    const position = _v.copy(a.currPos).add(b.currPos).multiplyScalar(0.5).clone();
    const va = a.body.linvel();
    const vb = b.body.linvel();
    const velocity = _v2
      .set((va.x + vb.x) * 0.5, (va.y + vb.y) * 0.5, (va.z + vb.z) * 0.5)
      .clone();

    this.remove(a);
    this.remove(b);

    this.chainCount = this.time - this.lastMergeTime < CONFIG.merge.chainWindow ? this.chainCount + 1 : 1;
    this.lastMergeTime = this.time;

    const isFinal = tier >= MAX_TIER;
    if (!isFinal) {
      velocity.y += CONFIG.merge.popImpulse;
      this.spawn(tier + 1, position, velocity, { popIn: true });
    }

    const base = isFinal ? CONFIG.scoring.doubleWatermelon : TIERS[tier + 1].award;
    const bonus = base * CONFIG.scoring.chainBonusPerStep * (this.chainCount - 1);
    bus.emit('merge', {
      tier: isFinal ? MAX_TIER : tier + 1,
      position,
      chainStep: this.chainCount,
      score: Math.round(base + bonus),
      isFinal,
    });
  }

  private checkFalls(dt: number): void {
    for (const fruit of this.fruits) {
      if (!fruit.alive) continue;

      if (fruit.doomed) {
        fruit.doomTimer += dt;
        continue;
      }

      if (fruit.currPos.y < CONFIG.fail.fallY) {
        fruit.offSince += dt;
        if (fruit.offSince >= CONFIG.fail.graceSeconds) {
          fruit.doomed = true;
          this.strikes++;
          bus.emit('fall', {
            tier: fruit.tier,
            position: fruit.currPos.clone(),
            strikesLeft: Math.max(0, CONFIG.fail.strikes - this.strikes),
          });
        }
      } else {
        fruit.offSince = 0;
      }
    }
  }

  /** Interpolate physics transforms into meshes and run the squash springs. */
  sync(alpha: number, dt: number): void {
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      if (!fruit.alive) continue;

      fruit.mesh.position.lerpVectors(fruit.prevPos, fruit.currPos, alpha);
      fruit.mesh.quaternion.slerpQuaternions(fruit.prevQuat, fruit.currQuat, alpha);

      // Critically-ish damped spring back to round.
      fruit.squashVel +=
        (-CONFIG.juice.squashStiffness * fruit.squash - CONFIG.juice.squashDamping * fruit.squashVel) * dt;
      fruit.squash += fruit.squashVel * dt;
      if (Math.abs(fruit.squash) < 0.001 && Math.abs(fruit.squashVel) < 0.01) {
        fruit.squash = 0;
        fruit.squashVel = 0;
      }

      if (fruit.popIn < 1) {
        fruit.popIn = Math.min(1, fruit.popIn + dt * 4.5);
      }

      const pop = fruit.popIn < 1 ? popCurve(fruit.popIn) : 1;
      const scale = fruit.radius * pop;
      const squash = fruit.squash;
      fruit.mesh.scale.set(scale * (1 + squash * 0.45), scale * (1 - squash * 0.7), scale * (1 + squash * 0.45));

      if (fruit.doomed) {
        const fade = clamp01(fruit.doomTimer / 0.7);
        fruit.mesh.scale.multiplyScalar(1 - fade * 0.85);
        if (fruit.doomTimer > 0.7) this.remove(fruit);
      }
    }
  }

  remove(fruit: Fruit): void {
    if (!fruit.alive) return;
    fruit.alive = false;
    this.colliderIndex.delete(fruit.collider.handle);
    this.physics.world.removeRigidBody(fruit.body);
    this.layer.remove(fruit.mesh);
    const index = this.fruits.indexOf(fruit);
    if (index >= 0) this.fruits.splice(index, 1);
  }

  clear(): void {
    for (let i = this.fruits.length - 1; i >= 0; i--) this.remove(this.fruits[i]);
    this.fruits.length = 0;
    this.colliderIndex.clear();
    this.chainCount = 0;
    this.lastMergeTime = -99;
    this.time = 0;
    this.strikes = 0;
    this.biggestTier = 0;
    this.discovered.clear();
  }
}

function popCurve(t: number): number {
  // Starts small, overshoots slightly, settles at 1.
  return 0.18 + 0.82 * easeOutBack(t);
}
