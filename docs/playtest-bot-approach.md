# Automated Playtesting Bot Approach

A reusable pattern for attaching an AI playtester to a real-time browser game so that
Claude can run full playtests autonomously, read structured reports, and iterate on the
game — and for capturing human play sessions as a baseline for comparison.

---

## Core Principle

Real-time games run at 60fps — Playwright can't react at game speed. The bot must live
**inside** the game loop, making decisions each frame. Playwright's role is limited to:
launching the session, waiting for completion, and reading the output file.

Bot data is only valid for **comparing strategies against each other** and against human
baselines. Never use bot-only data to conclude that the game is too hard or too easy —
a skilled human player will always outperform any bot strategy. The useful question is:
*"what does the relative delta between strategies tell us?"*

---

## Architecture

```
Browser (Phaser game)
  ├── BotPlayer (activated via ?bot=<strategy>)
  │     ├── Strategy (getMovement, chooseUpgrade)
  │     └── PlaytestReporter (stats, events, heuristic opinions)
  │           └── writes → window.__playtestReport + window.__playtestDone = true
  │
  └── PlaytestReporter in recorder mode (activated via ?record=true)
        └── writes → window.__humanPlaytestReport + window.__humanPlaytestDone = true

Vite dev server
  └── POST /api/save-playtest → playtests/<strategy>_<date>.json (auto-saved on game end)

Playwright (Claude's eyes)
  ├── navigates to /?bot=kiter&speed=4&runs=2
  ├── polls window.__playtestDone
  └── reads window.__playtestReport (already saved to disk by Vite plugin)
```

After all strategies complete, Claude reads all reports, synthesizes findings, and
proposes concrete code changes. Human session reports serve as the benchmark.

---

## URL Params

No impact on normal play — all params are opt-in:

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `bot` | strategy name | (off) | Enables bot mode with named strategy |
| `speed` | number | 1 | Time scale multiplier (4 = 4x faster, bots only) |
| `runs` | number | 1 | Auto-restart and run N sessions back-to-back |
| `seed` | integer | (off) | Seeds the RNG — same seed = identical upgrade offers + spawn positions |
| `record` | `true` | (off) | Record a human session; no bot, normal speed |
| `upgrades` | comma-separated labels | (off) | Pre-load upgrade sequence for `human_emulator` |
| `focus` | upgrade id | (off) | Sets preferred upgrade for `upgrade_focus` strategy |

Examples:
```
/?bot=kiter&speed=4&runs=2
/?bot=aggressive&speed=4&runs=2&seed=42
/?bot=kiter&speed=4&runs=2&seed=42          # same seed as aggressive — apples-to-apples
/?bot=upgrade_sampler&speed=4&runs=2
/?bot=upgrade_focus&focus=fire_rate&speed=4&runs=2
/?bot=human_emulator&speed=4&runs=2&upgrades=Extra%20Tuber,Rapid%20Starch,Sharp%20Potato
/?record=true
/?record=true&seed=42                        # fixed upgrade offers for reproducible human run
```

---

## Strategy Types

### Playstyle Strategies
Test game feel, difficulty curve, and balance.

| Strategy | Behavior | Best for testing |
|----------|----------|-----------------|
| `kiter` | Circles wide, flees enemies, drifts toward gems | Survivability, baseline competence |
| `aggressive` | Charges nearest enemy at all times, DPS-first upgrades | Whether offense compensates for taking hits |
| `collector` | Beelines to nearest gem, orbits enemies when no gems present | Pickup radius feel, gem density tuning |
| `gem_ignorer` | Kiter movement + actively avoids gems | Whether XP denial is a viable playstyle; gem placement |
| `human_emulator` | Kiter movement + exact human upgrade sequence | Isolates movement skill vs upgrade choices |

### Testing Strategies
Stress-test specific systems regardless of playstyle.

