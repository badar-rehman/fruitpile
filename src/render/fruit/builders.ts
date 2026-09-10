import * as THREE from 'three';
import { TIERS } from '../../gameplay/tiers';
import {
  colorize,
  displace,
  fibonacciSphere,
  fruitMaterial,
  makeLeaf,
  makeStem,
  noise3,
  plainMaterial,
  smoothNoise,
} from './geometry';

const tmpColor = new THREE.Color();

function sphere(detail = 3): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(1, detail);
}

function body(geometry: THREE.BufferGeometry): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, fruitMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function tint(base: number, accent: number, mix: number): THREE.Color {
  return tmpColor.setHex(base).lerp(new THREE.Color(accent), mix).clone();
}

// ----------------------------------------------------------- blueberry
function buildBlueberry(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(5), (dir) => {
    const dimple = Math.max(0, (dir.y - 0.7) / 0.3);
    return (1 - dimple * dimple * 0.28) * (1 + 0.02 * smoothNoise(dir.x, dir.y, dir.z, 6));
  });
  geometry.scale(1, 0.93, 1);
  colorize(geometry, (p, _n, c) => {
    const bloom = 0.25 + 0.35 * Math.max(0, p.y);
    c.copy(tint(0x35459e, 0xa8b6e8, bloom * 0.5));
  });
  group.add(body(geometry));

  const crown = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.22, 4),
      plainMaterial(0x2b3570, 0.8),
    );
    const angle = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.16, 0.72, Math.sin(angle) * 0.16);
    petal.rotation.set(Math.cos(angle) * 0.7, 0, -Math.sin(angle) * 0.7);
    crown.add(petal);
  }
  group.add(crown);
  return group;
}

// ---------------------------------------------------------- strawberry

function buildStrawberry(): THREE.Group {
  const group = new THREE.Group();
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.02, -1.15),
    new THREE.Vector2(0.3, -0.95),
    new THREE.Vector2(0.58, -0.68),
    new THREE.Vector2(0.8, -0.38),
    new THREE.Vector2(0.94, -0.02),
    new THREE.Vector2(0.97, 0.28),
    new THREE.Vector2(0.88, 0.58),
    new THREE.Vector2(0.68, 0.8),
    new THREE.Vector2(0.4, 0.92),
    new THREE.Vector2(0.02, 0.96),
  ];
  const geometry = new THREE.LatheGeometry(profile, 48);
  geometry.computeVertexNormals();
  colorize(geometry, (p, _n, c) => {
    c.copy(tint(0xe8324f, 0x8f1226, THREE.MathUtils.clamp(0.35 - p.y * 0.45, 0, 1)));
  });
  group.add(body(geometry));

  // Seeds ride the lathe profile so they sit flush with the surface.
  const seedGeometry = new THREE.SphereGeometry(0.05, 5, 4);
  const seedCount = 46;
  const seeds = new THREE.InstancedMesh(seedGeometry, plainMaterial(0xffe08a, 0.5), seedCount);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < seedCount; i++) {
    const t = (i + 0.5) / seedCount;
    const index = Math.min(profile.length - 2, Math.floor(t * (profile.length - 1)));
    const local = t * (profile.length - 1) - index;
    const r = THREE.MathUtils.lerp(profile[index].x, profile[index + 1].x, local) * 0.98;
    const y = THREE.MathUtils.lerp(profile[index].y, profile[index + 1].y, local);
    const angle = i * 2.399963;
    matrix.makeTranslation(Math.cos(angle) * r, y, Math.sin(angle) * r);
    seeds.setMatrixAt(i, matrix);
  }
  seeds.instanceMatrix.needsUpdate = true;
  group.add(seeds);

  const calyx = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 4), plainMaterial(0x4f9b34, 0.6));
    const angle = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.34, 0.95, Math.sin(angle) * 0.34);
    leaf.rotation.set(Math.cos(angle) * 1.15, -angle, -Math.sin(angle) * 1.15);
    calyx.add(leaf);
  }
  const stem = makeStem(0.3, 0.055, 0x4e7d33);
  stem.position.y = 0.92;
  calyx.add(stem);
  group.add(calyx);
  return group;
}

