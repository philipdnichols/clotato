import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';

// Priority order: speed helps kiting, fire rate keeps damage up, damage multiplies,
// HP is a cushion, rest are bonus.
const UPGRADE_PRIORITY = [
  'move_speed', 'fire_rate', 'more_damage', 'max_hp',
  'multishot', 'pickup_radius', 'proj_speed',
];

export const kiterStrategy: BotStrategy = {
  name: 'kiter',

  getMovement(state: BotGameState): BotMovement {
    const { player, enemies, gems } = state;

    // Flee vector: sum of repulsion from all nearby enemies, weighted by proximity
    let fleeX = 0;
    let fleeY = 0;
    let threatCount = 0;
    const fleeRadius = 150;

    for (const e of enemies) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < fleeRadius && dist > 0) {
        const weight = (fleeRadius - dist) / fleeRadius;
        fleeX += (dx / dist) * weight;
        fleeY += (dy / dist) * weight;
        threatCount++;
      }
    }

    if (threatCount > 0) {
      // Under threat — flee
      const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
      return mag > 0
        ? { vx: fleeX / mag, vy: fleeY / mag }
        : { vx: 0, vy: 0 };
    }

    // No immediate threat — drift toward nearest unattracting gem
    const freeGems = gems.filter(g => !g.attracted);
    if (freeGems.length > 0) {
      let nearestGem = freeGems[0];
      let nearestDist = Infinity;
      for (const g of freeGems) {
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        if (d < nearestDist) { nearestDist = d; nearestGem = g; }
      }
      const dx = nearestGem.x - player.x;
      const dy = nearestGem.y - player.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      return mag > 0 ? { vx: dx / mag, vy: dy / mag } : { vx: 0, vy: 0 };
    }

    return { vx: 0, vy: 0 };
  },

  chooseUpgrade(choices: UpgradeDef[]): UpgradeDef {
    for (const id of UPGRADE_PRIORITY) {
      const match = choices.find(c => c.id === id);
      if (match) return match;
    }
    return choices[0];
  },
};
