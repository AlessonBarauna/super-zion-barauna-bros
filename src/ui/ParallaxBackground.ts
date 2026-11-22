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

  /**
   * Variação de paleta por mundo: cada camada ganha uma cópia da textura multiplicada pela cor
   * (setTint não funciona no renderizador Canvas; assim o resultado é igual nos dois).
   */
  setTint(color: number): void {
    if (color === 0xffffff) return;
    const css = `#${color.toString(16).padStart(6, '0')}`;
    this.layers.forEach((layer, i) => {
      const sprite = this.sprites[i];
      if (!sprite) return;
      const scene = sprite.scene;
      const key = `${layer.key}-t${color.toString(16)}`;
      if (!scene.textures.exists(key)) {
        const src = scene.textures.get(layer.key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
        const tex = scene.textures.createCanvas(key, src.width, src.height);
        const ctx = tex?.getContext();
        if (!tex || !ctx) return;
        ctx.drawImage(src, 0, 0);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, src.width, src.height);
        // multiply pinta também as partes transparentes: devolve o recorte original.
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(src, 0, 0);
        tex.refresh();
      }
      sprite.setTexture(key);
    });
  }

  update(scrollX: number, timeMs: number): void {
    this.layers.forEach((layer, i) => {
      const sprite = this.sprites[i];
      if (sprite) sprite.tilePositionX = scrollX * layer.factor + timeMs * layer.auto;
    });
  }
}
