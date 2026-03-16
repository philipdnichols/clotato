import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { GAME_DURATION } from '../data/waves';

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private killText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const W = this.scale.width;

    // XP bar at top
    this.add.rectangle(W / 2, 8, W, 12, 0x333333).setScrollFactor(0);
    this.xpBar = this.add.rectangle(0, 8, 0, 12, 0x00ffcc).setOrigin(0, 0.5).setScrollFactor(0);

    this.hpText = this.add.text(10, 24, '', { fontSize: '14px', color: '#ff8888' }).setScrollFactor(0);
    this.levelText = this.add.text(10, 42, '', { fontSize: '14px', color: '#ffff88' }).setScrollFactor(0);
    this.killText = this.add.text(10, 60, '', { fontSize: '14px', color: '#aaaaaa' }).setScrollFactor(0);
    this.timerText = this.add.text(W - 10, 24, '', { fontSize: '16px', color: '#ffffff' }).setOrigin(1, 0).setScrollFactor(0);
  }

  update(): void {
    const game = this.scene.get('GameScene') as GameScene;
    if (!game?.player) return;

    const p = game.player;
    const W = this.scale.width;
    const elapsed = game.elapsed;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);

    this.hpText.setText(`HP: ${p.hp} / ${p.stats.maxHp}`);
    this.levelText.setText(`Level ${p.level}`);
    this.killText.setText(`Kills: ${game.kills}`);
    this.timerText.setText(`${mins}:${String(secs).padStart(2, '0')}`);

    this.xpBar.width = W * p.xpProgress;
  }
}
