import Phaser from 'phaser';
import { textureKey } from '../assets/AssetMode';

export class XPGem extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  value: number = 1;
  attractVx: number = 0;
  attractVy: number = 0;
  attracted: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const key = textureKey('gem');
    if (scene.textures.exists(key)) {
      const img = scene.add.image(0, 0, key);
      img.setDisplaySize(10, 10);
      this.add(img);
    } else {
      this.add(scene.add.ellipse(0, 0, 10, 10, 0x00ffcc));
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, -5, -5);
    body.setImmovable(true);
    body.allowGravity = false;
  }

  spawn(x: number, y: number, value: number): void {
    this.setPosition(x, y).setActive(true).setVisible(true);
    this.value = value;
    this.attractVx = 0;
    this.attractVy = 0;
    this.attracted = false;
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }

  collect(): void {
    this.setActive(false).setVisible(false);
  }
}
