const PREFIX = 'fruitmountain.';

/** localStorage is unavailable in some embeds and private windows; never throw. */
export function loadNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(PREFIX + key, String(value));
  } catch {
    /* storage blocked - scores just do not persist */
  }
}
