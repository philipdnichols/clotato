# Clotato — TODO / Backlog

Items are roughly prioritised within each section. Add detail as designs become clearer.

---

## Asset Implementation Modes

Audio and graphics are implemented in three switchable modes via URL param `?assets=a|b|c`
(default: `b`). This allows direct comparison of feel and quality across approaches.

| Mode | Graphics | Audio |
|------|----------|-------|
| **A** — Free resources | Kenney.nl CC0 PNG sprites | Kenney.nl CC0 OGG files |
| **B** — Procedural code | Phaser `graphics` drawing (runtime) | ZzFX synthesised at runtime |
| **C** — LLM-authored | SVG files written by Claude | ZzFX params designed by Claude |

---

### Mode A — Free Online Resources (Kenney.nl, CC0)

**Audio:** Download these packs and place `.ogg` files in `public/audio/`:
- Top-Down Shooter — weapon fire, impacts: https://kenney.nl/assets/top-down-shooter
- Impact Sounds — hits, collisions: https://kenney.nl/assets/impact-sounds
- RPG Audio — item pickup, level-up: https://kenney.nl/assets/rpg-audio
- UI Audio — menu clicks, game over: https://kenney.nl/assets/ui-audio

**Graphics:** Download these packs and place `.png` files in `public/sprites/`:
- Roguelike Characters — fantasy creatures: https://kenney.nl/assets/roguelike-characters
- Pixel Platformer — characters and objects: https://kenney.nl/assets/pixel-platformer
- Top-Down Shooter — players and projectiles: https://kenney.nl/assets/top-down-shooter
- All-in-1 bundle (60k+ assets): https://kenney.itch.io/kenney-game-assets

**Status:** Infrastructure wired; requires manual download of asset packs before Mode A works.
See `src/assets/FreeAssets.ts` for expected filenames.

---

### Mode B — Procedural Code (no external files)

**Audio:** ZzFX (~1 KB JS sound synthesiser, `npm install zzfx`).
Each sound is a plain parameter array synthesised at runtime via Web Audio API.
Interactive designer: https://killedbyapixel.github.io/ZzFX/

**Graphics:** Enhanced Phaser 3 procedural drawing via `graphics.fillPolygon()` /
`graphics.fillCircle()` etc., baked to textures at startup with `generateTexture()`.
Entity designs: potato body with dot eyes (player), squat blob (slime), chip wedge (runner),
armoured square (tank), tiny oval (swarm), starch pellet (bullet), diamond (gem).

---

### Mode C — LLM-Authored Assets (SVG sprites + ZzFX)

**Audio:** Same ZzFX approach as Mode B (Claude cannot output binary audio files).

**Graphics:** SVG files authored by Claude, placed in `public/sprites/llm/`.
Phaser loads them via `this.load.svg()` (rasterised to bitmap on load).
Each entity has a hand-crafted SVG designed to convey the potato theme with clear
silhouettes and colour-coding that reads well at small game sizes.

---

### Implementation Plan

1. `src/assets/AssetMode.ts` — reads `?assets=` URL param, exports `ASSET_MODE` constant
   and `getAssetMode()` helper.
2. `src/assets/sounds.ts` — ZzFX parameter arrays for all SFX (shared by Mode B and C);
   `playSound(scene, key)` dispatcher that routes to Phaser audio or ZzFX.
3. `src/assets/GeneratedGraphics.ts` — Mode B procedural texture generation functions.
4. `src/assets/FreeAssets.ts` — Mode A file manifest + Phaser load calls.
5. `public/sprites/llm/` — SVG files for Mode C (player, slime, runner, tank, swarm,
   bullet, gem, background tile).
6. Add `preload()` to `GameScene` — branches on `ASSET_MODE` to build/load textures.
7. Replace hardcoded geometry in `Player`, `Enemy`, `Bullet`, `XPGem` with texture keys.
8. Call `playSound()` at each game event: shoot, enemy death, player hit, level-up,
   gem pickup, game-over.

---

## Audio & Juice

**Goal:** Make the game feel satisfying to play. Currently silent with minimal feedback.

