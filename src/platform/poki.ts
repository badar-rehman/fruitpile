interface PokiSdk {
  init: () => Promise<void>;
  gameLoadingFinished: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  commercialBreak: () => Promise<void>;
  rewardedBreak: () => Promise<boolean>;
  /**
   * Progression funnel events for Poki's dashboard. category/what/action are
   * arbitrary strings but must not contain "/" or "^" (Poki reserves those
   * for its own event-path/funnel-key formatting). Poki gives special
   * reporting meaning to the actions 'start'/'complete'/'fail'/'visible'/
   * 'interact', but any string is accepted.
   */
  measure: (category: string, what: string, action: string) => void;
  setDebug?: (on: boolean) => void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSdk;
  }
}

const sdk = (): PokiSdk | undefined => window.PokiSDK;

let sdkReady = false;

// If a player taps "Play" (triggering gameplayStart) before PokiSDK.init()'s
// network round-trip resolves, calling straight through would silently drop
// the event on the floor - Poki's own Inspector tool would show "SDK
// initialized" with no matching "gameplayStart" above it. Both flags are
// replayed the instant init() actually resolves, in the order a normal
// session would produce them.
let pendingGameLoadingFinished = false;
let pendingGameplayStart = false;

/**
 * Thin, fail-open wrapper around the globally-exposed PokiSDK (loaded via a
 * plain <script> tag in index.html, not an ES import - that's how Poki's own
 * CDN script works). Every function behaves identically whether or not the
 * SDK is actually present, per Poki's own guidance: "implement PokiSDK.init()
 * with proper error handling that allows your game to load anyway if
 * initialization fails."
 */
export const poki = {
  async init(): Promise<void> {
    const instance = sdk();
    if (!instance) return;
    try {
      await instance.init();
      sdkReady = true;
      if (pendingGameLoadingFinished) {
        instance.gameLoadingFinished();
        pendingGameLoadingFinished = false;
      }
      if (pendingGameplayStart) {
        instance.gameplayStart();
        pendingGameplayStart = false;
      }
    } catch {
      /* SDK present but init failed - keep playing standalone */
    }
  },

  loadingFinished(): void {
    if (sdkReady) sdk()?.gameLoadingFinished();
    else pendingGameLoadingFinished = true;
  },

  gameplayStart(): void {
    if (sdkReady) sdk()?.gameplayStart();
    else pendingGameplayStart = true;
  },

  gameplayStop(): void {
    if (sdkReady) sdk()?.gameplayStop();
  },

  // Wraps a genuine natural-break moment (restarting the run) - stops
  // gameplay, offers Poki's system the chance to show an ad, then resumes.
  // A hard timeout guarantees the returned promise always settles even if
  // the SDK never resolves (offline, not embedded on Poki, a stalled ad) -
  // callers must put the actual game-logic transition after the await, not
  // before calling this, so the break (if shown) happens first.
  commercialBreak(): Promise<void> {
    return new Promise((resolve) => {
      const instance = sdk();
      if (!sdkReady || !instance) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        instance.gameplayStart();
        resolve();
      };
      instance.gameplayStop();
      instance.commercialBreak().then(finish).catch(finish);
      setTimeout(finish, 8000);
    });
  },

  // Wraps a player-initiated rewarded ad (extra life, boost, hint - whatever
  // optional reward feature exists). Unlike commercialBreak, the outcome
  // matters: resolves true only when the SDK itself resolves true (the
  // player watched it through), or immediately when the SDK is entirely
  // absent (fail-open, so the feature stays exercisable in local/standalone
  // testing). A stalled real ad times out to false - we can't confirm it
  // played, so the safe default is "don't grant".
  rewardedBreak(): Promise<boolean> {
    return new Promise((resolve) => {
      const instance = sdk();
      if (!sdkReady || !instance) {
        resolve(true);
        return;
      }
      let done = false;
      const finish = (granted: boolean) => {
        if (done) return;
        done = true;
        instance.gameplayStart();
        resolve(granted);
      };
      instance.gameplayStop();
      instance
        .rewardedBreak()
        .then((granted) => finish(!!granted))
        .catch(() => finish(false));
      setTimeout(() => finish(false), 45000);
    });
  },

  measure(category: string, what: string, action: string): void {
    try {
      sdk()?.measure(category, what, action);
    } catch {
      /* ignore */
    }
  },
};
