import type { Vector3 } from 'three';

export interface MergeEvent {
  tier: number; // tier of the fruit that was created
  position: Vector3;
  chainStep: number; // 1 = first merge of the chain
  score: number;
  isFinal: boolean; // two watermelons annihilating
}

export interface LandEvent {
  tier: number;
  position: Vector3;
  impact: number; // 0..1
}

export interface FallEvent {
  tier: number;
  position: Vector3;
  strikesLeft: number;
}

export interface ThrowEvent {
  tier: number;
  charge: number;
}

export interface GameOverEvent {
  score: number;
  best: number;
  isNewBest: boolean;
  biggestTier: number;
  throws: number;
}

export interface GameEvents {
  merge: MergeEvent;
  land: LandEvent;
  fall: FallEvent;
  throw: ThrowEvent;
  newTier: { tier: number };
  score: { total: number; delta: number; position?: Vector3 };
  gameover: GameOverEvent;
  start: { seed: number };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

/** Tiny typed pub/sub. It is the only seam between simulation and presentation. */
export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => set!.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) (handler as Handler<K>)(payload);
  }
}

export const bus = new EventBus();
