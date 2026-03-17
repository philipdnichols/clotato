import type { BotStrategy } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { kiterStrategy } from './kiter';

// Replays a human player's exact upgrade sequence (loaded from ?upgrades= URL param)
// with kiter movement. Isolates the question: "how does a skilled bot perform
// with the same upgrade path a human chose?"
//
// Sequence is stored on window.__humanUpgradeSequence (set by GameScene from ?upgrades=)
// and reset each run via the elapsed-reset detection pattern.

let upgradeIndex = 0;
let lastElapsed = -1;

export const humanEmulatorStrategy: BotStrategy = {
  name: 'human_emulator',

  onUpdate(state) {
    // Detect run restart (elapsed resets to near-zero)
    if (lastElapsed > 1 && state.elapsed < 0.5) {
      upgradeIndex = 0;
    }
    lastElapsed = state.elapsed;
  },

  chooseUpgrade(choices: UpgradeDef[], state) {
    const win = window as unknown as Record<string, unknown>;
    const seq = win.__humanUpgradeSequence as string[] | undefined;

    if (seq && upgradeIndex < seq.length) {
      const label = seq[upgradeIndex];
      const match = choices.find(c => c.label === label);
      if (match) {
        console.log(`[BOT] human_emulator: replaying human pick "${label}" (index ${upgradeIndex})`);
        upgradeIndex++;
        return match;
      }
      // Human's pick isn't available — skip and use kiter fallback
      console.log(`[BOT] human_emulator: "${label}" not offered, falling back to kiter choice`);
      upgradeIndex++;
    } else if (seq) {
      console.log(`[BOT] human_emulator: upgrade sequence exhausted, using kiter strategy`);
    } else {
      console.warn(`[BOT] human_emulator: no upgrade sequence loaded — set ?upgrades=Label1,Label2,...`);
    }

    return kiterStrategy.chooseUpgrade(choices, state);
  },

  getMovement: kiterStrategy.getMovement,
};
