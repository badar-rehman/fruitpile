import * as THREE from 'three';
import { CONFIG } from '../config';
import { createPlateMesh } from './plate';
import type { QualitySettings } from './quality';

export interface SceneKit {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  plate: THREE.Mesh;
  fruitLayer: THREE.Group;
  effectLayer: THREE.Group;
  sun: THREE.DirectionalLight;
}

function createSky(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(40, 24, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x9fd7ee) },
      middle: { value: new THREE.Color(0xffe9c9) },
      bottom: { value: new THREE.Color(0xf6c48a) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 middle; uniform vec3 bottom;
      varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y / 40.0 * 0.5 + 0.5, 0.0, 1.0);
        vec3 color = h > 0.5
          ? mix(middle, top, (h - 0.5) * 2.0)
          : mix(bottom, middle, h * 2.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sky';
  return mesh;
}

function createTable(): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(2.95, 2.8, 0.5, 48);
  const material = new THREE.MeshStandardMaterial({ color: 0x9c6742, roughness: 0.88, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = CONFIG.plate.tableY - 0.25;
  mesh.receiveShadow = true;
  mesh.name = 'table';

  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.0, 0.05, 48),
    new THREE.MeshStandardMaterial({ color: 0x8dbdb3, roughness: 0.95 }),
  );
  cloth.position.y = 0.26;
  cloth.receiveShadow = true;
  mesh.add(cloth);
  return mesh;
}

export function createScene(canvas: HTMLCanvasElement, quality: QualitySettings): SceneKit {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.add(createSky());
  scene.add(createTable());

  const plate = createPlateMesh();
  scene.add(plate);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9b48a, 1.15);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3dd, 2.1);
  sun.position.set(3.4, 6.2, 2.8);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 18;
  sun.shadow.camera.left = -3.6;
  sun.shadow.camera.right = 3.6;
  sun.shadow.camera.top = 3.6;
  sun.shadow.camera.bottom = -3.6;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0xbfe4ff, 0.55);
  rim.position.set(-4, 2.5, -3.5);
  scene.add(rim);

  const fruitLayer = new THREE.Group();
  fruitLayer.name = 'fruits';
  scene.add(fruitLayer);

  const effectLayer = new THREE.Group();
  effectLayer.name = 'effects';
  scene.add(effectLayer);

  return { renderer, scene, plate, fruitLayer, effectLayer, sun };
}
