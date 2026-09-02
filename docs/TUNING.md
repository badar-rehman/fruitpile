# Tuning guide

All numbers below live in [`src/config.ts`](../src/config.ts). Nothing else should
need editing to change how the game feels.

## "Throws are hard to aim"

| Symptom | Knob |
|---|---|
| The dish is not in the middle of the power range | `throw.landNear` / `throw.landFar` — these are offsets from the **plate centre**, so `landNear: -2` starts 2 units short of it |
| Full power should overshoot more (or less) | `throw.landFar` (currently 2.6 → about 1 unit past the far rim) |
| Charging takes too much dragging | `throw.chargeDragFraction` (fraction of the short screen axis for full charge) |
| Sideways aim too twitchy / too limited | `throw.yawDragFraction`, `throw.yawRangeDeg` |
| Arcs feel floaty or flat | `throw.pitchDeg` (52° is a lob) and `physics.gravity` |
| Rapid-fire throws feel spammy | `throw.cooldown` |

## "The held fruit looks wrong"

| Symptom | Knob |
|---|---|
| Too big / too small on screen | `throw.cameraGap` (distance from the camera) and the `* 0.85` preview scale in `Thrower.setTier` |
| Sits too high or too low | `throw.originHeight` |
| Swallows the screen in portrait | the `1.2` portrait boom multiplier in `CameraRig.boom` |

## "Fruit does not behave"

| Symptom | Knob |
|---|---|
| Fruit skates across the dish after landing | `landing.horizontalKeep` (lower = stickier), `landing.spinKeep` |
| The pile jitters or slowly explodes | `physics.solverIterations`, then `physics.linearDamping` / `angularDamping` |
| Fruit bounces like rubber | `physics.restitution` |
| Fruit rolls off too easily | `plate.lip`, the interior curve in `plateProfile()` (`src/render/plate.ts`), `landing.horizontalKeep` |
| Fast throws pass through the dish | CCD is enabled per throw in `Pile.spawn`; if it still happens, lower `physics.fixedStep` |
| Merges fire too eagerly / too late | `merge.contactSlack` (1.04 = 4% early) |
| A merge cascade tanks the frame rate | `merge.maxPerStep` |

## "The run is too easy / too hard"

| Symptom | Knob |
|---|---|
| Runs never end | `fail.strikes`, `fail.graceSeconds`, `throw.landFar` |
| Runs end unfairly | `fail.graceSeconds` (grace on the lip), `fail.fallY` |
| Small fruit clogs the dish | `run.spawnWeights` |
| Scores inflate too fast | `scoring.chainBonusPerStep`, tier `award` values in `src/gameplay/tiers.ts` |
| Big merges feel unrewarded | `scoring.doubleWatermelon`, tier awards |

## "Juice"

| Symptom | Knob |
|---|---|
| Landings feel stiff | `juice.landSquash`, `juice.squashStiffness`, `juice.squashDamping` |
| Screen shake is nauseating | `juice.shakeDecay`, and the per-event `rig.addShake()` amounts in `src/core/game.ts` |
| Big merges lack impact | `juice.hitstopMs`, `juice.hitstopFromTier` |
| Too many / too few particles | the per-device budgets in `src/render/quality.ts` |

## Fruit chain itself

`src/gameplay/tiers.ts` holds radius, award, name and colours. Radii grow ~1.22×
per tier; keep that ratio if you add a tier, or merges start looking abrupt. Every
system reads the table, so adding a twelfth fruit means one row plus one builder in
`src/render/fruit/builders.ts`.

## Camera

`camera.radius` / `height` / `fov` frame the dish; `minRadius` / `maxRadius` bound
zoom; `smoothing` controls how lazily the orbit catches up (12 is snappy but not
instant). The throw origin is derived from the camera, so changing the boom
automatically moves the launcher — no second number to keep in sync.
