# Fruit Mountain (web) — design document

## Pitch

A cosy 3D merge game: toss fruit onto an open plate, match them to grow them, and
build a wobbling mountain of fruit without letting anything roll off the edge.
The plate has no walls, so every throw is a small bet — the tension comes from
the pile you built yourself.

## Core loop (3–6 seconds per throw)

```
see the next fruit  →  orbit the camera, pick a landing spot
      →  press and drag down to charge (dotted arc + landing ring appear)
      →  release: the fruit lobs, lands, squashes, settles
      →  merges fire (pop, sparkles, +score, chain counter climbs)
      →  read the new shape of the pile  →  next fruit
```

**Run loop:** throws build the mountain → merges free up space → the mound grows
domed and every landing gets riskier → a fruit rolls off (strike) → three strikes
end the run → score card → one more run.

**Tension curve.** Early throws onto a flat dish are nearly free. Mid-run the pile
is a dome and a careless throw sends something rolling. Late run you are threading
small fruit into the pockets between giants, deciding between a safe short lob and
a greedy long one.

## Fruit chain

Eleven tiers, each ~1.2× the last. Only tiers 1–5 are throwable; the rest exist
only as merge results.

| # | Fruit | Radius | Merge award | Throwable |
|---|---|---|---|---|
| 1 | Blueberry | 0.12 | 1 | ✓ (weight 30) |
| 2 | Strawberry | 0.15 | 3 | ✓ (25) |
| 3 | Kiwano | 0.185 | 6 | ✓ (20) |
| 4 | Peach | 0.225 | 10 | ✓ (15) |
| 5 | Apple | 0.27 | 15 | ✓ (10) |
| 6 | Orange | 0.32 | 21 | — |
| 7 | Pear | 0.40 | 28 | — |
| 8 | Dragonfruit | 0.48 | 36 | — |
| 9 | Pineapple | 0.57 | 45 | — |
| 10 | Melon | 0.69 | 55 | — |
| 11 | Watermelon | 0.84 | 66 | — |

The dish's usable radius is 1.6, so a watermelon covers roughly half of it.
Throwables come from a **weighted shuffle bag** (`src/core/rng.ts`) seeded per run,
which prevents drought streaks and keeps runs reproducible for a future daily
challenge. **Two watermelons annihilate** in a confetti burst for 200 points — the
pressure valve that keeps a good run alive.

## Scoring

```
merge score = award(resulting tier)
chain bonus = merge score × 0.5 × (chainStep − 1)     # 2nd merge +50%, 3rd +100%, …
```

Merges that resolve within **0.9 s** of each other belong to one chain. The HUD
shows `CHAIN ×N` and each chain step raises the merge sound a semitone, so a long
cascade is audible before you finish reading it.

## Failing

A fruit counts as **dropped** when its centre falls below the dish floor while
outside the rim, and stays there for **0.25 s** — the grace period means a fruit
teetering on the lip can still be saved by the next throw. Each drop costs one of
**three strikes**: the screen shakes, a pip goes dark, the fruit fades out. On the
third, the run ends.

Full power lands a fruit ~1 unit past the far rim, so the top quarter of the power
range is a deliberate overshoot zone rather than a wasted stretch of the meter.

## Feel rules that make it *this* game

1. **Charge maps to a landing distance, not an impulse.** Charge picks where the
   fruit will land relative to the plate centre; the launch speed is solved from
   the ballistic equation. The dish therefore sits in the middle of the power
   range at any zoom level or aspect ratio, and the same drag always lands in the
   same place.
2. **A fixed camera gap.** The held fruit always sits 1.75 units in front of the
   camera, so it keeps its on-screen size when the player zooms or rotates the
   phone.
3. **Landing stickiness.** On first contact a fruit keeps only ~32% of its
   horizontal velocity and ~35% of its spin. This is what makes fruit "stay where
   you chucked it" like the original, instead of skating off a slick dish.
4. **A shallow bowl, not a plate.** The dish interior rises toward the rim, so the
   pile drifts to the middle and small fruit finds the gaps.
5. **Free camera.** Orbiting never costs a throw and never cancels an aim.

## Modes

- **Endless (shipped).** No timer, three strikes, chase a bigger score.
- **Time Attack (Run 3).** Three minutes, no strikes — a drop costs points and
  tempo instead of ending the run.
- **Sprint (Run 3).** Race to the first watermelon.
- **Party variants (Run 6, optional).** Item-based modes in the spirit of
  *Fruit Mountain Party*.

## HUD

Score and best at the top corners, strike pips under the score, the eleven-tier
evolution tray as a compact strip (dots light up as each fruit is discovered), the
next fruit named at the bottom-left, and ◀ ▶ rotate buttons at the screen edges.
Chain banners and floating score numbers are transient. Nothing overlaps the lower
centre, where the held fruit lives.

## Platform notes (Poki)

- `gameplayStart` on the first input of a run, `gameplayStop` on game over, pause
  or tab-hide; a `commercialBreak` sits in front of every restart.
- No splash screen, no outgoing links, no third-party ads or analytics.
- 16:9 and portrait both supported; the camera lengthens its boom and widens the
  lens on tall viewports.
- Progress lives in `localStorage` behind a wrapper that cannot throw.
