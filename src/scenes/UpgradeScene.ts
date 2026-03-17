import Phaser from 'phaser';
import type { UpgradeDef } from '../data/upgrades';
import type { GameScene } from './GameScene';

export class UpgradeScene extends Phaser.Scene {
  private choices: UpgradeDef[] = [];

  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(data: { choices: UpgradeDef[] }): void {
    this.choices = data.choices;
    const W = this.scale.width;
    const H = this.scale.height;
    const game = this.scene.get('GameScene') as GameScene;

    // Bot auto-selects immediately — no UI needed
    if (game.bot) {
      const chosen = game.bot.chooseUpgrade(
        data.choices, game.player,
        game.enemies.getChildren() as import('../entities/Enemy').Enemy[],
        game.gems.getChildren() as import('../entities/XPGem').XPGem[],
        game.elapsed, game.kills,
      );
      console.log(`[BOT] Level ${game.player.level} upgrade: ${chosen.label} (offered: ${data.choices.map(c => c.label).join(', ')})`);
      game.applyUpgrade(chosen);
      this.scene.stop();
      this.scene.resume('GameScene');
      return;
    }

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);
    overlay.setInteractive(); // block clicks through

    this.add.text(W / 2, H * 0.2, 'LEVEL UP! Choose an upgrade:', {
      fontSize: '22px',
      color: '#ffff88',
    }).setOrigin(0.5);

    const cardW = 180;
    const cardH = 120;
    const gap = 20;
    const totalW = data.choices.length * cardW + (data.choices.length - 1) * gap;
    const startX = (W - totalW) / 2;

    data.choices.forEach((choice, i) => {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const cy = H / 2;

      const card = this.add.rectangle(cx, cy, cardW, cardH, 0x224466)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, cy - 20, choice.label, {
        fontSize: '16px',
        color: '#ffffff',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(cx, cy + 16, choice.description, {
        fontSize: '13px',
        color: '#aaddff',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setFillStyle(0x336688));
      card.on('pointerout', () => card.setFillStyle(0x224466));
      card.on('pointerdown', () => this.selectUpgrade(choice));

      // Keyboard shortcut 1/2/3
      this.input.keyboard?.once(`keydown-${i + 1}`, () => this.selectUpgrade(choice));
    });
  }

  private selectUpgrade(choice: UpgradeDef): void {
    const game = this.scene.get('GameScene') as GameScene;

    // Record human upgrade choice if session recording is active
    if (game.recorder) {
      const state = game.buildBotGameState();
      game.recorder.onUpgradeOffered(this.choices, choice, state);
    }

    game.applyUpgrade(choice);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
