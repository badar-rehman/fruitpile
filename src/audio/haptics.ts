/**
 * Short vibration pulses for touch devices. No-ops everywhere else -
 * navigator.vibrate() was never implemented in iOS Safari, and only means
 * anything on a touch-primary device in the first place.
 */
class Haptics {
  readonly supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function' &&
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);

  enabled = true;

  private fire(pattern: number | number[]): void {
    if (!this.supported || !this.enabled) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Blocked by permissions policy (e.g. some iframe embeds) - ignore.
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  throwFruit(charge: number): void {
    this.fire(10 + Math.round(Math.min(1, Math.max(0, charge)) * 15));
  }

  land(impact: number): void {
    if (impact > 0.25) this.fire(12);
  }

  merge(chainStep: number): void {
    this.fire(Math.min(10 + chainStep * 4, 40));
  }

  celebrate(): void {
    this.fire([20, 40, 20, 40, 60]);
  }

  strike(): void {
    this.fire([30, 30, 30]);
  }

  gameOver(): void {
    this.fire([40, 60, 40, 60, 120]);
  }
}

export const haptics = new Haptics();
