import * as THREE from 'three';
import { CONFIG } from '../../config';

/**
 * Cute faces for the fruit: dot eyes and a thin mouth stroke, drawn into
 * canvases at boot so they cost nothing in the bundle.
 *
 * Faces are deliberately NOT children of the fruit meshes. A fruit mesh carries
 * the physics body's rotation (so a welded face would roll under the pile) and
 * a non-uniform squash scale (so a counter-rotating child would be sheared).
 * Instead FaceLayer keeps its own billboards and places them from the fruit's
 * world transform each frame, re-applying squash in billboard space - which
 * reads better anyway, since the squish always shows as vertical compression on
 * screen however the fruit happens to have rolled.
 */

export type Expression =
  | 'content'
  | 'blink'
  | 'flying'
  | 'impact'
  | 'delighted'
  | 'panicked'
  | 'dizzy';

export const EXPRESSIONS: Expression[] = [
  'content',
  'blink',
  'flying',
  'impact',
  'delighted',
  'panicked',
  'dizzy',
];

const SIZE = 128;
const INK = '#2f2a28';

/** Everything is laid out in a 0..1 square so the numbers read as proportions. */
function draw(expression: Expression): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const u = (v: number) => v * SIZE;

  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const eyeY = 0.42;
  const eyeX = 0.19; // distance either side of centre
  const dot = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.ellipse(u(x), u(y), u(r), u(r * 1.08), 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const arc = (x: number, y: number, r: number, from: number, to: number, width: number) => {
    ctx.lineWidth = u(width);
    ctx.beginPath();
    ctx.arc(u(x), u(y), u(r), from, to);
    ctx.stroke();
  };
  const dash = (x: number, y: number, half: number, width: number) => {
    ctx.lineWidth = u(width);
    ctx.beginPath();
    ctx.moveTo(u(x - half), u(y));
    ctx.lineTo(u(x + half), u(y));
    ctx.stroke();
  };
  /** Upside-down U - the classic happy squeezed eye. */
  const happyEye = (x: number) => arc(x, eyeY + 0.03, 0.075, Math.PI, Math.PI * 2, 0.042);
  const cross = (x: number, y: number, half: number) => {
    ctx.lineWidth = u(0.04);
    ctx.beginPath();
    ctx.moveTo(u(x - half), u(y - half));
    ctx.lineTo(u(x + half), u(y + half));
    ctx.moveTo(u(x + half), u(y - half));
    ctx.lineTo(u(x - half), u(y + half));
    ctx.stroke();
  };

  switch (expression) {
    case 'content':
      dot(0.5 - eyeX, eyeY, 0.058);
      dot(0.5 + eyeX, eyeY, 0.058);
      // A short, shallow smile - the reference keeps the mouth tiny.
      arc(0.5, 0.56, 0.1, Math.PI * 0.2, Math.PI * 0.8, 0.036);
      break;

    case 'blink':
      dash(0.5 - eyeX, eyeY, 0.06, 0.042);
      dash(0.5 + eyeX, eyeY, 0.06, 0.042);
      arc(0.5, 0.56, 0.1, Math.PI * 0.2, Math.PI * 0.8, 0.036);
      break;

    case 'flying':
      dot(0.5 - eyeX, eyeY - 0.01, 0.072);
      dot(0.5 + eyeX, eyeY - 0.01, 0.072);
      // Small open "o" - caught mid-air.
      ctx.lineWidth = u(0.036);
      ctx.beginPath();
      ctx.ellipse(u(0.5), u(0.61), u(0.055), u(0.07), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'impact':
      // Eyes screwed shut, mouth mashed flat.
      arc(0.5 - eyeX, eyeY + 0.05, 0.08, Math.PI * 1.15, Math.PI * 1.85, 0.042);
      arc(0.5 + eyeX, eyeY + 0.05, 0.08, Math.PI * 1.15, Math.PI * 1.85, 0.042);
      dash(0.5, 0.6, 0.075, 0.042);
      break;

    case 'delighted':
      happyEye(0.5 - eyeX);
      happyEye(0.5 + eyeX);
      // Open, beaming smile.
      ctx.lineWidth = u(0.038);
      ctx.beginPath();
      ctx.arc(u(0.5), u(0.55), u(0.13), Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      break;

    case 'panicked':
      dot(0.5 - eyeX, eyeY - 0.02, 0.078);
      dot(0.5 + eyeX, eyeY - 0.02, 0.078);
      // Wobbly worried mouth.
      ctx.lineWidth = u(0.034);
      ctx.beginPath();
      ctx.moveTo(u(0.41), u(0.63));
      ctx.quadraticCurveTo(u(0.455), u(0.58), u(0.5), u(0.63));
      ctx.quadraticCurveTo(u(0.545), u(0.68), u(0.59), u(0.63));
      ctx.stroke();
      break;

    case 'dizzy':
      cross(0.5 - eyeX, eyeY, 0.055);
      cross(0.5 + eyeX, eyeY, 0.055);
      // Small flat grimace.
      ctx.lineWidth = u(0.034);
      ctx.beginPath();
      ctx.moveTo(u(0.43), u(0.62));
      ctx.quadraticCurveTo(u(0.5), u(0.66), u(0.57), u(0.62));
      ctx.stroke();
      break;
  }

  return canvas;
}

const textures = new Map<Expression, THREE.CanvasTexture>();
let geometry: THREE.PlaneGeometry | null = null;

function faceTexture(expression: Expression): THREE.CanvasTexture {
  let texture = textures.get(expression);
  if (!texture) {
    texture = new THREE.CanvasTexture(draw(expression));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.set(expression, texture);
  }
  return texture;
}

/**
 * Textures are shared, materials are not: each face needs its own opacity for
 * the merge fade-in, and a shared material would fade every other fruit
 * wearing the same expression along with it.
 */
function faceMaterial(expression: Expression): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: faceTexture(expression),
    transparent: true,
    // Drawn over everything rather than depth-tested: a flat plane can never
    // clear a kiwano's spikes, a dragonfruit's fins or a pineapple's bumps, so
    // depth testing would slice the face in half. FaceLayer hides faces that
    // sit behind other fruit itself instead.
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function faceGeometry(): THREE.PlaneGeometry {
  geometry ??= new THREE.PlaneGeometry(1, 1);
  return geometry;
}

/** A static face, for places the fruit already faces the viewer (held fruit, HUD icons). */
export function createFaceMesh(expression: Expression = 'content'): THREE.Mesh {
  const mesh = new THREE.Mesh(faceGeometry(), faceMaterial(expression));
  mesh.renderOrder = 4;
  return mesh;
}

/** The subset of Fruit the face layer needs - keeps this module off the physics types. */
export interface FaceSubject {
  id: number;
  radius: number;
  squash: number;
  popIn: number;
  airborne: boolean;
  lastSpeed: number;
  offSince: number;
  doomed: boolean;
  mesh: THREE.Object3D;
}

interface FaceState {
  mesh: THREE.Mesh;
  expression: Expression;
  /** Seconds a momentary expression stays up, so it cannot flicker for one frame. */
  hold: number;
  nextBlink: number;
  blinkFor: number;
  seen: boolean;
  /** 0 = visible, 1 = hidden behind another fruit; eased so faces never pop. */
  occlusion: number;
}

export class FaceLayer {
  private readonly states = new Map<number, FaceState>();
  private readonly pool: THREE.Mesh[] = [];
  private gameOver = false;
  private time = 0;

  constructor(private readonly parent: THREE.Object3D) {}

  /** Every face goes dizzy when the run ends. */
  setGameOver(over: boolean): void {
    this.gameOver = over;
  }

  update(camera: THREE.Camera, fruits: readonly FaceSubject[], dt: number): void {
    this.time += dt;
    const face = CONFIG.face;

    for (const state of this.states.values()) state.seen = false;

    _camera.setFromMatrixPosition(camera.matrixWorld);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    for (const fruit of fruits) {
      const state = this.stateFor(fruit);
      state.seen = true;

      const expression = this.pick(fruit, state, dt);
      if (expression !== state.expression) {
        state.expression = expression;
        (state.mesh.material as THREE.MeshBasicMaterial).map = faceTexture(expression);
      }

      // Sit on the near surface, facing the camera dead on.
      _toCamera.setFromMatrixPosition(camera.matrixWorld).sub(fruit.mesh.position).normalize();
      state.mesh.position
        .copy(fruit.mesh.position)
        .addScaledVector(_toCamera, fruit.radius * face.surfaceOffset);
      state.mesh.quaternion.copy(camera.quaternion);

      // Squash in billboard space: the body's squish, without the shear that
      // parenting to a rotated non-uniformly-scaled mesh would cause.
      // Small fruit get proportionally bigger faces rather than unreadable
      // specks - the usual cute-character cheat.
      const size = Math.max(face.minSize, fruit.radius * face.scale);
      state.mesh.scale.set(
        size * (1 + fruit.squash * 0.45),
        size * (1 - fruit.squash * 0.7),
        size,
      );
      // Fade in with the merge pop so a new fruit's face does not snap on.
      const material = state.mesh.material as THREE.MeshBasicMaterial;
      const hidden = this.isHidden(fruit, fruits, state.mesh.position, size) ? 1 : 0;
      state.occlusion += (hidden - state.occlusion) * Math.min(1, dt * 16);
      const fade = (fruit.doomed ? 1 : Math.min(1, fruit.popIn * 1.6)) * (1 - state.occlusion);
      if (material.opacity !== fade) material.opacity = fade;
      state.mesh.visible = fade > 0.02;
    }

    for (const [id, state] of this.states) {
      if (state.seen) continue;
      state.mesh.visible = false;
      this.pool.push(state.mesh);
      this.states.delete(id);
    }
  }

  private stateFor(fruit: FaceSubject): FaceState {
    let state = this.states.get(fruit.id);
    if (!state) {
      const mesh = this.pool.pop() ?? createFaceMesh();
      mesh.visible = true;
      this.parent.add(mesh);
      state = {
        mesh,
        expression: 'content',
        hold: 0,
        nextBlink: this.time + 1 + Math.random() * CONFIG.face.blinkEvery,
        blinkFor: 0,
        seen: true,
        occlusion: 0,
      };
      this.states.set(fruit.id, state);
    }
    return state;
  }

  /**
   * A face counts as hidden when its centre, or two or more of its corners, sit
   * behind another fruit - so a face half-covered by a neighbour disappears
   * instead of poking out over that neighbour's silhouette.
   */
  private isHidden(
    self: FaceSubject,
    fruits: readonly FaceSubject[],
    anchor: THREE.Vector3,
    size: number,
  ): boolean {
    if (this.isOccluded(self, fruits, anchor)) return true;
    const reach = size * 0.4;
    let covered = 0;
    for (const [x, y] of CORNERS) {
      _sample.copy(anchor).addScaledVector(_right, x * reach).addScaledVector(_up, y * reach);
      if (this.isOccluded(self, fruits, _sample)) covered++;
    }
    return covered >= 2;
  }

  /** True when another fruit's body sits between the camera and this point. */
  private isOccluded(
    self: FaceSubject,
    fruits: readonly FaceSubject[],
    anchor: THREE.Vector3,
  ): boolean {
    _ray.copy(anchor).sub(_camera);
    const length = _ray.length();
    _ray.multiplyScalar(1 / length);
    for (const other of fruits) {
      if (other === self) continue;
      _offset.copy(other.mesh.position).sub(_camera);
      const along = _offset.dot(_ray);
      if (along <= 0 || along >= length) continue;
      const missSq = _offset.lengthSq() - along * along;
      const reach = other.radius * 0.9;
      if (missSq < reach * reach) return true;
    }
    return false;
  }

  /** Priority ladder: the more dramatic the state, the higher it sits. */
  private pick(fruit: FaceSubject, state: FaceState, dt: number): Expression {
    const face = CONFIG.face;
    state.hold = Math.max(0, state.hold - dt);

    if (this.gameOver || fruit.doomed) return 'dizzy';
    if (fruit.offSince > 0) return 'panicked';

    // Freshly merged fruit beam for a moment.
    if (fruit.popIn < 1) {
      state.hold = face.delightedHold;
      return 'delighted';
    }
    if (fruit.squash > face.impactSquash) {
      state.hold = face.impactHold;
      return 'impact';
    }
    if (state.hold > 0 && (state.expression === 'delighted' || state.expression === 'impact')) {
      return state.expression;
    }
    if (fruit.airborne && fruit.lastSpeed > face.flyingSpeed) return 'flying';

    // Idle: blink now and then so the pile feels alive.
    if (state.blinkFor > 0) {
      state.blinkFor -= dt;
      return 'blink';
    }
    if (this.time >= state.nextBlink) {
      state.blinkFor = face.blinkFor;
      state.nextBlink = this.time + face.blinkEvery * (0.6 + Math.random() * 0.8);
      return 'blink';
    }
    return 'content';
  }

  /** Live expression tally, surfaced in the ` debug overlay while tuning. */
  debugSummary(): string {
    const counts = new Map<Expression, number>();
    for (const state of this.states.values()) {
      counts.set(state.expression, (counts.get(state.expression) ?? 0) + 1);
    }
    return [...counts].map(([expression, n]) => `${expression}:${n}`).join(' ');
  }

  clear(): void {
    for (const state of this.states.values()) {
      state.mesh.visible = false;
      this.pool.push(state.mesh);
    }
    this.states.clear();
    this.gameOver = false;
  }
}

const _toCamera = new THREE.Vector3();
const _camera = new THREE.Vector3();
const _ray = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _sample = new THREE.Vector3();
const CORNERS: Array<[number, number]> = [
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
];
