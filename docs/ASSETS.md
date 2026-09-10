# Asset list

Nothing in this game is downloaded. Every mesh, colour and sound is generated in
code at boot, which is why the whole build is ~0.9 MB gzipped (mostly the physics
engine) and starts instantly on a phone.

## Fruit (`src/render/fruit/`)

One **prototype** is built per tier at unit radius; every fruit in play is a
`clone(true)` of that prototype, so geometry and materials are shared and the draw
call count stays low. Instances are scaled to the tier radius from
`src/gameplay/tiers.ts`. Colour and pattern are baked into a **vertex colour
attribute** — a single `MeshStandardMaterial` with `vertexColors: true` covers all
eleven fruits, no textures anywhere.

**Everything is welded and smooth-shaded.** `IcosahedronGeometry` is non-indexed
(every triangle carries its own three vertices), so computing normals on it can
only ever produce per-face normals — hard facets regardless of `flatShading`. So
`displace()` drops the stale normal/uv attributes, runs `mergeVertices()`, and
only then recomputes normals, letting them average across neighbouring faces.
Dropping the normals first is load-bearing: `mergeVertices()` keys on every
attribute, so leaving them attached makes the weld a silent no-op. Subdivision is
scaled by tier (detail 5 for the small fruit up to 8 for the big ones, ~720–1620
triangles) so silhouettes read round as well as smoothly shaded.

| Tier | Fruit | How it is built |
|---|---|---|
| 1 | Blueberry | Icosphere, squashed, dimpled top, 5 cone calyx petals, dusty-bloom gradient |
| 2 | Strawberry | Lathe teardrop, 46 instanced seeds placed along the lathe profile, 7-cone green calyx + stem |
| 3 | Kiwano | Noisy icosphere, 26 instanced cones on Fibonacci-spread points |
| 4 | Peach | Icosphere with a vertical crease and top dimple, cream-to-red vertical blush, stem + leaf |
| 5 | Apple | Squashed icosphere with pole dimples, longitudinal streaks, stem + leaf |
| 6 | Orange | High-detail icosphere with fine bump noise, mottled skin, green nub |
| 7 | Pear | Lathe profile (fat base, narrow neck), russet speckle, stem + leaf |
| 8 | Dragonfruit | Icosphere plus 19 flattened cones in three rings, pink-to-green tips |
| 9 | Pineapple | Icosphere stretched and displaced by a lat/long diamond lattice into quilted skin, 11-cone crown |
| 10 | Melon | Icosphere with a procedural net pattern raised and lightened via `netPattern()` |
| 11 | Watermelon | Icosphere with wobbling longitudinal stripes, tube-geometry curly tendril |

Shared helpers in `geometry.ts`: `displace()` (per-vertex radial displacement,
weld and smooth normals),
`colorize()` (bake vertex colours), `fibonacciSphere()`, `makeStem()`, `makeLeaf()`,
`noise3()` / `smoothNoise()`.

Review the whole set at any time with `npm run dev` → `?gallery=1`.

## Environment (`src/render/`)

| Asset | How |
|---|---|
| Sky | Backside sphere with a three-stop gradient shader (`scene.ts`) |
| Table | Cylinder in wood tone plus a thin cloth disc on top |
| Dish | `LatheGeometry` from `plateProfile()` — a shallow bowl with a raised lip — in glazed ceramic |
| Dish collider | The **same profile** revolved into a Rapier trimesh, so fruit rolls on exactly what you see |
| Lighting | Hemisphere fill + shadow-casting key light + cool rim light; ACES tone mapping |
| Aim arc | Instanced spheres along the predicted trajectory (`thrower.ts`) |
| Landing ring | Ring mesh oriented to the surface normal, amber when the spot is risky |
| Power ring | Ring under the held fruit, green → amber → orange with charge |

## Effects (`src/juice/`)

- **Sparkles** — one `InstancedMesh` of octahedra with a pooled particle list,
  budget set by device tier (180 mobile / 320 desktop).
- **Shockwaves** — a pool of six expanding additive rings.
- **Score popups** — pooled DOM elements projected from world space, clamped to
  stay inside the viewport.

## UI (`src/ui/`)

Plain DOM and one stylesheet: score, best, strike pips, chain banner, evolution
tray, next-fruit card, rotate buttons, mute toggle, title card, game-over card,
loading screen, debug overlay. System font stack, safe-area insets respected,
one narrow-screen media query re-flows the tray.

**Fruit icons**: the evolution tray, the next-fruit card and the game-over
summary show real renders, not coloured circles. `src/render/fruit/icons.ts`
renders each prototype once during the loading screen — its own throwaway
`WebGLRenderer` (transparent, square, lit identically to `scene.ts` so a tray
icon matches the fruit on the plate), each fruit framed individually off its
bounding sphere so the pineapple's crown doesn't make the set look randomly
sized — and hands eleven PNG data URLs to `hud.setFruitIcons()`. The context is
released immediately (`dispose()` + `forceContextLoss()`); browsers cap live
WebGL contexts and the game needs its own. Undiscovered tiers are shown
greyscaled and dimmed, so reaching a new fruit brings it into colour. Icons cost
nothing in download since they are generated at runtime, and the HUD falls back
to the original coloured circles if WebGL is unavailable.

One CSS trap worth remembering: never assign the `background` *shorthand* from
JS on these elements. It also writes `background-size`/`-position`/`-repeat`
inline at their initial values, and inline beats the stylesheet — which silently
defeats the `contain`/`center` sizing the icons need. Set `backgroundColor` and
`backgroundImage` longhands only.

## Audio (`src/audio/sfx.ts`)

A small WebAudio synth built on the first user gesture: throw whoosh (band-passed
noise sweep), landing thud (sine + click, pitched by tier), merge pop (triangle
with a rising chain pitch), celebration arpeggio, drop tone, strike sting,
game-over cadence, UI click. No audio files, no decode cost, mute is a single gain
node.

## If we swap to modelled fruit later

Only two functions need to change: `createFruitMesh()` and `createFruitIcon()` in
`builders.ts`. Load a Draco-compressed glTF, cache one prototype per tier, keep the
unit-radius convention and the ball collider, and everything else — physics, juice,
HUD — is untouched. Budget ~2–4 MB for that, still far inside Poki's 8 MB limit.
