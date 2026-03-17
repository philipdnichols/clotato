import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';

// Prioritises collecting XP gems above all else — runs toward the nearest gem
// even through enemies. Upgrade priority: pickup radius → speed → then DPS.
// Answers: "Does rushing XP and levelling faster beat playing safe?"

const UPGRADE_PRIORITY = ['pickup_radius', 'move_speed', 'fire_rate', 'more_damage', 'multishot', 'proj_speed', 'max_hp'];

export const collectorStrategy: BotStrategy = {
  name: 'collector',

  getMovement(state: BotGameState): BotMovement {
    const { player, gems, enemies } = state;

    // Always move toward the nearest gem (attracted or not)
    if (gems.length > 0) {
      let nearest = gems[0];
      let nearestDist = Infinity;
      for (const g of gems) {
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        if (d < nearestDist) { nearestDist = d; nearest = g; }
      }
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) return { vx: dx / mag, vy: dy / mag };
    }

    // No gems — orbit loosely around nearest enemy to generate more
    if (enemies.length > 0) {
      let nearest = enemies[0];
      let nearestDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      // Orbit at ~120px — close enough to kill but not facetanking
      const dx = nearest.x - player.x;
      const dy = nearest.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 120) {
        return { vx: dx / dist, vy: dy / dist };
      }
    }

    return { vx: 0, vy: 0 };
  },

  chooseUpgrade(choices: UpgradeDef[]) {
    for (const id of UPGRADE_PRIORITY) {
      const match = choices.find(c => c.id === id);
      if (match) return match;
    }
    return choices[0];
  },
};
