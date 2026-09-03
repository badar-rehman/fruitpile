import { CONFIG } from '../config';
import { TIERS } from '../gameplay/tiers';
import { haptics } from '../audio/haptics';

export interface HudCallbacks {
  onRotate: (direction: number) => void;
  onStart: () => void;
  onRestart: () => void;
  onToggleMute: (muted: boolean) => void;
  onToggleHaptics: (enabled: boolean) => void;
}

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

/** All DOM chrome: HUD readouts, title card, game-over card, debug overlay. */
export class Hud {
  readonly popupLayer: HTMLDivElement;
  private readonly scoreValue: HTMLDivElement;
  private readonly bestValue: HTMLDivElement;
  private readonly chainLabel: HTMLDivElement;
  private readonly strikeRow: HTMLDivElement;
  private readonly trayDots: HTMLDivElement[] = [];
  private readonly nextSwatch: HTMLDivElement;
  private readonly nextName: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly titleScreen: HTMLDivElement;
  private readonly overScreen: HTMLDivElement;
  private readonly overBody: HTMLDivElement;
  private readonly debugBox: HTMLDivElement;
  private readonly loading: HTMLDivElement;
  private chainTimer = 0;
  private muted = false;

  constructor(root: HTMLElement, private readonly callbacks: HudCallbacks) {
    root.innerHTML = '';

    const top = el('div', 'hud-top');
    const scoreCard = el('div', 'panel');
    scoreCard.append(el('div', 'score-label', 'Score'));
    this.scoreValue = el('div', 'score-value', '0');
    scoreCard.append(this.scoreValue);
    this.strikeRow = el('div', 'strikes');
    scoreCard.append(this.strikeRow);

    const bestCard = el('div', 'panel');
    bestCard.append(el('div', 'best-label', 'Best'));
    this.bestValue = el('div', 'best-value', '0');
    bestCard.append(this.bestValue);
    top.append(scoreCard, bestCard);

    this.chainLabel = el('div', 'chain');

    const tray = el('div', 'tray panel');
    TIERS.forEach((tier) => {
      const dot = el('div', 'tray-dot');
      const size = 8 + tier.index * 1.9;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = hex(tier.color);
      dot.title = tier.name;
      tray.append(dot);
      this.trayDots.push(dot);
    });

    const next = el('div', 'next panel');
    this.nextSwatch = el('div', 'next-swatch');
    const nextText = el('div');
    nextText.append(el('div', 'next-text', 'Next'));
    this.nextName = el('div', 'next-text next-name', '-');
    nextText.append(this.nextName);
    next.append(this.nextSwatch, nextText);

    const left = el('button', 'rotate left', '◀');
    const right = el('button', 'rotate right', '▶');
    bindHold(left, () => this.callbacks.onRotate(-1), () => this.callbacks.onRotate(0));
    bindHold(right, () => this.callbacks.onRotate(1), () => this.callbacks.onRotate(0));

    // Wordless tutorial: an animated hand pantomimes press-drag-release, on
    // loop, above the held fruit. No text so it reads the same in any locale.
    this.hint = el('div', 'hint');
    this.hint.append(
      el('div', 'hint-trail'),
      el('div', 'hint-release'),
      el('div', 'hint-hand', '\u{1F446}'),
    );

    const mute = el('button', 'mute', '\u{1F50A}');
    mute.addEventListener('click', () => {
      this.muted = !this.muted;
      mute.textContent = this.muted ? '\u{1F507}' : '\u{1F50A}';
      this.callbacks.onToggleMute(this.muted);
    });

    // Only shown on devices where vibration can actually do anything.
    let hapticsButton: HTMLButtonElement | null = null;
    if (haptics.supported) {
      hapticsButton = el('button', 'haptics', '\u{1F4F3}');
      let hapticsOn = true;
      hapticsButton.addEventListener('click', () => {
        hapticsOn = !hapticsOn;
        hapticsButton!.textContent = hapticsOn ? '\u{1F4F3}' : '\u{1F4F4}';
        hapticsButton!.classList.toggle('off', !hapticsOn);
        this.callbacks.onToggleHaptics(hapticsOn);
      });
    }

    this.debugBox = el('div', 'debug');
    this.popupLayer = el('div', 'popup-layer');

    this.titleScreen = this.buildTitle();
    this.overScreen = el('div', 'screen hidden');
    this.overBody = el('div', 'card');
    this.overScreen.append(this.overBody);

    this.loading = el('div', 'loading', 'Slicing fruit…');

    root.append(
      top,
      this.chainLabel,
      tray,
      next,
      left,
      right,
      this.hint,
      mute,
      ...(hapticsButton ? [hapticsButton] : []),
      this.debugBox,
      this.popupLayer,
      this.titleScreen,
      this.overScreen,
      this.loading,
    );

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Backquote') this.debugBox.classList.toggle('show');
    });
  }

  private buildTitle(): HTMLDivElement {
    const screen = el('div', 'screen');
    const card = el('div', 'card');
    card.append(el('h1', '', 'Fruit Mountain'));
    card.append(el('p', '', 'Toss fruit onto the plate. Matching fruit merges into something bigger.'));
    card.append(el('p', '', 'Nothing may roll off — three drops and the run is over.'));
    const button = el('button', 'btn', 'Play');
    button.addEventListener('click', () => this.callbacks.onStart());
    card.append(button);
    screen.append(card);
    return screen;
  }

  setLoaded(): void {
    this.loading.classList.add('hidden');
    window.setTimeout(() => this.loading.remove(), 500);
  }

  showTitle(show: boolean): void {
    this.titleScreen.classList.toggle('hidden', !show);
  }

  setScore(value: number): void {
    this.scoreValue.textContent = String(value);
    this.scoreValue.classList.remove('bump');
    void this.scoreValue.offsetWidth;
    this.scoreValue.classList.add('bump');
  }

  setBest(value: number): void {
    this.bestValue.textContent = String(value);
  }

  setStrikes(left: number): void {
    this.strikeRow.innerHTML = '';
    for (let i = 0; i < CONFIG.fail.strikes; i++) {
      const pip = el('div', `strike-pip${i < left ? '' : ' spent'}`);
      this.strikeRow.append(pip);
    }
  }

  flashStrike(): void {
    this.strikeRow.classList.remove('shake');
    void this.strikeRow.offsetWidth;
    this.strikeRow.classList.add('shake');
  }

  setChain(step: number): void {
    if (step >= 2) {
      this.chainLabel.textContent = `CHAIN ×${step}`;
      this.chainLabel.classList.remove('show');
      void this.chainLabel.offsetWidth;
      this.chainLabel.classList.add('show');
      this.chainTimer = 1.1;
    }
  }

  setNext(tier: number): void {
    const data = TIERS[tier];
    this.nextSwatch.style.background = hex(data.color);
    this.nextName.textContent = data.name;
  }

  markDiscovered(tier: number): void {
    const dot = this.trayDots[tier];
    if (!dot) return;
    dot.classList.add('found', 'pulse');
    window.setTimeout(() => dot.classList.remove('pulse'), 260);
  }

  resetTray(): void {
    for (const dot of this.trayDots) dot.classList.remove('found', 'pulse');
  }

  hideHint(): void {
    this.hint.classList.add('hidden');
  }

  showGameOver(data: { score: number; best: number; isNewBest: boolean; biggestTier: number; throws: number }): void {
    this.overBody.innerHTML = '';
    this.overBody.append(el('h2', '', data.isNewBest ? 'New best!' : 'Plate cleared out'));
    this.overBody.append(el('div', 'big-score', String(data.score)));
    this.overBody.append(el('div', 'sub', 'points'));
    this.overBody.append(
      el('p', '', `Biggest fruit: ${TIERS[data.biggestTier].name} • ${data.throws} throws`),
    );
    if (data.isNewBest) this.overBody.append(el('div', 'badge', `Best ${data.best}`));
    else this.overBody.append(el('p', '', `Best: ${data.best}`));
    const button = el('button', 'btn', 'Play again');
    button.addEventListener('click', () => this.callbacks.onRestart());
    this.overBody.append(button);
    this.overScreen.classList.remove('hidden');
  }

  hideGameOver(): void {
    this.overScreen.classList.add('hidden');
  }

  setDebug(text: string): void {
    if (this.debugBox.classList.contains('show')) this.debugBox.textContent = text;
  }

  update(dt: number): void {
    if (this.chainTimer > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) this.chainLabel.classList.remove('show');
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function bindHold(button: HTMLElement, start: () => void, end: () => void): void {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    start();
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    button.addEventListener(type, (event) => {
      event.stopPropagation();
      end();
    });
  }
}
