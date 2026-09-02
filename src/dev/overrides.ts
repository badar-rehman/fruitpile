import { CONFIG, DEFAULT_CONFIG, type GameConfig } from '../config';
import { TIERS, DEFAULT_TIERS, type FruitTier } from '../gameplay/tiers';

const STORAGE_KEY = 'fruitmountain.devOverrides.v1';
const TWEAKABLE_TIER_FIELDS = ['radius', 'award', 'color', 'accent'] as const;
type TweakableTierField = (typeof TWEAKABLE_TIER_FIELDS)[number];

type ConfigSection = keyof GameConfig;

interface OverridesBlob {
  config?: Partial<Record<ConfigSection, Record<string, unknown>>>;
  tiers?: Array<Partial<Pick<FruitTier, TweakableTierField>>>;
}

/**
 * Assigns `source`'s values onto `target` in place, recursing into nested
 * plain objects instead of replacing their reference (arrays and primitives
 * are assigned directly). CONFIG's sub-objects (CONFIG.physics, CONFIG.plate,
 * CONFIG.camera.target, ...) are captured by reference at dev-panel
 * construction time — swapping one out (a plain `Object.assign(CONFIG, ...)`)
 * would silently orphan every controller built on top of it.
 */
function assignInPlace(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    const bothPlainObjects =
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue);
    if (bothPlainObjects) {
      assignInPlace(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      target[key] = sourceValue;
    }
  }
}

/**
 * Reads any saved dev-panel tweaks from localStorage and applies them onto
 * CONFIG/TIERS in place. Must run before `Game` is constructed — CONFIG and
 * TIERS are shared-by-reference singletons, so mutating them here means
 * every later reader (including one-time reads baked into the physics world
 * and plate mesh at construction) sees the tweaked values from the start.
 */
export function loadOverrides(): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const blob: OverridesBlob = JSON.parse(raw);

    if (blob.config) {
      for (const section of Object.keys(blob.config) as ConfigSection[]) {
        const patch = blob.config[section];
        if (patch) assignInPlace(CONFIG[section] as Record<string, unknown>, patch);
      }
    }
    if (blob.tiers) {
      for (const patch of blob.tiers) {
        const tier = TIERS.find((t) => t.index === (patch as { index?: number }).index);
        if (tier) Object.assign(tier, patch);
      }
    }
  } catch {
    // Corrupt or blocked storage: silently fall back to defaults.
  }
}

let saveTimer: number | undefined;

/** Debounced full snapshot of CONFIG + the tweakable tier fields. */
export function saveOverrides(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const blob: OverridesBlob = {
        config: CONFIG as unknown as OverridesBlob['config'],
        tiers: TIERS.map((tier) => ({
          index: tier.index,
          radius: tier.radius,
          award: tier.award,
          color: tier.color,
          accent: tier.accent,
        })),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      // Storage blocked (e.g. itch.io iframe): the panel still works this
      // session, it just won't persist across a reload.
    }
  }, 400);
}

/** Clears persisted tweaks and restores CONFIG/TIERS to their shipped defaults. */
export function resetOverrides(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  assignInPlace(
    CONFIG as unknown as Record<string, unknown>,
    JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
  );
  TIERS.forEach((tier, i) => Object.assign(tier, DEFAULT_TIERS[i]));
}

/**
 * Diffs the live CONFIG/TIERS against their shipped defaults and returns
 * only what actually changed — meant to be pasted back as new defaults,
 * not as a full config dump.
 */
export function exportChangedJSON(): string {
  const config: Partial<Record<ConfigSection, Record<string, unknown>>> = {};
  for (const section of Object.keys(CONFIG) as ConfigSection[]) {
    const current = CONFIG[section] as Record<string, unknown>;
    const defaults = DEFAULT_CONFIG[section] as Record<string, unknown>;
    const sectionDiff: Record<string, unknown> = {};
    for (const key of Object.keys(current)) {
      if (JSON.stringify(current[key]) !== JSON.stringify(defaults[key])) {
        sectionDiff[key] = current[key];
      }
    }
    if (Object.keys(sectionDiff).length > 0) config[section] = sectionDiff;
  }

  const tiers: Array<{ index: number; name: string } & Partial<Pick<FruitTier, TweakableTierField>>> = [];
  TIERS.forEach((tier, i) => {
    const defaults = DEFAULT_TIERS[i];
    const changed: Partial<Pick<FruitTier, TweakableTierField>> = {};
    for (const field of TWEAKABLE_TIER_FIELDS) {
      if (tier[field] !== defaults[field]) changed[field] = tier[field];
    }
    if (Object.keys(changed).length > 0) tiers.push({ index: tier.index, name: tier.name, ...changed });
  });

  const payload: Record<string, unknown> = {};
  if (Object.keys(config).length > 0) payload.config = config;
  if (tiers.length > 0) payload.tiers = tiers;
  return JSON.stringify(payload, null, 2);
}
