import Phaser from 'phaser';
import { type PlayerStats, BASE_STATS } from '../data/upgrades';
import { textureKey } from '../assets/AssetMode';

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  stats: PlayerStats;
  hp: number;
  xp: number = 0;
  level: number = 1;
  xpToNext: number = 10;

  private sprite: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;

  private shootTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.stats = { ...BASE_STATS };
    this.hp = this.stats.maxHp;

    // Use sprite texture if available (Mode B/C/A), otherwise plain ellipse
    const key = textureKey('player');
    if (scene.textures.exists(key)) {
      const img = scene.add.image(0, 0, key);
      img.setDisplaySize(28, 28);
      this.sprite = img;
    } else {
      this.sprite = scene.add.ellipse(0, 0, 28, 28, 0xf5c842);
    }
    this.add(this.sprite);

    // HP bar background
    this.hpBarBg = scene.add.rectangle(0, 22, 32, 5, 0x333333);
    this.add(this.hpBarBg);

    // HP bar fill
    this.hpBar = scene.add.rectangle(-16, 22, 32, 5, 0xff4444);
    this.hpBar.setOrigin(0, 0.5);
    this.add(this.hpBar);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14, -14, -14);
    body.setCollideWorldBounds(true);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHpBar();

    // Flash red
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.3, to: 1 },
      duration: 150,
      ease: 'Linear',
    });
  }

  heal(amount: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
    this.updateHpBar();
  }

  addXP(amount: number): boolean {
    this.xp += amount;
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.4);
      return true; // leveled up
    }
    return false;
  }

  get xpProgress(): number {
    return this.xp / this.xpToNext;
  }

  private updateHpBar(): void {
    const pct = this.hp / this.stats.maxHp;
    this.hpBar.width = 32 * pct;
  }

  updateShooting(delta: number): number {
    this.shootTimer += delta / 1000;
    const interval = 1 / this.stats.fireRate;
    if (this.shootTimer >= interval) {
      this.shootTimer -= interval;
      return this.stats.projectileCount;
    }
    return 0;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }
}
