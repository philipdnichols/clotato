import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { kiterStrategy } from './kiter';

// Kites to stay alive as long as possible, but never takes the same upgrade twice.
// Ensures every upgrade is exercised at least once per run.
// Useful for measuring each upgrade's individual impact.

const takenIds = new Set<string>();

export const upgradeSamplerStrategy: BotStrategy = {
  name: 'upgrade_sampler',

  getMovement(state: BotGameState): BotMovement {
    // Borrow kiter movement — survival is the goal so we see more upgrades
    return kiterStrategy.getMovement(state);
  },

  chooseUpgrade(choices: UpgradeDef[], _state: BotGameState): UpgradeDef {
    // Prefer upgrades not yet taken
    const untaken = choices.filter(c => !takenIds.has(c.id));
    const pick = untaken.length > 0
      ? untaken[0]
      : choices[0]; // all seen — fall back to first offered
    takenIds.add(pick.id);
    return pick;
  },

  onUpdate(_state: BotGameState): void {
    // Reset taken set when a new run starts (elapsed resets to near 0)
    if (_state.elapsed < 0.5) takenIds.clear();
  },
};
