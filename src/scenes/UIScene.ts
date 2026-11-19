import Phaser from 'phaser';
import type { CharacterId } from '../art/characterArt';
import { DEPTH, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../game/constants';
import { saveManager } from '../game/saveStore';
import { charactersFor } from '../systems/coop';
import { UI_FONT } from '../ui/Button';

/** Informações individuais de cada jogador (corações e poder). */
export interface PlayerHud {
  id: CharacterId;
  hp: number;
  maxHp: number;
  power: string | null;
  dead: boolean;
}

export interface HudSnapshot {
  /** Vidas, moedas e pontuação são da equipe. */
  lives: number;
  coins: number;
  score: number;
  timeLeft: number;
  levelId: string;
  levelName: string;
  players: PlayerHud[];
}

interface PlayerWidgets {
  hearts: Phaser.GameObjects.Image[];
  powerIcon: Phaser.GameObjects.Image;
  portrait: Phaser.GameObjects.Image;
}

/** Posição do painel do jogador 2 no HUD cooperativo (entre a pontuação e o tempo). */
const P2_PANEL_X = 826;

export const HUD_EVENT = 'hud-update';
export const LEVEL_INTRO_EVENT = 'level-intro';

const textStyle = (size: number): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: UI_FONT,
  fontStyle: 'bold',
  fontSize: `${size}px`,
  color: PALETTE.creme,
  stroke: PALETTE.contorno,
  strokeThickness: 6,
});

/** HUD sobreposto à cena de jogo: vidas, corações, moedas, pontuação e tempo. */
export class UIScene extends Phaser.Scene {
  private livesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private widgets: PlayerWidgets[] = [];

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    const coop = charactersFor(saveManager.data.mode).length > 1;
    const panel = this.add.graphics().setDepth(DEPTH.hud);
    panel.fillStyle(0x10202c, 0.55);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 170, 12, 340, 62, 22);
    panel.fillRoundedRect(GAME_WIDTH - 224, 12, 210, 62, 22);
    this.widgets = [];

    this.add.text(GAME_WIDTH / 2, 20, 'PONTOS', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 38, '000000', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.add.text(GAME_WIDTH - 119, 20, 'TEMPO', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.timeText = this.add.text(GAME_WIDTH - 119, 38, '300', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);

    if (!coop) {
      // Modo individual: vidas, corações e moedas à esquerda; poder embaixo da pontuação.
      panel.fillRoundedRect(14, 12, 290, 112, 22);
      panel.fillRoundedRect(GAME_WIDTH / 2 - 36, 82, 72, 62, 18);
      const portrait = this.add.image(46, 44, 'zion-idle-0').setScale(0.52).setDepth(DEPTH.hud);
      this.livesText = this.add.text(82, 25, '×5', textStyle(34)).setDepth(DEPTH.hud);
      const hearts: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 3; i++) hearts.push(this.add.image(180 + i * 38, 42, 'heart-full').setScale(0.9).setDepth(DEPTH.hud));
      this.add.image(46, 96, 'coin-0').setScale(1).setDepth(DEPTH.hud);
      this.coinsText = this.add.text(82, 76, '×00', textStyle(34)).setDepth(DEPTH.hud);
      this.add.text(GAME_WIDTH / 2, 138, 'X', { ...textStyle(14), strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(DEPTH.hud);
      const powerIcon = this.add.image(GAME_WIDTH / 2, 110, 'item-flower').setScale(0.9).setDepth(DEPTH.hud).setVisible(false);
      this.widgets.push({ hearts, powerIcon, portrait });
    } else {
      // Cooperativo: P1 e vidas/moedas da equipe à esquerda; P2 ao lado do tempo.
      panel.fillRoundedRect(14, 12, 332, 112, 22);
      panel.fillRoundedRect(P2_PANEL_X, 12, 224, 62, 22);
      const p1x = 46;
      const zion = this.add.image(p1x, 44, 'zion-idle-0').setScale(0.52).setDepth(DEPTH.hud);
      const h1: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 3; i++) h1.push(this.add.image(94 + i * 36, 42, 'heart-full').setScale(0.85).setDepth(DEPTH.hud));
      const pw1 = this.add.image(228, 42, 'item-flower').setScale(0.8).setDepth(DEPTH.hud).setVisible(false);
      this.add.text(p1x, 86, 'P1', { ...textStyle(14), strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
      this.add.image(94, 100, 'coin-0').setScale(0.8).setDepth(DEPTH.hud);
      this.coinsText = this.add.text(118, 84, '×00', textStyle(28)).setDepth(DEPTH.hud);
      this.livesText = this.add.text(214, 86, 'VIDAS ×5', textStyle(22)).setDepth(DEPTH.hud);
      this.widgets.push({ hearts: h1, powerIcon: pw1, portrait: zion });

      const x2 = P2_PANEL_X + 36;
      const bara = this.add.image(x2, 44, 'bara-idle-0').setScale(0.52).setDepth(DEPTH.hud);
      const h2: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 3; i++) h2.push(this.add.image(x2 + 46 + i * 36, 42, 'heart-full').setScale(0.85).setDepth(DEPTH.hud));
      const pw2 = this.add.image(x2 + 46 + 3 * 36 + 8, 42, 'item-flower').setScale(0.8).setDepth(DEPTH.hud).setVisible(false);
      this.add.text(x2, 14, 'P2', { ...textStyle(12), strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
      this.widgets.push({ hearts: h2, powerIcon: pw2, portrait: bara });
    }

    const onHud = (h: HudSnapshot): void => this.render(h);
    const onIntro = (id: string, name: string): void => this.intro(id, name);
    this.game.events.on(HUD_EVENT, onHud);
    this.game.events.on(LEVEL_INTRO_EVENT, onIntro);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(HUD_EVENT, onHud);
      this.game.events.off(LEVEL_INTRO_EVENT, onIntro);
      this.widgets = [];
    });
  }

  private render(h: HudSnapshot): void {
    this.livesText.setText(this.widgets.length > 1 ? `VIDAS ×${h.lives}` : `×${h.lives}`);
    this.coinsText.setText(`×${String(h.coins).padStart(2, '0')}`);
    this.scoreText.setText(String(h.score).padStart(6, '0'));
    this.timeText.setText(String(Math.max(0, Math.ceil(h.timeLeft))));
    this.timeText.setColor(h.timeLeft <= 30 ? '#FF8A7A' : PALETTE.creme);
    h.players.forEach((player, idx) => {
      const w = this.widgets[idx];
      if (!w) return;
      w.powerIcon.setVisible(player.power === 'flor-de-fogo' && !player.dead);
      w.portrait.setAlpha(player.dead ? 0.4 : 1);
      w.hearts.forEach((heart, i) => {
        heart.setTexture(i < player.hp ? 'heart-full' : 'heart-empty');
        heart.setVisible(i < player.maxHp);
      });
    });
  }

  private intro(id: string, name: string): void {
    const banner = this.add
      .text(GAME_WIDTH / 2, 250, `${id}  ${name}`, { ...textStyle(60), strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    this.tweens.chain({
      targets: banner,
      tweens: [
        { alpha: 1, y: 230, duration: 450, ease: 'Back.easeOut' },
        { alpha: 1, duration: 1400 },
        { alpha: 0, y: 210, duration: 500, onComplete: () => banner.destroy() },
      ],
    });
  }
}
