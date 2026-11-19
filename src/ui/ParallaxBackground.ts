import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../game/constants';

export interface ParallaxLayer {
  key: string;
  /** Fração do deslocamento da câmera (0 = fixo ao fundo, 1 = acompanha o mundo). */
  factor: number;
  /** Deriva automática em pixels por milissegundo (nuvens). */
  auto: number;
}

export class ParallaxBackground {
  private readonly sprites: Phaser.GameObjects.TileSprite[];

  constructor(
    scene: Phaser.Scene,
    private readonly layers: readonly ParallaxLayer[],
  ) {
    this.sprites = layers.map((layer, i) =>
      scene.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, layer.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.background + i),
    );
  }

  update(scrollX: number, timeMs: number): void {
    this.layers.forEach((layer, i) => {
      const sprite = this.sprites[i];
      if (sprite) sprite.tilePositionX = scrollX * layer.factor + timeMs * layer.auto;
    });
  }
}
