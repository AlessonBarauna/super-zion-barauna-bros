import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../game/constants';
import { createButton, UI_FONT } from '../ui/Button';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Pause);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1620, 0.62).setOrigin(0, 0).setDepth(DEPTH.overlay);
    this.add
      .text(cx, 190, 'PAUSADO', {
        fontFamily: UI_FONT,
        fontStyle: 'bold',
        fontSize: '84px',
        color: PALETTE.douradoAurora,
        stroke: PALETTE.contorno,
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);

    const resume = (): void => {
      this.scene.resume(SCENE_KEYS.Game);
      this.scene.stop();
    };
    const toMenu = (): void => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.stop(SCENE_KEYS.Game);
      this.scene.start(SCENE_KEYS.Menu);
    };
    createButton(this, cx, 340, 'CONTINUAR', resume).setDepth(DEPTH.overlay);
    createButton(this, cx, 440, 'MENU PRINCIPAL', toMenu, {
      fill: Phaser.Display.Color.HexStringToColor(PALETTE.roxoUmbrax).color,
      height: 64,
      fontSize: 28,
    }).setDepth(DEPTH.overlay);

    this.add
      .text(
        cx,
        600,
        'Zion: ← → mover  •  Shift correr  •  Espaço pular (2x no ar)  •  ↓ abaixar / entrar  •  X poder\nBara: J L mover  •  K correr  •  I pular  •  O abaixar  •  U poder',
        { fontFamily: UI_FONT, fontSize: '20px', align: 'center', lineSpacing: 6, color: PALETTE.creme, stroke: PALETTE.contorno, strokeThickness: 4 },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);

    this.input.keyboard?.on('keydown-P', resume);
    this.input.keyboard?.on('keydown-ESC', resume);
  }
}
