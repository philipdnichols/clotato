import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { XPGem } from '../entities/XPGem';
import { WaveManager } from '../systems/WaveManager';
import { UpgradeManager } from '../systems/UpgradeManager';
import type { UpgradeDef } from '../data/upgrades';
import { GAME_DURATION } from '../data/waves';
import { ENEMIES } from '../data/enemies';
import { BotPlayer } from '../bot/BotPlayer';
import { PlaytestReporter } from '../bot/PlaytestReporter';
import type { BotGameState } from '../bot/BotTypes';
import { seedRng, resetToRandom } from '../rng';

const WORLD_W = 3200;
const WORLD_H = 3200;

export class GameScene extends Phaser.Scene {
  player!: Player;
  kills: number = 0;
  elapsed: number = 0; // seconds

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  enemies!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  gems!: Phaser.GameObjects.Group;

  private waveManager!: WaveManager;
  private upgradeManager!: UpgradeManager;

  private nearestEnemy: Enemy | null = null;
  private splatters: Phaser.GameObjects.Image[] = [];

  // Bot playtesting
  bot: BotPlayer | null = null;
  gemsSpawnedTotal = 0;
  gemsCollectedTotal = 0;
  lastDeathCause = 'unknown';

  // Human session recording (?record=true)
  recorder: PlaytestReporter | null = null;
  private recorderPrevGemsSpawned = 0;
  private recorderPrevGemsCollected = 0;

  // Pause / upgrade tracking
  appliedUpgrades: UpgradeDef[] = [];
  private gameOver = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset all instance state — scene.restart() reuses the class instance
    this.kills = 0;
    this.elapsed = 0;
    this.gemsSpawnedTotal = 0;
    this.gemsCollectedTotal = 0;
    this.lastDeathCause = 'unknown';
    this.splatters = [];
    this.nearestEnemy = null;
    this.appliedUpgrades = [];
    this.bot = null;
    this.gameOver = false;
    this.recorder = null;
    this.recorderPrevGemsSpawned = 0;
    this.recorderPrevGemsCollected = 0;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.generateSplatterTextures();

