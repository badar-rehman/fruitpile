/** Deterministic RNG so a run can be replayed from its seed (daily challenge later). */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

/**
 * Weighted shuffle bag: guarantees the mix stays close to the intended weights
 * instead of handing out five blueberries in a row.
 */
export class SpawnBag {
  private bag: number[] = [];

  constructor(
    private readonly values: readonly number[],
    private readonly weights: readonly number[],
    private readonly rng: Rng,
  ) {}

  private refill(): void {
    this.bag = [];
    for (let i = 0; i < this.values.length; i++) {
      const count = Math.max(1, Math.round(this.weights[i] / 5));
      for (let n = 0; n < count; n++) this.bag.push(this.values[i]);
    }
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  take(): number {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }
}
