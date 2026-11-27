import Phaser from 'phaser';
import { MORCEGO_BODY, MORCEGO_FRAME } from '../../art/newCreatureArt';
import { DEPTH, PX } from '../../game/constants';
import type { TileGrid } from '../../levels/TileGrid';
import { batPhase, batPose } from '../../systems/batAI';
import type { Enemy } from './Enemy';

const ACTIVATION_RANGE = 1100;

export class MorcegoCristal extends Phaser.Physics.Arcade.Sprite implements Enemy {
  dead = false;
  readonly kind = 'morcego-cristal' as const;
  readonly stompable = true;
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly phase: number;
  private t = 0;
  private lastTick = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, tileX: number) {
    super(scene, x, y, 'morcego-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
    const body = this.arcadeBody;
    body.setAllowGravity(false);
    body.setSize(MORCEGO_BODY.w * PX, MORCEGO_BODY.h * PX, false);
    body.setOffset(MORCEGO_BODY.offsetX * PX, MORCEGO_BODY.offsetY * PX);
    body.reset(x, y);
    this.homeX = x;
    this.homeY = y;
    this.phase = batPhase(tileX);
    this.play('morcego-fly');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  tick(_grid: TileGrid, _px: number, _py: number, _alive: boolean, cameraCenterX: number): boolean {
    if (this.dead) return true;
    if (Math.abs(this.x - cameraCenterX) > ACTIVATION_RANGE) {
      this.arcadeBody.setVelocity(0, 0);
      this.lastTick = -1;
      return true;
    }
    const now = this.scene.time.now;
    const dt = this.lastTick < 0 ? 1 / 60 : Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;
    this.t += dt;
    const pose = batPose(this.homeX, this.homeY, this.t, this.phase);
    this.arcadeBody.setVelocity((pose.x - this.x) / dt, (pose.y - this.y) / dt);
    this.setFlipX(pose.dir === -1);
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

  static readonly frame = MORCEGO_FRAME;
}
