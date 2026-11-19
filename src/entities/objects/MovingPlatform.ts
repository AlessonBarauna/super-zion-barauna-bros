import Phaser from 'phaser';
import { DEPTH, PX, TILE } from '../../game/constants';
import type { MovingPlatformSpec } from '../../levels/types';
import { platformPosition } from '../../systems/movingPlatform';

/** Espessura da laje (o corpo de colisão tem a mesma altura). */
const THICKNESS = 27 * PX;

/**
 * Plataforma móvel de passagem única: só o topo colide, então o jogador sobe por baixo e pelos lados.
 * A posição vem da função pura `platformPosition`; aqui só aplicamos como velocidade, para que o
 * Arcade Physics enxergue o movimento real e carregue quem está em cima.
 */
export class MovingPlatform extends Phaser.GameObjects.TileSprite {
  constructor(
    scene: Phaser.Scene,
    readonly spec: MovingPlatformSpec,
  ) {
    super(scene, 0, 0, spec.w * TILE, THICKNESS, 'tile-moving');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.tiles);
    this.setOrigin(0, 0);
    const body = this.arcadeBody;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    this.snapTo(0);
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /** Posição desejada (em pixels, canto superior esquerdo) no instante `t`. */
  targetAt(t: number): { x: number; y: number } {
    const p = platformPosition(this.spec, t);
    return { x: p.x * TILE, y: p.y * TILE };
  }

  private snapTo(t: number): void {
    const target = this.targetAt(t);
    this.setPosition(target.x, target.y);
    this.arcadeBody.reset(target.x, target.y);
  }

  /** Aponta a velocidade para a posição de `t + dt`, mantendo o corpo sincronizado com a função pura. */
  follow(t: number, dt: number): void {
    if (dt <= 0) return;
    const target = this.targetAt(t + dt);
    const body = this.arcadeBody;
    body.setVelocity((target.x - body.x) / dt, (target.y - body.y) / dt);
  }
}
