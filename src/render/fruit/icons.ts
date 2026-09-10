import * as THREE from 'three';
import { TIERS } from '../../gameplay/tiers';
import { createFruitIcon } from './builders';

/**
 * Renders each fruit once to a PNG data URL so the HUD can show the real thing
 * instead of a coloured circle.
 *
 * Uses its own throwaway renderer rather than the game's: it runs before the
 * first frame, needs a transparent background and a square aspect, and must not
 * disturb the main renderer's size or clear colour. The context is released as
 * soon as the icons are captured - browsers cap how many live WebGL contexts a
 * page may hold, and the game still needs its own.
 *
 * Returns an empty array if WebGL is unavailable, letting callers keep whatever
 * fallback they already display.
 */
export function renderFruitIcons(size = 112): string[] {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      // Required for a reliable toDataURL() read-back.
      preserveDrawingBuffer: true,
    });
  } catch {
    return [];
  }

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Same rig as src/render/scene.ts, so a tray icon reads like the fruit
    // sitting on the plate rather than a differently-lit sticker.
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9b48a, 1.15));
    const sun = new THREE.DirectionalLight(0xfff3dd, 2.1);
    sun.position.set(3.4, 6.2, 2.8);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xbfe4ff, 0.55);
    rim.position.set(-4, 2.5, -3.5);
    scene.add(rim);

    const fov = 30;
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 100);
    const box = new THREE.Box3();
    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();

    const urls: string[] = [];
    for (let tier = 0; tier < TIERS.length; tier++) {
      const fruit = createFruitIcon(tier);
      // A slight turn keeps stems, leaves and creases from hiding dead-on.
      fruit.rotation.y = -0.35;
      scene.add(fruit);

      // Fit each fruit individually: at a shared scale the pineapple's crown
      // and the strawberry's calyx would make the set look randomly sized.
      box.setFromObject(fruit, true).getCenter(center);
      box.getBoundingSphere(sphere);
      fruit.position.sub(center);

      const distance = (sphere.radius / Math.sin((fov * Math.PI) / 360)) * 1.06;
      camera.position.set(0.35, 0.42, 1).normalize().multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      urls.push(renderer.domElement.toDataURL('image/png'));

      scene.remove(fruit);
    }
    return urls;
  } catch {
    return [];
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
