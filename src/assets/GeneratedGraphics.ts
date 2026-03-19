/**
 * Mode B — Procedural graphics.
 * All textures drawn with Phaser Graphics at startup, then baked via generateTexture().
 * Entity designs are potato-themed with outlines and detail, not just plain ellipses.
 */
import Phaser from 'phaser';
import { textureKey } from './AssetMode';

function already(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

// ---- helpers ---------------------------------------------------------------

function oval(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, rx: number, ry: number,
  fill: number, stroke: number, strokeW = 2,
): void {
  g.fillStyle(fill, 1);
  g.fillEllipse(cx, cy, rx * 2, ry * 2);
  g.lineStyle(strokeW, stroke, 1);
  g.strokeEllipse(cx, cy, rx * 2, ry * 2);
}

function dot(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
}

// ---- player ----------------------------------------------------------------

export function generatePlayerTexture(scene: Phaser.Scene): void {
  const key = textureKey('player');
  if (already(scene, key)) return;

  const S = 32;
  const g = scene.add.graphics();

  // Body — warm golden-brown potato shape (slightly taller ellipse)
  oval(g, S / 2, S / 2, 12, 14, 0xd4a017, 0x8b6400);

  // Highlight
  g.fillStyle(0xf5d060, 0.6);
  g.fillEllipse(S / 2 - 3, S / 2 - 4, 8, 6);

  // Eyes
  dot(g, S / 2 - 4, S / 2 - 2, 2.5, 0x1a0a00);
  dot(g, S / 2 + 4, S / 2 - 2, 2.5, 0x1a0a00);

  // Eye shine
  dot(g, S / 2 - 3, S / 2 - 3, 1, 0xffffff);
  dot(g, S / 2 + 5, S / 2 - 3, 1, 0xffffff);

  // Blush
  g.fillStyle(0xff9966, 0.5);
  g.fillEllipse(S / 2 - 7, S / 2 + 3, 5, 3);
  g.fillEllipse(S / 2 + 7, S / 2 + 3, 5, 3);

  // Mouth (small arc drawn as dots)
  dot(g, S / 2 - 1, S / 2 + 5, 1, 0x8b6400);
  dot(g, S / 2,     S / 2 + 6, 1, 0x8b6400);
  dot(g, S / 2 + 1, S / 2 + 5, 1, 0x8b6400);

  g.generateTexture(key, S, S);
  g.destroy();
}

// ---- enemies ---------------------------------------------------------------

export function generateSlimeTexture(scene: Phaser.Scene): void {
  const key = textureKey('slime');
  if (already(scene, key)) return;

  const S = 28;
  const cx = S / 2, cy = S / 2;
  const g = scene.add.graphics();

  // Irregular blob — base ellipse wider at bottom
  g.fillStyle(0x33dd33, 1);
  g.beginPath();
  // Rough polygon approximating a squat blob
  const pts = [
    { x: cx,      y: cy - 10 },
    { x: cx + 8,  y: cy - 6  },
    { x: cx + 11, y: cy + 2  },
    { x: cx + 7,  y: cy + 9  },
    { x: cx,      y: cy + 11 },
    { x: cx - 7,  y: cy + 9  },
    { x: cx - 11, y: cy + 2  },
    { x: cx - 8,  y: cy - 6  },
  ];
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x119911, 1);
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.strokePath();

  // Highlight
  g.fillStyle(0x88ff88, 0.5);
  g.fillEllipse(cx - 2, cy - 3, 7, 5);

  // Eyes
  dot(g, cx - 3, cy - 1, 2.5, 0x003300);
  dot(g, cx + 3, cy - 1, 2.5, 0x003300);
  dot(g, cx - 2, cy - 2, 1,   0xffffff);
  dot(g, cx + 4, cy - 2, 1,   0xffffff);

  g.generateTexture(key, S, S);
  g.destroy();
}

export function generateRunnerTexture(scene: Phaser.Scene): void {
  const key = textureKey('runner');
  if (already(scene, key)) return;

  const S = 28;
  const cx = S / 2, cy = S / 2;
  const g = scene.add.graphics();

  // Lean chip/wedge body — angled and narrow
  g.fillStyle(0xff7722, 1);
  g.beginPath();
  const pts = [
    { x: cx - 5,  y: cy - 10 },
    { x: cx + 8,  y: cy - 7  },
    { x: cx + 9,  y: cy + 3  },
    { x: cx + 4,  y: cy + 10 },
    { x: cx - 8,  y: cy + 7  },
    { x: cx - 9,  y: cy - 3  },
  ];
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0xaa4400, 1);
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.strokePath();

  // Speed lines
  g.lineStyle(1.5, 0xffaa55, 0.8);
  g.lineBetween(cx - 8, cy - 6, cx - 12, cy - 6);
  g.lineBetween(cx - 8, cy,     cx - 13, cy    );
  g.lineBetween(cx - 7, cy + 5, cx - 11, cy + 5);

  // Eye (single for runner — focused look)
  dot(g, cx + 2, cy - 2, 2.5, 0x330000);
  dot(g, cx + 3, cy - 3, 1, 0xffffff);

  g.generateTexture(key, S, S);
  g.destroy();
}

