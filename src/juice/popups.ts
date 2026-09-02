import * as THREE from 'three';

interface Popup {
  element: HTMLDivElement;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 14;

/** Floating "+21" numbers, DOM-projected so they stay crisp at any resolution. */
export class ScorePopups {
  private readonly popups: Popup[] = [];
  private readonly projected = new THREE.Vector3();

  constructor(root: HTMLElement) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const element = document.createElement('div');
      element.className = 'popup';
      element.style.opacity = '0';
      root.appendChild(element);
      this.popups.push({ element, position: new THREE.Vector3(), life: 0, maxLife: 1 });
    }
  }

  spawn(position: THREE.Vector3, text: string, variant = ''): void {
    const popup = this.popups.find((p) => p.life <= 0) ?? this.popups[0];
    popup.element.textContent = text;
    popup.element.className = `popup ${variant}`.trim();
    popup.position.copy(position);
    popup.maxLife = 1.05;
    popup.life = popup.maxLife;
  }

  update(dt: number, camera: THREE.Camera, width: number, height: number): void {
    for (const popup of this.popups) {
      if (popup.life <= 0) {
        if (popup.element.style.opacity !== '0') popup.element.style.opacity = '0';
        continue;
      }
      popup.life -= dt;
      const t = 1 - popup.life / popup.maxLife;
      popup.position.y += dt * 0.9;

      this.projected.copy(popup.position).project(camera);
      // Clamp inside the viewport so popups at the plate edge stay readable.
      const x = Math.min(Math.max((this.projected.x * 0.5 + 0.5) * width, 70), width - 70);
      const y = Math.min(Math.max((-this.projected.y * 0.5 + 0.5) * height, 60), height - 60);
      const behind = this.projected.z > 1;

      popup.element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${
        0.85 + Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * 0.35
      })`;
      popup.element.style.opacity = behind ? '0' : String(Math.max(0, 1 - Math.pow(t, 2.2)));
    }
  }

  clear(): void {
    for (const popup of this.popups) {
      popup.life = 0;
      popup.element.style.opacity = '0';
    }
  }
}
