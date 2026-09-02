import * as THREE from 'three';
import { CONFIG } from '../config';
import { sfx } from '../audio/sfx';
import { haptics } from '../audio/haptics';
import { SpawnBag, Rng } from './rng';
import { bus } from './events';
import { loadNumber, saveNumber } from './storage';
import { Pile } from '../gameplay/pile';
import { Thrower } from '../gameplay/thrower';
import { TIERS } from '../gameplay/tiers';
import { ParticleSystem } from '../juice/particles';
import { ScorePopups } from '../juice/popups';
import { CameraRig } from '../render/cameraRig';
import { createScene } from '../render/scene';
import { detectQuality } from '../render/quality';
import { buildFruitPrototypes } from '../render/fruit/builders';
import { createPhysicsWorld, initRapier, type PhysicsWorld } from '../physics/world';
import { InputController } from '../platform/input';
import { poki } from '../platform/poki';
import { Hud } from '../ui/hud';
import { DevPanel } from '../dev/panel';

type State = 'title' | 'playing' | 'over';

export class Game {
  private readonly quality = detectQuality();
  private readonly kit;
  private readonly rig: CameraRig;
  private readonly hud: Hud;
  private readonly particles: ParticleSystem;
  private readonly popups: ScorePopups;
  private readonly input: InputController;
  private physics!: PhysicsWorld;
  private pile!: Pile;
  private thrower!: Thrower;

  private state: State = 'title';
  private accumulator = 0;
  private hitstop = 0;
  private lastTime = 0;
  private frames = 0;
  private fps = 0;
  private fpsTimer = 0;

  private score = 0;
  private best = loadNumber('best', 0);
  private throws = 0;
  private queue: number[] = [];
  private bag!: SpawnBag;
  private throwDirty = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.kit = createScene(canvas, this.quality);
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.particles = new ParticleSystem(this.kit.effectLayer, this.quality.particleBudget);

    this.hud = new Hud(uiRoot, {
      onRotate: (direction) => this.input.setButtonOrbit(direction),
      onStart: () => this.startRun(),
      onRestart: () => void this.restart(),
      onToggleMute: (muted) => sfx.setMuted(muted),
      onToggleHaptics: (enabled) => haptics.setEnabled(enabled),
    });
    this.popups = new ScorePopups(this.hud.popupLayer);
    this.input = new InputController(canvas, this.rig);

