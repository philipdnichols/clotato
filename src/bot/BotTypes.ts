import type { PlayerStats } from '../data/upgrades';
import type { UpgradeDef } from '../data/upgrades';

export interface BotEnemyState {
  x: number;
  y: number;
  radius: number;
  speed: number;
  damage: number;
  key: string;
}

export interface BotGemState {
  x: number;
  y: number;
  attracted: boolean;
}

export interface BotGameState {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    level: number;
    stats: PlayerStats;
  };
  enemies: BotEnemyState[];
  gems: BotGemState[];
  elapsed: number;
  kills: number;
}

export interface BotMovement {
  vx: number; // -1 to 1
  vy: number; // -1 to 1
}

export interface BotStrategy {
  name: string;
  getMovement(state: BotGameState): BotMovement;
  chooseUpgrade(choices: UpgradeDef[], state: BotGameState): UpgradeDef;
  onUpdate?(state: BotGameState): void; // optional per-frame hook for strategy state
}
