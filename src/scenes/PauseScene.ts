import Phaser from 'phaser';
import type { GameScene } from './GameScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const game = this.scene.get('GameScene') as GameScene;
    const p = game.player;

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8).setScrollFactor(0);

    this.add.text(W / 2, 30, '— PAUSED —', {
      fontSize: '24px', color: '#ffff88',
    }).setOrigin(0.5).setScrollFactor(0);

    // Current stats column
    const stats = p.stats;
    const statLines = [
      `HP:              ${Math.ceil(p.hp)} / ${stats.maxHp}`,
      `Speed:           ${stats.speed.toFixed(1)}`,
      `Fire Rate:       ${stats.fireRate.toFixed(2)}/s`,
      `Damage:          ${stats.damage}`,
      `Projectiles:     ${stats.projectileCount}`,
      `Proj Speed:      ${stats.projectileSpeed.toFixed(0)}`,
      `Pickup Radius:   ${stats.pickupRadius.toFixed(0)}`,
    ];

    this.add.text(60, 70, 'STATS', { fontSize: '14px', color: '#aaddff' }).setScrollFactor(0);
    this.add.text(60, 90, statLines.join('\n'), {
      fontSize: '13px', color: '#ffffff', lineSpacing: 6,
    }).setScrollFactor(0);

    // Run info column
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60);
    const infoLines = [
      `Level:    ${p.level}`,
      `Kills:    ${game.kills}`,
      `Time:     ${mins}:${String(secs).padStart(2, '0')}`,
    ];
    this.add.text(W / 2, 70, 'RUN', { fontSize: '14px', color: '#aaddff' }).setOrigin(0.5, 0).setScrollFactor(0);
    this.add.text(W / 2, 90, infoLines.join('\n'), {
      fontSize: '13px', color: '#ffffff', lineSpacing: 6, align: 'right',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    // Upgrades column
    this.add.text(W - 60, 70, 'UPGRADES TAKEN', {
      fontSize: '14px', color: '#aaddff',
    }).setOrigin(1, 0).setScrollFactor(0);

    if (game.appliedUpgrades.length === 0) {
      this.add.text(W - 60, 90, 'None yet', {
        fontSize: '13px', color: '#888888',
      }).setOrigin(1, 0).setScrollFactor(0);
    } else {
      // Count stacks per upgrade
      const counts = new Map<string, number>();
      for (const u of game.appliedUpgrades) {
        counts.set(u.label, (counts.get(u.label) ?? 0) + 1);
      }
      const upgradeLines = [...counts.entries()]
        .map(([label, n]) => n > 1 ? `${label} ×${n}` : label)
        .join('\n');
      this.add.text(W - 60, 90, upgradeLines, {
        fontSize: '13px', color: '#ffffff', lineSpacing: 6, align: 'right',
      }).setOrigin(1, 0).setScrollFactor(0);
    }

    this.add.text(W / 2, H - 30, 'Press P to resume', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0);

    this.input.keyboard?.once('keydown-P', () => this.resume());
    this.input.keyboard?.once('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
