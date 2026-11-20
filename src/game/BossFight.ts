import Phaser from 'phaser';
import type { Player } from '../entities/characters/Player';
import { Boss } from '../entities/bosses/Boss';
import { DEPTH, GAME_WIDTH, PALETTE, PX, TILE } from './constants';
import type { BossKind, BossSpec } from '../levels/types';
import { nearestAlive } from '../systems/coop';
import { isEnraged } from '../systems/boss';
import { hazardHits, isHarmful, spawnQuake, spawnRain, spawnShot, stepHazard, type Arena, type Hazard } from '../systems/bossHazards';
import { UI_FONT } from '../ui/Button';

/** Cor dos projéteis de cada chefão (arte provisória feita com formas simples). */
const BOSS_ACCENT: Record<BossKind, string> = {
  gronk: '#A8B96A',
  kragor: '#8A63FF',
  sakhur: '#F5B84A',
  frostak: '#2F7BFF',
  vyrak: '#6FE39A',
  mechazord: '#F2C94C',
  auron: '#FFE066',
  umbrax: '#B26BFF',
};

export interface BossHooks {
  onHit(): void;
  onWall(): void;
  onDefeated(): void;
}

/** Costura entre a cena e o chefão: colisões, golpes, barra de vida. A lógica fica em systems/boss. */
export class BossFight {
  readonly boss: Boss;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private shownHp = -1;
  private readonly arena: Arena;
  private hazards: { data: Hazard; shape: Phaser.GameObjects.Shape; marker?: Phaser.GameObjects.Ellipse }[] = [];

