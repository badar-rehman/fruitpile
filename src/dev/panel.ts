import GUI from 'lil-gui';
import { CONFIG } from '../config';
import { TIERS } from '../gameplay/tiers';
import type { CameraRig } from '../render/cameraRig';
import type { Thrower } from '../gameplay/thrower';
import { saveOverrides, resetOverrides, exportChangedJSON } from './overrides';

interface NumOpts {
  label?: string;
  reload?: boolean;
  onChange?: () => void;
}

/**
 * Hidden-by-default lil-gui panel exposing every CONFIG/TIERS value plus the
 * thrower's trajectory/landing-ring visuals. Opened with the toggle button
 * fixed to the bottom-right corner — ships in the production build.
 */
export class DevPanel {
  private readonly gui: GUI;
  private visible = false;
  private readonly reloadBanner: HTMLDivElement;
  private readonly exportOverlay: HTMLDivElement;
  private readonly exportTextarea: HTMLTextAreaElement;

  constructor(
    private readonly rig: CameraRig,
    private readonly thrower: Thrower,
  ) {
    this.gui = new GUI({ title: 'Dev Panel', width: 340 });
    this.gui.hide();

    this.buildPhysics();
    this.buildPlate();
    this.buildThrow();
    this.buildLaunchPosition();
    this.buildCamera();
    this.buildMerge();
    this.buildFail();
    this.buildScoring();
    this.buildLanding();
    this.buildJuice();
    this.buildRun();
    this.buildTrajectory();
    this.buildLandingRing();
    this.buildFruitTiers();
    this.buildActions();

    this.reloadBanner = this.buildReloadBanner();
    this.exportOverlay = this.buildExportOverlay();
    this.exportTextarea = this.exportOverlay.querySelector('textarea') as HTMLTextAreaElement;
    this.buildToggleButton();
  }

  // ------------------------------------------------------------- helpers

  private num<T extends object>(
    folder: GUI,
    obj: T,
    key: keyof T & string,
    min: number,
    max: number,
    step: number,
    opts: NumOpts = {},
  ): void {
    folder
      .add(obj, key, min, max, step)
      .name(opts.label ?? key)
      .onChange(() => {
        opts.onChange?.();
        if (opts.reload) this.markNeedsReload();
        saveOverrides();
      });
  }

  private color<T extends object>(folder: GUI, obj: T, key: keyof T & string, label?: string): void {
    folder
      .addColor(obj, key)
      .name(label ?? key)
      .onChange(() => saveOverrides());
  }

  private markNeedsReload(): void {
    this.reloadBanner.style.display = 'flex';
  }

  // ------------------------------------------------------------- folders

  private buildPhysics(): void {
    const f = this.gui.addFolder('Physics');
    this.num(f, CONFIG.physics, 'gravity', -40, -2, 0.5, { reload: true });
    this.num(f, CONFIG.physics, 'fixedStep', 0.005, 0.05, 0.001, { reload: true });
    this.num(f, CONFIG.physics, 'maxStepsPerFrame', 1, 10, 1);
    this.num(f, CONFIG.physics, 'solverIterations', 1, 20, 1, { reload: true });
    this.num(f, CONFIG.physics, 'friction', 0, 2, 0.01);
    this.num(f, CONFIG.physics, 'restitution', 0, 1, 0.01);
    this.num(f, CONFIG.physics, 'linearDamping', 0, 2, 0.01);
    this.num(f, CONFIG.physics, 'angularDamping', 0, 2, 0.01);
  }

  private buildPlate(): void {
    const f = this.gui.addFolder('Plate');
    this.num(f, CONFIG.plate, 'radius', 0.5, 3, 0.01, { reload: true });
    this.num(f, CONFIG.plate, 'lip', 0, 1, 0.01, { reload: true });
    this.num(f, CONFIG.plate, 'surfaceY', -1, 1, 0.01, {
      label: 'surfaceY (trajectory calc only)',
    });
    this.num(f, CONFIG.plate, 'tableY', -3, 0, 0.01, { reload: true });
  }

  private buildThrow(): void {
    const f = this.gui.addFolder('Throw');
    this.num(f, CONFIG.throw, 'pitchDeg', 10, 85, 1);
    this.num(f, CONFIG.throw, 'landNear', -5, 0, 0.05);
    this.num(f, CONFIG.throw, 'landFar', 0, 6, 0.05);
    this.num(f, CONFIG.throw, 'yawRangeDeg', 0, 60, 1);
    this.num(f, CONFIG.throw, 'chargeDragFraction', 0.05, 1, 0.01);
    this.num(f, CONFIG.throw, 'yawDragFraction', 0.05, 1, 0.01);
    this.num(f, CONFIG.throw, 'cooldown', 0, 1, 0.01);
  }

  private buildLaunchPosition(): void {
    const f = this.gui.addFolder('Launch Position');
    this.num(f, CONFIG.throw, 'cameraGap', 0.5, 4, 0.01);
    this.num(f, CONFIG.throw, 'minOriginDistance', 1, 6, 0.01);
    this.num(f, CONFIG.throw, 'originHeight', 0, 3, 0.01);
  }