// -------------------------------------------------------------- kiwano
function buildKiwano(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(5), (dir) => 1 + 0.05 * smoothNoise(dir.x, dir.y, dir.z, 4));
  geometry.scale(1, 1.12, 0.95);
  colorize(geometry, (p, _n, c) => {
    c.copy(tint(0xe8a022, 0xc46b12, 0.3 + 0.3 * noise3(p.x * 3, p.y * 3, p.z * 3)));
  });
  group.add(body(geometry));

  const spikeGeometry = new THREE.ConeGeometry(0.1, 0.3, 5);
  spikeGeometry.translate(0, 0.15, 0);
  const spikes = new THREE.InstancedMesh(spikeGeometry, plainMaterial(0xf5c451, 0.55), 26);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(1, 1, 1);
  fibonacciSphere(26).forEach((dir, i) => {
    quaternion.setFromUnitVectors(up, dir);
    matrix.compose(dir.clone().multiply(new THREE.Vector3(0.96, 1.06, 0.9)), quaternion, scale);
    spikes.setMatrixAt(i, matrix);
  });
  spikes.instanceMatrix.needsUpdate = true;
  group.add(spikes);
  return group;
}

// --------------------------------------------------------------- peach

function buildPeach(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(6), (dir) => {
    const crease = Math.exp(-Math.pow(dir.x / 0.2, 2)) * Math.max(0, dir.z);
    const dimple = Math.max(0, (dir.y - 0.74) / 0.26);
    return 1 - 0.2 * crease - 0.2 * dimple * dimple;
  });
  geometry.scale(1.02, 0.99, 1);
  colorize(geometry, (p, _n, c) => {
    const blush = THREE.MathUtils.clamp(
      0.25 + p.y * 0.75 + 0.1 * noise3(p.x * 5, p.y * 5, p.z * 5),
      0,
      1,
    );
    c.copy(tint(0xffd79a, 0xf4574a, blush));
  });
  group.add(body(geometry));

  const stem = makeStem(0.16, 0.035, 0x6b4a2a);
  stem.position.y = 0.78;
  group.add(stem);
  const leaf = makeLeaf(0.55, 0.26, 0x54992f);
  leaf.position.set(0.05, 0.86, 0);
  group.add(leaf);
  return group;
}

// --------------------------------------------------------------- apple
function buildApple(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(6), (dir) => {
    const pole = Math.max(0, (Math.abs(dir.y) - 0.68) / 0.32);
    return 1 - 0.32 * pole * pole + 0.02 * smoothNoise(dir.x, dir.y, dir.z, 5);
  });
  geometry.scale(1.03, 0.95, 1.03);
  colorize(geometry, (p, _n, c) => {
    const streak = 0.5 + 0.5 * Math.sin(Math.atan2(p.z, p.x) * 9 + p.y * 2);
    const blush = THREE.MathUtils.clamp(0.35 + 0.4 * streak + p.y * 0.15, 0, 1);
    c.copy(tint(0xc22b2b, 0xf2603f, blush * 0.7));
  });
  group.add(body(geometry));

  const stem = makeStem(0.32, 0.035, 0x6b4a2a);
  stem.position.y = 0.72;
  group.add(stem);
  const leaf = makeLeaf(0.46, 0.2, 0x69ac3c);
  leaf.position.set(0.05, 0.92, 0);
  leaf.rotation.y = 0.6;
  group.add(leaf);
  return group;
}

// -------------------------------------------------------------- orange
function buildOrange(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(8), (dir) => {
    const pole = Math.max(0, (Math.abs(dir.y) - 0.8) / 0.2);
    return 1 - 0.1 * pole * pole + 0.012 * smoothNoise(dir.x, dir.y, dir.z, 22);
  });
  geometry.scale(1, 0.94, 1);
  colorize(geometry, (p, _n, c) => {
    const mottle = noise3(p.x * 8, p.y * 8, p.z * 8);
    c.copy(tint(0xff9a1f, 0xffc46b, 0.15 + mottle * 0.3));
  });
  group.add(body(geometry));

  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 6), plainMaterial(0x8faf4a, 0.8));
  nub.position.y = 0.9;
  group.add(nub);
  return group;
}

// ---------------------------------------------------------------- pear

