import type { BotStrategy, BotGameState, BotMovement } from '../BotTypes';
import type { UpgradeDef } from '../../data/upgrades';
import { kiterStrategy } from './kiter';

// Kiter movement but actively avoids gems — never levels up.
// Answers: "How long can you survive with zero upgrades? How much does the
// upgrade system actually matter for survival?" If this bot survives 4+ minutes
// with no upgrades the early difficulty is too forgiving.
//
// Avoids gems by steering away when within avoidance radius.

const GEM_AVOID_RADIUS = 80;

export const gemIgnorerStrategy: BotStrategy = {
  name: 'gem_ignorer',

  getMovement(state: BotGameState): BotMovement {
    const { player, enemies, gems } = state;

    // First: flee enemies (same logic as kiter)
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

    // Also add repulsion from nearby gems
    for (const g of gems) {
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GEM_AVOID_RADIUS && dist > 0) {
        const weight = (GEM_AVOID_RADIUS - dist) / GEM_AVOID_RADIUS;
        fleeX += (dx / dist) * weight * 2; // double weight — really avoid them
        fleeY += (dy / dist) * weight * 2;
        threatCount++;
      }
    }

    if (threatCount > 0) {
      const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
      return mag > 0 ? { vx: fleeX / mag, vy: fleeY / mag } : { vx: 0, vy: 0 };
    }

    return { vx: 0, vy: 0 };
  },

  // Shouldn't matter since gems are avoided, but pick worst option just in case
  chooseUpgrade(choices: UpgradeDef[], state: BotGameState): UpgradeDef {
    return kiterStrategy.chooseUpgrade(choices, state);
  },
};
