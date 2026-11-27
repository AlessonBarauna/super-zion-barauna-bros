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
  /** Poder temporário ativo (Asas/Estrela) e quanto resta (0–1). */
  timed?: { id: 'asas' | 'estrela'; fraction: number } | null;
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
  /** Barrinha de tempo do poder temporário (só solo). */
  powerBar?: Phaser.GameObjects.Graphics;
  slot?: Phaser.GameObjects.Graphics;
  portrait: Phaser.GameObjects.Image;
  /** Corações do quadro anterior (para animar ganho e perda). */
  prevHp?: number;
}

/** Posição do painel do jogador 2 no HUD cooperativo (entre a pontuação e o tempo). */
const P2_PANEL_X = 826;

/** Placa translúcida do HUD: vidro escuro com filete claro e brilho no topo. */
function plate(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number): void {
  g.fillStyle(0x0c1a26, 0.62).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, 0.07).fillRoundedRect(x + 3, y + 3, w - 6, h * 0.42, { tl: r - 3, tr: r - 3, bl: 6, br: 6 });
  g.lineStyle(2, 0xffd84a, 0.4).strokeRoundedRect(x, y, w, h, r);
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
  private widgets: PlayerWidgets[] = [];

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    const coop = charactersFor(saveManager.data.mode).length > 1;
    const panel = this.add.graphics().setDepth(DEPTH.hud);
    plate(panel, GAME_WIDTH / 2 - 170, 12, 340, 62, 22);
    plate(panel, GAME_WIDTH - 224, 12, 210, 62, 22);
    this.widgets = [];

    this.add.text(GAME_WIDTH / 2, 20, 'PONTOS', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.scoreText = this.add.text(GAME_WIDTH / 2, 38, '000000', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.add.text(GAME_WIDTH - 119, 20, 'TEMPO', { ...textStyle(16), strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
    this.timeText = this.add.text(GAME_WIDTH - 119, 38, '300', textStyle(34)).setOrigin(0.5, 0).setDepth(DEPTH.hud);

    if (!coop) {
      // Modo individual: vidas, corações e moedas à esquerda; poder embaixo da pontuação.
      plate(panel, 14, 12, 290, 112, 22);
      const portrait = this.add.image(46, 44, 'zion-idle-0').setScale(0.52).setDepth(DEPTH.hud);
      this.livesText = this.add.text(82, 25, '×5', textStyle(34)).setDepth(DEPTH.hud);
      const hearts: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 3; i++) hearts.push(this.add.image(180 + i * 38, 42, 'heart-full').setScale(0.9).setDepth(DEPTH.hud));
      this.add.image(46, 96, 'coin-0').setScale(0.95).setDepth(DEPTH.hud);
      this.coinsText = this.add.text(82, 76, '×00', textStyle(34)).setDepth(DEPTH.hud);
      // Espaço do poder: só aparece quando há poder ativo (nada de caixa vazia).
      const slot = this.add.graphics().setDepth(DEPTH.hud).setVisible(false);
      plate(slot, GAME_WIDTH / 2 - 40, 82, 80, 70, 18);
      const powerIcon = this.add.image(GAME_WIDTH / 2, 110, 'item-flower').setScale(0.9).setDepth(DEPTH.hud).setVisible(false);
      const powerBar = this.add.graphics().setDepth(DEPTH.hud);
      this.widgets.push({ hearts, powerIcon, powerBar, slot, portrait });
    } else {
      // Cooperativo: P1 e vidas/moedas da equipe à esquerda; P2 ao lado do tempo.
      plate(panel, 14, 12, 332, 112, 22);
      plate(panel, P2_PANEL_X, 12, 224, 62, 22);
      const p1x = 46;
      const zion = this.add.image(p1x, 44, 'zion-idle-0').setScale(0.52).setDepth(DEPTH.hud);
      const h1: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 3; i++) h1.push(this.add.image(94 + i * 36, 42, 'heart-full').setScale(0.85).setDepth(DEPTH.hud));
      const pw1 = this.add.image(228, 42, 'item-flower').setScale(0.8).setDepth(DEPTH.hud).setVisible(false);
      this.add.text(p1x, 86, 'P1', { ...textStyle(14), strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(DEPTH.hud);
      this.add.image(94, 100, 'coin-0').setScale(0.75).setDepth(DEPTH.hud);
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
      const tex = player.timed ? (player.timed.id === 'asas' ? 'item-wings' : 'item-star') : 'item-flower';
      const active = (player.timed !== null && player.timed !== undefined) || player.power === 'flor-de-fogo';
      w.powerIcon.setTexture(tex).setVisible(active && !player.dead);
      w.slot?.setVisible(active && !player.dead);
      if (w.powerBar) {
        w.powerBar.clear();
        if (player.timed && !player.dead) {
          const blink = player.timed.fraction < 0.25 && Math.floor(this.time.now / 140) % 2 === 0;
          w.powerBar.fillStyle(0x000000, 0.5).fillRoundedRect(GAME_WIDTH / 2 - 28, 138, 56, 8, 4);
          if (!blink) w.powerBar.fillStyle(player.timed.id === 'estrela' ? 0xffd84a : 0x8fd3ff, 1).fillRoundedRect(GAME_WIDTH / 2 - 27, 139, Math.max(3, 54 * player.timed.fraction), 6, 3);
        }
      }
      w.portrait.setAlpha(player.dead ? 0.4 : 1);
      w.hearts.forEach((heart, i) => {
        heart.setTexture(i < player.hp ? 'heart-full' : 'heart-empty');
        heart.setVisible(i < player.maxHp);
      });
      this.animateHearts(w, player);
    });
  }

  /** Coração novo "pula" (ao crescer ou curar) e o perdido treme; sem animação no primeiro quadro nem na morte. */
  private animateHearts(w: PlayerWidgets, player: PlayerHud): void {
    const prev = w.prevHp;
    w.prevHp = player.hp;
    if (prev === undefined || player.dead || prev === player.hp) return;
    const lo = Math.min(prev, player.hp);
    const hi = Math.max(prev, player.hp);
    for (let i = lo; i < hi; i++) {
      const heart = w.hearts[i];
      if (!heart || !heart.visible) continue;
      this.tweens.killTweensOf(heart);
      const base = heart.getData('baseScale') as number | undefined ?? heart.scaleX;
      heart.setData('baseScale', base);
      heart.setScale(base);
      if (player.hp > prev) {
        this.tweens.add({ targets: heart, scale: base * 1.9, duration: 170, yoyo: true, ease: 'Back.easeOut', repeat: 1, onComplete: () => heart.setScale(base) });
        const plus = this.add
          .text(heart.x, heart.y - 22, '+1', { fontFamily: UI_FONT, fontStyle: 'bold', fontSize: '22px', color: '#FFE066', stroke: PALETTE.contorno, strokeThickness: 5 })
          .setOrigin(0.5)
          .setDepth(DEPTH.hud);
        this.tweens.add({ targets: plus, y: plus.y - 26, alpha: 0, duration: 800, onComplete: () => plus.destroy() });
      } else {
        const x0 = heart.x;
        this.tweens.add({ targets: heart, x: x0 + 5, duration: 45, yoyo: true, repeat: 4, onComplete: () => heart.setX(x0) });
      }
    }
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
