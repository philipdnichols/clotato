import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { rng } from '../../rng';

// Simulates a confused or new player — random movement with periodic direction changes,
// random upgrade choices. Good for finding edge cases and measuring baseline difficulty.

export const randomStrategy: BotStrategy = {
  name: 'random',

  // Direction changes every ~2s at 60fps = ~120 frames
  _dirX: 1,
  _dirY: 0,
  _frameCount: 0,
  _changePeriod: 120,

  getMovement(_state: BotGameState): BotMovement {
    this._frameCount++;
    if (this._frameCount >= this._changePeriod) {
      this._frameCount = 0;
      this._changePeriod = 80 + Math.floor(rng() * 120); // 1.3–3.3s
      const angle = rng() * Math.PI * 2;
      this._dirX = Math.cos(angle);
      this._dirY = Math.sin(angle);
    }
    return { vx: this._dirX, vy: this._dirY };
  },

  chooseUpgrade(choices: UpgradeDef[]): UpgradeDef {
    return choices[Math.floor(rng() * choices.length)];
  },
} as BotStrategy & { _dirX: number; _dirY: number; _frameCount: number; _changePeriod: number };
