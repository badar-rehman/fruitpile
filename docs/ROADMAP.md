# Roadmap

Run 1 (done) shipped the first playable: throwing, merging, chains, scoring, the
drop-off fail state, baseline juice, HUD, and a production build under 1 MB
gzipped. What follows, in the order it is worth building.

## Run 2 — feel & juice pass

Playtest-driven tuning of throw power, arc pitch, damping and landing stickiness.
Then the juice that did not fit into the first playable:

- Wobble warning: fruit near the rim gets a nervous tilt and a pulsing outline.
- New-tier discovery celebration — slow zoom, confetti, a name card.
- Clean-throw bonus (+points for a throw that costs nothing) — the constant was
  cut from `config.ts` until the tracking exists.
- Chain crescendo audio, layered music beds, idle "breathing" on resting fruit.
- Bloom / vignette gated by device tier; game-over camera pan around the pile.

## Run 3 — modes

- Mode framework (rules object: timer, strike count, win condition, HUD widgets).
- **Time Attack**: 3 minutes, drops cost points instead of ending the run.
- **Sprint**: race to the first watermelon.
- Per-mode results cards and local leaderboards (`core/storage.ts`).

## Run 4 — Poki readiness

- Real SDK script + `gameplayStart` / `gameplayStop` / `commercialBreak` /
  `rewardedBreak` wired through `platform/poki.ts` (wrappers already exist).
- Rewarded-ad continue: restore one strike.
- Portrait and landscape layout passes on real devices; quality auto-tiering
  verified on low-end phones (target 30 fps floor, 60 on desktop).
- Bundle audit: switch `@dimforge/rapier3d-compat` for the non-compat build with a
  separate `.wasm` asset (the compat build inlines the WASM as base64, costing
  ~200 KB gzipped) — needs `vite-plugin-wasm` + top-level await.
- Submission checklist: no splash, no outgoing links, first-input gating, focus
  and visibility handling.

## Run 5 — meta

- Plate and table cosmetics with an unlock currency earned per run.
- Daily seeded challenge (the seeded RNG and spawn bag already support it).
- Stats page: runs, best tier reached, longest chain.

## Run 6 — party modes (optional)

Item-based variants in the spirit of *Fruit Mountain Party*: thief, harvest,
survival. Only worth building once the core loop is proven on Poki.

## Known follow-ups from Run 1

- `Pile.remove()` leaves shared prototype geometry alone by design; if fruit ever
  gets per-instance geometry, add disposal.
- The debug overlay and `?gallery=1` are dev-only and stripped from production —
  keep them that way.
- Merge detection is an O(n²)-per-tier distance check. Fine at ~80 bodies; if the
  cap ever rises, bucket by grid cell.
