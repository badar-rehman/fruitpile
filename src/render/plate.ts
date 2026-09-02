import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Profile of the dish, revolved for both the visual mesh and the physics
 * trimesh so what the player sees is exactly what the fruit rolls on.
 * x = radius, y = height, interior floor at y = 0.
 */
export function plateProfile(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const inner = CONFIG.plate.radius * 0.94;
  const steps = 14;
  // Shallow bowl interior: fruit drifts gently toward the middle.
  for (let i = 0; i <= steps; i++) {
    const r = (i / steps) * inner;
    const y = 0.19 * Math.pow(r / inner, 2);
    points.push(new THREE.Vector2(Math.max(r, 0.0008), y));
  }
  // Lip, outer wall and underside.
  points.push(new THREE.Vector2(CONFIG.plate.radius, CONFIG.plate.lip));
  points.push(new THREE.Vector2(CONFIG.plate.radius + 0.07, CONFIG.plate.lip - 0.02));
  points.push(new THREE.Vector2(CONFIG.plate.radius + 0.05, 0.0));
  points.push(new THREE.Vector2(CONFIG.plate.radius - 0.15, -0.09));
  points.push(new THREE.Vector2(0.6, -0.14));
  points.push(new THREE.Vector2(0.52, -0.22));
  points.push(new THREE.Vector2(0.44, -0.22));
  points.push(new THREE.Vector2(0.4, -0.14));
  points.push(new THREE.Vector2(0.0008, -0.14));
  return points;
}

export function createPlateMesh(): THREE.Mesh {
  const geometry = new THREE.LatheGeometry(plateProfile(), 64);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0xfdf7ef,
    roughness: 0.32,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'plate';
  return mesh;
}

/** Flattened vertex/index buffers for the Rapier trimesh collider. */
export function plateCollisionBuffers(): { vertices: Float32Array; indices: Uint32Array } {
  const geometry = new THREE.LatheGeometry(plateProfile(), 48);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const index = geometry.index;
  const vertices = new Float32Array(position.array);
  const indices = index
    ? new Uint32Array(index.array)
    : new Uint32Array(Array.from({ length: position.count }, (_, i) => i));
  geometry.dispose();
  return { vertices, indices };
}
