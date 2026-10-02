import * as THREE from 'three';
import { CONFIG } from '../config';
import { clamp, damp } from '../core/math';
import type { CameraRig } from './cameraRig';
import smileUrl from './miki/Smile.webp';
import closedSmileUrl from './miki/Closed_Smile.webp';
import openUrl from './miki/Open.webp';
import closedOpenUrl from './miki/Closed_Open.webp';
import openBlushUrl from './miki/Open_Blush.webp';
import frownUrl from './miki/Frown.webp';
import frownBlushUrl from './miki/Frown_Blush.webp';
import closedFrownUrl from './miki/Closed_Frown.webp';
import closedFrownBlushUrl from './miki/Closed_Frown_Blush.webp';

/**
 * "Miki" by Noraneko Games (https://noranekogames.itch.io/miki), Casual outfit,
 * cropped to the upper body. See ./miki/CREDITS.txt for the licence terms.
 *
 * She stands on the far side of the plate from the camera, so she stays in view
 * however the player orbits, and watches the game. She is a flat picture, so
 * she is animated like a paper cut-out: bobbing, swaying, hopping and squashing
 * as a whole, with the expression swapped for the matching image.
 */

type Mood =
  | 'content'
  | 'blink'
  | 'watching'
  | 'cheer'
  | 'love'
  | 'wince'
  | 'gasp'
  | 'sad'
  | 'worried';

export type Reaction =
  | { kind: 'start' }
  | { kind: 'throw'; charge: number }
  | { kind: 'land'; impact: number }
  | { kind: 'merge'; chain: number; big: boolean }
  | { kind: 'discover'; tier: number }
  | { kind: 'fall'; strikesLeft: number }
  | { kind: 'gameover' };

type Pose =
  | 'smile'
  | 'closedSmile'
  | 'open'
  | 'closedOpen'
  | 'openBlush'
  | 'frown'
  | 'frownBlush'
  | 'closedFrown'
  | 'closedFrownBlush';

const URLS: Record<Pose, string> = {
  smile: smileUrl,
  closedSmile: closedSmileUrl,
  open: openUrl,
  closedOpen: closedOpenUrl,
  openBlush: openBlushUrl,
  frown: frownUrl,
  frownBlush: frownBlushUrl,
  closedFrown: closedFrownUrl,
  closedFrownBlush: closedFrownBlushUrl,
};

const POSE_FOR: Record<Mood, Pose> = {
  content: 'smile',
  blink: 'closedSmile',
  watching: 'open',
  cheer: 'closedOpen',
  love: 'openBlush',
  wince: 'closedFrown',
  gasp: 'frown',
  sad: 'closedFrownBlush',
  worried: 'frownBlush',
};

const IMAGE_ASPECT = 480 / 574;
const HEIGHT = 2.3;
const GRAVITY = 24;

export class Miki {
  readonly root = new THREE.Group();

  private readonly pivot = new THREE.Group();
  private readonly plane: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly textures = new Map<Pose, THREE.Texture>();
  private shown: Pose | null = null;

  private time = 0;
  private y = 0;
  private vy = 0;
  private squash = 0;
  private squashV = 0;
  private lean = 0;
  private leanV = 0;
  private lookAngle = 0;
  private slump = 0;
  private cheering = 0;
  private lift = 0;
  private liftTarget = 0;

  private mood: Mood = 'content';
  private moodUntil = 0;
  private moodPriority = 0;
  private blinkAt = 2;
  private blinkUntil = 0;

  private watching: THREE.Object3D | null = null;
  private watchingUntil = 0;
  private strikesLeft: number = CONFIG.fail.strikes;
  private over = false;

  private readonly toCamera = new THREE.Vector3();
  private readonly aim = new THREE.Vector3();

