import Phaser from 'phaser';
import { textureKey } from '../assets/AssetMode';

export class Bullet extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  damage: number = 10;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const key = textureKey('bullet');
    if (scene.textures.exists(key)) {
      const img = scene.add.image(0, 0, key);
      img.setDisplaySize(14, 8);
      this.add(img);
    } else {
      this.add(scene.add.ellipse(0, 0, 10, 10, 0xffffff));
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, -5, -5);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.setPosition(x, y).setActive(true).setVisible(true);
    this.damage = damage;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    // Rotate the visual to face travel direction
    this.setRotation(angle);
  }

  deactivate(): void {
    this.setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
