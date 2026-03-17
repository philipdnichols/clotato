# Clotato — Game Design Document

> Version: 0.1 (MVP)
> This document is the authoritative specification for Clotato. It should be detailed
> enough that a developer reading it cold can reproduce the codebase from scratch.

---

## 1. Concept

**Clotato** is a potato-themed auto-shooter survival game in the style of Vampire Survivors.
The player controls a potato that automatically shoots at the nearest enemy. The goal is to
survive 10 minutes of increasingly difficult enemy waves while leveling up via XP gems dropped
by enemies.

- **Genre:** Auto-shooter / bullet heaven / survivor
- **Platform:** Browser (desktop), built with Phaser 3 + TypeScript + Vite
- **Session length:** 10 minutes (fixed)
- **Win condition:** Survive for 10:00
- **Loss condition:** HP reaches 0

---

## 2. Technical Stack

| Layer | Technology |
|-------|-----------|
| Renderer / Physics | Phaser 3.90 (arcade physics) |
| Language | TypeScript |
| Build tool | Vite |
| Dev environment | WSL2 (Ubuntu on Windows) |
| Deployment | GitHub Pages (via GitHub Actions) |

**Project structure:**
```
src/
  main.ts                  ← Phaser game config, scene registration
  rng.ts                   ← Seeded PRNG (mulberry32)
  data/
    upgrades.ts            ← UpgradeDef[], PlayerStats, BASE_STATS
    enemies.ts             ← EnemyDef[]
    waves.ts               ← WAVE_CONFIGS[], GAME_DURATION
  entities/
    Player.ts              ← Player sprite, stats, HP, XP, level
    Enemy.ts               ← Enemy sprite, def ref, alive flag
    Bullet.ts              ← Bullet sprite, object pool
    XPGem.ts               ← XP gem sprite, attracted flag, value
  systems/
    WaveManager.ts         ← Spawns enemies on timer, weighted random selection
    UpgradeManager.ts      ← Picks 3 random upgrades, applies chosen upgrade
  scenes/
    GameScene.ts           ← Main game loop: movement, shooting, enemies, gems
    UIScene.ts             ← HUD overlay (HP bar, kills, timer)
    UpgradeScene.ts        ← Pause-style upgrade selection screen
    PauseScene.ts          ← P key pause overlay
  bot/
    BotPlayer.ts           ← Bot orchestrator (see Bot System section)
    BotTypes.ts            ← BotGameState, BotStrategy interfaces
    PlaytestReporter.ts    ← Stats/events/opinions collector
    strategies/            ← Individual bot strategy files
```

---

## 3. World