  constructor(parent: THREE.Object3D) {
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.35,
      toneMapped: false,
    });
    const geometry = new THREE.PlaneGeometry(HEIGHT * IMAGE_ASPECT, HEIGHT);
    geometry.translate(0, HEIGHT / 2, 0);
    this.plane = new THREE.Mesh(geometry, this.material);
    this.plane.visible = false;
    this.pivot.add(this.plane);
    this.root.add(this.pivot);
    this.root.name = 'miki';
    parent.add(this.root);

    // Start decoding every expression so the first reaction never shows a blank frame.
    for (const pose of Object.keys(URLS) as Pose[]) this.texture(pose);
  }

  private texture(pose: Pose): THREE.Texture {
    let texture = this.textures.get(pose);
    if (!texture) {
      texture = new THREE.Texture();
      this.textures.set(pose, texture);
      const target = texture;
      const image = new Image();
      image.onload = () => {
        target.image = image;
        target.colorSpace = THREE.SRGBColorSpace;
        target.anisotropy = 4;
        target.needsUpdate = true;
        target.userData.ready = true;
      };
      image.src = URLS[pose];
    }
    return texture;
  }

  /** The fruit she follows with her eyes, until it lands or merges away. */
  watch(target: THREE.Object3D | null): void {
    this.watching = target;
    this.watchingUntil = this.time + 2.5;
  }

  react(reaction: Reaction): void {
    switch (reaction.kind) {
      case 'start':
        this.over = false;
        this.strikesLeft = CONFIG.fail.strikes;
        this.slump = 0;
        this.moodUntil = 0;
        this.moodPriority = 0;
        this.setMood('cheer', 1.1, 2);
        this.hop(0.22);
        break;
      case 'throw':
        this.setMood('watching', 1.2, 1);
        this.flinch(0.25, 1);
        break;
      case 'land':
        if (reaction.impact > 0.25) {
          const heavy = reaction.impact > 0.5;
          this.setMood(heavy ? 'wince' : 'watching', heavy ? 0.35 : 0.3, 2);
          this.flinch(0.3 + reaction.impact * 0.5, 1);
        }
        break;
      case 'merge':
        if (reaction.big) {
          this.setMood('love', 2, 5);
          this.hop(0.5);
          this.raise(1, 2000);
          this.cheering = 2;
        } else if (reaction.chain >= 2) {
          this.setMood('love', 1.1, 4);
          this.hop(0.22 + reaction.chain * 0.06);
          this.raise(0.8, 900);
        } else {
          this.setMood('cheer', 0.9, 3);
          this.hop(0.14);
        }
        break;
      case 'discover':
        if (reaction.tier >= 4) {
          this.setMood('love', 1.4, 4);
          this.hop(0.28);
          this.raise(1, 1100);
        }
        break;
      case 'fall':
        this.strikesLeft = reaction.strikesLeft;
        this.setMood('gasp', 1, 6);
        this.flinch(1, -1);
        this.hop(0.08);
        break;
      case 'gameover':
        this.over = true;
        this.moodUntil = 0;
        this.moodPriority = 0;
        this.cheering = 0;
        this.liftTarget = 0;
        this.setMood('sad', 99, 9);
        this.slump = 1;
        break;
    }
  }

  private setMood(mood: Mood, hold: number, priority: number): void {
    if (this.time < this.moodUntil && priority < this.moodPriority) return;
    this.mood = mood;
    this.moodUntil = this.time + hold;
    this.moodPriority = priority;
  }

  private hop(height: number): void {
    this.vy = Math.sqrt(2 * GRAVITY * height * 0.8);
    this.squash = -0.06;
    this.squashV = 0;
  }

  private flinch(strength: number, direction: number): void {
    this.squash = Math.max(this.squash, 0.05 * strength);
    this.leanV += direction * 1.6 * strength;
  }

  private raise(amount: number, forMs: number): void {
    this.liftTarget = amount;
    window.setTimeout(() => {
      this.liftTarget = 0;
    }, forMs);
  }

  update(dt: number, rig: CameraRig): void {
    this.time += dt;
    const now = this.time;

    // Stand on the far side of the plate from the camera, facing it.
    rig.horizontalDirection(this.toCamera);
    const distance = CONFIG.plate.radius + 0.95;
    this.root.position.copy(this.toCamera).multiplyScalar(-distance);
    this.root.position.y = CONFIG.plate.tableY + 0.14;
    const facing = Math.atan2(this.toCamera.x, this.toCamera.z);
    this.root.rotation.y = facing;
    // Smaller on tall (portrait) screens so her hair clears the HUD.
    this.root.scale.setScalar(rig.camera.aspect < 0.85 ? 0.78 : 1);

    // What she is looking at
    const target =
      this.watching && this.watching.parent && now < this.watchingUntil ? this.watching : null;
    if (!target) this.watching = null;
    let lookYaw = 0;
    if (target && !this.over) {
      this.aim.copy(target.position).sub(this.root.position);
      const angle = Math.atan2(this.aim.x, this.aim.z) - facing;
      lookYaw = clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.7, 0.7) * 0.3;
    }

    // Which expression
    const base: Mood = this.over
      ? 'sad'
      : this.strikesLeft <= 1
        ? 'worried'
        : target
          ? 'watching'
          : 'content';
    let mood: Mood = base;
    if (now < this.moodUntil) mood = this.mood;
    else {
      this.moodPriority = 0;
      if (mood === 'content' || mood === 'watching') {
        if (now >= this.blinkAt) {
          this.blinkUntil = now + 0.14;
          this.blinkAt = now + 2.5 + Math.random() * 3.5;
        }
        if (now < this.blinkUntil) mood = 'blink';
      }
    }

    // Swap the picture once it has decoded; keep the previous one until then.
    const pose = POSE_FOR[mood];
    const texture = this.texture(pose);
    if (texture.userData.ready && this.shown !== pose) {
      this.material.map = texture;
      this.material.needsUpdate = true;
      this.shown = pose;
      this.plane.visible = true;
    }

    // Hop
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        const impact = -this.vy;
        this.y = 0;
        this.vy = 0;
        this.squash = clamp(impact * 0.025, 0.02, 0.12);
        this.squashV = 0;
        if (this.cheering > 0) this.vy = Math.sqrt(2 * GRAVITY * 0.07);
      }
    }
    this.cheering = Math.max(0, this.cheering - dt);

    this.squashV += (-170 * this.squash - 15 * this.squashV) * dt;
    this.squash += this.squashV * dt;

    const sway = Math.sin(this.time * 1.3) * 0.02;
    this.leanV += (-55 * (this.lean - (sway + this.slump * 0.05)) - 9 * this.leanV) * dt;
    this.lean += this.leanV * dt;
    this.lookAngle = damp(this.lookAngle, lookYaw, 6, dt);
    this.lift = damp(this.lift, this.liftTarget, 10, dt);

    const breathe = Math.sin(this.time * 1.9) * 0.008;
    const sy = 1 - this.squash + breathe + this.lift * 0.03;
    this.pivot.scale.set(1 + this.squash * 0.5 - breathe * 0.4, sy, 1);
    this.pivot.position.y = this.y - this.slump * 0.04 + Math.sin(this.time * 1.9) * 0.01;
    this.pivot.rotation.z = this.lean;
    this.pivot.rotation.y = this.lookAngle;
    this.pivot.rotation.x = this.slump * 0.07;
  }
}
