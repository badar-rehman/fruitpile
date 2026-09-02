import { clamp01 } from '../core/math';

/**
 * Every sound is synthesised at runtime - no audio files, no download cost.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** Browsers only allow audio after a gesture; call from the first input. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 0.6);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  private tone(options: {
    type: OscillatorType;
    from: number;
    to?: number;
    duration: number;
    gain?: number;
    delay?: number;
  }): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;

    const start = ctx.currentTime + (options.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = options.type;
    osc.frequency.setValueAtTime(options.from, start);
    if (options.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + options.duration);
    }
    const peak = options.gain ?? 0.3;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + options.duration + 0.05);
  }

  private noise(options: { duration: number; frequency: number; q?: number; gain?: number; sweepTo?: number }): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer || this.muted) return;

    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(options.frequency, start);
    if (options.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(options.sweepTo, start + options.duration);
    }
    filter.Q.value = options.q ?? 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(options.gain ?? 0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + options.duration + 0.05);
  }

  throwFruit(charge: number): void {
    this.noise({ duration: 0.22, frequency: 420 + charge * 500, sweepTo: 180, gain: 0.16, q: 0.8 });
  }

  land(tier: number, impact: number): void {
    const base = 190 - tier * 11;
    this.tone({ type: 'sine', from: base, to: base * 0.6, duration: 0.13, gain: 0.05 + impact * 0.22 });
    this.noise({ duration: 0.07, frequency: 900, gain: 0.04 + impact * 0.08 });
  }

  merge(tier: number, chainStep: number): void {
    const semitone = Math.pow(2, 1 / 12);
    const base = 300 * Math.pow(semitone, Math.min(chainStep - 1, 12)) * (1 + tier * 0.02);
    this.tone({ type: 'triangle', from: base, to: base * 2.1, duration: 0.2, gain: 0.22 });
    this.tone({ type: 'sine', from: base * 2, to: base * 3, duration: 0.26, gain: 0.12, delay: 0.04 });
    if (tier >= 6) {
      this.tone({ type: 'sine', from: base * 0.5, to: base * 0.75, duration: 0.4, gain: 0.2, delay: 0.02 });
    }
  }

  celebrate(): void {
    [0, 4, 7, 12].forEach((step, i) => {
      this.tone({
        type: 'triangle',
        from: 440 * Math.pow(2, step / 12),
        duration: 0.3,
        gain: 0.16,
        delay: i * 0.07,
      });
    });
  }

  fall(): void {
    this.tone({ type: 'sawtooth', from: 300, to: 70, duration: 0.45, gain: 0.16 });
  }

  strike(strikesLeft: number): void {
    this.tone({ type: 'square', from: 160 - strikesLeft * 20, to: 90, duration: 0.32, gain: 0.14 });
  }

  gameOver(): void {
    [0, -3, -7, -12].forEach((step, i) => {
      this.tone({
        type: 'triangle',
        from: 392 * Math.pow(2, step / 12),
        duration: 0.5,
        gain: 0.18,
        delay: i * 0.16,
      });
    });
  }

  uiClick(): void {
    this.tone({ type: 'square', from: 620, to: 880, duration: 0.08, gain: 0.1 });
  }

  charge(level: number): void {
    this.tone({ type: 'sine', from: 260 + clamp01(level) * 320, duration: 0.05, gain: 0.05 });
  }
}

export const sfx = new Sfx();
