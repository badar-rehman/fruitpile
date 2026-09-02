import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { CONFIG, DEG } from '../config';
import { clamp01, lerp } from '../core/math';
import { createFruitIcon } from '../render/fruit/builders';
import type { CameraRig } from '../render/cameraRig';
import type { PhysicsWorld } from '../physics/world';
import { TIERS } from './tiers';

export interface ThrowSolution {
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Where the arc is predicted to land, and how safe that spot is. */
  impact: THREE.Vector3 | null;
  impactNormal: THREE.Vector3;
  risky: boolean;
}

const ARC_DOTS = 26;
const GRAVITY = Math.abs(CONFIG.physics.gravity);

/** Holds the next fruit, turns drag input into a launch, and draws the aim. */
export class Thrower {
  private readonly group = new THREE.Group();
  private readonly holder = new THREE.Group();
  private readonly arc: THREE.InstancedMesh;
  private readonly landingRing: THREE.Mesh;
  private readonly powerRing: THREE.Mesh;
  private held: THREE.Object3D | null = null;
  private bob = 0;
  private readonly solution: ThrowSolution = {
    origin: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    impact: null,
    impactNormal: new THREE.Vector3(0, 1, 0),
    risky: false,
  };

  tier = 0;
  cooldown = 0;
  visible = true;

