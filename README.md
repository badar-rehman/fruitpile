# Fruit Mountain (web)

A 3D fruit-tossing merge game for the browser, inspired by BeXide's *Fruit Mountain*
(itself a 3D take on the Suika / Watermelon Game formula). You stand in front of a
plate and **toss** fruit onto it. Two fruits of the same kind that touch **merge**
into the next fruit up the chain. There are no walls — anything that rolls off the
plate is gone, and three drops end the run.

Built with **Vite + TypeScript + three.js + Rapier3D**. Every fruit, the dish, the
table and all sound effects are generated procedurally at runtime, so the whole
game downloads in well under a megabyte. Target platform: **Poki**.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Dev-only extras:

- `?gallery=1` — art review page showing all eleven fruits at equal size, slowly turning.
- `` ` `` (backquote) — in-game debug overlay: fps, live fruit count, state, draw calls.

## Controls

| Intent | Desktop | Mobile |
|---|---|---|
| Aim & throw | Left-press, drag **down** to charge, sideways to aim, release | One finger, same drag |
| Cancel a throw | Drag back up / `Esc` | Drag back up |
| Look around | Right-drag, `A`/`D`, `←`/`→`, or the ◀ ▶ buttons | Two-finger drag or the ◀ ▶ buttons |
| Zoom | Mouse wheel | Pinch |

## Documentation

- [`docs/GDD.md`](docs/GDD.md) — the design: core loop, fruit chain, scoring, fail rules.
- [`docs/ASSETS.md`](docs/ASSETS.md) — every asset and how it is generated.
- [`docs/TUNING.md`](docs/TUNING.md) — which number to change when the game feels wrong.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what ships in the runs after this one.

## Layout

```
src/
  config.ts        every gameplay-feel constant
  core/            game state machine, loop, event bus, RNG, storage, math
  gameplay/        fruit tiers, the pile (physics + merging), the thrower
  physics/         Rapier world setup
  render/          scene, camera rig, dish, quality tiers, procedural fruit
  juice/           particles, score popups
  audio/           WebAudio synthesised SFX
  ui/              HUD, screens, stylesheet
  platform/        input, Poki SDK wrappers
```