  private buildCamera(): void {
    const f = this.gui.addFolder('Camera');
    const pushTarget = () =>
      this.rig.setTarget(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);
    this.num(f, CONFIG.camera.target, 'x', -3, 3, 0.01, { label: 'target.x', onChange: pushTarget });
    this.num(f, CONFIG.camera.target, 'y', -2, 3, 0.01, { label: 'target.y', onChange: pushTarget });
    this.num(f, CONFIG.camera.target, 'z', -3, 3, 0.01, { label: 'target.z', onChange: pushTarget });
    this.num(f, CONFIG.camera, 'radius', 1, 15, 0.05, {
      onChange: () => this.rig.setRadius(CONFIG.camera.radius),
    });
    this.num(f, CONFIG.camera, 'minRadius', 1, 15, 0.05);
    this.num(f, CONFIG.camera, 'maxRadius', 1, 15, 0.05);
    this.num(f, CONFIG.camera, 'height', 0, 8, 0.05);
    this.num(f, CONFIG.camera, 'fov', 20, 100, 1, {
      onChange: () => this.rig.setAspect(window.innerWidth / window.innerHeight),
    });
    this.num(f, CONFIG.camera, 'orbitDragFraction', 0.1, 3, 0.01);
    this.num(f, CONFIG.camera, 'keyOrbitSpeed', 0.1, 6, 0.05);
    this.num(f, CONFIG.camera, 'smoothing', 1, 30, 0.5);
  }

  private buildMerge(): void {
    const f = this.gui.addFolder('Merge');
    this.num(f, CONFIG.merge, 'contactSlack', 0.9, 1.5, 0.01);
    this.num(f, CONFIG.merge, 'maxPerStep', 1, 30, 1);
    this.num(f, CONFIG.merge, 'chainWindow', 0, 3, 0.01);
    this.num(f, CONFIG.merge, 'popImpulse', 0, 4, 0.05);
  }

  private buildFail(): void {
    const f = this.gui.addFolder('Fail');
    this.num(f, CONFIG.fail, 'fallY', -2, 0, 0.01);
    this.num(f, CONFIG.fail, 'graceSeconds', 0, 2, 0.01);
    this.num(f, CONFIG.fail, 'strikes', 1, 10, 1, { label: 'strikes (applies next run)' });
  }

  private buildScoring(): void {
    const f = this.gui.addFolder('Scoring');
    this.num(f, CONFIG.scoring, 'chainBonusPerStep', 0, 3, 0.01);
    this.num(f, CONFIG.scoring, 'doubleWatermelon', 0, 1000, 10);
  }

  private buildLanding(): void {
    const f = this.gui.addFolder('Landing');
    this.num(f, CONFIG.landing, 'horizontalKeep', 0, 1, 0.01);
    this.num(f, CONFIG.landing, 'spinKeep', 0, 1, 0.01);
  }

  private buildJuice(): void {
    const f = this.gui.addFolder('Juice');
    this.num(f, CONFIG.juice, 'landSquash', 0, 1, 0.01);
    this.num(f, CONFIG.juice, 'squashStiffness', 0, 300, 1);
    this.num(f, CONFIG.juice, 'squashDamping', 0, 50, 0.5);
    this.num(f, CONFIG.juice, 'shakeDecay', 0, 20, 0.1);
    this.num(f, CONFIG.juice, 'hitstopFromTier', 0, 10, 1);
    this.num(f, CONFIG.juice, 'hitstopMs', 0, 300, 1);
  }

