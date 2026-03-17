/**
 * Seeded PRNG (mulberry32). Drop-in replacement for Math.random().
 *
 * Usage:
 *   seedRng(12345);   // set seed before a run
 *   rng();            // returns float in [0, 1)
 *
 * When no seed is set (default) falls back to Math.random() so non-bot
 * human sessions are unaffected.
 */

let _fn: () => number = Math.random.bind(Math);
let _currentSeed: number | null = null;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function seedRng(seed: number): void {
  _currentSeed = seed >>> 0;
  _fn = mulberry32(_currentSeed);
}

export function resetToRandom(): void {
  _currentSeed = null;
  _fn = Math.random.bind(Math);
}

export function getCurrentSeed(): number | null {
  return _currentSeed;
}

/** Drop-in replacement for Math.random() */
export function rng(): number {
  return _fn();
}
