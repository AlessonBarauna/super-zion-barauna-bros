import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import { canvasTexture, circle, ellipse, fillStroke, OUT, roundRectPath, type Ctx } from './canvasArt';

/** Cogumelo Sombrio: cogumelo roxo (cor do Imperador Umbrax) de olhar zangado. */

export const COGUMELO_FRAME = { w: 48, h: 48 } as const;
export const COGUMELO_BODY = { w: 34, h: 30, offsetX: 7, offsetY: 16 } as const;

function draw(ctx: Ctx, step: 0 | 1, squashed: boolean): void {
  ctx.save();
  ctx.translate(0, 2);
  if (squashed) {
    ellipse(ctx, 24, 37, 20, 6);
    fillStroke(ctx, PALETTE.roxoUmbrax, 2.6);
    ellipse(ctx, 24, 35, 10, 2.4);
    ctx.fillStyle = '#9B66CC';
    ctx.fill();
    for (const x of [16, 32]) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 3, 36);
      ctx.lineTo(x + 3, 40);
      ctx.moveTo(x + 3, 36);
      ctx.lineTo(x - 3, 40);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // pés
  const off = step === 0 ? 3 : -3;
  ellipse(ctx, 15 + off, 41, 8, 3.8);
  fillStroke(ctx, '#4A2E1A', 2.2);
  ellipse(ctx, 33 - off, 41, 8, 3.8);
  fillStroke(ctx, '#4A2E1A', 2.2);
  // caule
  roundRectPath(ctx, 12, 24, 24, 17, 7);
  fillStroke(ctx, PALETTE.creme, 2.6);
  // chapéu
  ctx.beginPath();
  ctx.moveTo(2, 28);
  ctx.bezierCurveTo(0, 6, 14, 1, 24, 1);
  ctx.bezierCurveTo(34, 1, 48, 6, 46, 28);
  ctx.quadraticCurveTo(24, 33, 2, 28);
  ctx.closePath();
  fillStroke(ctx, PALETTE.roxoUmbrax, 2.8);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#5A2D85';
  ctx.fillRect(0, 22, 48, 12);
  ctx.fillStyle = '#9B66CC';
  ctx.beginPath();
  ctx.ellipse(16, 8, 9, 3.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [x, y, r] of [
    [10, 14, 3.4],
    [37, 12, 3.8],
    [24, 8, 2.8],
  ] as Array<[number, number, number]>) {
    circle(ctx, x, y, r);
    ctx.fillStyle = '#C9A8EA';
    ctx.fill();
  }
  // olhos zangados
  for (const x of [16.5, 31.5]) {
    ellipse(ctx, x, 22, 5, 5.6);
    fillStroke(ctx, '#FFFFFF', 2);
    circle(ctx, x + (x < 24 ? 1.4 : -1.4), 23, 2.2);
    ctx.fillStyle = OUT;
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(10.5, 14.5);
  ctx.lineTo(21, 19.5);
  ctx.moveTo(37.5, 14.5);
  ctx.lineTo(27, 19.5);
  ctx.stroke();
  // presinhas
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.2;
  for (const x of [20.5, 27.5]) {
    ctx.beginPath();
    ctx.moveTo(x - 1.6, 31.5);
    ctx.lineTo(x, 35.5);
    ctx.lineTo(x + 1.6, 31.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function createEnemyTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'cogumelo-walk-0', COGUMELO_FRAME.w, COGUMELO_FRAME.h, (c) => draw(c, 0, false));
  canvasTexture(scene, 'cogumelo-walk-1', COGUMELO_FRAME.w, COGUMELO_FRAME.h, (c) => draw(c, 1, false));
  canvasTexture(scene, 'cogumelo-squash', COGUMELO_FRAME.w, COGUMELO_FRAME.h, (c) => draw(c, 0, true));
}

export function createEnemyAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists('cogumelo-walk')) {
    scene.anims.create({
      key: 'cogumelo-walk',
      frames: [{ key: 'cogumelo-walk-0' }, { key: 'cogumelo-walk-1' }],
      frameRate: 6,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('coin-spin')) {
    scene.anims.create({
      key: 'coin-spin',
      frames: [0, 1, 2, 3].map((i) => ({ key: `coin-${i}` })),
      frameRate: 8,
      repeat: -1,
    });
  }
}
