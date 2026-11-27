import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import { createPowerAnimations, createPowerTextures } from './powerArt';
import { canvasTexture, circle, ellipse, fillStroke, OUT, polygon, type Ctx } from './canvasArt';

/** Besouro Saltador, Tatu Couraçado e Morcego de Cristal. Arte original e provisória. */

export const BESOURO_FRAME = { w: 52, h: 44 } as const;
export const BESOURO_BODY = { w: 36, h: 26, offsetX: 8, offsetY: 16 } as const;
export const TATU_FRAME = { w: 56, h: 44 } as const;
export const TATU_BODY = { w: 42, h: 26, offsetX: 7, offsetY: 16 } as const;
export const MORCEGO_FRAME = { w: 60, h: 44 } as const;
export const MORCEGO_BODY = { w: 30, h: 22, offsetX: 15, offsetY: 14 } as const;

function eyes(ctx: Ctx, xs: number[], y: number, r = 3.4): void {
  for (const x of xs) {
    circle(ctx, x, y, r);
    fillStroke(ctx, '#FFFFFF', 1.8);
    circle(ctx, x + 0.9, y + 0.5, r * 0.45);
    ctx.fillStyle = OUT;
    ctx.fill();
  }
}

function drawBesouro(ctx: Ctx, step: 0 | 1, squash = false): void {
  if (squash) {
    ellipse(ctx, 26, 38, 22, 6);
    fillStroke(ctx, '#2E7D6B', 2.6);
    ellipse(ctx, 26, 36, 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    return;
  }
  const off = step === 0 ? 3 : -3;
  // patas
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [lx, o] of [[14, off], [24, -off], [34, off], [42, -off]] as const) {
    ctx.beginPath();
    ctx.moveTo(lx, 34);
    ctx.lineTo(lx + o, 42);
    ctx.stroke();
  }
  // casco brilhante
  ellipse(ctx, 26, 26, 21, 14);
  fillStroke(ctx, '#2FA38A', 2.8);
  ctx.beginPath();
  ctx.moveTo(26, 12);
  ctx.lineTo(26, 38);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 18, 20, 6, 3.2, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  // cabeça
  circle(ctx, 42, 28, 8);
  fillStroke(ctx, '#1F6F5F', 2.6);
  eyes(ctx, [44], 26, 3.2);
  // antenas
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(40, 21);
  ctx.quadraticCurveTo(38, 12, 44, 10);
  ctx.moveTo(46, 22);
  ctx.quadraticCurveTo(50, 14, 49, 9);
  ctx.stroke();
  ellipse(ctx, 30, 28, 4, 2.2);
  ctx.fillStyle = PALETTE.douradoAurora;
  ctx.fill();
}

function drawTatu(ctx: Ctx, step: 0 | 1): void {
  const off = step === 0 ? 3 : -3;
  ellipse(ctx, 16 + off, 41, 7, 3.2);
  fillStroke(ctx, '#3A3F4A', 2);
  ellipse(ctx, 40 - off, 41, 7, 3.2);
  fillStroke(ctx, '#3A3F4A', 2);
  // cauda
  polygon(ctx, [[8, 30], [0, 24], [4, 34]]);
  fillStroke(ctx, '#7A8494', 2.2);
  // armadura em faixas
  ellipse(ctx, 27, 28, 21, 14);
  fillStroke(ctx, '#7A8494', 2.8);
  for (const x of [17, 25, 33]) {
    ctx.beginPath();
    ctx.moveTo(x, 16);
    ctx.quadraticCurveTo(x + 2, 28, x, 41);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    circle(ctx, x + 3, 24, 1.5);
    ctx.fillStyle = PALETTE.douradoAurora;
    ctx.fill();
  }
  // crista de espinhos de aço (por isso não se pisa)
  for (const x of [15, 23, 31]) {
    polygon(ctx, [[x - 4, 17], [x, 6], [x + 4, 17]]);
    fillStroke(ctx, '#C9D2E0', 2.2);
  }
  // cabeça e focinho
  polygon(ctx, [[40, 22], [54, 31], [40, 38]]);
  fillStroke(ctx, '#5E6878', 2.6);
  circle(ctx, 41, 27, 3.2);
  fillStroke(ctx, '#FF5A5A', 1.8);
  circle(ctx, 41.5, 27, 1.1);
  ctx.fillStyle = OUT;
  ctx.fill();
}

function drawMorcego(ctx: Ctx, wingsUp: boolean): void {
  const wy = wingsUp ? -14 : 9;
  for (const side of [-1, 1]) {
    polygon(ctx, [[30 + side * 6, 24], [30 + side * 28, 22 + wy], [30 + side * 22, 28 + wy / 2], [30 + side * 14, 26 + wy / 3], [30 + side * 8, 32]]);
    fillStroke(ctx, '#3FA6D9', 2.4);
  }
  ellipse(ctx, 30, 27, 9, 11);
  fillStroke(ctx, '#6D58C9', 2.6);
  circle(ctx, 30, 16, 8);
  fillStroke(ctx, '#6D58C9', 2.6);
  for (const side of [-1, 1]) {
    polygon(ctx, [[30 + side * 3, 10], [30 + side * 8, 0], [30 + side * 9, 11]]);
    fillStroke(ctx, '#B9F0FA', 2);
  }
  eyes(ctx, [26.5, 33.5], 15, 2.6);
  polygon(ctx, [[28, 20], [32, 20], [30, 24]]);
  fillStroke(ctx, '#FFFFFF', 1.4);
}

export function createNewCreatureTextures(scene: Phaser.Scene): void {
  createPowerTextures(scene);
  canvasTexture(scene, 'besouro-0', BESOURO_FRAME.w, BESOURO_FRAME.h, (c) => drawBesouro(c, 0));
  canvasTexture(scene, 'besouro-1', BESOURO_FRAME.w, BESOURO_FRAME.h, (c) => drawBesouro(c, 1));
  canvasTexture(scene, 'besouro-squash', BESOURO_FRAME.w, BESOURO_FRAME.h, (c) => drawBesouro(c, 0, true));
  canvasTexture(scene, 'tatu-0', TATU_FRAME.w, TATU_FRAME.h, (c) => drawTatu(c, 0));
  canvasTexture(scene, 'tatu-1', TATU_FRAME.w, TATU_FRAME.h, (c) => drawTatu(c, 1));
  canvasTexture(scene, 'morcego-0', MORCEGO_FRAME.w, MORCEGO_FRAME.h, (c) => drawMorcego(c, true));
  canvasTexture(scene, 'morcego-1', MORCEGO_FRAME.w, MORCEGO_FRAME.h, (c) => drawMorcego(c, false));
}

export function createNewCreatureAnimations(scene: Phaser.Scene): void {
  createPowerAnimations(scene);
  const make = (key: string, frames: string[], frameRate: number): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((k) => ({ key: k })), frameRate, repeat: -1 });
  };
  make('besouro-walk', ['besouro-0', 'besouro-1'], 7);
  make('tatu-walk', ['tatu-0', 'tatu-1'], 6);
  make('morcego-fly', ['morcego-0', 'morcego-1'], 9);
}