| Strategy | Behavior | Best for testing |
|----------|----------|-----------------|
| `random` | Random movement + random upgrades | New player experience, edge cases |
| `upgrade_sampler` | Kiter movement, never repeats an upgrade | All upgrade paths exercised |
| `upgrade_focus` | Kiter movement, always picks `?focus=<id>` when offered | Single upgrade deep-stack testing |
| `stress_test` | Stands completely still, HP-first upgrades | Raw incoming DPS per wave, damage tuning |
| `late_game` | God mode until 7:00, then kiter movement | Late-game waves bots can't otherwise reach |

---

## Seeded RNG

All gameplay-affecting randomness (enemy type selection, spawn positions, upgrade offers,
random bot movement) runs through a seeded PRNG. Cosmetic effects (splatter textures,
explosion particles, gem scatter jitter) remain unseeded.

**When to use a seed:**
- Cross-strategy comparison — `?seed=42` on kiter and aggressive gives both the exact
  same upgrade draws, removing RNG as a confounding factor
- Reproducing a specific run — note the seed from a report's `meta.seed` field and replay
- Validating a balance fix — run before/after with the same seed to isolate the change

**Multi-run sessions:** run 1 gets seed `n`, run 2 gets `n+1`, etc. Runs differ but stay
reproducible.

**Without a seed:** `resetToRandom()` is called, falling back to `Math.random()` — normal
human sessions are unaffected.

---

## Speed Validation

Speed multiplier has been empirically validated across 6 runs (2× at each of 1x, 2x, 4x):

| Speed | Wins | Avg kills/min (winning runs) |
|-------|------|------------------------------|
| 1x | 2/2 | 178.3 |
| 2x | 1/2 | 178.7 (winning run) |
| 4x | 1/2 | 177.9 (winning run) |

Winning runs are statistically identical across all speeds (~178 kills/min, <1% variance).
Losses are RNG variance from bad upgrade draws, not speed artifacts. **Use 4x for all bot
runs** — 4× faster data collection with no tradeoff in result quality.

---

## Human Session Recording

Play normally with `?record=true`. On game end (death or win):
- Report is auto-saved to `playtests/human_<date>.json` via the Vite plugin
- `window.__humanPlaytestReport` is also populated (same schema as bot reports)
- `window.__humanPlaytestDone = true`
- Console logs the session summary

**Claude's workflow for a human session:**
```
1. Ask user to navigate to /?record=true and play a full run
2. User signals they're done — report is already saved to playtests/human_<date>.json
3. Read playtests/human_<date>.json directly (no Playwright needed)
4. Extract upgrade sequence: runs[0].upgrades.map(u => u.chosen)
5. Run human_emulator: /?bot=human_emulator&speed=4&runs=2&upgrades=<encoded sequence>
6. Compare bot results to human baseline
```

**What the human report reveals:**
- Upgrade choices and order made by a skilled player
- Timeline showing HP management style
- Gem efficiency under real decision-making
- How the human handles the same waves that kill bots

---

## The Human Emulator Strategy

`human_emulator` replays the human player's exact upgrade sequence in order,
using kiter movement for everything else.

**What this isolates:** "If a bot had the same power-ups as the human but moved
suboptimally, how much worse would it do?" This quantifies the value of skilled
movement as a number (survival time delta, kills delta).

**How to run it:**
```javascript
// Extract sequence from a saved human report:
const seq = report.runs[0].upgrades.map(u => u.chosen);
const encoded = seq.map(s => encodeURIComponent(s)).join(',');
// Navigate to:
// /?bot=human_emulator&speed=4&runs=2&upgrades=<encoded>
```

The sequence is embedded in the URL so it survives page reloads and resets
correctly at the start of each run.

---

## Report Schema

Both bot and human recording use the same `PlaytestReport` schema:

