import type { TileGrid } from '../../levels/TileGrid';
import type { EnemyKind } from '../../levels/types';

/** Contrato comum dos inimigos para a GameScene (cogumelo, ouriço, corvo). */
export interface Enemy {
  dead: boolean;
  active: boolean;
  x: number;
  y: number;
  /** Pisar derrota? Se não, tocar por cima também machuca. */
  readonly kind: EnemyKind;
  readonly stompable: boolean;
  readonly arcadeBody: Phaser.Physics.Arcade.Body;
  getBounds(): Phaser.Geom.Rectangle;
  /** Retorna false se o inimigo deve ser removido (caiu do mundo). */
  tick(grid: TileGrid, playerX: number, playerY: number, playerAlive: boolean, cameraCenterX: number): boolean;
  knockOut(dir: 1 | -1): void;
  squash(): void;
  destroy(): void;
}
