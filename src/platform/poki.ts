interface PokiSdk {
  init?: () => Promise<void>;
  gameLoadingFinished: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  commercialBreak: () => Promise<void>;
  rewardedBreak: () => Promise<boolean>;
  setDebug?: (on: boolean) => void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSdk;
  }
}

const sdk = (): PokiSdk | undefined => window.PokiSDK;

/**
 * Safe wrappers so the game runs identically with or without the Poki SDK
 * script present. The real integration lands in the Poki readiness pass.
 */
export const poki = {
  async init(): Promise<void> {
    try {
      await sdk()?.init?.();
    } catch {
      /* SDK missing or blocked - keep playing */
    }
  },
  loadingFinished(): void {
    sdk()?.gameLoadingFinished();
  },
  gameplayStart(): void {
    sdk()?.gameplayStart();
  },
  gameplayStop(): void {
    sdk()?.gameplayStop();
  },
  async commercialBreak(): Promise<void> {
    try {
      await sdk()?.commercialBreak();
    } catch {
      /* ignore */
    }
  },
  async rewardedBreak(): Promise<boolean> {
    try {
      return (await sdk()?.rewardedBreak()) ?? false;
    } catch {
      return false;
    }
  },
};
