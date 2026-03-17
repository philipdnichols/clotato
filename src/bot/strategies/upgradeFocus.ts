import type { BotStrategy, BotGameState } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { kiterStrategy } from './kiter';

// Takes only one specific upgrade type every level-up, stacking it to max.
// Parameterised via ?focus=<upgrade_id> URL param.
// Answers: "What does stacking one upgrade path fully look like?
//           Are there diminishing returns? What's the ceiling on a single stat?"
//
// Example URLs:
//   /?bot=upgrade_focus&speed=4&runs=2&focus=fire_rate
//   /?bot=upgrade_focus&speed=4&runs=2&focus=more_damage
//   /?bot=upgrade_focus&speed=4&runs=2&focus=max_hp

function getFocusId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('focus') ?? 'fire_rate';
}

export const upgradeFocusStrategy: BotStrategy = {
  name: 'upgrade_focus',

  getMovement: kiterStrategy.getMovement,
  onUpdate: kiterStrategy.onUpdate,

  chooseUpgrade(choices: UpgradeDef[], state: BotGameState): UpgradeDef {
    const focusId = getFocusId();

    // Always pick the focused upgrade if available
    const focused = choices.find(c => c.id === focusId);
    if (focused) return focused;

    // Not available this level — fall back to kiter priority
    console.log(`[BOT upgrade_focus] "${focusId}" not offered — using kiter fallback`);
    return kiterStrategy.chooseUpgrade(choices, state);
  },
};
