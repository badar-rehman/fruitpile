export interface QualitySettings {
  pixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
  particleBudget: number;
  isMobile: boolean;
}

export function detectQuality(): QualitySettings {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const isMobile = coarse || cores <= 4 || memory <= 4;

  return {
    isMobile,
    pixelRatio: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2),
    shadows: !isMobile,
    shadowMapSize: isMobile ? 512 : 1024,
    antialias: !isMobile,
    particleBudget: isMobile ? 180 : 320,
  };
}
