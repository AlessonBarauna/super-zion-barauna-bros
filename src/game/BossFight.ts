import Phaser from 'phaser';
import type { Player } from '../entities/characters/Player';
import { Boss } from '../entities/bosses/Boss';
import { DEPTH, GAME_WIDTH, PALETTE, PX, TILE } from './constants';
import type { BossSpec } from '../levels/types';
import { nearestAlive } from '../systems/coop';
import { UI_FONT } from '../ui/Button';

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

  constructor(
    scene: Phaser.Scene,
    spec: BossSpec,
    solids: Phaser.Physics.Arcade.StaticGroup,
    players: Player[],
    hooks: BossHooks,
  ) {
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
    this.boss.step(dt, target ? target.x - this.boss.x : 0);
    this.drawBar();
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
