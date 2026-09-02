import * as THREE from 'three';
import { CONFIG } from '../config';
import { clamp, damp } from '../core/math';

/**
 * Orbits on a ring around the plate. Yaw is player-driven, everything else
 * eases so the camera never snaps.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  private currentYaw = 0;
  private radius: number = CONFIG.camera.radius;
  private currentRadius: number = CONFIG.camera.radius;
  private shake = 0;
  private shakeSeed = Math.random() * 100;
  private readonly target = new THREE.Vector3(
    CONFIG.camera.target.x,
    CONFIG.camera.target.y,
    CONFIG.camera.target.z,
  );
  private readonly offset = new THREE.Vector3();
  private portrait = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, aspect, 0.1, 100);
    this.update(0);
  }

  orbit(deltaRadians: number): void {
    this.yaw += deltaRadians;
  }

  zoom(delta: number): void {
    this.radius = clamp(this.radius + delta, CONFIG.camera.minRadius, CONFIG.camera.maxRadius);
  }

  addShake(amount: number): void {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  /** Current camera distance from the plate, including the portrait boost. */
  get boom(): number {
    return this.currentRadius * (this.portrait ? 1.2 : 1);
  }

  /** Unit vector pointing from the plate toward the camera, flattened to the ground. */
  horizontalDirection(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.currentYaw), 0, Math.cos(this.currentYaw)).normalize();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // Tall viewports (mobile portrait) need a wider lens and a longer boom,
    // otherwise the held fruit swallows the screen.
    this.portrait = aspect < 0.85;
    this.camera.fov = this.portrait ? CONFIG.camera.fov + 10 : CONFIG.camera.fov;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.currentYaw = damp(this.currentYaw, this.yaw, CONFIG.camera.smoothing, dt);
    this.currentRadius = damp(this.currentRadius, this.radius, CONFIG.camera.smoothing, dt);

    const boom = this.boom;
    const height = CONFIG.camera.height * (boom / CONFIG.camera.radius);
    this.offset.set(Math.sin(this.currentYaw) * boom, height, Math.cos(this.currentYaw) * boom);
    this.camera.position.copy(this.target).add(this.offset);

    if (this.shake > 0.0005) {
      const t = performance.now() * 0.001 + this.shakeSeed;
      const amount = this.shake * this.shake * 0.16;
      this.camera.position.x += Math.sin(t * 47) * amount;
      this.camera.position.y += Math.sin(t * 61 + 1.7) * amount;
      this.camera.position.z += Math.sin(t * 53 + 3.1) * amount;
      this.shake = Math.max(0, this.shake - CONFIG.juice.shakeDecay * this.shake * dt - 0.001);
    }

    this.camera.lookAt(this.target);
  }
}
