import { UPGRADES, type UpgradeDef, type PlayerStats } from '../data/upgrades';

export class UpgradeManager {
  private appliedCounts: Map<string, number> = new Map();

  getChoices(count = 3): UpgradeDef[] {
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  apply(upgrade: UpgradeDef, stats: PlayerStats): void {
    upgrade.apply(stats);
    this.appliedCounts.set(upgrade.id, (this.appliedCounts.get(upgrade.id) ?? 0) + 1);
  }

  getCount(id: string): number {
    return this.appliedCounts.get(id) ?? 0;
  }
}