  constructor(
    scene: Phaser.Scene,
    spec: BossSpec,
    solids: Phaser.Physics.Arcade.StaticGroup,
    players: Player[],
    hooks: BossHooks,
    arenaTiles: { widthTiles: number; groundRow: number },
  ) {
    this.arena = { left: TILE, right: (arenaTiles.widthTiles - 1) * TILE, groundY: arenaTiles.groundRow * TILE };
    this.boss = new Boss(scene, spec.kind, (spec.x + 0.5) * TILE, (spec.y + 1) * TILE);
    scene.physics.add.collider(this.boss as unknown as Phaser.Physics.Arcade.Sprite, solids);
    this.boss.onEvent = (e) => {
      if (e === 'hit') hooks.onHit();
      else if (e === 'wall') hooks.onWall();
      else {
        this.bar.setVisible(false);
        this.label.setVisible(false);
        hooks.onDefeated();
      }
    };
    for (const player of players) {
      scene.physics.add.overlap(player, this.boss as unknown as Phaser.Physics.Arcade.Sprite, () => this.onTouch(player));
    }
    this.bar = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.label = scene.add
      .text(GAME_WIDTH / 2, 158, this.boss.def.name.toUpperCase(), {
        fontFamily: UI_FONT,
        fontStyle: 'bold',
        fontSize: '24px',
        color: PALETTE.creme,
        stroke: PALETTE.contorno,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.drawBar();
  }

  get defeated(): boolean {
    return this.boss.defeated;
  }

  step(dt: number, players: Player[]): void {
    const target = players[nearestAlive(this.boss.x, players)];
    const action = this.boss.step(dt, target ? target.x - this.boss.x : 0);
    if (action && !this.defeated) this.spawn(action.kind, target?.x ?? this.boss.x);
    if (this.defeated) this.clearHazards();
    else this.stepHazards(dt, players);
    this.drawBar();
  }

  private spawn(kind: 'shot' | 'rain' | 'leap' | 'quake', targetX: number): void {
    if (kind === 'leap') return;
    const def = this.boss.def;
    const rage = isEnraged(this.boss.ai, def);
    const list =
      kind === 'shot'
        ? spawnShot(def, this.boss.x, this.boss.ai.dir, this.arena, rage)
        : kind === 'rain'
          ? spawnRain(def, targetX, this.arena, rage)
          : spawnQuake(def, this.boss.x, this.arena);
    for (const data of list) this.hazards.push(this.makeVisual(data));
    if (kind === 'quake') this.boss.scene.cameras.main.shake(220, 0.006);
  }

  private makeVisual(data: Hazard): { data: Hazard; shape: Phaser.GameObjects.Shape; marker?: Phaser.GameObjects.Ellipse } {
    const scene = this.boss.scene;
    const color = Phaser.Display.Color.HexStringToColor(BOSS_ACCENT[this.boss.def.id]).color;
    const dark = Phaser.Display.Color.HexStringToColor(PALETTE.contorno).color;
    let shape: Phaser.GameObjects.Shape;
    if (data.kind === 'orb') shape = scene.add.ellipse(data.x, data.y, data.w, data.h, color).setStrokeStyle(6, dark);
    else if (data.kind === 'wave') shape = scene.add.ellipse(data.x, data.y, data.w, data.h, color).setStrokeStyle(6, dark);
    else shape = scene.add.rectangle(data.x, data.y, data.w * 0.8, data.h * 0.8, color).setStrokeStyle(6, dark).setAngle(45);
    shape.setDepth(DEPTH.enemies + 1);
    const marker =
      data.kind === 'rock'
        ? scene.add.ellipse(data.x, this.arena.groundY - 6, data.w * 2.2, 18, 0xff3b30, 0.8).setStrokeStyle(3, dark).setDepth(DEPTH.enemies - 1)
        : undefined;
    return { data, shape, marker };
  }

  private stepHazards(dt: number, players: Player[]): void {
    const next: typeof this.hazards = [];
    for (const item of this.hazards) {
      const data = stepHazard(item.data, dt, this.arena);
      if (!data) {
        item.shape.destroy();
        item.marker?.destroy();
        continue;
      }
      item.data = data;
      item.shape.setPosition(data.x, data.y);
      if (data.kind === 'rock') {
        item.shape.setVisible(isHarmful(data));
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(data.warn * 12));
        item.marker?.setAlpha(isHarmful(data) ? 0 : pulse);
      } else if (data.kind === 'orb') item.shape.setAngle(item.shape.angle + 12);
      for (const p of players) {
        if (p.dead) continue;
        const b = p.arcadeBody;
        if (hazardHits(data, { x: b.x, y: b.y, w: b.width, h: b.height })) p.takeHit(data.x);
      }
      next.push(item);
    }
    this.hazards = next;
  }

  private clearHazards(): void {
    for (const item of this.hazards) {
      item.shape.destroy();
      item.marker?.destroy();
    }
    this.hazards = [];
  }

  /** Uma bola de fogo atingiu o chefão? */
  fireHit(box: Phaser.Geom.Rectangle): boolean {
    if (this.defeated || !this.boss.active) return false;
    if (!Phaser.Geom.Intersects.RectangleToRectangle(box, this.boss.getBounds())) return false;
    this.boss.hurt('fire');
    return true;
  }

  private onTouch(player: Player): void {
    const boss = this.boss;
    if (boss.defeated || player.dead) return;
    const pb = player.arcadeBody;
    const bb = boss.arcadeBody;
    const falling = pb.velocity.y > 40 * PX;
    const fromAbove = pb.bottom - bb.top < bb.height * 0.4;
    if (falling && fromAbove) {
      boss.hurt('stomp');
      player.bounce();
      return;
    }
    if (boss.ai.mode === 'stunned') return; // atordoado não machuca ao toque
    player.takeHit(boss.x);
  }

  private drawBar(): void {
    const hp = this.boss.ai.hp;
    if (hp === this.shownHp) return;
    this.shownHp = hp;
    const w = 420;
    const x = GAME_WIDTH / 2 - w / 2;
    const g = this.bar;
    g.clear();
    g.fillStyle(0x1b2a3a, 1).fillRoundedRect(x - 6, 174, w + 12, 28, 12);
    g.fillStyle(0x4a1a22, 1).fillRoundedRect(x, 178, w, 20, 8);
    if (hp > 0) g.fillStyle(0xe0453a, 1).fillRoundedRect(x, 178, (w * hp) / this.boss.def.hp, 20, 8);
  }
}
