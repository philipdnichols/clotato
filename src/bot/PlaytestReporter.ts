import type { BotGameState } from './BotTypes';
import type { UpgradeDef } from '../data/upgrades';

interface TimelineEntry {
  t: number;
  hp: number;
  level: number;
  kills: number;
  killsPerMin: number;
  damageTakenPerMin: number;
}

interface EventEntry {
  t: string;
  type: string;
  note: string;
}

interface UpgradeEntry {
  level: number;
  chosen: string;
  offered: string[];
  statsBefore: { killsPerMin: number; damageTakenPerMin: number; hp: number };
  statsAfter?: { killsPerMin: number; damageTakenPerMin: number };
  deltaNote?: string;
}

export interface PlaytestReport {
  meta: {
    strategy: string;
    timestamp: string;
    survived: string;
    survivedSeconds: number;
    won: boolean;
    deathCause: string;
    levelReached: number;
    timeScale: number;
    runIndex: number;
    seed: number | null;
  };
  stats: {
    killsTotal: number;
    killsPerMin: number;
    damageTakenTotal: number;
    damageTakenPerMin: number;
    gemsSpawned: number;
    gemsCollected: number;
    gemEfficiencyPct: number;
  };
  upgrades: UpgradeEntry[];
  timeline: TimelineEntry[];
  events: EventEntry[];
  opinions: string[];
}

export class PlaytestReporter {
  private strategy: string;
  private timeScale: number;
  private runIndex: number;
  seed: number | null = null;
  private startTime = Date.now();

  private timeline: TimelineEntry[] = [];
  private events: EventEntry[] = [];
  private upgrades: UpgradeEntry[] = [];

  private lastTimelineSample = 0;
  private lastHp = 100;
  private lastKills = 0;
  private damageTakenTotal = 0;
  private gemsSpawned = 0;
  private gemsCollected = 0;

  // Rolling windows for rate calculation
  private killWindow: number[] = []; // timestamps of kills (in game seconds)
  private damageWindow: { t: number; amount: number }[] = [];

  private pendingUpgrade: UpgradeEntry | null = null;
  private postUpgradeWait = 0; // frames to wait after upgrade before recording "after" stats

  constructor(strategy: string, timeScale: number, runIndex: number) {
    this.strategy = strategy;
    this.timeScale = timeScale;
    this.runIndex = runIndex;
  }

  onFrame(state: BotGameState, gemsSpawnedDelta: number, gemsCollectedDelta: number): void {
    const { player, elapsed, kills } = state;

    // Track gem counts
    this.gemsSpawned += gemsSpawnedDelta;
    this.gemsCollected += gemsCollectedDelta;

    // Track damage taken
    const hpDelta = this.lastHp - player.hp;
    if (hpDelta > 0) {
      this.damageTakenTotal += hpDelta;
      this.damageWindow.push({ t: elapsed, amount: hpDelta });
      this.damageWindow = this.damageWindow.filter(d => elapsed - d.t < 60);
    }
    this.lastHp = player.hp;

    // Track kills for rate
    if (kills > this.lastKills) {
      for (let i = 0; i < kills - this.lastKills; i++) {
        this.killWindow.push(elapsed);
      }
      this.killWindow = this.killWindow.filter(k => elapsed - k < 60);
      this.lastKills = kills;
    }

    // Near-death detection
    const hpPct = player.hp / player.maxHp;
    if (hpPct < 0.2 && hpDelta > 0) {
      this.events.push({
        t: this.formatTime(elapsed),
        type: 'near_death',
        note: `HP dropped to ${Math.round(player.hp)} (${Math.round(hpPct * 100)}%)`,
      });
    }

    // Post-upgrade stats capture
    if (this.pendingUpgrade) {
      this.postUpgradeWait--;
      if (this.postUpgradeWait <= 0) {
        const kpm = this.killsPerMin(elapsed);
        const dtpm = this.damagePerMin(elapsed);
        this.pendingUpgrade.statsAfter = { killsPerMin: kpm, damageTakenPerMin: dtpm };
        const kpmBefore = this.pendingUpgrade.statsBefore.killsPerMin;
        if (kpmBefore > 0) {
          const delta = ((kpm - kpmBefore) / kpmBefore * 100).toFixed(0);
          this.pendingUpgrade.deltaNote = `kills/min ${kpm.toFixed(1)} (${Number(delta) >= 0 ? '+' : ''}${delta}% vs before)`;
        }
        this.pendingUpgrade = null;
      }
    }

    // Timeline snapshot every 30s
    if (elapsed - this.lastTimelineSample >= 30) {
      this.lastTimelineSample = elapsed;
      this.timeline.push({
        t: Math.round(elapsed),
        hp: Math.round(player.hp),
        level: player.level,
        kills,
        killsPerMin: Math.round(this.killsPerMin(elapsed) * 10) / 10,
        damageTakenPerMin: Math.round(this.damagePerMin(elapsed) * 10) / 10,
      });
    }

    // Difficulty spike detection: damage rate doubled in last 30s vs previous 30s
    if (elapsed > 60 && Math.round(elapsed) % 30 === 0) {
      const recent = this.damageWindow.filter(d => elapsed - d.t < 30).reduce((s, d) => s + d.amount, 0);
      const prior = this.damageWindow.filter(d => elapsed - d.t >= 30 && elapsed - d.t < 60).reduce((s, d) => s + d.amount, 0);
      if (prior > 5 && recent > prior * 2) {
        this.events.push({
          t: this.formatTime(elapsed),
          type: 'difficulty_spike',
          note: `Damage rate doubled: ${prior.toFixed(0)} → ${recent.toFixed(0)} in last 30s`,
        });
      }
    }
  }