```json
{
  "meta": {
    "strategy": "kiter",
    "timestamp": "2026-03-16T14:32:00Z",
    "survived": "4:12",
    "survivedSeconds": 252,
    "won": false,
    "deathCause": "swarm",
    "levelReached": 6,
    "timeScale": 4,
    "runIndex": 1,
    "seed": 42
  },
  "stats": {
    "killsTotal": 87,
    "killsPerMin": 20.7,
    "damageTakenTotal": 94,
    "damageTakenPerMin": 22.4,
    "gemsSpawned": 180,
    "gemsCollected": 122,
    "gemEfficiencyPct": 67.8
  },
  "upgrades": [
    {
      "level": 2,
      "chosen": "Sharp Potato",
      "offered": ["Sharp Potato", "Greased Spud", "Extra Tuber"],
      "statsBefore": { "killsPerMin": 12.1, "damageTakenPerMin": 4.2, "hp": 98 },
      "statsAfter":  { "killsPerMin": 14.3, "damageTakenPerMin": 3.8 },
      "deltaNote": "kills/min 14.3 (+18% vs before)"
    }
  ],
  "timeline": [
    { "t": 30,  "hp": 98,  "level": 1, "kills": 8,  "killsPerMin": 16.0, "damageTakenPerMin": 0 },
    { "t": 60,  "hp": 71,  "level": 2, "kills": 19, "killsPerMin": 14.2, "damageTakenPerMin": 22.4 }
  ],
  "events": [
    { "t": "1:45", "type": "near_death",      "note": "HP dropped to 18 (12%)" },
    { "t": "3:00", "type": "difficulty_spike", "note": "Damage rate doubled: 12 → 38 in last 30s" },
    { "t": "4:12", "type": "death",            "note": "Killed by swarm, HP 0" }
  ],
  "opinions": [
    "[STRONG UPGRADE] Sharp Potato: kills/min +18% after pickup",
    "[DANGER] 4 near-death events — game is very punishing",
    "[HIGH DPS] 20.7 kills/min — player feels powerful"
  ]
}
```

Human sessions wrap the single run in the same outer envelope:
```json
{ "strategy": "human", "runs": [<PlaytestReport>] }
```

---

## Heuristic Opinion Rules

Threshold rules applied to collected stats. Add new rules as the game grows.

| Rule | Threshold | Opinion label |
|------|-----------|---------------|
| Upgrade increased kills/min | > +15% delta | `[STRONG UPGRADE]` |
| Upgrade decreased kills/min | < -10% delta | `[WEAK/NEGATIVE UPGRADE]` |
| HP fell below 20% | any event | `[DANGER] N near-death events` |
| Damage rate doubled in 30s window | prior > 5 hp | `[DIFFICULTY SPIKE X:XX]` |
| Gem collection efficiency | < 40% | `[LOW GEM EFFICIENCY]` |
| Gem collection efficiency | > 85% | `[HIGH GEM EFFICIENCY]` |
| Survived < 2 minutes | — | `[EARLY DEATH]` |
| Overall kill rate | > 30/min | `[HIGH DPS]` |
| Overall kill rate | < 5/min | `[LOW DPS]` |

---

## Interpreting Results

**Bots are bad players.** Always compare bots to the human baseline before drawing
balance conclusions. Valid uses of bot data:

- **Cross-strategy delta** — if kiter survives 3× longer than random, that tells you
  something about movement skill's value vs upgrade path.
- **Upgrade impact** — the `deltaNote` on each upgrade is consistent across strategies
  since it measures the same 30s window pre/post pickup. If an upgrade shows -15% for
  both random and kiter, it's likely genuinely weak.
- **Consistent death points** — if every bot dies to swarm at 7:00, and a human
  survives easily past that, the bots just can't handle the density. No balance change
  needed. But if the human also struggles at 7:00, investigate the wave.
- **Gem efficiency** — tells you about pickup radius and bot movement quality, not
  directly about difficulty.
- **Use seeds for controlled comparisons** — without a seed, two runs of the same strategy
  can diverge significantly based on upgrade draw luck. With a seed, you can attribute
  differences to strategy behavior rather than RNG.

---

## Claude's Workflow

```
1. Run all strategies with a shared seed for controlled comparison:
     ?bot=kiter&speed=4&runs=2&seed=42
     ?bot=aggressive&speed=4&runs=2&seed=42
     ?bot=upgrade_sampler&speed=4&runs=2&seed=42
     ... etc
2. Reports are auto-saved to playtests/<strategy>_<date>.json by the Vite plugin
3. Ask user to run ?record=true session for human baseline
4. Read all playtests/<strategy>_<date>.json files for analysis
5. Extract human upgrade sequence, run human_emulator×2 with same seed
6. Compare: human vs human_emulator isolates movement skill value
7. Compare: upgrade_sampler reveals which upgrades are universally strong/weak
8. Synthesize findings — focus on patterns that appear across multiple strategies
9. Propose specific code changes, re-run with same seed to verify improvement
```