export function generateTankTexture(scene: Phaser.Scene): void {
  const key = textureKey('tank');
  if (already(scene, key)) return;

  const S = 48;
  const cx = S / 2, cy = S / 2;
  const g = scene.add.graphics();

  // Outer armour shell — dark purple octagon
  g.fillStyle(0x6622cc, 1);
  g.beginPath();
  const R = 20, r2 = R * 0.414; // 45-degree chamfer size
  const pts = [
    { x: cx - r2, y: cy - R   },
    { x: cx + r2, y: cy - R   },
    { x: cx + R,  y: cy - r2  },
    { x: cx + R,  y: cy + r2  },
    { x: cx + r2, y: cy + R   },
    { x: cx - r2, y: cy + R   },
    { x: cx - R,  y: cy + r2  },
    { x: cx - R,  y: cy - r2  },
  ];
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.fillPath();

  // Inner body
  g.fillStyle(0x8844ff, 1);
  g.fillEllipse(cx, cy, 26, 26);

  // Armour highlight
  g.lineStyle(3, 0xaa66ff, 0.8);
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.strokePath();

  // Rivets / armour bolts at corners
  g.fillStyle(0x4400aa, 1);
  for (const p of pts) dot(g, p.x, p.y, 2.5, 0x4400aa);

  // Eyes — mean slanted look
  dot(g, cx - 5, cy - 2, 3.5, 0x110022);
  dot(g, cx + 5, cy - 2, 3.5, 0x110022);
  dot(g, cx - 4, cy - 3, 1.5, 0xff2255);
  dot(g, cx + 6, cy - 3, 1.5, 0xff2255);

  g.generateTexture(key, S, S);
  g.destroy();
}

export function generateSwarmTexture(scene: Phaser.Scene): void {
  const key = textureKey('swarm');
  if (already(scene, key)) return;

  const S = 16;
  const cx = S / 2, cy = S / 2;
  const g = scene.add.graphics();

  // Tiny fry/pellet
  oval(g, cx, cy + 1, 5, 6, 0xff3333, 0xaa0000, 1.5);

  // Highlight
  g.fillStyle(0xff9999, 0.7);
  g.fillEllipse(cx - 1, cy - 1, 4, 3);

  // Dot eye
  dot(g, cx + 1, cy - 1, 1.2, 0x110000);

  g.generateTexture(key, S, S);
  g.destroy();
}

// ---- projectile + gem ------------------------------------------------------

export function generateBulletTexture(scene: Phaser.Scene): void {
  const key = textureKey('bullet');
  if (already(scene, key)) return;

  const W = 16, H = 10;
  const g = scene.add.graphics();

  // Elongated starch pellet — white-gold
  g.fillStyle(0xfffde0, 1);
  g.fillEllipse(W / 2, H / 2, W - 2, H - 2);
  g.lineStyle(1, 0xd4a017, 1);
  g.strokeEllipse(W / 2, H / 2, W - 2, H - 2);

  // Core glow
  g.fillStyle(0xffffff, 0.8);
  g.fillEllipse(W / 2 - 1, H / 2, 6, 4);

  g.generateTexture(key, W, H);
  g.destroy();
}

export function generateGemTexture(scene: Phaser.Scene): void {
  const key = textureKey('gem');
  if (already(scene, key)) return;

  const S = 14;
  const cx = S / 2, cy = S / 2;
  const g = scene.add.graphics();

  // Diamond shape
  g.fillStyle(0x00ffcc, 1);
  g.beginPath();
  g.moveTo(cx,      cy - 6);
  g.lineTo(cx + 5,  cy    );
  g.lineTo(cx,      cy + 6);
  g.lineTo(cx - 5,  cy    );
  g.closePath();
  g.fillPath();
  g.lineStyle(1.5, 0x00aa88, 1);
  g.strokePath();

  // Top facet lighter
  g.fillStyle(0xaafff0, 0.7);
  g.beginPath();
  g.moveTo(cx,      cy - 6);
  g.lineTo(cx + 5,  cy    );
  g.lineTo(cx,      cy - 1);
  g.lineTo(cx - 5,  cy    );
  g.closePath();
  g.fillPath();

  g.generateTexture(key, S, S);
  g.destroy();
}

// ---- entry point -----------------------------------------------------------

export function generateAllTextures(scene: Phaser.Scene): void {
  generatePlayerTexture(scene);
  generateSlimeTexture(scene);
  generateRunnerTexture(scene);
  generateTankTexture(scene);
  generateSwarmTexture(scene);
  generateBulletTexture(scene);
  generateGemTexture(scene);
}