function buildPear(): THREE.Group {
  const group = new THREE.Group();
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.02, -1.0),
    new THREE.Vector2(0.42, -0.96),
    new THREE.Vector2(0.72, -0.82),
    new THREE.Vector2(0.9, -0.6),
    new THREE.Vector2(0.97, -0.32),
    new THREE.Vector2(0.93, -0.05),
    new THREE.Vector2(0.78, 0.2),
    new THREE.Vector2(0.6, 0.44),
    new THREE.Vector2(0.5, 0.66),
    new THREE.Vector2(0.46, 0.86),
    new THREE.Vector2(0.36, 1.0),
    new THREE.Vector2(0.02, 1.04),
  ];
  const geometry = new THREE.LatheGeometry(profile, 48);
  geometry.computeVertexNormals();
  colorize(geometry, (p, _n, c) => {
    const russet = noise3(p.x * 9, p.y * 9, p.z * 9);
    const ripeness = THREE.MathUtils.clamp(0.3 + p.y * 0.3 + russet * 0.3, 0, 1);
    c.copy(tint(0xd7e067, 0x9aba38, ripeness));
  });
  group.add(body(geometry));

  const stem = makeStem(0.34, 0.035, 0x6b4a2a);
  stem.position.y = 1.0;
  stem.rotation.z = 0.2;
  group.add(stem);
  const leaf = makeLeaf(0.5, 0.22, 0x6aa83a);
  leaf.position.set(0.04, 1.14, 0);
  group.add(leaf);
  return group;
}

// --------------------------------------------------------- dragonfruit

function buildDragonfruit(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(8), (dir) => 1 + 0.04 * smoothNoise(dir.x, dir.y, dir.z, 4));
  geometry.scale(0.92, 1.14, 0.92);
  colorize(geometry, (p, _n, c) => {
    c.copy(tint(0xe0326f, 0xff7fae, 0.15 + 0.35 * Math.max(0, p.y)));
  });
  group.add(body(geometry));

  // Flattened cones read as the scaly fins from any angle.
  const finGeometry = new THREE.ConeGeometry(0.26, 0.8, 4);
  finGeometry.translate(0, 0.4, 0);
  finGeometry.scale(1, 1, 0.42);
  finGeometry.computeVertexNormals();
  colorize(finGeometry, (p, _n, c) => {
    c.copy(tint(0xe0326f, 0x63c95a, THREE.MathUtils.clamp(p.y / 0.8, 0, 1)));
  });
  const finMaterial = fruitMaterial({ roughness: 0.55 });

  for (let ring = 0; ring < 3; ring++) {
    const height = -0.45 + ring * 0.5;
    const count = ring === 1 ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      const angle = (i / count) * Math.PI * 2 + ring * 0.4;
      const radius = 0.78 * Math.sqrt(Math.max(0.15, 1 - Math.pow(height / 1.1, 2)));
      fin.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      fin.rotation.set(Math.cos(angle) * 1.15, -angle, -Math.sin(angle) * 1.15);
      fin.rotateX(-0.5);
      group.add(fin);
    }
  }
  return group;
}

// ----------------------------------------------------------- pineapple
function buildPineapple(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(8), (dir) => {
    const lat = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const lon = Math.atan2(dir.z, dir.x);
    const facet = Math.sin(lat * 11 + lon * 5) * Math.sin(lat * 11 - lon * 5);
    const pole = Math.max(0, (Math.abs(dir.y) - 0.75) / 0.25);
    return 1 + 0.045 * facet - 0.12 * pole * pole;
  });
  geometry.scale(0.92, 1.3, 0.92);
  colorize(geometry, (p, _n, c) => {
    const lat = Math.asin(THREE.MathUtils.clamp(p.y / 1.3, -1, 1));
    const lon = Math.atan2(p.z, p.x);
    const grid = Math.sin(lat * 11 + lon * 5) * Math.sin(lat * 11 - lon * 5);
    c.copy(tint(0xc9861f, 0xf3c760, THREE.MathUtils.clamp(grid * 0.9 + 0.45, 0, 1)));
  });
  group.add(body(geometry));

  const crown = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.5, 4),
      plainMaterial(i % 2 === 0 ? 0x4f9b3f : 0x63b34c, 0.6),
    );
    const angle = (i / 11) * Math.PI * 2;
    const tilt = 0.3 + (i % 3) * 0.16;
    leaf.position.set(Math.cos(angle) * 0.16, 1.3 + (i % 3) * 0.06, Math.sin(angle) * 0.16);
    leaf.rotation.set(Math.cos(angle) * tilt, 0, -Math.sin(angle) * tilt);
    crown.add(leaf);
  }
  group.add(crown);
  return group;
}

