import Phaser from 'phaser';
import { OLIVEIRAS_LAYERS } from '../art/backgroundArt';
import { GAME_HEIGHT, GAME_VERSION, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../game/constants';
import { saveManager } from '../game/saveStore';
import type { GameMode } from '../systems/coop';
import { createButton, UI_FONT } from '../ui/Button';
import { ParallaxBackground } from '../ui/ParallaxBackground';

export class MenuScene extends Phaser.Scene {
  private bg!: ParallaxBackground;

  constructor() {
    super(SCENE_KEYS.Menu);
  }

  create(): void {
    this.bg = new ParallaxBackground(this, OLIVEIRAS_LAYERS);
    const cx = GAME_WIDTH / 2;

    // faixa de grama no rodapé
    for (let x = 0; x < GAME_WIDTH; x += 60) {
      this.add.image(x + 30, GAME_HEIGHT - 30, `tile-dirt-${(x / 60) % 3}`).setDepth(1);
      this.add.image(x + 30, GAME_HEIGHT - 90, `tile-grass-${(x / 60) % 3}`).setDepth(1);
    }

    const titleStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: UI_FONT,
      fontStyle: 'bold',
      fontSize: `${size}px`,
      color,
      stroke: PALETTE.contorno,
      strokeThickness: Math.round(size / 8),
      shadow: { offsetX: 0, offsetY: Math.round(size / 14), color: '#10202c', blur: 0, fill: true, stroke: true },
    });

    const t1 = this.add.text(cx, 118, 'SUPER ZION', titleStyle(104, PALETTE.douradoAurora)).setOrigin(0.5).setDepth(5);
    const t2 = this.add.text(cx, 214, 'BARAÚNA BROS.', titleStyle(70, '#7BE27F')).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: [t1, t2], y: '+=8', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(cx, 280, 'Reino de Baraúna  •  8 mundos, 32 fases e 8 chefões', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: PALETTE.creme,
        stroke: PALETTE.contorno,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const zion = this.add.sprite(cx - 440, GAME_HEIGHT - 150, 'zion-idle-0').setScale(2.1).setOrigin(0.5, 1).setDepth(6);
    zion.play('zion-idle');
    const bara = this.add.sprite(cx - 300, GAME_HEIGHT - 150, 'bara-idle-0').setScale(2.1).setOrigin(0.5, 1).setDepth(6);
    bara.play('bara-idle');
    const walker = this.add.sprite(cx + 390, GAME_HEIGHT - 150, 'cogumelo-walk-0').setScale(2).setOrigin(0.5, 1).setDepth(6);
    walker.play('cogumelo-walk');
    walker.setFlipX(true);

    const start = (mode: GameMode): void => {
      saveManager.setMode(mode);
      // `?level=1-1` entra direto na fase (atalho de desenvolvimento e dos testes automáticos).
      const direct = new URLSearchParams(window.location.search).get('level');
      if (direct) this.scene.start(SCENE_KEYS.Game, { levelId: direct });
      else this.scene.start(SCENE_KEYS.WorldSelect);
    };
    createButton(this, cx, 410, '1 JOGADOR', () => start('solo')).setDepth(6);
    createButton(this, cx, 496, '2 JOGADORES', () => start('coop'), {
      fill: Phaser.Display.Color.HexStringToColor(PALETTE.laranja).color,
    }).setDepth(6);
    createButton(this, cx, 572, 'TELA CHEIA', () => this.scale.toggleFullscreen(), {
      fill: Phaser.Display.Color.HexStringToColor(PALETTE.azulZion).color,
      height: 54,
      fontSize: 24,
    }).setDepth(6);

    this.add
      .text(cx, GAME_HEIGHT - 52, 'Bara (jogador 2):  J L mover   •   K correr   •   I pular   •   U poder        Teclas 1 e 2 escolhem o modo', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        color: '#FFB89E',
        stroke: PALETTE.contorno,
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(6);
    this.add
      .text(
        cx,
        GAME_HEIGHT - 22,
        'Zion: ← → / A D mover   •   Shift correr   •   Espaço pular   •   X poder   •   Esc pausa   •   F tela cheia   •   M som   •   Enter: último modo',
        {
          fontFamily: UI_FONT,
          fontSize: '19px',
          color: PALETTE.creme,
          stroke: PALETTE.contorno,
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(6);
    this.add
      .text(GAME_WIDTH - 12, 10, `v${GAME_VERSION}`, { fontFamily: UI_FONT, fontSize: '16px', color: '#10202c' })
      .setOrigin(1, 0)
      .setDepth(6);

    const save = saveManager.data;
    const info: string[] = [];
    if (save.completedLevels.length > 0) {
      const best = Math.max(...Object.values(save.bestScores), 0);
      info.push(`Fases concluídas: ${save.completedLevels.length}/32   •   Melhor pontuação: ${String(best).padStart(6, '0')}`);
    }
    if (saveManager.status === 'corrupt') info.push('O salvamento estava corrompido e foi reiniciado (uma cópia foi preservada).');
    if (saveManager.status === 'newer') info.push('Salvamento de versão mais nova: o progresso não será sobrescrito.');
    info.forEach((line, i) => {
      this.add
        .text(cx, 322 + i * 28, line, { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '21px', color: PALETTE.douradoAurora, stroke: PALETTE.contorno, strokeThickness: 5 })
        .setOrigin(0.5)
        .setDepth(6);
    });
    const soundLabel = this.add
      .text(GAME_WIDTH - 14, GAME_HEIGHT - 70, '', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '20px', color: PALETTE.creme, stroke: PALETTE.contorno, strokeThickness: 4 })
      .setOrigin(1, 1)
      .setDepth(6);
    const refreshSound = (): void => {
      soundLabel.setText(`Som: ${saveManager.data.settings.muted ? 'desligado' : 'ligado'} (M)`);
    };
    refreshSound();
    this.input.keyboard?.on('keydown-M', () => {
      saveManager.setMuted(!saveManager.data.settings.muted);
      refreshSound();
    });

    this.input.keyboard?.on('keydown-ENTER', () => start(saveManager.data.mode));
    this.input.keyboard?.on('keydown-ONE', () => start('solo'));
    this.input.keyboard?.on('keydown-TWO', () => start('coop'));
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
  }

  override update(time: number): void {
    this.bg.update(time * 0.05, time);
  }
}