    // Grid background (depth -2, below splatters)
    const g = this.add.graphics().setDepth(-2);
    g.lineStyle(1, 0x222222, 0.5);
    for (let x = 0; x <= WORLD_W; x += 64) g.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += 64) g.lineBetween(0, y, WORLD_W, y);

    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);

    this.enemies = this.add.group({ classType: Enemy, runChildUpdate: false });
    this.bullets = this.add.group({ classType: Bullet, maxSize: 200, runChildUpdate: false });
    this.gems = this.add.group({ classType: XPGem, maxSize: 500, runChildUpdate: false });

    // Pre-pool some objects
    for (let i = 0; i < 100; i++) this.bullets.add(new Bullet(this), true);
    for (let i = 0; i < 200; i++) this.gems.add(new XPGem(this), true);

    this.waveManager = new WaveManager();
    this.upgradeManager = new UpgradeManager();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Collisions
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      (bullet, enemy) => this.onBulletHitEnemy(bullet as Bullet, enemy as Enemy),
    );
    // Gem collection is handled via direct distance check in handleGemMagnet

    // Expose debug API
    (window as unknown as Record<string, unknown>).__debug = {
      player: () => this.player,
      enemies: () => this.enemies.getChildren(),
      kills: () => this.kills,
      elapsed: () => this.elapsed,
      godMode: () => { this.player.hp = 999999; this.player.stats.maxHp = 999999; },
      setTimeScale: (s: number) => { this.time.timeScale = s; this.physics.world.timeScale = 1 / s; },
      skipTime: (s: number) => { this.elapsed += s; },
      spawnEnemy: (key: string) => {
        const { x, y } = this.waveManager.randomSpawnPosition(
          this.cameras.main.scrollX, this.cameras.main.scrollY,
          this.scale.width, this.scale.height,
        );
        this.spawnEnemy(key, x, y);
      },
    };

    // Bot mode — activated via ?bot=<strategy>&speed=<n>&runs=<n>
    // Persisted bot survives scene.restart() so run count is maintained.
    const win = window as unknown as Record<string, unknown>;
    const persistedBot = win.__activeBotPlayer as BotPlayer | undefined;
    const params = new URLSearchParams(window.location.search);
    const botParam = params.get('bot');

    if (persistedBot) {
      this.bot = persistedBot;
      delete win.__activeBotPlayer;
      this.time.timeScale = this.bot.timeScale;
      this.physics.world.timeScale = 1 / this.bot.timeScale;
      console.log(`[BOT] Resuming run ${this.bot.currentRun} of ${this.bot.totalRuns}`);
    } else if (botParam) {
      const speed = Number(params.get('speed') ?? 1);
      const runs = Number(params.get('runs') ?? 1);
      this.bot = new BotPlayer(botParam, speed, runs);
      this.time.timeScale = speed;
      this.physics.world.timeScale = 1 / speed;
      console.log(`[BOT] Strategy: ${botParam} | Speed: ${speed}x | Runs: ${runs}`);
    }

    // Seeded RNG (?seed=<n>) — same seed produces identical upgrade offers and spawn patterns.
    // Each run within a multi-run session gets seed+runIndex so runs differ but stay reproducible.
    const seedParam = params.get('seed');
    const activeSeed: number | null = seedParam !== null ? parseInt(seedParam, 10) : null;
    if (activeSeed !== null) {
      const runOffset = this.bot ? this.bot.currentRun - 1 : 0;
      seedRng(activeSeed + runOffset);
      console.log(`[RNG] Seeded with ${activeSeed + runOffset} (base ${activeSeed}, run ${runOffset + 1})`);
    } else {
      resetToRandom();
    }

    // Stamp seed onto the active reporter (bot or human)
    const stampSeed = (r: import('../bot/PlaytestReporter').PlaytestReporter) => {
      r.seed = activeSeed !== null ? activeSeed + (this.bot ? this.bot.currentRun - 1 : 0) : null;
    };
    if (this.bot?.reporter) stampSeed(this.bot.reporter);

    // Human session recorder (?record=true) — captures the same stats as bot mode
    if (params.get('record') === 'true' && !this.bot) {
      this.recorder = new PlaytestReporter('human', 1, 1);
      if (activeSeed !== null) stampSeed(this.recorder);
      console.log('[RECORD] Human session recording active — play normally, report saved on game end');
    }

    // Pre-load a human upgrade sequence for the human_emulator strategy (?upgrades=Label1,Label2,...)
    const upgradesParam = params.get('upgrades');
    if (upgradesParam) {
      (win as Record<string, unknown>).__humanUpgradeSequence =
        upgradesParam.split(',').map(s => decodeURIComponent(s).trim());
    }

    // Pause on P key
    this.input.keyboard?.on('keydown-P', () => {
      if (this.scene.isActive('PauseScene')) return;
      this.scene.pause('GameScene');
      this.scene.launch('PauseScene');
    });

    this.scene.launch('UIScene');
  }

  update(_time: number, rawDelta: number): void {
    if (this.scene.isPaused() || this.gameOver) return;

    // Scale delta so all manual calculations match physics and tween speed
    const delta = rawDelta * (this.bot?.timeScale ?? 1);

    this.elapsed += delta / 1000;

    this.handlePlayerMovement();
    this.handleShooting(delta);
    this.handleEnemyMovement();
    this.handleEnemyContact(delta);
    this.handleGemMagnet(delta);
    this.handleWaveSpawning(delta);
    this.checkBulletBounds();

    // Feed frame data to human session recorder
    if (this.recorder) {
      const spawnDelta = this.gemsSpawnedTotal - this.recorderPrevGemsSpawned;
      const collectDelta = this.gemsCollectedTotal - this.recorderPrevGemsCollected;
      this.recorderPrevGemsSpawned = this.gemsSpawnedTotal;
      this.recorderPrevGemsCollected = this.gemsCollectedTotal;
      this.recorder.onFrame(this.buildBotGameState(), spawnDelta, collectDelta);
    }

    if (this.player.isDead()) this.endGame(false);
    if (this.elapsed >= GAME_DURATION) this.endGame(true);
  }

  buildBotGameState(): BotGameState {
    return {
      player: {
        x: this.player.x,
        y: this.player.y,
        hp: this.player.hp,
        maxHp: this.player.stats.maxHp,
        level: this.player.level,
        stats: this.player.stats,
      },
      enemies: (this.enemies.getChildren() as Enemy[])
        .filter(e => e.active && e.alive)
        .map(e => ({ x: e.x, y: e.y, radius: e.def.radius, speed: e.def.speed, damage: e.def.damage, key: e.def.key })),
      gems: (this.gems.getChildren() as XPGem[])
        .filter(g => g.active)
        .map(g => ({ x: g.x, y: g.y, attracted: g.attracted })),
      elapsed: this.elapsed,
      kills: this.kills,
    };
  }

  private handlePlayerMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.player.stats.speed;
    let vx = 0;
    let vy = 0;

    if (this.bot) {
      const result = this.bot.update(
        this.player,
        this.enemies.getChildren() as Enemy[],
        this.gems.getChildren() as XPGem[],
        this.elapsed,
        this.kills,
        this.gemsSpawnedTotal,
        this.gemsCollectedTotal,
      );
      vx = result.vx;
      vy = result.vy;
    } else {
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    }

    body.setVelocity(vx * speed, vy * speed);
  }

  private handleShooting(delta: number): void {
    const shots = this.player.updateShooting(delta);
    if (shots <= 0) return;

    this.nearestEnemy = this.findNearestEnemy();
    if (!this.nearestEnemy) return;

    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.nearestEnemy.x, this.nearestEnemy.y,
    );

    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 0.2;
      this.fireBullet(this.player.x, this.player.y, baseAngle + spread);
    }
  }

  private fireBullet(x: number, y: number, angle: number): void {
    const bullet = this.bullets.getFirstDead(false) as Bullet | null;
    if (!bullet) return;
    bullet.fire(x, y, angle, this.player.stats.projectileSpeed, this.player.stats.damage);
  }

  private findNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active || !e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    return nearest;
  }

  private handleEnemyMovement(): void {
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (e.active && e.alive) e.moveToward(this.player.x, this.player.y);
    }
  }

  private handleEnemyContact(delta: number): void {
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active || !e.alive) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist < 28) {
        this.player.takeDamage(e.def.damage * (delta / 1000));
        this.lastDeathCause = e.def.key;
      }
    }
  }

  private handleGemMagnet(delta: number): void {
    const r = this.player.stats.pickupRadius;
    const collectDist = 14;
    const accel = 600;   // px/s² — how quickly gems build speed
    const maxSpeed = 480; // px/s cap
    const dt = delta / 1000;

    for (const g of this.gems.getChildren() as XPGem[]) {
      if (!g.active) continue;
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= collectDist) {
        this.onPlayerPickupGem(g);
        continue;
      }

      if (dist < r) g.attracted = true;

      if (g.attracted) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Increase speed each frame for the gravity-suck feel, but always
        // point directly at the player — this prevents orbital drift
        const currentSpd = Math.sqrt(g.attractVx * g.attractVx + g.attractVy * g.attractVy);
        const newSpd = Math.min(currentSpd + accel * dt, maxSpeed);
        g.attractVx = nx * newSpd;
        g.attractVy = ny * newSpd;

        g.setPosition(g.x + g.attractVx * dt, g.y + g.attractVy * dt);
        (g.body as Phaser.Physics.Arcade.Body).reset(g.x, g.y);
      }
    }
  }

  private handleWaveSpawning(delta: number): void {
    const def = this.waveManager.update(delta, this.elapsed);
    if (!def) return;

    const { x, y } = this.waveManager.randomSpawnPosition(
      this.cameras.main.scrollX, this.cameras.main.scrollY,
      this.scale.width, this.scale.height,
    );
    this.spawnEnemy(def.key, x, y);
  }

  private spawnEnemy(key: string, x: number, y: number): void {
    const def = ENEMIES.find((e) => e.key === key) ?? ENEMIES[0];
    const enemy = new Enemy(this, x, y, def);
    this.enemies.add(enemy, true);
  }

  private onBulletHitEnemy(bullet: Bullet, enemy: Enemy): void {
    if (!bullet.active || !enemy.active || !enemy.alive) return;
    bullet.deactivate();
    const died = enemy.takeDamage(bullet.damage);
    if (died) {
      this.kills++;
      this.spawnDeathEffect(enemy.x, enemy.y, enemy.def.color, enemy.def.radius);
      this.spawnGems(enemy.x, enemy.y, enemy.def.xp);
      enemy.destroy();
      this.enemies.remove(enemy);
    }
  }

  private spawnGems(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const gem = this.gems.getFirstDead(false) as XPGem | null;
      if (!gem) return;
      const ox = (Math.random() - 0.5) * 20;
      const oy = (Math.random() - 0.5) * 20;
      gem.spawn(x + ox, y + oy, 1);
      this.gemsSpawnedTotal++;
    }
  }

  private onPlayerPickupGem(gem: XPGem): void {
    if (!gem.active) return;
    gem.collect();
    this.gemsCollectedTotal++;
    const leveledUp = this.player.addXP(gem.value);
    if (leveledUp) this.triggerLevelUp();
  }

  private triggerLevelUp(): void {
    const choices = this.upgradeManager.getChoices(3);
    this.scene.pause('GameScene');
    this.scene.launch('UpgradeScene', { choices });
  }

  applyUpgrade(upgrade: UpgradeDef): void {
    this.upgradeManager.apply(upgrade, this.player.stats);
    this.appliedUpgrades.push(upgrade);
    this.player.heal(this.player.stats.maxHp);
  }

  private generateSplatterTextures(): void {
    // 3 variants with different blob arrangements, drawn in white for tinting
    for (let i = 0; i < 3; i++) {
      const size = 64;
      const cx = size / 2;
      const cy = size / 2;
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);

      // Main blob
      gfx.fillCircle(cx, cy, 10 + i * 2);

      // Satellite drops — unique per variant
      const drops = 4 + i * 2;
      for (let d = 0; d < drops; d++) {
        const angle = (d / drops) * Math.PI * 2 + i * 0.4;
        const dist = 10 + Math.sin(d + i) * 6 + 6;
        const r = 2 + Math.cos(d * 1.7) * 2 + 3;
        gfx.fillCircle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r);
      }

      gfx.generateTexture(`splatter_${i}`, size, size);
      gfx.destroy();
    }
  }

  private spawnDeathEffect(x: number, y: number, color: number, radius: number): void {
    // --- Persistent splatter on the floor ---
    const variant = Math.floor(Math.random() * 3);
    const splatter = this.add.image(x, y, `splatter_${variant}`)
      .setDepth(-1)
      .setAlpha(0.75)
      .setAngle(Math.random() * 360)
      .setScale((radius / 10) * (0.7 + Math.random() * 0.6))
      .setTint(color);

    this.splatters.push(splatter);
    if (this.splatters.length > 300) {
      this.splatters.shift()!.destroy();
    }

    // --- Explosion burst ---
    const count = 6 + Math.floor(radius / 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = radius * 1.5 + Math.random() * radius * 2.5;
      const size = 3 + Math.random() * 5;
      const particle = this.add.ellipse(x, y, size, size, color);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 250 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private checkBulletBounds(): void {
    const cam = this.cameras.main;
    const margin = 200;
    for (const b of this.bullets.getChildren() as Bullet[]) {
      if (!b.active) continue;
      if (
        b.x < cam.scrollX - margin || b.x > cam.scrollX + this.scale.width + margin ||
        b.y < cam.scrollY - margin || b.y > cam.scrollY + this.scale.height + margin
      ) {
        b.deactivate();
      }
    }
  }

  private endGame(won: boolean): void {
    if (this.recorder) {
      const state = this.buildBotGameState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const report = this.recorder.finalize(state, won, this.lastDeathCause) as any;
      const output = { strategy: 'human', runs: [report] };
      (window as unknown as Record<string, unknown>).__humanPlaytestReport = output;
      (window as unknown as Record<string, unknown>).__humanPlaytestDone = true;
      // POST to Vite dev server so the report lands on disk automatically
      fetch('/api/save-playtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(output),
      }).catch(() => { /* non-fatal if dev server endpoint unavailable */ });
      console.log(
        `[RECORD] Session complete — ${won ? 'WIN' : `died (${this.lastDeathCause})`} | ` +
        `Survived: ${report.meta.survived} | Lvl: ${report.meta.levelReached} | Kills: ${this.kills}`,
      );
    }

    if (this.bot) {
      const { done } = this.bot.onGameEnd(
        this.player,
        this.enemies.getChildren() as Enemy[],
        this.gems.getChildren() as XPGem[],
        this.elapsed, this.kills, won, this.lastDeathCause,
      );
      if (!done) {
        // Persist bot across restart so run count is maintained
        (window as unknown as Record<string, unknown>).__activeBotPlayer = this.bot;
        this.scene.stop('UIScene');
        this.scene.stop('UpgradeScene');
        this.scene.restart();
        return;
      }
      // All runs done — fall through to show end screen (bot stays visible so Playwright sees it's done)
    }

    // Freeze game logic without pausing the scene — pausing kills keyboard input
    this.gameOver = true;
    // Disable physics body entirely — prevents physics residue and enemy bumping from moving player
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setEnable(false);
    // Stop camera follow so the lerp doesn't keep sliding the camera after game over.
    // Snap it to the player's exact position first so the overlay appears centered.
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(
      this.player.x - this.scale.width / 2,
      this.player.y - this.scale.height / 2,
    );
    const W = this.scale.width;
    const H = this.scale.height;
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;

    this.add.rectangle(camX + W / 2, camY + H / 2, W, H, 0x000000, 0.75);
    this.add.text(camX + W / 2, camY + H * 0.4, won ? 'YOU SURVIVED!' : 'GAME OVER', {
      fontSize: '36px',
      color: won ? '#ffff44' : '#ff4444',
    }).setOrigin(0.5);
    this.add.text(camX + W / 2, camY + H * 0.5, `Kills: ${this.kills}  |  Level: ${this.player.level}`, {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(camX + W / 2, camY + H * 0.6, 'Press R to restart', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-R', () => {
      this.scene.stop('UIScene');
      this.scene.stop('UpgradeScene');
      this.scene.restart();
    });
  }
}