// --------------------------------------------------------------- melon

function buildMelon(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(8), (dir) => {
    const vein = netPattern(dir.x, dir.y, dir.z);
    return 1 + 0.015 * smoothNoise(dir.x, dir.y, dir.z, 9) + vein * 0.038;
  });
  geometry.scale(1, 0.96, 1);
  colorize(geometry, (p, _n, c) => {
    const vein = netPattern(p.x, p.y / 0.96, p.z);
    const base = tint(0x9fb56d, 0xc9d69a, 0.25 + 0.3 * noise3(p.x * 4, p.y * 4, p.z * 4));
    c.copy(base).lerp(NET_COLOR, vein * 0.6);
  });
  group.add(body(geometry));

  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 6), plainMaterial(0x8b9d5a, 0.8));
  nub.position.y = 0.93;
  group.add(nub);
  return group;
}

const NET_COLOR = new THREE.Color(0xf2f3e0);

/** Raised reticulation of a netted melon: 0 = skin, 1 = vein. */
function netPattern(x: number, y: number, z: number): number {
  const ridge = Math.abs(Math.sin(x * 7.5) + Math.sin(y * 8.5 + 1.2) + Math.sin(z * 7.0 + 2.4));
  return 1 - THREE.MathUtils.smoothstep(Math.min(ridge, 1.0), 0.02, 0.24);
}

// ---------------------------------------------------------- watermelon
function buildWatermelon(): THREE.Group {
  const group = new THREE.Group();
  const geometry = displace(sphere(8), (dir) => 1 + 0.012 * smoothNoise(dir.x, dir.y, dir.z, 7));
  geometry.scale(1, 0.93, 1);
  colorize(geometry, (p, _n, c) => {
    const lon = Math.atan2(p.z, p.x);
    const wobble = 0.25 * Math.sin(p.y * 6);
    const stripe = Math.sin(lon * 8 + wobble);
    const isDark = stripe > 0.1 ? 1 : 0;
    c.copy(tint(0x8fd06a, 0x1f6b34, isDark * 0.85 + 0.1));
  });
  group.add(body(geometry));

  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      const angle = t * Math.PI * 3;
      const r = 0.16 * (1 - t * 0.5);
      return new THREE.Vector3(Math.cos(angle) * r, 0.9 + t * 0.32, Math.sin(angle) * r);
    }),
  );
  const tendril = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, 0.022, 5, false),
    plainMaterial(0x6d8f3f, 0.8),
  );
  group.add(tendril);
  return group;
}

const BUILDERS: Array<() => THREE.Group> = [
  buildBlueberry,
  buildStrawberry,
  buildKiwano,
  buildPeach,
  buildApple,
  buildOrange,
  buildPear,
  buildDragonfruit,
  buildPineapple,
  buildMelon,
  buildWatermelon,
];

const prototypes: THREE.Group[] = [];

/** Builds every fruit once at unit radius; instances are cheap clones. */
export function buildFruitPrototypes(): void {
  if (prototypes.length) return;
  for (let i = 0; i < BUILDERS.length; i++) {
    const group = BUILDERS[i]();
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    prototypes.push(group);
  }
}

/** A ready-to-place fruit scaled to its tier radius. */
export function createFruitMesh(tier: number): THREE.Object3D {
  buildFruitPrototypes();
  const clone = prototypes[Math.min(tier, prototypes.length - 1)].clone(true);
  clone.scale.setScalar(TIERS[Math.min(tier, TIERS.length - 1)].radius);
  return clone;
}

/** Small unscaled clone for HUD/preview use. */
export function createFruitIcon(tier: number): THREE.Object3D {
  buildFruitPrototypes();
  return prototypes[Math.min(tier, prototypes.length - 1)].clone(true);
}
