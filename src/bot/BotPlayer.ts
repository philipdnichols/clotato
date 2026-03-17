import type { BotStrategy, BotGameState } from './BotTypes';
import type { UpgradeDef } from '../data/upgrades';
import { PlaytestReporter } from './PlaytestReporter';
import { kiterStrategy } from './strategies/kiter';
import { randomStrategy } from './strategies/random';
import { upgradeSamplerStrategy } from './strategies/upgradeSampler';
import { humanEmulatorStrategy } from './strategies/humanEmulator';
import { aggressiveStrategy } from './strategies/aggressive';
import { stressTestStrategy } from './strategies/stressTest';
import { lateGameStrategy } from './strategies/lateGame';
import { collectorStrategy } from './strategies/collector';
import { gemIgnorerStrategy } from './strategies/gemIgnorer';
import { upgradeFocusStrategy } from './strategies/upgradeFocus';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { XPGem } from '../entities/XPGem';

const STRATEGIES: Record<string, BotStrategy> = {
  kiter: kiterStrategy,
  random: randomStrategy,
  upgrade_sampler: upgradeSamplerStrategy,
  human_emulator: humanEmulatorStrategy,
  aggressive: aggressiveStrategy,
  stress_test: stressTestStrategy,
  late_game: lateGameStrategy,
  collector: collectorStrategy,
  gem_ignorer: gemIgnorerStrategy,
  upgrade_focus: upgradeFocusStrategy,
};

export class BotPlayer {
  readonly strategy: BotStrategy;
  readonly timeScale: number;
  readonly totalRuns: number;

  currentRun = 1;
  reporter!: PlaytestReporter;
  private allReports: unknown[] = [];

  private prevGemsCollected = 0;
  private prevGemsSpawned = 0;

  constructor(strategyName: string, timeScale: number, runs: number) {
    this.strategy = STRATEGIES[strategyName] ?? kiterStrategy;
    this.timeScale = timeScale;
    this.totalRuns = runs;
    this.startRun();
  }

  private lastLoggedSecond = -1;
  private lastHp = -1;
  private wasNearDeath = false;

  private startRun(): void {
    this.reporter = new PlaytestReporter(this.strategy.name, this.timeScale, this.currentRun);
    this.prevGemsCollected = 0;
    this.prevGemsSpawned = 0;
    this.lastLoggedSecond = -1;
    this.lastHp = -1;
    this.wasNearDeath = false;
    console.log(`[BOT] ▶ Starting run ${this.currentRun}/${this.totalRuns} — strategy: ${this.strategy.name}`);
  }

  /** Called each frame from GameScene.update — returns velocity to apply to player */
  update(
    player: Player,
    enemies: Enemy[],
    gems: XPGem[],
    elapsed: number,
    kills: number,
    gemsSpawnedTotal: number,
    gemsCollectedTotal: number,
  ): { vx: number; vy: number } {
    const state = this.buildState(player, enemies, gems, elapsed, kills);

    this.strategy.onUpdate?.(state);

    const gemSpawnedDelta = gemsSpawnedTotal - this.prevGemsSpawned;
    const gemCollectedDelta = gemsCollectedTotal - this.prevGemsCollected;
    this.prevGemsSpawned = gemsSpawnedTotal;
    this.prevGemsCollected = gemsCollectedTotal;

    this.reporter.onFrame(state, gemSpawnedDelta, gemCollectedDelta);
    this.logFrame(state);

    const { vx, vy } = this.strategy.getMovement(state);
    return { vx, vy };
  }

  private logFrame(state: BotGameState): void {
    const { player, elapsed, kills } = state;
    const sec = Math.floor(elapsed);
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    // Status line every 30 game-seconds
    if (sec > 0 && sec % 30 === 0 && sec !== this.lastLoggedSecond) {
      this.lastLoggedSecond = sec;
      const hpPct = Math.round((player.hp / player.maxHp) * 100);
      const enemies = state.enemies.length;
      console.log(
        `[BOT ${fmt(elapsed)}] Run ${this.currentRun}/${this.totalRuns} | ` +
        `HP: ${Math.ceil(player.hp)}/${player.maxHp} (${hpPct}%) | ` +
        `Lvl: ${player.level} | Kills: ${kills} | Enemies: ${enemies}`,
      );
    }

    // Near-death warning (below 25% HP)
    const hpPct = player.hp / player.maxHp;
    if (hpPct < 0.25 && !this.wasNearDeath) {
      this.wasNearDeath = true;
      console.warn(`[BOT ${fmt(elapsed)}] ⚠ Near death! HP: ${Math.ceil(player.hp)}/${player.maxHp} (${Math.round(hpPct * 100)}%)`);
    } else if (hpPct >= 0.5) {
      this.wasNearDeath = false;
    }

    // Significant damage burst (>15 HP lost since last frame check)
    if (this.lastHp > 0 && this.lastHp - player.hp > 15) {
      const lost = Math.round(this.lastHp - player.hp);
      console.log(`[BOT ${fmt(elapsed)}] Took ${lost} damage — HP now ${Math.ceil(player.hp)}/${player.maxHp}`);
    }
    this.lastHp = player.hp;
  }

