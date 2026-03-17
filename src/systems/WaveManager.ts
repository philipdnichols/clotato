import { ENEMIES, type EnemyDef } from '../data/enemies';
import { WAVE_CONFIGS } from '../data/waves';
import { rng } from '../rng';

export class WaveManager {
  private spawnTimer: number = 0;

  getConfig(elapsedSeconds: number) {
    let cfg = WAVE_CONFIGS[0];
    for (const c of WAVE_CONFIGS) {
      if (elapsedSeconds >= c.startTime) cfg = c;
      else break;
    }
    return cfg;
  }

  update(delta: number, elapsedSeconds: number): EnemyDef | null {
    const cfg = this.getConfig(elapsedSeconds);
    this.spawnTimer += delta / 1000;
    const interval = 1 / cfg.rate;

    if (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      return this.pickEnemy(cfg.weights);
    }
    return null;
  }

  private pickEnemy(weights: Record<string, number>): EnemyDef {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = rng() * total;
    for (const [key, w] of Object.entries(weights)) {
      roll -= w;
      if (roll <= 0) {
        return ENEMIES.find((e) => e.key === key) ?? ENEMIES[0];
      }
    }
    return ENEMIES[0];
  }

  randomSpawnPosition(camX: number, camY: number, viewW: number, viewH: number): { x: number; y: number } {
    const margin = 60;
    const side = Math.floor(rng() * 4);
    switch (side) {
      case 0: return { x: camX + rng() * viewW, y: camY - margin };
      case 1: return { x: camX + viewW + margin, y: camY + rng() * viewH };
      case 2: return { x: camX + rng() * viewW, y: camY + viewH + margin };
      default: return { x: camX - margin, y: camY + rng() * viewH };
    }
  }
}
