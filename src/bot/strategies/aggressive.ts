import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';

// Charges toward the nearest enemy at all times — opposite of kiter.
// Tests whether pure offense (maximizing contact time for auto-fire) is viable,
// and how DPS-first upgrade paths compare to survivability paths.
// Good for: DPS balance, testing whether the game punishes aggression enough.

const DAMAGE_FIRST_PRIORITY = ['fire_rate', 'more_damage', 'multishot', 'proj_speed', 'move_speed', 'max_hp', 'pickup_radius'];

export const aggressiveStrategy: BotStrategy = {
  name: 'aggressive',

  getMovement(state: BotGameState): BotMovement {
    const { player, enemies, gems } = state;

    // Charge the nearest enemy
    let nearestDist = Infinity;
    let nearestDx = 0;
    let nearestDy = 0;

    for (const e of enemies) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestDx = dx;
        nearestDy = dy;
      }
    }

    if (nearestDist < Infinity) {
      const mag = Math.sqrt(nearestDx * nearestDx + nearestDy * nearestDy);
      return mag > 0 ? { vx: nearestDx / mag, vy: nearestDy / mag } : { vx: 0, vy: 0 };
    }

    // No enemies — drift toward nearest gem
    if (gems.length > 0) {
      let nearestGem = gems[0];
      let gemDist = Infinity;
      for (const g of gems) {
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        if (d < gemDist) { gemDist = d; nearestGem = g; }
      }
      const dx = nearestGem.x - player.x;
      const dy = nearestGem.y - player.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      return mag > 0 ? { vx: dx / mag, vy: dy / mag } : { vx: 0, vy: 0 };
    }

    return { vx: 0, vy: 0 };
  },

  chooseUpgrade(choices: UpgradeDef[]) {
    for (const id of DAMAGE_FIRST_PRIORITY) {
      const match = choices.find(c => c.id === id);
      if (match) return match;
    }
    return choices[0];
  },
};
