# Dice Game

A browser-based dice game built with **React 18**, **Phaser 3**, and **TypeScript**. Roll a number between 1–100 and try to land under your chosen target. React owns all game logic and state; Phaser owns all visuals and audio. The two layers communicate exclusively through a typed **pub/sub event bus** — neither imports the other.

---

## Features

- Animated dice roll with shake, scale wobble, and number-cycling effect
- Win / lose glow + particle burst
- Procedural audio via the Web Audio API (no audio files)
- Bitmap digit display — numbers rendered as a PNG spritesheet loaded via Phaser's asset pipeline, tinted at runtime (no CSS involved)
- Target selector (number input + range slider) with live win-probability hint
- Roll history — last 20 rolls with win/loss badge and running win-rate
- Win/loss streak tracking
- Keyboard shortcut: **Space** or **Enter** to roll
- Mute toggle
- Fully responsive — Phaser canvas scales to fill its container

---

## Tech Stack

| Layer | Library | Purpose |
|-------|---------|---------|
| UI | React 18 | State management, controls, roll history |
| Renderer | Phaser 3.80 | Canvas/WebGL visuals, animation, audio |
| Language | TypeScript 5.5 | End-to-end type safety |
| Build | Vite 5 | Dev server, HMR, production bundle |
| Tests | Vitest 2 + Testing Library | Unit tests for the event bus and hook |

---

## Project Structure

```
src/
├── events/
│   ├── types.ts          # GameEvents type map (single source of truth)
│   └── bus.ts            # EventBus class + module-level singleton `bus`
│
├── assets/
│   └── digitSheet.ts     # Generates the PNG digit spritesheet at runtime
│
├── game/
│   ├── DiceScene.ts      # Phaser scene — visuals, animation, audio
│   └── config.ts         # Phaser.Game configuration factory
│
├── hooks/
│   └── useGameBridge.ts  # React hook — game state + actions (useReducer)
│
├── components/
│   ├── DiceGame.tsx       # Mounts Phaser; wires scene lifecycle to the bus
│   ├── ControlPanel.tsx   # All React UI controls
│   └── RollHistory.tsx    # Scrollable roll history list
│
├── types/
│   └── game.ts            # Shared domain types (GameStatus, HistoryEntry)
│
├── App.tsx
└── main.tsx
```

---

## Architecture — Event Bus

```
  React layer                    Phaser layer
  ──────────────                 ──────────────
  useGameBridge                  DiceScene
       │                              │
       │  bus.emit('roll:start')  ──► │  bus.on('roll:start', ...)
       │                              │
       │ ◄──  bus.emit('roll:complete')│
       │                              │
       │  bus.emit('result:show') ──► │  bus.on('result:show', ...)
       │                              │
       │ ◄── bus.emit('scene:ready')  │
```

**Event flow for a single roll:**

1. User clicks **Roll** → `useGameBridge.roll()` dispatches `ROLL_START` and emits `roll:start`
2. `DiceScene` receives `roll:start`, runs the 2.2 s animation, then emits `roll:complete`
3. `useGameBridge` receives `roll:complete`, dispatches `ROLL_COMPLETE`, and immediately emits `result:show`
4. `DiceScene` receives `result:show` and applies the win/lose glow + colour tint

### Event reference

| Event | Direction | Payload |
|-------|-----------|---------|
| `scene:ready` | Phaser → React | — |
| `scene:error` | Phaser → React | `{ message: string }` |
| `roll:complete` | Phaser → React | `{ result: number, timestamp: number }` |
| `roll:start` | React → Phaser | `{ result: number }` |
| `result:show` | React → Phaser | `{ isWin: boolean }` |
| `audio:mute` | React → Phaser | `{ muted: boolean }` |
| `audio:volume` | React → Phaser | `{ volume: number }` |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run (dev server)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

Output goes to `dist/`. Preview the production build with:

```bash
npm run preview
```

### Test

```bash
npm test            # single run
npm run test:watch  # watch mode
npm run test:ui     # browser UI (requires @vitest/ui)
```

---

## How to Play

1. Set your **target** using the number input or the slider (default 50).
2. Click **Roll** — or press **Space / Enter**.
3. Watch the dice animate to a random result between 1 and 100.
4. You win if the result is **≤ your target**.
5. Your win probability equals your target number (target 70 → 70% chance to win).

---

## Design Decisions

**Why pub/sub instead of a direct bridge?**
Neither the React hook nor the Phaser scene needs to know the other exists. Adding a new event (e.g. `'ui:theme-change'`) requires a one-line addition to `events/types.ts` — no changes to any other file.

**Why `useReducer` in `useGameBridge`?**
A single game event touches 6+ state fields atomically. `useReducer` keeps all transition logic in one pure function that is trivially testable without mounting any component.

**Why a PNG digit spritesheet instead of `Phaser.GameObjects.Text`?**
`Text` objects re-rasterise on every content or style change. A pre-baked spritesheet drawn once in `preload()` is a static GPU texture; colour changes are free (`setTint()`), and the rendering path is the same as any other sprite.

**Why generate the PNG at runtime instead of shipping a file?**
The project has no design assets. Generating the sheet in `buildDigitSheetDataURL()` keeps everything self-contained — a single `npm install` is all that is needed to run the game.