- [ ] Add sound effects: shooting, enemy death, player hit, level-up, gem pickup, game over
- [ ] Add background music (looping, escalates with wave intensity)
- [ ] Screen shake on player hit and on death
- [ ] Hit-flash on enemies when damaged (brief white/red tint)
- [ ] Bullet impact effect (small spark/flash at hit point)
- [ ] Level-up fanfare / visual flash
- [ ] Gem collection particle burst
- [ ] Player invincibility frames after taking damage (brief flash + I-frames)

See **Asset Implementation Modes** above for how audio will be sourced (ZzFX vs Kenney).

---

## Graphics & Visual Polish

**Goal:** Replace programmer-art circles/rectangles with actual potato-themed pixel art.

- [ ] Player sprite — potato character with idle/move animation
- [ ] Enemy sprites — each type should be visually distinct (not just colour-coded circles)
  - Slime: small green blob
  - Runner: lean/fast potato chip?
  - Tank: large armoured potato
  - Swarm: tiny fry/pellet
- [ ] Bullet sprite — potato pellet / starch ball
- [ ] XP gem sprite — small gem or potato chip
- [ ] Improve enemy death effect (currently basic splatter circles)
  - Add screen-space flash
  - More dynamic splatter shape
  - Maybe brief "pop" animation before disappearing
- [ ] Background — more interesting than flat grid (parallax layers? dirt/field texture?)
- [ ] UI improvements — styled HP bar, animated kill counter, better fonts

See **Asset Implementation Modes** above for how sprites will be sourced (procedural vs Kenney).

---

## Gameplay / Mechanics

**Goal:** Expand beyond the MVP loop with more interesting decisions and variety.

- [ ] More enemy types
  - Ranged enemy (shoots back at player)
  - Exploding enemy (area damage on death)
  - Boss enemies at fixed time milestones (2:00, 5:00, 8:00)
- [ ] More upgrades / weapons
  - Area-of-effect weapon (potato bomb, splash damage)
  - Piercing bullets
  - Orbiting projectiles
  - Shield / damage reduction
  - XP multiplier
- [ ] HP regeneration option (slow regen upgrade)
- [ ] Chests / special drops (rare items with strong effects)
- [ ] Experience curve tuning (currently linear per-level cost — may need adjustment)

---

## Bot System Isolation

**Priority:** Medium (revisit after more mechanics are stable)

**Problem:** Bot code currently lives inside the game project (`src/bot/`). This has risks:
1. Bots could theoretically "cheat" by accessing internal game state beyond what a real
   player could perceive (e.g. reading off-screen enemy positions, future wave schedules)
2. Bot code can influence game results if it accidentally imports and modifies game state
3. Coupling makes it harder to test bots against different game versions

**Proposed approach:**
- Move `src/bot/` to a separate repository / npm package
- Define a clean `BotAPI` interface: the game exposes only what's visible on screen
  (player position/stats, visible enemies, visible gems, elapsed time)
- Bots are injected at runtime via a `?botUrl=<script>` param — game fetches and evals
  an external script that registers a strategy
- This mirrors how a human player perceives the game (no hidden information)

**Details to figure out:**
- How to handle the `PlaytestReporter` — stays in-game (it's a testing tool, not a bot)
- Security model for injected scripts (probably fine for local dev; not a prod concern)
- Whether to use a message-passing architecture (postMessage) instead of direct JS

---

## Infrastructure / Developer Experience

- [ ] Add unit tests for upgrade system (stat calculations, stacking)
- [ ] Add unit tests for wave timing / enemy weights
- [ ] Consider adding a wave editor / debug overlay to visualise spawn zones
- [ ] Add `?debug` URL param to show: hitboxes, gem pickup radius, spawn positions
- [ ] Gitignore `playtests/` or track it — decide per project convention

---

## Deferred Balancing

**Note:** Do not balance until more mechanics are in place. The current MVP has too few
variables to balance meaningfully. Revisit after:
- At least 2-3 more enemy types are added
- At least 3-4 more upgrades/weapons are added
- Audio is in (feel heavily influences perceived difficulty)

**Findings to revisit when balancing:**
- Tank burst damage at ~8:00 can one-shot full-HP players — may be too spikey
- Runner wave at ~2:15 is a hard wall for passive builds — check if this is fun for new players
- Level 10 appears to be the win/lose threshold — verify this remains true with more content
- Kiter bot (competent play) consistently hits level 8-9 but can't win — suggests mid-game
  difficulty is slightly above "competent but not optimal" player skill