- **World size:** 3200 × 3200 pixels
- **Background:** Dark (#111) with a subtle grid (64px cells, #222, 50% opacity)
- **Camera:** Follows player with lerp (0.1, 0.1), bounded to world edges
- **Player start:** World centre (1600, 1600)

---

## 4. Player

### 4.1 Base Stats

| Stat | Value | Description |
|------|-------|-------------|
| `maxHp` | 100 | Starting max HP |
| `speed` | 140 | Move speed (pixels/sec) |
| `damage` | 10 | Damage per bullet |
| `fireRate` | 1.5 | Shots per second |
| `projectileSpeed` | 300 | Bullet speed (pixels/sec) |
| `projectileCount` | 1 | Bullets fired per shot |
| `pickupRadius` | 50 | Gem magnet radius (pixels) |

### 4.2 Movement
- 8-directional movement via WASD or arrow keys
- Velocity normalised for diagonal movement (no speed boost diagonally)
- Bounded to world (Phaser world bounds)

### 4.3 Shooting
- Auto-aims at nearest active enemy each frame
- Fires every `1 / fireRate` seconds
- If `projectileCount > 1`, fires N bullets in a symmetric spread:
  - Spread formula: `offset = (i - (shots-1)/2) * 0.2` radians
  - 1 shot: no spread (centre only)
  - 2 shots: −0.1 rad, +0.1 rad (tight flanking)
  - 3 shots: −0.2, 0, +0.2 (classic V with centre)
  - 4 shots: −0.3, −0.1, +0.1, +0.3
- No target = no shooting
- Bullets are pooled (max 200), recycled on hit or leaving world bounds

### 4.4 HP & Death
- Contact with enemy deals `enemy.damage` per frame (distance check, not physics collider)
- HP is a float; displayed as rounded in HUD
- At HP ≤ 0: game over screen shown (GAME OVER)
- HP does NOT regenerate

### 4.5 XP & Leveling
- Each level requires 1 gem per level (level 1→2 needs 1 gem, level 5→6 needs 5 gems — verify in Player.ts)
- On level-up: `UpgradeScene` launches (GameScene pauses via scene manager), player picks 1 of 3 offered upgrades
- Level is tracked as an integer, no cap

---

## 5. Enemies

Four enemy types, spawned by `WaveManager` off-screen:

| Key | Colour | Radius | Speed | HP | XP | Damage | Notes |
|-----|--------|--------|-------|----|----|--------|-------|
| `slime` | Green `#44ff44` | 10 | 60 | 3 | 1 | 5 | Basic slow enemy |
| `runner` | Orange `#ff8844` | 8 | 110 | 2 | 1 | 4 | Fast, low HP |
| `tank` | Purple `#8844ff` | 18 | 35 | 12 | 4 | 10 | Slow, very tanky |
| `swarm` | Red `#ff4444` | 6 | 90 | 1 | 1 | 3 | Fast, tiny, huge numbers |

### 5.1 Enemy Behaviour
- Move directly toward player each frame at `enemy.speed`
- No pathfinding — straight line
- Death: remove from scene, spawn XP gems at death position, play splatter effect

### 5.2 Spawning
- Spawn off-screen (60px outside camera viewport edges)
- Spawn position randomised along a random edge (top/right/bottom/left)
- Enemy type picked by weighted random from `WAVE_CONFIGS[current].weights`

### 5.3 Death Effects
- Blood splatter texture generated procedurally at startup (3 variants, random radius/angle)
- Splatter placed at death position, fades via tween (depth below player)
- XP gems scatter slightly from death position (±10px random offset)

---

## 6. XP Gems

- Dropped at enemy death position, one gem per XP point (tank = 4 gems)
- **Magnet mechanic:** gems within `pickupRadius` of player gain `attracted = true` and fly toward player at 200 px/s
- **Collection:** distance check each frame; gems within 8px of player are collected
- Collected gems add 1 XP to player; enough XP triggers level-up

---

## 7. Upgrades

Seven upgrades, offered in random groups of 3 at each level-up. No repeat prevention by default (upgrade_sampler strategy enforces no-repeat for testing purposes).

| ID | Label | Effect | Notes |
|----|-------|--------|-------|
| `more_damage` | Sharp Potato | +25% damage | Multiplicative |
| `fire_rate` | Rapid Starch | +20% fire rate | Multiplicative |
| `move_speed` | Greased Spud | +15% move speed | Multiplicative |
| `max_hp` | Extra Tuber | +25 max HP | Additive; heals to new max |
| `multishot` | Split Shot | +1 projectile | Additive |
| `proj_speed` | Turbo Tater | +25% projectile speed | Multiplicative |
| `pickup_radius` | Starchy Magnet | +50% pickup radius | Multiplicative |

Upgrades can be stacked multiple times (e.g. 5× Rapid Starch is valid).

---

## 8. Wave System

Waves are defined in `src/data/waves.ts` as `WAVE_CONFIGS`. Each config has:
- `startTime` (seconds) — when this wave config becomes active
- `rate` — enemy spawns per second
- `weights` — probability weights per enemy type

Wave config is selected by finding the last config whose `startTime ≤ elapsed`.

`GAME_DURATION` = 600 seconds (10 minutes).

**Key difficulty events (observed in playtesting):**
- ~2:15 — Runner wave arrives; stationary targets die in seconds
- ~4:00-4:30 — Significant damage spike; builds below level 7-8 struggle
- ~7:00+ — Late game; survivable if player reached level 10+
- Level 10 appears to be the approximate threshold for consistently winning

---

## 9. Game Scenes

### GameScene (main)
- Manages all gameplay: movement, shooting, enemy spawning/movement, gem collection
- Runs at configurable time scale (`?speed=<n>`) for bot testing
- `update()` returns early if `this.gameOver` is true (keeps scene active for keyboard input)
- On game end: stops camera follow, disables player physics body, shows overlay

### UIScene (overlay)
- Runs in parallel with GameScene
- Shows: HP bar, level, kills counter, elapsed timer (top of screen)

### UpgradeScene
- Launched when player levels up (GameScene stays running but player can't shoot)
- Shows 3 upgrade cards; click or keyboard to select
- On selection: applies upgrade, resumes GameScene, records choice in bot reporter

### PauseScene
- Launched on P key
- Pauses GameScene; resumes on any key

---

## 10. Controls

| Input | Action |
|-------|--------|
| WASD / Arrow keys | Move player |
| P | Pause |
| R (on game over screen) | Restart |
| Click / keyboard on upgrade cards | Select upgrade |

---

## 11. Visual Style

- **Aesthetic:** Minimal / programmer art (placeholder sprites)
- **Player:** Circular sprite, potato-coloured
- **Enemies:** Solid-colour circles, size reflects radius stat
- **Bullets:** Small rectangles/circles
- **Background:** Dark with grid lines
- **Effects:** Procedural splatter (circles), gem particle explosion on collection (planned)

> **TODO:** Replace placeholder circle/rectangle sprites with actual potato-themed pixel art.
> Add screen shake, flash effects, and audio for juice.

---

## 12. Bot Testing System

See `docs/playtest-bot-approach.md` for the full bot testing methodology.

**Summary:**
- Bots live inside the game loop, activated via `?bot=<strategy>&speed=<n>&runs=<n>`
- 10 strategies cover playstyle extremes and specific system tests
- `?record=true` captures human sessions in the same report schema
- Reports auto-saved to `playtests/<strategy>_<date>.json` via Vite dev server plugin
- `?seed=<n>` seeds all gameplay RNG for controlled cross-strategy comparisons
- Speed multiplier validated: 4x produces statistically identical results to 1x

**Key playtest findings (MVP baseline):**
- Human player won at level 14, 178 kills/min, 92% gem efficiency, 1 total HP damage
- Level 10+ is the approximate win threshold across all strategies
- Gem collection efficiency is the primary driver of level progression
- Runner wave at ~2:15 is a hard wall for passive/stationary builds (by design)

---

## 13. Planned Features (TODO)

See `docs/TODO.md` for the full list. High-level:

1. **Audio & juice** — sound effects, screen shake, visual feedback
2. **Better graphics** — pixel art sprites, particle effects, improved death FX
3. **More enemy types** — ranged enemies, enemies with special abilities
4. **More upgrades** — area effects, pierce, orbit weapons, shields
5. **Meta progression** — between-run unlocks
6. **Bot system isolation** — move bot code to a separate project with a clean API

---

## 14. Out of Scope (v0.1)

- Mobile / touch support
- Multiplayer
- Leaderboards
- Save/load
- Settings menu
- Sound (placeholder)