  onUpgradeOffered(choices: UpgradeDef[], chosen: UpgradeDef, state: BotGameState): void {
    const elapsed = state.elapsed;
    this.pendingUpgrade = {
      level: state.player.level,
      chosen: chosen.label,
      offered: choices.map(c => c.label),
      statsBefore: {
        killsPerMin: this.killsPerMin(elapsed),
        damageTakenPerMin: this.damagePerMin(elapsed),
        hp: state.player.hp,
      },
    };
    this.upgrades.push(this.pendingUpgrade);
    this.postUpgradeWait = 180; // ~3s of game time at 60fps to see the effect
  }

  onGemSpawned(): void { this.gemsSpawned++; }
  onGemCollected(): void { this.gemsCollected++; }

  finalize(state: BotGameState, won: boolean, deathCause: string): PlaytestReport {
    const elapsed = state.elapsed;

    this.events.push({
      t: this.formatTime(elapsed),
      type: won ? 'win' : 'death',
      note: won
        ? `Survived the full run at level ${state.player.level}`
        : `Killed by ${deathCause}, HP 0`,
    });

    const killsPerMin = elapsed > 0 ? (state.kills / elapsed) * 60 : 0;
    const damageTakenPerMin = elapsed > 0 ? (this.damageTakenTotal / elapsed) * 60 : 0;
    const gemEfficiency = this.gemsSpawned > 0
      ? (this.gemsCollected / this.gemsSpawned) * 100
      : 0;

    const opinions = this.generateOpinions(state, won, killsPerMin, damageTakenPerMin, gemEfficiency);

    return {
      meta: {
        strategy: this.strategy,
        timestamp: new Date(this.startTime).toISOString(),
        survived: this.formatTime(elapsed),
        survivedSeconds: Math.round(elapsed),
        won,
        deathCause,
        levelReached: state.player.level,
        timeScale: this.timeScale,
        runIndex: this.runIndex,
        seed: this.seed,
      },
      stats: {
        killsTotal: state.kills,
        killsPerMin: Math.round(killsPerMin * 10) / 10,
        damageTakenTotal: Math.round(this.damageTakenTotal),
        damageTakenPerMin: Math.round(damageTakenPerMin * 10) / 10,
        gemsSpawned: this.gemsSpawned,
        gemsCollected: this.gemsCollected,
        gemEfficiencyPct: Math.round(gemEfficiency),
      },
      upgrades: this.upgrades,
      timeline: this.timeline,
      events: this.events,
      opinions,
    };
  }

  private generateOpinions(
    state: BotGameState,
    won: boolean,
    killsPerMin: number,
    _damageTakenPerMin: number,
    gemEfficiency: number,
  ): string[] {
    const ops: string[] = [];
    const elapsed = state.elapsed;

    // Survival time
    if (elapsed < 120) ops.push(`[EARLY DEATH] Survived only ${this.formatTime(elapsed)} — early difficulty may be too high`);
    if (won) ops.push(`[WIN] Survived the full run at level ${state.player.level} with ${state.kills} kills`);

    // Gem efficiency
    if (gemEfficiency < 40) ops.push(`[LOW GEM EFFICIENCY] Only collecting ${Math.round(gemEfficiency)}% of gems — pickup radius likely too small`);
    else if (gemEfficiency > 85) ops.push(`[HIGH GEM EFFICIENCY] Collecting ${Math.round(gemEfficiency)}% of gems — pickup radius feels good`);

    // Upgrade impact opinions
    for (const u of this.upgrades) {
      if (!u.statsAfter) continue;
      const kpmBefore = u.statsBefore.killsPerMin;
      const kpmAfter = u.statsAfter.killsPerMin;
      if (kpmBefore > 0) {
        const pct = ((kpmAfter - kpmBefore) / kpmBefore) * 100;
        if (pct > 20) ops.push(`[STRONG UPGRADE] ${u.chosen}: kills/min +${pct.toFixed(0)}% after pickup`);
        else if (pct < -10) ops.push(`[WEAK/NEGATIVE UPGRADE] ${u.chosen}: kills/min ${pct.toFixed(0)}% after pickup`);
      }
    }

    // Kill rate
    if (killsPerMin < 5) ops.push(`[LOW DPS] Only ${killsPerMin.toFixed(1)} kills/min — player damage may be too low`);
    else if (killsPerMin > 30) ops.push(`[HIGH DPS] ${killsPerMin.toFixed(1)} kills/min — player feels powerful`);

    // Near-death count
    const nearDeaths = this.events.filter(e => e.type === 'near_death').length;
    if (nearDeaths >= 3) ops.push(`[DANGER] ${nearDeaths} near-death events — game is very punishing`);

    // Difficulty spikes
    const spikes = this.events.filter(e => e.type === 'difficulty_spike');
    for (const s of spikes) ops.push(`[DIFFICULTY SPIKE at ${s.t}] ${s.note}`);

    return ops;
  }

  private killsPerMin(elapsed: number): number {
    const window = 30;
    const recentKills = this.killWindow.filter(k => elapsed - k < window).length;
    return (recentKills / Math.min(window, elapsed)) * 60;
  }

  private damagePerMin(elapsed: number): number {
    const window = 30;
    const recent = this.damageWindow
      .filter(d => elapsed - d.t < window)
      .reduce((s, d) => s + d.amount, 0);
    return (recent / Math.min(window, elapsed)) * 60;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
