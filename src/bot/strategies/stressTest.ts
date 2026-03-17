import type { BotStrategy } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';

// Stands completely still — measures raw incoming DPS per wave without movement
// confounding the numbers. Prioritizes HP upgrades to stay alive longer.
// Good for: tuning wave damage values in isolation.

const HP_FIRST_PRIORITY = ['max_hp', 'fire_rate', 'more_damage', 'multishot', 'move_speed', 'pickup_radius', 'proj_speed'];

export const stressTestStrategy: BotStrategy = {
  name: 'stress_test',

  getMovement() {
    return { vx: 0, vy: 0 };
  },

  chooseUpgrade(choices: UpgradeDef[]) {
    for (const id of HP_FIRST_PRIORITY) {
      const match = choices.find(c => c.id === id);
      if (match) return match;
    }
    return choices[0];
  },
};