---

## Important Caveats

- **Bot data alone is not sufficient** to conclude game balance is wrong. Always get
  a human session before recommending changes.
- **Upgrade delta measurements** have noise — the 30s window is tight and kill rate
  fluctuates naturally. Trust deltas > ±15%, be skeptical of ±5–10% deltas.
- **Speed multiplier does not affect results** — validated across 1x/2x/4x runs; winning
  runs land within 1% of each other on kills/min. Use 4x for all bot runs.
- **Gem efficiency** is heavily strategy-dependent. Random bots have poor efficiency
  (they leave gems behind); that's a movement artifact, not a radius bug.
- **Playwright shares a single browser tab** — never run multiple bot agents in parallel.
  Run them sequentially in one agent, or check `__playtestReport.strategy` to confirm
  you're reading the right run's data.

---

## Applying to a New Game

1. **Create `BotPlayer.ts`** — reads URL params, hooks into the game's update loop,
   overrides player input with strategy decisions each frame. Persists on `window`
   across `scene.restart()`.

2. **Define `BotGameState`** — a snapshot of game state: player position/stats,
   enemy positions, collectibles, elapsed time.

3. **Implement strategies** — each exports `getMovement(state)` and
   `chooseAction(options, state)`. Start with `random` and `kiter` as baselines.

4. **Create `PlaytestReporter.ts`** — collects per-frame stats, fires event rules,
   generates opinions. Mostly reusable; adjust opinion thresholds per game.

5. **Add seeded RNG** — create `rng.ts` with a PRNG (mulberry32 works well), replace
   all gameplay `Math.random()` calls, wire `?seed=<n>` in the entry point. Leave
   cosmetic effects (particles, visual jitter) unseeded to avoid burning RNG budget.

6. **Add `?record=true` mode** — attaches `PlaytestReporter` to the human player,
   exposes report on `window` at game end. Same schema as bot reports for direct
   comparison.

7. **Add Vite plugin for auto-save** — `POST /api/save-playtest` middleware in
   `vite.config.ts` writes reports to disk automatically. No copy-paste needed.

8. **Wire in URL params** — `?bot=<strategy>&speed=<n>&runs=<n>&seed=<n>&record=true`
   in the game's entry point. Parse `?upgrades=` for human_emulator, `?focus=` for
   upgrade_focus.

9. **Handle `scene.restart()`** — persist `BotPlayer` on `window` before restart,
   restore in `create()`. Re-seed RNG in `create()` using `baseSeed + runIndex` so
   each run in a multi-run session is deterministic but distinct.

---

## File Locations (per project)

```
src/
  rng.ts                 ← seeded PRNG, seedRng() / resetToRandom() / rng()
  bot/
    BotPlayer.ts           ← orchestrator, hooks into game loop
    BotTypes.ts            ← BotGameState, BotStrategy interfaces
    PlaytestReporter.ts    ← stats collection + heuristic opinions
    strategies/
      kiter.ts             ← skilled movement bot
      aggressive.ts        ← charges enemies, DPS-first upgrades
      collector.ts         ← beelines for gems, orbits enemies
      gemIgnorer.ts        ← avoids gems, tests XP-denial playstyle
      random.ts            ← baseline / edge case testing
      upgradeSampler.ts    ← exercises all upgrade paths
      upgradeFocus.ts      ← deep-stacks a single upgrade (?focus=<id>)
      stressTest.ts        ← stands still, measures raw incoming DPS
      lateGame.ts          ← god mode until 7:00, then kiter
      humanEmulator.ts     ← replays human upgrade sequence
playtests/                 ← output reports (gitignored or tracked per project)
docs/
  playtest-bot-approach.md ← this file
vite.config.ts             ← includes playtest-saver plugin (POST /api/save-playtest)
```
