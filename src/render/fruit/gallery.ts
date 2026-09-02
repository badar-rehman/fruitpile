import * as THREE from 'three';
import { TIERS } from '../../gameplay/tiers';
import { createFruitIcon } from './builders';

/**
 * Dev-only art review: every fruit at the same size, slowly turning.
 * Open with ?gallery=1 during development; stripped from production builds.
 */
export function runGallery(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3e6d2);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9a887, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  const columns = 6;
  const spacing = 2.6;
  const rows = Math.ceil(TIERS.length / columns);

  const spinners: THREE.Object3D[] = [];
  TIERS.forEach((tier, i) => {
    const mesh = createFruitIcon(tier.index);
    const col = i % columns;
    const row = Math.floor(i / columns);
    mesh.position.set((col - (columns - 1) / 2) * spacing, -(row - (rows - 1) / 2) * spacing, 0);
    scene.add(mesh);
    spinners.push(mesh);

    const label = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      new THREE.MeshBasicMaterial({ color: tier.color }),
    );
    label.position.set(mesh.position.x, mesh.position.y - 1.35, 0);
    scene.add(label);
  });

  camera.position.set(0, 0, columns * spacing * 0.92);
  camera.lookAt(0, 0, 0);

  renderer.setAnimationLoop(() => {
    for (const mesh of spinners) mesh.rotation.y += 0.006;
    renderer.render(scene, camera);
  });
}
