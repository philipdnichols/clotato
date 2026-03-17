# Clotato — Claude Code Guide

This file guides Claude Code sessions on this project. Read it before making any changes.

---

## Project Overview

Clotato is a potato-themed auto-shooter survival game (Vampire Survivors style) built with
Phaser 3.90 + TypeScript + Vite. The player survives 10 minutes of escalating enemy waves,
collecting XP gems to level up and choosing upgrades.

- **Docs:** `docs/GDD.md` (full game spec), `docs/playtest-bot-approach.md` (bot testing)
- **Live:** https://philipdnichols.github.io/clotato/
- **Repo:** https://github.com/philipdnichols/clotato

---

## Running the Project

```bash
npm install          # first time only
npm run dev          # dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

Dev server runs on WSL2. File watching uses polling (`vite.config.ts`) because inotify
doesn't fire reliably across the WSL2/Windows filesystem boundary.

---

## Key Architecture Decisions

### Phaser Scene Structure
- `GameScene` — main game loop (always running, never paused for input reasons)
- `UIScene` — HUD overlay, runs in parallel with GameScene
- `UpgradeScene` — upgrade picker, launched on level-up
- `PauseScene` — P-key pause overlay

**Important:** We do NOT use `scene.pause()` to freeze gameplay. It kills keyboard input
listeners. Instead, `GameScene` has a `this.gameOver` boolean — `update()` returns early
when true, but the scene stays active so the R key restart works.

### Physics Time Scaling (bot speed)
- `this.time.timeScale = speed` — scales tweens and Phaser timers
- `this.physics.world.timeScale = 1 / speed` — scales physics movement
- Manual delta: `const delta = rawDelta * (this.bot?.timeScale ?? 1)` — for calculations
  not covered by Phaser's time scale (elapsed tracking, damage per frame, etc.)

### scene.restart() Persistence
- `scene.restart()` re-runs `create()` but reuses the same class instance
- Class-level property initialisers do NOT re-run on restart
- `BotPlayer` is persisted across restarts via `window.__activeBotPlayer`
- All `GameScene` state is explicitly reset at the top of `create()`

### Seeded RNG
- All gameplay randomness goes through `src/rng.ts` (`rng()` function)
- Cosmetic effects (particles, splatter) still use `Math.random()` — don't waste RNG budget
- `?seed=<n>` sets the seed; each run in a multi-run session gets `seed + runIndex`
- Human sessions without a seed call `resetToRandom()` — unaffected

### Game Over Screen
- `endGame()` sets `gameOver = true`, calls `body.setEnable(false)` (stops physics)
- `cameras.main.stopFollow()` + `setScroll()` to snap camera before disabling follow
- This prevents camera lerp drift moving the overlay off-screen

---

## Bot Testing Workflow

The project has an extensive automated playtesting system. See `docs/playtest-bot-approach.md`
for the full methodology. Quick reference:

```
# Run a bot (replace strategy and params as needed)
http://localhost:5173/?bot=aggressive&speed=4&runs=2&seed=42

# Record a human session
http://localhost:5173/?record=true

# Available strategies
kiter, aggressive, collector, gem_ignorer, random,
upgrade_sampler, upgrade_focus, stress_test, late_game, human_emulator
```

Reports are auto-saved to `playtests/<strategy>_<date>.json` by the Vite plugin.
Playwright polls `window.__playtestDone` to detect completion.

**Critical Playwright gotcha:** All bot runs share a single browser tab. Never run
multiple bot agents in parallel — they'll read each other's results. Run them
sequentially in a single agent.

---

## Data Files (game constants)

| File | Contents |
|------|----------|
| `src/data/upgrades.ts` | `UPGRADES` array, `PlayerStats` interface, `BASE_STATS` |
| `src/data/enemies.ts` | `ENEMIES` array with all 4 enemy types |
| `src/data/waves.ts` | `WAVE_CONFIGS` array, `GAME_DURATION = 600` |

When adding new upgrades or enemies, add them to the appropriate data file. The rest of
the systems (WaveManager, UpgradeManager) pick them up automatically.

---

## Upgrade IDs (for bot strategy `?focus=` param)

| ID | Label | Effect |
|----|-------|--------|
| `fire_rate` | Rapid Starch | +20% fire rate |
| `more_damage` | Sharp Potato | +25% damage |
| `move_speed` | Greased Spud | +15% move speed |
| `max_hp` | Extra Tuber | +25 max HP |
| `multishot` | Split Shot | +1 projectile |
| `proj_speed` | Turbo Tater | +25% projectile speed |
| `pickup_radius` | Starchy Magnet | +50% pickup radius |

---

## Known Gotchas

- **WSL2 file watching:** `vite.config.ts` uses `usePolling: true` — don't remove this
- **Hot reload kills bot runs:** Code changes cause Vite HMR which resets `window.*` globals.
  Don't edit code while a bot run is in progress.
- **Upgrade delta noise:** The ±30s kill-rate window is noisy. Trust deltas > ±15% only.
- **Level threshold:** Winning requires approximately level 10+. Gem collection efficiency
  is the primary driver — bots that ignore gems die mid-game.
- **Tank burst damage:** At late game (~8:00), tanks can deal fatal burst damage in under
  1 second. May need tuning once more mechanics are added.
- **Split Shot formula:** Uses `(i - (shots-1)/2) * 0.2` — NOT `((i/(shots-1))-0.5)*0.4`.
  The old formula had no centre shot with 2 projectiles (both missed direct-aimed enemies).

---

## Deployment

GitHub Actions deploys to GitHub Pages on every push to `master`.
Workflow: `.github/workflows/deploy.yml`
Live URL: https://philipdnichols.github.io/clotato/

The `base` in `vite.config.ts` is set to `/clotato/` for correct asset paths on Pages.

---

## What NOT to Do

- Don't rebalance upgrades/enemies without running a full playtest suite first
- Don't use `scene.pause()` — breaks keyboard input (use `gameOver` flag instead)
- Don't run multiple Playwright bot agents in parallel
- Don't remove `usePolling` from vite.config.ts
- Don't add bot strategies that read internal game state not exposed via `BotGameState` —
  this would be "cheating" (bots should only see what a real player could see)
