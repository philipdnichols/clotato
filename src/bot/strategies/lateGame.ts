import type { BotStrategy, BotGameState } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { kiterStrategy } from './kiter';

// God mode for the first 7 minutes, then plays normally with kiter movement.
// Lets us observe waves 7-10 that other bots never reach.
// Good for: testing late-game balance and difficulty that bots can't otherwise access.
//
// God mode is implemented by calling window.__debug.godMode() each frame while
// elapsed < GOD_MODE_UNTIL. This continuously resets HP/maxHp to 999999.
// The transition to normal play happens cleanly when the timer expires.

const GOD_MODE_UNTIL = 7 * 60; // 7 minutes in seconds

let godModeActive = false;

export const lateGameStrategy: BotStrategy = {
  name: 'late_game',

  onUpdate(state: BotGameState) {
    kiterStrategy.onUpdate?.(state);

    const shouldBeGod = state.elapsed < GOD_MODE_UNTIL;

    if (shouldBeGod) {
      // Call god mode every frame to keep HP maxed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__debug?.godMode();
      if (!godModeActive) {
        godModeActive = true;
        console.log('[BOT late_game] God mode active until 7:00');
      }
    } else if (godModeActive) {
      godModeActive = false;
      console.log(`[BOT late_game] God mode ended at ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')} — playing normally`);
    }
  },

  getMovement: kiterStrategy.getMovement,

  chooseUpgrade(choices: UpgradeDef[], state: BotGameState): UpgradeDef {
    return kiterStrategy.chooseUpgrade(choices, state);
  },
};
