import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../game/constants';
import { UI_FONT } from '../ui/Button';

export interface HudSnapshot {
  lives: number;
  coins: number;
  score: number;
  hp: number;
  maxHp: number;
  timeLeft: number;
  levelId: string;
  levelName: string;
  power: string | null;
}

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
  private hearts: Phaser.GameObjects.Image[] = [];
  private powerIcon!: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    const panel = this.add.graphics().setDepth(DEPTH.hud);
    panel.fillStyle(0x10202c, 0.55);
    panel.fillRoundedRect(14, 12, 290, 112, 22);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 170, 12, 340, 62, 22);
    panel.fillRoundedRect(GAME_WIDTH - 224, 12, 210, 62, 22);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 36, 82, 72, 62, 18);

    this.add.image(46, 44, 'zion-idle-0').setScale(0.52).setDepth(DEPTH.hud);
    this.livesText = this.add.text(82, 25, '×5', textStyle(34)).setDepth(DEPTH.hud);

    for (let i = 0; i < 3; i++) {
      this.hearts.push(this.add.image(180 + i * 38, 42, 'heart-full').setScale(0.9).setDepth(DEPTH.hud));
    }
    this.add.image(46, 96, 'coin-0').setScale(1).setDepth(DEPTH.hud);
    this.coinsText = this.add.text(82, 76, '×00', textStyle(34)).setDepth(DEPTH.hud);

    this.add.text(GAME_WIDTH / 2, 20, 'PONTOS', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 38, '000000', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);

    this.add.text(GAME_WIDTH - 119, 20, 'TEMPO', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.timeText = this.add.text(GAME_WIDTH - 119, 38, '300', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);

    this.add.text(GAME_WIDTH / 2, 138, 'X', { ...textStyle(14), strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(DEPTH.hud);
    this.powerIcon = this.add.image(GAME_WIDTH / 2, 110, 'item-flower').setScale(0.9).setDepth(DEPTH.hud).setVisible(false);

    const onHud = (h: HudSnapshot): void => this.render(h);
    const onIntro = (id: string, name: string): void => this.intro(id, name);
    this.game.events.on(HUD_EVENT, onHud);
    this.game.events.on(LEVEL_INTRO_EVENT, onIntro);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(HUD_EVENT, onHud);
      this.game.events.off(LEVEL_INTRO_EVENT, onIntro);
      this.hearts = [];
    });
  }

  private render(h: HudSnapshot): void {
    this.livesText.setText(`×${h.lives}`);
    this.coinsText.setText(`×${String(h.coins).padStart(2, '0')}`);
    this.scoreText.setText(String(h.score).padStart(6, '0'));
    this.timeText.setText(String(Math.max(0, Math.ceil(h.timeLeft))));
    this.timeText.setColor(h.timeLeft <= 30 ? '#FF8A7A' : PALETTE.creme);
    this.powerIcon.setVisible(h.power === 'flor-de-fogo');
    this.hearts.forEach((heart, i) => {
      heart.setTexture(i < h.hp ? 'heart-full' : 'heart-empty');
      heart.setVisible(i < h.maxHp);
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
