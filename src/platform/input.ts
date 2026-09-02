import { CONFIG } from '../config';
import { clamp } from '../core/math';
import type { CameraRig } from '../render/cameraRig';

export interface AimState {
  active: boolean;
  charge: number; // 0..1
  yaw: number; // -1..1
  cancelled: boolean;
}

interface Pointer {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  role: 'aim' | 'orbit';
}

/**
 * One scheme for both platforms:
 *   throw  - left mouse drag / one finger drag (pull down to charge)
 *   orbit  - right mouse drag, A/D, arrows, two-finger drag, or the HUD buttons
 *   zoom   - wheel / pinch
 */
export class InputController {
  readonly aim: AimState = { active: false, charge: 0, yaw: 0, cancelled: false };
  onThrow: ((charge: number, yaw: number) => void) | null = null;
  onFirstInput: (() => void) | null = null;
  canThrow: () => boolean = () => true;
  enabled = true;

  private pointers = new Map<number, Pointer>();
  private keys = new Set<string>();
  private buttonOrbit = 0;
  private pinchDistance = 0;
  private hadInput = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly rig: CameraRig,
  ) {
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** Held on-screen rotate buttons: -1 left, 0 none, 1 right. */
  setButtonOrbit(direction: number): void {
    this.buttonOrbit = direction;
  }

  update(dt: number): void {
    let orbit = this.buttonOrbit;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) orbit -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) orbit += 1;
    if (orbit !== 0) this.rig.orbit(orbit * CONFIG.camera.keyOrbitSpeed * dt);
  }

  cancelAim(): void {
    this.aim.active = false;
    this.aim.charge = 0;
    this.aim.yaw = 0;
    this.aim.cancelled = false;
    for (const pointer of this.pointers.values()) {
      if (pointer.role === 'aim') pointer.role = 'orbit';
    }
  }

  private markInput(): void {
    if (this.hadInput) return;
    this.hadInput = true;
    this.onFirstInput?.();
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.markInput();
    (this.element as HTMLElement).setPointerCapture?.(event.pointerId);

    const wantsOrbit = event.button === 2 || event.button === 1 || this.pointers.size > 0;
    const role: Pointer['role'] = wantsOrbit || !this.canThrow() ? 'orbit' : 'aim';

    if (role === 'orbit' && this.aim.active) this.cancelAim();

    this.pointers.set(event.pointerId, {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      role,
    });

    if (role === 'aim') {
      this.aim.active = true;
      this.aim.charge = 0;
      this.aim.yaw = 0;
      this.aim.cancelled = false;
    }

    if (this.pointers.size === 2) {
      this.pinchDistance = this.currentPinchDistance();
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    const prevX = pointer.x;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (this.pointers.size >= 2) {
      const distance = this.currentPinchDistance();
      if (this.pinchDistance > 0) this.rig.zoom((this.pinchDistance - distance) * 0.01);
      this.pinchDistance = distance;
      const [first] = [...this.pointers.values()];
      if (pointer === first) this.orbitFromDrag(pointer.x - prevX);
      return;
    }

    if (pointer.role === 'orbit') {
      this.orbitFromDrag(pointer.x - prevX);
      return;
    }

    const short = Math.min(window.innerWidth, window.innerHeight);
    const dy = pointer.y - pointer.startY;
    const dx = pointer.x - pointer.startX;

    // Dragging well above the press point aborts the throw.
    this.aim.cancelled = dy < -short * 0.16;
    this.aim.charge = clamp(dy / (short * CONFIG.throw.chargeDragFraction), 0, 1);
    this.aim.yaw = clamp(dx / (window.innerWidth * CONFIG.throw.yawDragFraction), -1, 1);
    event.preventDefault();
  };

  private onPointerUp = (event: PointerEvent): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;

    if (pointer.role !== 'aim' || !this.aim.active) return;
    const { charge, yaw, cancelled } = this.aim;
    this.aim.active = false;
    this.aim.charge = 0;
    this.aim.yaw = 0;
    if (!cancelled && this.enabled && charge > 0.03) this.onThrow?.(charge, yaw);
    this.aim.cancelled = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.rig.zoom(Math.sign(event.deltaY) * 0.35);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (event.code === 'Escape' && this.aim.active) this.cancelAim();
    this.markInput();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private orbitFromDrag(deltaX: number): void {
    this.rig.orbit((-deltaX / (window.innerWidth * CONFIG.camera.orbitDragFraction)) * Math.PI * 2);
  }

  private currentPinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