  private buildRun(): void {
    const f = this.gui.addFolder('Run');
    const proxy = {
      get spawnTiersJSON(): string {
        return JSON.stringify(CONFIG.run.spawnTiers);
      },
      set spawnTiersJSON(value: string) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) CONFIG.run.spawnTiers = parsed;
        } catch {
          // ignore invalid JSON while typing
        }
      },
      get spawnWeightsJSON(): string {
        return JSON.stringify(CONFIG.run.spawnWeights);
      },
      set spawnWeightsJSON(value: string) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) CONFIG.run.spawnWeights = parsed;
        } catch {
          // ignore invalid JSON while typing
        }
      },
    };
    f.add(proxy, 'spawnTiersJSON')
      .name('spawnTiers (applies next run)')
      .onFinishChange(() => saveOverrides());
    f.add(proxy, 'spawnWeightsJSON')
      .name('spawnWeights (applies next run)')
      .onFinishChange(() => saveOverrides());
  }

  private buildTrajectory(): void {
    const f = this.gui.addFolder('Trajectory Line');
    this.color(f, CONFIG.trajectory, 'color');
    this.num(f, CONFIG.trajectory, 'opacity', 0, 1, 0.01);
    this.num(f, CONFIG.trajectory, 'thicknessPx', 0.5, 10, 0.1);
  }

  private buildLandingRing(): void {
    const f = this.gui.addFolder('Landing Ring');
    const applyRing = () => {
      if (CONFIG.landingRing.outerRadius <= CONFIG.landingRing.innerRadius) {
        CONFIG.landingRing.outerRadius = CONFIG.landingRing.innerRadius + 0.01;
      }
      this.thrower.applyRingConfig();
    };
    this.num(f, CONFIG.landingRing, 'innerRadius', 0.05, 1, 0.005, { onChange: applyRing });
    this.num(f, CONFIG.landingRing, 'outerRadius', 0.06, 1.2, 0.005, { onChange: applyRing });
    this.num(f, CONFIG.landingRing, 'opacity', 0, 1, 0.01);
    this.color(f, CONFIG.landingRing, 'safeColor');
    this.color(f, CONFIG.landingRing, 'riskyColor');
  }

  private buildFruitTiers(): void {
    const root = this.gui.addFolder('Fruit Tiers');
    root
      .add({ note: 'Only affects fruit spawned after the change' }, 'note')
      .name('Note')
      .disable();
    for (const tier of TIERS) {
      const f = root.addFolder(tier.name);
      this.num(f, tier, 'radius', 0.05, 1.2, 0.005);
      this.num(f, tier, 'award', 0, 200, 1);
      this.color(f, tier, 'color');
      this.color(f, tier, 'accent');
    }
  }

  private buildActions(): void {
    this.gui
      .add({ reset: () => this.resetToDefaults() }, 'reset')
      .name('Reset to Defaults');
    this.gui
      .add({ copy: () => this.showExport() }, 'copy')
      .name('Copy Changed Parameters');
  }

  private resetToDefaults(): void {
    resetOverrides();
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
    this.thrower.applyRingConfig();
    this.rig.setRadius(CONFIG.camera.radius);
    this.rig.setTarget(CONFIG.camera.target.x, CONFIG.camera.target.y, CONFIG.camera.target.z);
    this.rig.setAspect(window.innerWidth / window.innerHeight);
    this.reloadBanner.style.display = 'none';
  }

  // --------------------------------------------------------- extra chrome

  private buildReloadBanner(): HTMLDivElement {
    const banner = document.createElement('div');
    Object.assign(banner.style, {
      position: 'fixed',
      left: '50%',
      top: '12px',
      transform: 'translateX(-50%)',
      zIndex: '10001',
      display: 'none',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      borderRadius: '8px',
      background: 'rgba(20,20,20,0.85)',
      color: '#fff',
      font: '12px ui-monospace, monospace',
    } as CSSStyleDeclaration);
    const label = document.createElement('span');
    label.textContent = 'Some changes need a reload to apply';
    const button = document.createElement('button');
    button.textContent = 'Reload now';
    Object.assign(button.style, {
      padding: '4px 8px',
      borderRadius: '6px',
      border: 'none',
      background: '#ff8b4a',
      color: '#fff',
      cursor: 'pointer',
      font: '12px ui-monospace, monospace',
    } as CSSStyleDeclaration);
    button.addEventListener('click', () => {
      saveOverrides();
      window.location.reload();
    });
    banner.append(label, button);
    document.body.append(banner);
    return banner;
  }

  private buildExportOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10002',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    } as CSSStyleDeclaration);

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: '#1a1a1a',
      color: '#fff',
      padding: '16px',
      borderRadius: '10px',
      width: 'min(560px, 90vw)',
      font: '12px ui-monospace, monospace',
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = 'Changed parameters (Ctrl+C to copy)';
    title.style.marginBottom = '8px';

    const textarea = document.createElement('textarea');
    Object.assign(textarea.style, {
      width: '100%',
      height: '260px',
      background: '#0d0d0d',
      color: '#b8ffcf',
      border: '1px solid #333',
      borderRadius: '6px',
      padding: '8px',
      boxSizing: 'border-box',
      font: '12px ui-monospace, monospace',
      resize: 'vertical',
      userSelect: 'text',
      webkitUserSelect: 'text',
    } as CSSStyleDeclaration);
    textarea.readOnly = true;

    const close = document.createElement('button');
    close.textContent = 'Close';
    Object.assign(close.style, {
      marginTop: '10px',
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      background: '#ff8b4a',
      color: '#fff',
      cursor: 'pointer',
      font: '12px ui-monospace, monospace',
    } as CSSStyleDeclaration);
    close.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    card.append(title, textarea, close);
    overlay.append(card);
    document.body.append(overlay);
    return overlay;
  }

  private showExport(): void {
    const json = exportChangedJSON();
    const empty = json === '{}';
    this.exportTextarea.value = empty ? 'Nothing has changed from defaults yet.' : json;
    this.exportOverlay.style.display = 'flex';
    this.exportTextarea.focus();
    this.exportTextarea.select();
    if (!empty) {
      navigator.clipboard?.writeText(json).catch(() => {
        // Restricted (e.g. itch.io iframe) — the visible, pre-selected textarea is the fallback.
      });
    }
  }

  private buildToggleButton(): void {
    const button = document.createElement('button');
    button.textContent = '⚙ Dev';
    Object.assign(button.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      zIndex: '10000',
      padding: '6px 10px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(20,20,20,0.75)',
      color: '#fff',
      font: '12px ui-monospace, monospace',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    button.addEventListener('click', () => {
      this.visible = !this.visible;
      this.gui.show(this.visible);
    });
    document.body.append(button);
  }
}
