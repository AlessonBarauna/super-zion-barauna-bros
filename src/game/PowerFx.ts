import Phaser from 'phaser';
import type { Player } from '../entities/characters/Player';
import { DEPTH } from './constants';

/** Efeitos visuais dos poderes temporários de um jogador: asas batendo, brilho da estrela e barra de tempo. */
export class PowerFx {
  private readonly wingBack: Phaser.GameObjects.Image;
  private readonly wingFront: Phaser.GameObjects.Image;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly bar: Phaser.GameObjects.Graphics;
  private lastSpark = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter,
  ) {
    this.wingBack = scene.add.image(0, 0, 'wing-down').setDepth(DEPTH.player - 1).setVisible(false).setAlpha(0.8);
    this.wingFront = scene.add.image(0, 0, 'wing-down').setDepth(DEPTH.player - 1).setVisible(false);
    this.aura = scene.add.image(0, 0, 'aura').setDepth(DEPTH.player - 1).setVisible(false);
    this.bar = scene.add.graphics().setDepth(DEPTH.fx);
  }

  update(time: number): void {
    const p = this.player;
    const t = p.timed;
    this.bar.clear();
    const wings = t.has('asas') && !p.dead;
    const star = t.has('estrela') && !p.dead;
    this.wingBack.setVisible(wings);
    this.wingFront.setVisible(wings);
    this.aura.setVisible(star);
    if (!t.id || p.dead) return;

    const top = p.y - p.displayHeight / 2;
    if (wings) {
      const airborne = !p.onGround;
      const up = airborne && Math.floor(time / 110) % 2 === 0;
      const tex = up ? 'wing-up' : 'wing-down';
      const back = p.facing === 1 ? -1 : 1;
      for (const [img, dx, dy, a] of [[this.wingBack, 4, -2, 0.8], [this.wingFront, 0, 2, 1]] as const) {
        img.setTexture(tex);
        img.setOrigin(0.11, up ? 0.8 : 0.2);
        img.setFlipX(back === -1);
        img.setPosition(p.x + back * (8 + dx), p.y - p.displayHeight * 0.18 + dy);
        img.setAlpha(a);
        img.setScale(p.scaleX * 1.6);
      }
    }
    if (star) {
      this.aura.setPosition(p.x, p.y);
      this.aura.setScale((1.15 + 0.12 * Math.sin(time / 90)) * Math.max(0.8, p.scaleX));
      this.aura.setAlpha(0.7 + 0.2 * Math.sin(time / 130));
      if (time - this.lastSpark > 70) {
        this.lastSpark = time;
        this.sparks.explode(1, p.x + (Math.random() - 0.5) * 34, p.y + (Math.random() - 0.5) * p.displayHeight);
      }
    }

    // Barra de tempo acima da cabeça (pisca quando está acabando).
    const w = 40;
    const x = p.x - w / 2;
    const y = top - 14;
    const low = t.left < 3;
    if (low && Math.floor(time / 120) % 2 === 0) return;
    this.bar.fillStyle(0x000000, 0.5).fillRoundedRect(x - 2, y - 2, w + 4, 9, 4);
    this.bar.fillStyle(star ? 0xffd84a : 0x8fd3ff, 1).fillRoundedRect(x, y, Math.max(2, w * t.fraction), 5, 2);
  }
}