  constructor(
    parent: THREE.Object3D,
    private readonly physics: PhysicsWorld,
    private readonly rig: CameraRig,
  ) {
    const dotGeometry = new THREE.SphereGeometry(0.045, 6, 5);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xfffdf5, transparent: true, opacity: 0.9 });
    this.arc = new THREE.InstancedMesh(dotGeometry, dotMaterial, ARC_DOTS);
    this.arc.frustumCulled = false;
    this.arc.count = 0;

    this.landingRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.36, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.landingRing.renderOrder = 5;
    this.landingRing.visible = false;

    this.powerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.24, 28),
      new THREE.MeshBasicMaterial({
        color: 0x8de8a1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.powerRing.rotation.x = -Math.PI / 2;
    this.powerRing.renderOrder = 5;
    this.powerRing.visible = false;

    this.group.add(this.holder, this.arc, this.landingRing, this.powerRing);
    parent.add(this.group);
  }

  setTier(tier: number): void {
    this.tier = tier;
    if (this.held) this.holder.remove(this.held);
    this.held = createFruitIcon(tier);
    // Slightly under-scaled: held right in front of the lens, full size reads huge.
    this.held.scale.setScalar(TIERS[tier].radius * 0.85);
    this.holder.add(this.held);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
  }

  /** Where the fruit is held: a fixed gap in front of wherever the camera is. */
  originFor(out = new THREE.Vector3()): THREE.Vector3 {
    const distance = Math.max(
      CONFIG.throw.minOriginDistance,
      this.rig.boom - CONFIG.throw.cameraGap,
    );
    this.rig.horizontalDirection(out).multiplyScalar(distance);
    out.y = CONFIG.throw.originHeight;
    return out;
  }

  solve(charge: number, yawInput: number, out = this.solution): ThrowSolution {
    const pitch = CONFIG.throw.pitchDeg * DEG;
    const origin = this.originFor(out.origin);
    const originDistance = Math.hypot(origin.x, origin.z);
    // Charge is measured against the plate, not the launcher, so the dish stays
    // in the middle of the power range at any zoom level.
    const distance = Math.max(
      0.4,
      originDistance + lerp(CONFIG.throw.landNear, CONFIG.throw.landFar, clamp01(charge)),
    );
    const height = origin.y - CONFIG.plate.surfaceY;

    // Ballistic speed that lands exactly `distance` away, so charge maps to
    // reach instead of to a raw impulse the player has to learn.
    const cos = Math.cos(pitch);
    const denominator = 2 * cos * cos * (distance * Math.tan(pitch) + height);
    const speed = Math.sqrt(Math.max(1, (GRAVITY * distance * distance) / denominator));

    const yawOffset = yawInput * CONFIG.throw.yawRangeDeg * DEG;
    const toPlate = this.rig.horizontalDirection(_dir).multiplyScalar(-1);
    toPlate.applyAxisAngle(UP, yawOffset);
    out.velocity.set(toPlate.x * speed * cos, speed * Math.sin(pitch), toPlate.z * speed * cos);

    this.predict(out);
    return out;
  }

  /** Steps the arc through the world so it stops on the pile, not the floor. */
  private predict(solution: ThrowSolution): void {
    const step = 0.045;
    const point = _a.copy(solution.origin);
    const next = _b;
    const dir = _c;
    solution.impact = null;

    this.arc.count = 0;
    const matrix = new THREE.Matrix4();
    let dotIndex = 0;

    for (let i = 0; i < 70; i++) {
      const t = (i + 1) * step;
      next.set(
        solution.origin.x + solution.velocity.x * t,
        solution.origin.y + solution.velocity.y * t - 0.5 * GRAVITY * t * t,
        solution.origin.z + solution.velocity.z * t,
      );

      dir.copy(next).sub(point);
      const length = dir.length();
      if (length > 0.0001) {
        dir.multiplyScalar(1 / length);
        _ray.origin = point;
        _ray.dir = dir;
        const hit = this.physics.world.castRayAndGetNormal(_ray, length, true);
        if (hit) {
          const impact = point.clone().addScaledVector(dir, hit.timeOfImpact);
          solution.impact = impact;
          solution.impactNormal.set(hit.normal.x, hit.normal.y, hit.normal.z);
          break;
        }
      }

      // Skip the first samples: right under the camera they read as blobs.
      if (dotIndex < ARC_DOTS && i >= 3 && i % 3 === 0) {
        matrix.makeTranslation(next.x, next.y, next.z);
        matrix.scale(_scale.setScalar(1));
        this.arc.setMatrixAt(dotIndex++, matrix);
      }

      point.copy(next);
      if (next.y < CONFIG.plate.tableY) break;
    }

    this.arc.count = dotIndex;
    this.arc.instanceMatrix.needsUpdate = true;

    const impact = solution.impact;
    solution.risky =
      !impact || Math.hypot(impact.x, impact.z) > CONFIG.plate.radius * 0.82 || impact.y < -0.2;
  }

  update(dt: number, aiming: boolean, charge: number, yawInput: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.visible) return;

    this.bob += dt;
    const origin = this.originFor(_origin);
    this.holder.position.set(origin.x, origin.y + Math.sin(this.bob * 2.2) * 0.045, origin.z);
    this.holder.rotation.y += dt * 0.6;

    if (aiming && charge > 0.001) {
      const solution = this.solve(charge, yawInput);
      this.arc.visible = true;

      const impact = solution.impact;
      if (impact) {
        this.landingRing.visible = true;
        this.landingRing.position.copy(impact).addScaledVector(solution.impactNormal, 0.02);
        this.landingRing.quaternion.setFromUnitVectors(FORWARD, solution.impactNormal);
        const pulse = 1 + Math.sin(this.bob * 7) * 0.06;
        this.landingRing.scale.setScalar((0.85 + TIERS[this.tier].radius * 1.8) * pulse);
        (this.landingRing.material as THREE.MeshBasicMaterial).color.setHex(
          solution.risky ? 0xffb03a : 0xffffff,
        );
      } else {
        this.landingRing.visible = false;
      }

      this.powerRing.visible = true;
      this.powerRing.position.set(origin.x, origin.y - TIERS[this.tier].radius - 0.16, origin.z);
      this.powerRing.scale.setScalar(0.45 + charge * 0.85);
      (this.powerRing.material as THREE.MeshBasicMaterial).color.setHex(
        charge > 0.85 ? 0xff8b5e : charge > 0.55 ? 0xffd166 : 0x8de8a1,
      );
    } else {
      this.arc.count = 0;
      this.arc.visible = false;
      this.landingRing.visible = false;
      this.powerRing.visible = false;
    }
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
