/**
 * Mode C — LLM-authored SVG sprites.
 * SVGs are in public/sprites/llm/ and loaded via Phaser's SVG loader
 * (rasterised to bitmap on load). Loaded at 2× the in-game display size
 * so downscaling gives sharper results.
 */
import Phaser from 'phaser';
import { textureKey } from './AssetMode';

const BASE = 'sprites/llm/';

const LLM_SPRITES: Array<{ key: string; file: string; w: number; h: number }> = [
  { key: textureKey('player'), file: 'player.svg',      w: 64,  h: 64  },
  { key: textureKey('slime'),  file: 'enemy_slime.svg', w: 48,  h: 48  },
  { key: textureKey('runner'), file: 'enemy_runner.svg',w: 48,  h: 48  },
  { key: textureKey('tank'),   file: 'enemy_tank.svg',  w: 72,  h: 72  },
  { key: textureKey('swarm'),  file: 'enemy_swarm.svg', w: 24,  h: 24  },
  { key: textureKey('bullet'), file: 'bullet.svg',      w: 24,  h: 14  },
  { key: textureKey('gem'),    file: 'gem.svg',         w: 24,  h: 24  },
];

/** Load all Mode C SVG sprites. Call from GameScene.preload(). */
export function loadLLMSprites(scene: Phaser.Scene): void {
  for (const { key, file, w, h } of LLM_SPRITES) {
    scene.load.svg(key, BASE + file, { width: w, height: h });
  }
}
