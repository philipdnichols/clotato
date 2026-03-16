export interface UpgradeDef {
  id: string;
  label: string;
  description: string;
  apply: (stats: PlayerStats) => void;
}

export interface PlayerStats {
  maxHp: number;
  speed: number;
  damage: number;
  fireRate: number;   // shots per second
  projectileSpeed: number;
  projectileCount: number;
  pickupRadius: number;
}

export const BASE_STATS: PlayerStats = {
  maxHp: 100,
  speed: 140,
  damage: 10,
  fireRate: 1.5,
  projectileSpeed: 300,
  projectileCount: 1,
  pickupRadius: 50,
};

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'more_damage',
    label: 'Sharp Potato',
    description: '+25% damage',
    apply: (s) => { s.damage = Math.round(s.damage * 1.25); },
  },
  {
    id: 'fire_rate',
    label: 'Rapid Starch',
    description: '+20% fire rate',
    apply: (s) => { s.fireRate *= 1.2; },
  },
  {
    id: 'move_speed',
    label: 'Greased Spud',
    description: '+15% move speed',
    apply: (s) => { s.speed *= 1.15; },
  },
  {
    id: 'max_hp',
    label: 'Extra Tuber',
    description: '+25 max HP',
    apply: (s) => { s.maxHp += 25; },
  },
  {
    id: 'multishot',
    label: 'Split Shot',
    description: '+1 projectile',
    apply: (s) => { s.projectileCount += 1; },
  },
  {
    id: 'proj_speed',
    label: 'Turbo Tater',
    description: '+25% projectile speed',
    apply: (s) => { s.projectileSpeed *= 1.25; },
  },
  {
    id: 'pickup_radius',
    label: 'Starchy Magnet',
    description: '+50% pickup radius',
    apply: (s) => { s.pickupRadius *= 1.5; },
  },
];
