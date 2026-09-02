import * as THREE from 'three';
import { clamp01 } from '../core/math';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface Shockwave {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** Instanced sparkle burst plus a small pool of expanding rings. */
export class ParticleSystem {
  private readonly mesh: THREE.InstancedMesh;
  private readonly pool: Particle[] = [];
  private readonly active: Particle[] = [];
  private readonly shockwaves: Shockwave[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();

  constructor(
    private readonly parent: THREE.Object3D,
    private readonly budget: number,
  ) {
    const geometry = new THREE.OctahedronGeometry(0.06, 0);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    this.mesh = new THREE.InstancedMesh(geometry, material, budget);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = budget;
    parent.add(this.mesh);

    for (let i = 0; i < budget; i++) {
      this.pool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(),
      });
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    const ringGeometry = new THREE.RingGeometry(0.6, 0.78, 32);
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(
        ringGeometry,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      parent.add(mesh);
      this.shockwaves.push({ mesh, life: 0, maxLife: 1, maxScale: 1 });
    }
  }

  burst(position: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed = 3): void {
    const tint = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const particle = this.pool.pop();
      if (!particle) return;
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.4,
        Math.random() * 2 - 1,
      ).normalize();
      particle.position.copy(position);
      particle.velocity.copy(dir).multiplyScalar(speed * (0.5 + Math.random()));
      particle.maxLife = 0.45 + Math.random() * 0.45;
      particle.life = particle.maxLife;
      particle.size = 0.6 + Math.random() * 0.9;
      particle.color.copy(tint).offsetHSL(0, 0, (Math.random() - 0.5) * 0.25);
      this.active.push(particle);
    }
  }

  ring(position: THREE.Vector3, color: THREE.ColorRepresentation, maxScale: number): void {
    const wave = this.shockwaves.find((w) => w.life <= 0);
    if (!wave) return;
    wave.mesh.position.copy(position);
    wave.mesh.rotation.set(-Math.PI / 2, 0, 0);
    wave.mesh.visible = true;
    wave.mesh.scale.setScalar(0.15);
    (wave.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    wave.maxLife = 0.42;
    wave.life = wave.maxLife;
    wave.maxScale = maxScale;
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const particle = this.active[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.active.splice(i, 1);
        this.pool.push(particle);
        continue;
      }
      particle.velocity.y -= 9 * dt;
      particle.velocity.multiplyScalar(1 - 1.6 * dt);
      particle.position.addScaledVector(particle.velocity, dt);
    }

    for (let i = 0; i < this.budget; i++) {
      const particle = this.active[i];
      if (!particle) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      const t = clamp01(particle.life / particle.maxLife);
      this.scale.setScalar(particle.size * t);
      this.matrix.compose(particle.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, particle.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    for (const wave of this.shockwaves) {
      if (wave.life <= 0) continue;
      wave.life -= dt;
      const t = 1 - clamp01(wave.life / wave.maxLife);
      wave.mesh.scale.setScalar(0.15 + t * wave.maxScale);
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
      if (wave.life <= 0) wave.mesh.visible = false;
    }
  }

  clear(): void {
    while (this.active.length) this.pool.push(this.active.pop()!);
    for (const wave of this.shockwaves) {
      wave.life = 0;
      wave.mesh.visible = false;
    }
    this.update(0);
  }

  dispose(): void {
    this.parent.remove(this.mesh);
  }
}
