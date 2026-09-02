export interface FruitTier {
  readonly index: number;
  readonly name: string;
  readonly radius: number;
  readonly award: number;
  /** Base flesh/skin colour used by the procedural builder. */
  readonly color: number;
  readonly accent: number;
  readonly emoji: string;
}

/**
 * Eleven tiers, blueberry through watermelon, growing ~1.22x each step.
 * Awards follow the Suika-style triangular curve: the top of the chain is
 * worth far more than the sum of the small merges that fed it.
 */
export const TIERS: readonly FruitTier[] = [
  { index: 0, name: 'Blueberry', radius: 0.12, award: 1, color: 0x4a5bb8, accent: 0x8fa3e8, emoji: '🫐' },
  { index: 1, name: 'Strawberry', radius: 0.15, award: 3, color: 0xe23b52, accent: 0xffd25e, emoji: '🍓' },
  { index: 2, name: 'Kiwano', radius: 0.185, award: 6, color: 0xe8a022, accent: 0xffd77a, emoji: '🥭' },
  { index: 3, name: 'Peach', radius: 0.225, award: 10, color: 0xffb07c, accent: 0xff7c6b, emoji: '🍑' },
  { index: 4, name: 'Apple', radius: 0.27, award: 15, color: 0xd83a3a, accent: 0x7fc45a, emoji: '🍎' },
  { index: 5, name: 'Orange', radius: 0.32, award: 21, color: 0xff9a1f, accent: 0xffc46b, emoji: '🍊' },
  { index: 6, name: 'Pear', radius: 0.4, award: 28, color: 0xc6d94a, accent: 0x8fbf3f, emoji: '🍐' },
  { index: 7, name: 'Dragonfruit', radius: 0.48, award: 36, color: 0xe4467f, accent: 0x7fd97a, emoji: '🐉' },
  { index: 8, name: 'Pineapple', radius: 0.57, award: 45, color: 0xe0a52c, accent: 0x5faa4a, emoji: '🍍' },
  { index: 9, name: 'Melon', radius: 0.69, award: 55, color: 0xbfd08a, accent: 0xe6efc6, emoji: '🍈' },
  { index: 10, name: 'Watermelon', radius: 0.84, award: 66, color: 0x2f8f4a, accent: 0x9fd86b, emoji: '🍉' },
];

export const MAX_TIER = TIERS.length - 1;

export function tierOf(index: number): FruitTier {
  return TIERS[Math.min(Math.max(index, 0), MAX_TIER)];
}
