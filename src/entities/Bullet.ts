import Phaser from 'phaser';

export class Bullet extends Phaser.GameObjects.Ellipse {
  declare body: Phaser.Physics.Arcade.Body;
  damage: number = 10;
  active: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 10, 10, 0xffffff);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(5);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.setPosition(x, y).setActive(true).setVisible(true);
    this.damage = damage;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  deactivate(): void {
    this.setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).reset(0, 0);
  }
}
