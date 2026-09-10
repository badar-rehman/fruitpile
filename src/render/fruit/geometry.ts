import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Cheap deterministic value noise - enough to make fruit look hand-made. */
export function noise3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export function smoothNoise(x: number, y: number, z: number, freq: number): number {
  return (
    0.6 * Math.sin(x * freq) * Math.cos(y * freq * 1.3) +
    0.4 * Math.sin(z * freq * 1.7 + y * freq)
  );
}

/**
 * Displace every vertex of a (roughly spherical) geometry along its direction,
 * then weld it so the shading comes out smooth.
 *
 * IcosahedronGeometry is non-indexed - every triangle carries its own three
 * vertices - so computeVertexNormals() on it can only produce per-face normals
 * and the fruit reads as hard facets no matter what `flatShading` says. Welding
 * the duplicate corners together first lets the normals average across
 * neighbouring faces, which is why the lathe-built fruit (indexed from the
 * start) always looked smoother than the rest.
 */
export function displace(
  geometry: THREE.BufferGeometry,
  fn: (dir: THREE.Vector3, original: THREE.Vector3) => number,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const dir = new THREE.Vector3();
  const original = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    original.fromBufferAttribute(pos, i);
    dir.copy(original).normalize();
    const scale = fn(dir, original);
    pos.setXYZ(i, original.x * scale, original.y * scale, original.z * scale);
  }
  pos.needsUpdate = true;

  // mergeVertices() keys on every attribute, so the stale per-face normals
  // would make each corner look unique and the weld a no-op. Drop them (and
  // the unused UVs) and let the normals be rebuilt from the welded topology.
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, 1e-5);
  welded.computeVertexNormals();
  return welded;
}

/** Bake a per-vertex colour so a single material can carry stripes and speckles. */
export function colorize(
  geometry: THREE.BufferGeometry,
  fn: (position: THREE.Vector3, normal: THREE.Vector3, out: THREE.Color) => void,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const nrm = geometry.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i);
    c.setRGB(1, 1, 1);
    fn(p, n, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function fruitMaterial(options?: {
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: options?.roughness ?? 0.62,
    metalness: options?.metalness ?? 0.02,
    flatShading: options?.flatShading ?? false,
  });
}

export function plainMaterial(color: number, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.0 });
}

/** Evenly spread points over a sphere - used for seeds, spikes and speckles. */
export function fibonacciSphere(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius));
  }
  return points;
}

export function makeStem(height = 0.28, radius = 0.035, color = 0x6b4a2a): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius * 0.75, radius, height, 6, 1);
  geometry.translate(0, height * 0.5, 0);
  return new THREE.Mesh(geometry, plainMaterial(color, 0.85));
}

export function makeLeaf(length = 0.42, width = 0.24, color = 0x5ea83f): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width, length * 0.35, 0, length);
  shape.quadraticCurveTo(-width, length * 0.35, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  geometry.rotateX(-Math.PI / 2.4);
  const material = plainMaterial(color, 0.6);
  material.side = THREE.DoubleSide;
  return new THREE.Mesh(geometry, material);
}
