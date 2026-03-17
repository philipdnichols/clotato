# Clotato — TODO / Backlog

Items are roughly prioritised within each section. Add detail as designs become clearer.

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