  /** Called when upgrade choices are presented — returns the chosen upgrade */
  chooseUpgrade(choices: UpgradeDef[], player: Player, enemies: Enemy[], gems: XPGem[], elapsed: number, kills: number): UpgradeDef {
    const state = this.buildState(player, enemies, gems, elapsed, kills);
    const chosen = this.strategy.chooseUpgrade(choices, state);
    this.reporter.onUpgradeOffered(choices, chosen, state);
    return chosen;
  }

  /** Called when the game ends (death or win) */
  onGameEnd(
    player: Player,
    enemies: Enemy[],
    gems: XPGem[],
    elapsed: number,
    kills: number,
    won: boolean,
    deathCause: string,
  ): { done: boolean; report: unknown } {
    const state = this.buildState(player, enemies, gems, elapsed, kills);
    const report = this.reporter.finalize(state, won, deathCause);
    this.allReports.push(report);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = report as any;
    console.log(
      `[BOT] ■ Run ${this.currentRun}/${this.totalRuns} ended — ` +
      `${won ? '✓ WIN' : `✗ died (${deathCause})`} | ` +
      `Survived: ${r.meta.survived} | Lvl: ${r.meta.levelReached} | Kills: ${r.stats.killsTotal}`,
    );

    if (this.currentRun < this.totalRuns) {
      this.currentRun++;
      this.startRun();
      return { done: false, report };
    }

    // All runs complete — expose results globally
    const finalOutput = {
      strategy: this.strategy.name,
      runs: this.allReports,
      summary: this.buildSummary(),
    };
    (window as unknown as Record<string, unknown>).__playtestReport = finalOutput;
    (window as unknown as Record<string, unknown>).__playtestDone = true;

    return { done: true, report: finalOutput };
  }

  get isLastRun(): boolean {
    return this.currentRun >= this.totalRuns;
  }

  private buildState(
    player: Player,
    enemies: Enemy[],
    gems: XPGem[],
    elapsed: number,
    kills: number,
  ): BotGameState {
    return {
      player: {
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.stats.maxHp,
        level: player.level,
        stats: player.stats,
      },
      enemies: enemies
        .filter(e => e.active && e.alive)
        .map(e => ({
          x: e.x, y: e.y,
          radius: e.def.radius,
          speed: e.def.speed,
          damage: e.def.damage,
          key: e.def.key,
        })),
      gems: gems
        .filter(g => g.active)
        .map(g => ({ x: g.x, y: g.y, attracted: g.attracted })),
      elapsed,
      kills,
    };
  }

  private buildSummary(): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reports = this.allReports as any[];
    if (reports.length === 0) return {};

    const avgSurvived = reports.reduce((s, r) => s + r.meta.survivedSeconds, 0) / reports.length;
    const avgKillsPerMin = reports.reduce((s, r) => s + r.stats.killsPerMin, 0) / reports.length;
    const avgGemEfficiency = reports.reduce((s, r) => s + r.stats.gemEfficiencyPct, 0) / reports.length;
    // Count how many runs contain each opinion tag (not total occurrences)
    const opinionCounts = new Map<string, number>();
    for (const report of reports) {
      const seenTags = new Set<string>();
      for (const op of (report as { opinions: string[] }).opinions) {
        const tag = op.match(/\[.*?\]/)?.[0] ?? op;
        if (!seenTags.has(tag)) {
          seenTags.add(tag);
          opinionCounts.set(tag, (opinionCounts.get(tag) ?? 0) + 1);
        }
      }
    }
    const recurringOpinions = [...opinionCounts.entries()]
      .filter(([, n]) => n >= 2)
      .map(([tag, n]) => `${tag} appeared in ${n}/${reports.length} runs`);

    return {
      runsCompleted: reports.length,
      avgSurvivedSeconds: Math.round(avgSurvived),
      avgSurvived: `${Math.floor(avgSurvived / 60)}:${String(Math.floor(avgSurvived % 60)).padStart(2, '0')}`,
      avgKillsPerMin: Math.round(avgKillsPerMin * 10) / 10,
      avgGemEfficiencyPct: Math.round(avgGemEfficiency),
      recurringOpinions,
    };
  }
}
