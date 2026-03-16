export interface WaveConfig {
  // time in seconds when this wave config starts applying
  startTime: number;
  // enemy key -> spawn weight
  weights: Record<string, number>;
  // enemies spawned per second
  rate: number;
}

export const WAVE_CONFIGS: WaveConfig[] = [
  { startTime: 0,   rate: 1.0, weights: { slime: 10, runner: 2 } },
  { startTime: 60,  rate: 1.5, weights: { slime: 8, runner: 5, swarm: 4 } },
  { startTime: 120, rate: 2.0, weights: { slime: 5, runner: 6, swarm: 8, tank: 1 } },
  { startTime: 180, rate: 2.5, weights: { slime: 3, runner: 6, swarm: 10, tank: 2 } },
  { startTime: 240, rate: 3.0, weights: { slime: 2, runner: 5, swarm: 10, tank: 4 } },
  { startTime: 300, rate: 4.0, weights: { slime: 1, runner: 4, swarm: 10, tank: 6 } },
];

export const GAME_DURATION = 600; // 10 minutes in seconds