    this.hud.setBest(this.best);
    this.hud.setStrikes(CONFIG.fail.strikes);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onResize();
  }

  async load(): Promise<void> {
    await initRapier();
    buildFruitPrototypes();
    this.physics = createPhysicsWorld();
    this.pile = new Pile(this.physics, this.kit.fruitLayer);
    this.thrower = new Thrower(this.kit.scene, this.physics, this.rig);
    new DevPanel(this.rig, this.thrower);
    this.thrower.setResolution(window.innerWidth, window.innerHeight);

    this.wireEvents();
    this.input.canThrow = () => this.state === 'playing' && this.thrower.cooldown <= 0;
    this.input.onThrow = (charge, yaw) => this.throwFruit(charge, yaw);
    this.input.onFirstInput = () => sfx.unlock();

    this.prepareQueue();
    this.thrower.setVisible(false);

    await poki.init();
    poki.loadingFinished();
    this.hud.setLoaded();
    this.hud.showTitle(true);

    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------- run flow

  private prepareQueue(): void {
    const rng = new Rng(Date.now() & 0xffffffff);
    this.bag = new SpawnBag(CONFIG.run.spawnTiers, CONFIG.run.spawnWeights, rng);
    this.queue = [this.bag.take(), this.bag.take()];
    this.thrower.setTier(this.queue[0]);
    this.hud.setNext(this.queue[1]);
  }

  private startRun(): void {
    sfx.unlock();
    this.hud.showTitle(false);
    this.hud.hideGameOver();
    this.state = 'playing';
    this.thrower.setVisible(true);
    poki.gameplayStart();
  }

  private async restart(): Promise<void> {
    sfx.uiClick();
    this.hud.hideGameOver();
    // A natural break in play: this is where the interstitial belongs.
    await poki.commercialBreak();

    this.pile.clear();
    this.particles.clear();
    this.popups.clear();
    this.score = 0;
    this.throws = 0;
    this.hud.setScore(0);
    this.hud.setStrikes(CONFIG.fail.strikes);
    this.hud.resetTray();
    this.prepareQueue();
    this.startRun();
  }

  private endRun(): void {
    if (this.state !== 'playing') return;
    this.state = 'over';
    this.thrower.setVisible(false);
    poki.gameplayStop();
    sfx.gameOver();
    haptics.gameOver();

    const isNewBest = this.score > this.best;
    if (isNewBest) {
      this.best = this.score;
      saveNumber('best', this.best);
      this.hud.setBest(this.best);
    }
    const payload = {
      score: this.score,
      best: this.best,
      isNewBest,
      biggestTier: this.pile.biggestTier,
      throws: this.throws,
    };
    bus.emit('gameover', payload);
    window.setTimeout(() => this.hud.showGameOver(payload), 900);
  }

  private throwFruit(charge: number, yaw: number): void {
    if (this.state !== 'playing' || this.thrower.cooldown > 0) return;

    const solution = this.thrower.solve(charge, yaw);
    const tier = this.queue.shift()!;
    this.queue.push(this.bag.take());
    this.pile.spawn(tier, solution.origin.clone(), solution.velocity.clone(), { ccd: true });

    this.thrower.cooldown = CONFIG.throw.cooldown;
    this.thrower.setTier(this.queue[0]);
    this.hud.setNext(this.queue[1]);
    this.hud.hideHint();
    this.throws++;
    this.throwDirty = false;
    sfx.throwFruit(charge);
    haptics.throwFruit(charge);
    bus.emit('throw', { tier, charge });
  }

  // -------------------------------------------------------------- events

  private wireEvents(): void {
    bus.on('merge', (event) => {
      const tier = TIERS[event.tier];
      this.addScore(event.score, event.position);
      this.hud.setChain(event.chainStep);
      sfx.merge(event.tier, event.chainStep);
      haptics.merge(event.chainStep);

      this.particles.burst(event.position, tier.color, event.isFinal ? 40 : 10 + event.tier * 2, 2 + event.tier * 0.4);
      this.particles.burst(event.position, tier.accent, 6 + event.tier, 1.6 + event.tier * 0.3);
      this.particles.ring(event.position, tier.accent, 0.6 + tier.radius * 3);
      this.rig.addShake(0.05 + event.tier * 0.035 + (event.isFinal ? 0.5 : 0));

      if (event.tier >= CONFIG.juice.hitstopFromTier || event.isFinal) {
        this.hitstop = Math.max(this.hitstop, CONFIG.juice.hitstopMs / 1000);
      }
      if (event.isFinal) {
        sfx.celebrate();
        haptics.celebrate();
      }
    });

    bus.on('newTier', (event) => {
      this.hud.markDiscovered(event.tier);
      if (event.tier >= 5) {
        sfx.celebrate();
        haptics.celebrate();
      }
    });

    bus.on('land', (event) => {
      sfx.land(event.tier, event.impact);
      haptics.land(event.impact);
      if (event.impact > 0.25) {
        this.particles.burst(event.position, 0xfff0d0, Math.round(2 + event.impact * 5), 1.2);
        this.rig.addShake(event.impact * 0.06);
      }
    });

    bus.on('fall', (event) => {
      sfx.fall();
      sfx.strike(event.strikesLeft);
      haptics.strike();
      this.hud.setStrikes(event.strikesLeft);
      this.hud.flashStrike();
      this.popups.spawn(event.position, 'DROPPED!', 'bad');
      this.rig.addShake(0.35);
      this.particles.burst(event.position, 0xff8b6b, 12, 2.4);
      if (event.strikesLeft <= 0) this.endRun();
    });
  }

  private addScore(amount: number, position?: THREE.Vector3): void {
    this.score += amount;
    this.hud.setScore(this.score);
    if (position) this.popups.spawn(position, `+${amount}`, amount >= 60 ? 'big' : '');
    bus.emit('score', { total: this.score, delta: amount, position });
  }

  // ---------------------------------------------------------------- loop

  private frame = (now: number): void => {
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    requestAnimationFrame(this.frame);

    this.input.update(rawDt);
    this.rig.update(rawDt);

    let dt = rawDt;
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      dt = 0;
    }

    if (this.pile) {
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= CONFIG.physics.fixedStep && steps < CONFIG.physics.maxStepsPerFrame) {
        this.pile.step(CONFIG.physics.fixedStep);
        this.accumulator -= CONFIG.physics.fixedStep;
        steps++;
      }
      if (steps === CONFIG.physics.maxStepsPerFrame) this.accumulator = 0;
      this.pile.sync(this.accumulator / CONFIG.physics.fixedStep, rawDt);
    }

    const aim = this.input.aim;
    this.thrower?.update(
      rawDt,
      this.state === 'playing' && aim.active && !aim.cancelled,
      aim.charge,
      aim.yaw,
    );
    if (aim.active && aim.charge > 0.02 && !this.throwDirty) {
      this.throwDirty = true;
      sfx.charge(aim.charge);
    }

    this.particles.update(rawDt);
    this.popups.update(rawDt, this.rig.camera, window.innerWidth, window.innerHeight);
    this.hud.update(rawDt);

    this.kit.renderer.render(this.kit.scene, this.rig.camera);
    this.updateDebug(rawDt);
  };

  private updateDebug(dt: number): void {
    this.frames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsTimer);
      this.frames = 0;
      this.fpsTimer = 0;
    }
    this.hud.setDebug(
      `fps ${this.fps}\nfruits ${this.pile?.count ?? 0}\nstate ${this.state}\ndraws ${this.kit.renderer.info.render.calls}`,
    );
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.kit.renderer.setSize(width, height, false);
    this.kit.renderer.setPixelRatio(this.quality.pixelRatio);
    this.rig.setAspect(width / height);
    this.thrower?.setResolution(width, height);
  };

  private onVisibility = (): void => {
    if (document.hidden && this.state === 'playing') poki.gameplayStop();
    else if (!document.hidden && this.state === 'playing') poki.gameplayStart();
    this.lastTime = performance.now();
  };
}
