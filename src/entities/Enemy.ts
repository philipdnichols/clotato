import Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';
import { textureKey } from '../assets/AssetMode';

export class Enemy extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  def: EnemyDef;
  hp: number;
  maxHp: number;
  alive: boolean = true;

  private sprite: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y);

    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;

    // Use sprite texture if available, otherwise plain ellipse
    const key = textureKey(def.key as Parameters<typeof textureKey>[0]);
    if (scene.textures.exists(key)) {
      const img = scene.add.image(0, 0, key);
      const size = def.radius * 2;
      img.setDisplaySize(size, size);
      this.sprite = img;
    } else {
      this.sprite = scene.add.ellipse(0, 0, def.radius * 2, def.radius * 2, def.color);
    }
    this.add(this.sprite);

    const barW = Math.max(def.radius * 2, 20);
    const barBg = scene.add.rectangle(0, def.radius + 5, barW, 4, 0x333333);
    this.add(barBg);

    this.hpBar = scene.add.rectangle(-barW / 2, def.radius + 5, barW, 4, 0xff2222);
    this.hpBar.setOrigin(0, 0.5);
    this.add(this.hpBar);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(def.radius, -def.radius, -def.radius);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = (Math.max(this.def.radius * 2, 20)) * pct;

    if (this.hp <= 0) {
      this.alive = false;
      return true; // died
    }
    return false;
  }

  moveToward(tx: number, ty: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    body.setVelocity(
      Math.cos(angle) * this.def.speed,
      Math.sin(angle) * this.def.speed,
    );
  }
}
