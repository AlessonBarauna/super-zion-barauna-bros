import Phaser from 'phaser';
import { COGUMELO_BODY, COGUMELO_FRAME } from '../../art/enemyArt';
import { DEPTH, PX, TILE } from '../../game/constants';
import type { TileGrid } from '../../levels/TileGrid';
import { stepWalker, type WalkerState } from '../../systems/walkerAI';

const ACTIVATION_RANGE = 1100;

export class CogumeloSombrio extends Phaser.Physics.Arcade.Sprite {
  dead = false;
  private ai: WalkerState = { dir: -1, mode: 'patrol' };

  constructor(scene: Phaser.Scene, x: number, bottomY: number) {
    super(scene, x, 0, 'cogumelo-walk-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
    const body = this.arcadeBody;
    body.setSize(COGUMELO_BODY.w * PX, COGUMELO_BODY.h * PX, false);
    body.setOffset(COGUMELO_BODY.offsetX * PX, COGUMELO_BODY.offsetY * PX);
    const centerToBodyBottom = body.offset.y + body.height - (COGUMELO_FRAME.h * PX) / 2;
    body.reset(x, bottomY - centerToBodyBottom);
    this.play('cogumelo-walk');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get mode(): string {
    return this.ai.mode;
  }

  /** Atualiza a IA. Retorna false se o inimigo caiu do mundo e deve ser removido. */
  tick(grid: TileGrid, playerX: number, playerY: number, playerAlive: boolean, cameraCenterX: number): boolean {
    if (this.dead) return true;
    const body = this.arcadeBody;
    if (this.y > grid.level.heightTiles * TILE + 300) return false;
    if (Math.abs(this.x - cameraCenterX) > ACTIVATION_RANGE) {
      body.setVelocityX(0);
      return true;
    }

    const halfW = body.width / 2;
    const midRow = Math.floor((body.y + body.height / 2) / TILE);
    const belowRow = Math.floor((body.bottom + 6) / TILE);
    const canAdvance = (dir: 1 | -1): boolean => {
      const col = Math.floor((body.center.x + dir * (halfW + 6)) / TILE);
      if (grid.isSolid(col, midRow)) return false;
      return !body.blocked.down || grid.isSolid(col, belowRow);
    };

    const result = stepWalker(this.ai, {
      canAdvance,
      playerDx: playerX - this.x,
      playerDy: playerY - this.y,
      playerAlive,
    });
    this.ai = result.state;
    body.setVelocityX(this.ai.dir * result.speed);
    this.setFlipX(this.ai.dir === 1);
    this.anims.timeScale = this.ai.mode === 'chase' ? 1.7 : 1;
    return true;
  }

  /** Derrotado por fogo: gira para trás e cai para fora da tela. */
  knockOut(dir: 1 | -1): void {
    if (this.dead) return;
    this.dead = true;
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.anims.stop();
    this.setFlipY(true);
    this.scene.tweens.add({ targets: this, x: this.x + dir * 150, angle: dir * 200, duration: 900 });
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: this.y - 80, duration: 220, ease: 'Quad.easeOut' },
        { y: this.y + 700, duration: 800, ease: 'Quad.easeIn' },
      ],
      onComplete: () => this.destroy(),
    });
  }

  squash(): void {
    if (this.dead) return;
    this.dead = true;
    const body = this.arcadeBody;
    body.setVelocity(0, 0);
    body.enable = false;
    this.anims.stop();
    this.setTexture('cogumelo-squash');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 350,
      duration: 250,
      onComplete: () => this.destroy(),
    });
  }
}
