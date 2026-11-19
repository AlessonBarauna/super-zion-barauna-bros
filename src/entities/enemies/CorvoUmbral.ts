import Phaser from 'phaser';
import { CORVO_BODY, CORVO_FRAME } from '../../art/creatureArt';
import { DEPTH, PX, TILE } from '../../game/constants';
import type { TileGrid } from '../../levels/TileGrid';
import { createFlyer, stepFlyer, type FlyerState } from '../../systems/flyerAI';
import type { Enemy } from './Enemy';

const ACTIVATION_RANGE = 1100;

export class CorvoUmbral extends Phaser.Physics.Arcade.Sprite implements Enemy {
  dead = false;
  readonly kind = 'corvo-umbral' as const;
  readonly stompable = true;
  private ai: FlyerState;
  private lastTick = -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'corvo-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
    const body = this.arcadeBody;
    body.setAllowGravity(false);
    body.setSize(CORVO_BODY.w * PX, CORVO_BODY.h * PX, false);
    body.setOffset(CORVO_BODY.offsetX * PX, CORVO_BODY.offsetY * PX);
    body.reset(x, y);
    this.ai = createFlyer(x, y);
    this.play('corvo-fly');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get mode(): string {
    return this.ai.mode;
  }

  tick(grid: TileGrid, playerX: number, playerY: number, playerAlive: boolean, cameraCenterX: number): boolean {
    if (this.dead) return true;
    if (Math.abs(this.x - cameraCenterX) > ACTIVATION_RANGE) {
      this.arcadeBody.setVelocity(0, 0);
      this.lastTick = -1;
      return true;
    }
    const now = this.scene.time.now;
    const dt = this.lastTick < 0 ? 1 / 60 : Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const floorY = grid.level.groundRow * TILE - 26 * PX;
    const next = stepFlyer(this.ai, dt, { dx: playerX - this.x, dy: playerY - this.y, alive: playerAlive, floorY });
    this.arcadeBody.setVelocity((next.x - this.x) / dt, (next.y - this.y) / dt);
    this.ai = next;
    this.setFlipX(next.dir === 1);
    this.anims.timeScale = next.mode === 'dive' ? 2 : 1;
    return true;
  }

  knockOut(dir: 1 | -1): void {
    if (this.dead) return;
    this.dead = true;
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.anims.stop();
    this.setFlipY(true);
    this.scene.tweens.add({ targets: this, x: this.x + dir * 120, angle: dir * 160, duration: 800 });
    this.scene.tweens.add({ targets: this, y: this.y + 700, duration: 900, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
  }

  squash(): void {
    this.knockOut(1);
  }

  static readonly frame = CORVO_FRAME;
}
