import Phaser from 'phaser';
import { OLIVEIRAS_LAYERS } from '../art/backgroundArt';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../game/constants';
import { saveManager } from '../game/saveStore';
import { WORLDS } from '../levels/generator';
import { LEVELS } from '../levels';
import { BOSSES, BOSS_BY_WORLD } from '../systems/boss';
import { isLevelUnlocked, MAX_STARS, suggestedLevel, totalStars } from '../systems/worldMap';
import { UI_FONT } from '../ui/Button';
import { ParallaxBackground } from '../ui/ParallaxBackground';

const CARD_W = 292;
const CARD_H = 262;
const GAP_X = 18;
const TOP = 112;
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Mapa interativo: 8 mundos, 4 fases cada, com bloqueios, estrelas e progresso geral. */
export class WorldSelectScene extends Phaser.Scene {
  private bg!: ParallaxBackground;
  private selected = '1-1';
  private nodes = new Map<string, { ring: Phaser.GameObjects.Graphics; x: number; y: number }>();
  private cursor!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENE_KEYS.WorldSelect);
  }

  create(): void {
    this.nodes.clear();
    const save = saveManager.data;
    this.bg = new ParallaxBackground(this, OLIVEIRAS_LAYERS);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1620, 0.62).setOrigin(0, 0).setDepth(-50);
    const style = (size: number, color: string = PALETTE.creme): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: UI_FONT,
      fontStyle: 'bold',
      fontSize: `${size}px`,
      color,
      stroke: PALETTE.contorno,
      strokeThickness: Math.max(3, Math.round(size / 6)),
    });
    this.add.text(GAME_WIDTH / 2, 44, 'MAPA DE MUNDOS', style(46, PALETTE.douradoAurora)).setOrigin(0.5);
    const done = save.completedLevels.length;
    this.add
      .text(GAME_WIDTH / 2, 88, `Fases concluídas: ${done}/32   •   Estrelas: ${totalStars(save)}/${MAX_STARS}   •   Mundos abertos: ${save.unlockedWorlds}/8`, style(20))
      .setOrigin(0.5);

    WORLDS.forEach((info, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 30 + col * (CARD_W + GAP_X);
      const y = TOP + row * (CARD_H + 14);
      const open = info.world <= save.unlockedWorlds;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 3, y + 6, CARD_W, CARD_H, 22);
      g.fillStyle(open ? info.bgTint : 0x55606b, 1).fillRoundedRect(x - 3, y - 3, CARD_W + 6, CARD_H + 6, 24);
      g.fillStyle(0x1b2a3a, 1).fillRoundedRect(x, y, CARD_W, CARD_H, 21);
      g.fillStyle(open ? 0x2a4258 : 0x26313b, 1).fillRoundedRect(x + 5, y + 5, CARD_W - 10, CARD_H - 10, 17);
      this.add.text(x + CARD_W / 2, y + 30, `MUNDO ${info.world}`, style(18, open ? hex(info.bgTint) : '#8a97a3')).setOrigin(0.5);
      this.add
        .text(x + CARD_W / 2, y + 66, info.name, { ...style(22, open ? PALETTE.creme : '#8a97a3'), wordWrap: { width: CARD_W - 24 }, align: 'center' })
        .setOrigin(0.5);
      const boss = BOSSES[BOSS_BY_WORLD[info.world - 1] ?? 'gronk'];
      this.add.text(x + CARD_W / 2, y + CARD_H - 24, open ? `Chefão: ${boss.name}` : '🔒 Bloqueado', style(17, open ? PALETTE.laranja : '#8a97a3')).setOrigin(0.5);

      for (let stage = 1; stage <= 4; stage++) {
        const id = `${info.world}-${stage}`;
        const unlocked = isLevelUnlocked(save, id);
        const completed = save.completedLevels.includes(id);
        const nx = x + 46 + (stage - 1) * 67;
        const ny = y + 132;
        const node = this.add.graphics();
        const color = !unlocked ? 0x3b4650 : completed ? 0x43b649 : stage === 4 ? 0xe0453a : 0xf28b36;
        node.fillStyle(0x1b2a3a, 1).fillCircle(nx, ny, 27);
        node.fillStyle(color, 1).fillCircle(nx, ny, 23);
        node.fillStyle(0xffffff, 0.2).fillEllipse(nx - 4, ny - 9, 26, 10);
        this.add.text(nx, ny, stage === 4 ? 'B' : String(stage), style(26, unlocked ? PALETTE.creme : '#7b8794')).setOrigin(0.5);
        const stars = save.stars[id] ?? 0;
        this.add.text(nx, ny + 38, unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '', style(15, PALETTE.douradoAurora)).setOrigin(0.5);
        if (unlocked) {
          const hit = this.add.circle(nx, ny, 30, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
          hit.on('pointerover', () => this.select(id));
          hit.on('pointerdown', () => this.play(id));
        }
        this.nodes.set(id, { ring: node, x: nx, y: ny });
      }
    });

    this.cursor = this.add.graphics().setDepth(10);
    this.selected = suggestedLevel(save);
    this.select(this.selected);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '← → ↑ ↓ escolher   •   Enter jogar   •   Esc voltar ao menu', style(19)).setOrigin(0.5, 1);
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.move(-1, 0));
    kb?.on('keydown-RIGHT', () => this.move(1, 0));
    kb?.on('keydown-UP', () => this.move(0, -1));
    kb?.on('keydown-DOWN', () => this.move(0, 1));
    kb?.on('keydown-ENTER', () => this.play(this.selected));
    kb?.on('keydown-SPACE', () => this.play(this.selected));
    kb?.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.Menu));
  }

  /** Move a seleção para a fase aberta mais próxima na direção pedida. */
  private move(dx: number, dy: number): void {
    const save = saveManager.data;
    const cur = this.nodes.get(this.selected);
    if (!cur) return;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const [id, n] of this.nodes) {
      if (id === this.selected || !isLevelUnlocked(save, id)) continue;
      const vx = n.x - cur.x;
      const vy = n.y - cur.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(dx !== 0 ? vy : vx);
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (best) this.select(best);
  }

  private select(id: string): void {
    this.selected = id;
    const n = this.nodes.get(id);
    if (!n) return;
    this.cursor.clear();
    this.cursor.lineStyle(5, 0xf7c948, 1).strokeCircle(n.x, n.y, 33);
    this.cursor.lineStyle(2, 0xffffff, 0.8).strokeCircle(n.x, n.y, 37);
  }

  private play(id: string): void {
    if (!isLevelUnlocked(saveManager.data, id) || !LEVELS[id]) return;
    this.scene.start(SCENE_KEYS.Game, { levelId: id });
  }

  override update(time: number): void {
    this.bg.update(time * 0.05, time);
  }
}
