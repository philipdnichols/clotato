export interface EnemyDef {
  key: string;
  color: number;
  radius: number;
  speed: number;
  hp: number;
  xp: number;
  damage: number;
}

export const ENEMIES: EnemyDef[] = [
  { key: 'slime',  color: 0x44ff44, radius: 10, speed: 60,  hp: 3,  xp: 1, damage: 5 },
  { key: 'runner', color: 0xff8844, radius: 8,  speed: 110, hp: 2,  xp: 1, damage: 4 },
  { key: 'tank',   color: 0x8844ff, radius: 18, speed: 35,  hp: 12, xp: 4, damage: 10 },
  { key: 'swarm',  color: 0xff4444, radius: 6,  speed: 90,  hp: 1,  xp: 1, damage: 3 },
];
