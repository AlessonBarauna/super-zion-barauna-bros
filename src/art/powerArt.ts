import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import { canvasTexture, circle, ellipse, fillStroke, OUT, polygon, star4, type Ctx } from './canvasArt';

/** Arte dos poderes: Estrela, Asas, chama de fogo, brasas e brilho. Original e provisória. */

export const FLAME_FRAME = { w: 40, h: 24 } as const;

function starItem(ctx: Ctx): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 17 : 8;
    pts.push([18 + Math.cos(a) * r, 23 + Math.sin(a) * r]);
  }
  polygon(ctx, pts);
  const g = ctx.createRadialGradient(15, 18, 2, 18, 24, 18);
  g.addColorStop(0, '#FFFBD0');
  g.addColorStop(0.55, '#FFD84A');
  g.addColorStop(1, '#F59B2B');
  fillStroke(ctx, g, 2.8);
  for (const x of [13.5, 22.5]) {
    ellipse(ctx, x, 23, 1.7, 2.6);
    ctx.fillStyle = OUT;
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(18, 27.5, 3.6, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function wingShape(ctx: Ctx, up: boolean, ox: number, oy: number, flip: 1 | -1): void {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(flip, 1);
  const k = up ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8, k * 4, 20, k * 12, 30, k * 8);
  ctx.bezierCurveTo(26, k * 14, 24, k * 17, 16, k * 17);
  ctx.bezierCurveTo(18, k * 22, 12, k * 24, 6, k * 21);
  ctx.bezierCurveTo(6, k * 14, 3, k * 8, 0, 0);
  ctx.closePath();
  fillStroke(ctx, '#FFFFFF', 2.4, '#5B7BA8');
  ctx.beginPath();
  ctx.moveTo(4, k * 4);
  ctx.quadraticCurveTo(14, k * 10, 24, k * 10);
  ctx.moveTo(4, k * 8);
  ctx.quadraticCurveTo(12, k * 13, 18, k * 15);
  ctx.strokeStyle = '#B8CBE6';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function wingsItem(ctx: Ctx): void {
  wingShape(ctx, true, 18, 24, -1);
  wingShape(ctx, true, 18, 24, 1);
  circle(ctx, 18, 26, 7);
  fillStroke(ctx, PALETTE.douradoAurora, 2.4);
  star4(ctx, 18, 26, 4, 0.45);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

/** Asa usada atrás do personagem (uma só; a segunda é a mesma, espelhada). */
function wingSprite(ctx: Ctx, up: boolean): void {
  wingShape(ctx, up, 4, up ? 24 : 6, 1);
}

function aura(ctx: Ctx): void {
  const g = ctx.createRadialGradient(48, 48, 6, 48, 48, 46);
  g.addColorStop(0, 'rgba(255,248,190,0.85)');
  g.addColorStop(0.55, 'rgba(255,214,74,0.45)');
  g.addColorStop(1, 'rgba(255,214,74,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
}

function burst(ctx: Ctx): void {
  const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 23);
  g.addColorStop(0, 'rgba(255,250,200,0.95)');
  g.addColorStop(0.4, 'rgba(255,170,40,0.75)');
  g.addColorStop(1, 'rgba(230,70,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
}

function ember(ctx: Ctx): void {
  const g = ctx.createRadialGradient(5, 5, 0.5, 5, 5, 5);
  g.addColorStop(0, '#FFF7C2');
  g.addColorStop(0.5, '#FFB52E');
  g.addColorStop(1, 'rgba(230,70,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 10, 10);
}

/** Chama horizontal (cabeça à direita, cauda tremulando à esquerda): 3 quadros que cintilam. */
function flame(ctx: Ctx, frame: 0 | 1 | 2): void {
  const w = [0, 3, -3][frame]!;
  const t = [0, -3, 2][frame]!;
  const layers: Array<{ scale: number; color: string; stroke?: boolean }> = [
    { scale: 1, color: '#E8453C', stroke: true },
    { scale: 0.78, color: '#F28B36' },
    { scale: 0.52, color: '#FFD84A' },
    { scale: 0.26, color: '#FFFBE0' },
  ];
  for (const layer of layers) {
    ctx.save();
    ctx.translate(26, 12);
    ctx.scale(layer.scale, layer.scale);
    ctx.translate(-26, -12);
    ctx.beginPath();
    ctx.moveTo(38, 12);
    ctx.bezierCurveTo(38, 3, 30, 1, 24, 3);
    ctx.bezierCurveTo(18, 4 + t, 12, 1 + w, 3, 4 + t);
    ctx.bezierCurveTo(10, 8, 9, 10 + w / 2, 1, 12 + t / 2);
    ctx.bezierCurveTo(9, 14, 10, 16 - w / 2, 3, 20 - t);
    ctx.bezierCurveTo(12, 23 - w, 18, 20, 24, 21);
    ctx.bezierCurveTo(30, 23, 38, 21, 38, 12);
    ctx.closePath();
    if (layer.stroke) fillStroke(ctx, layer.color, 2, '#B8431A');
    else {
      ctx.fillStyle = layer.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

export function createPowerTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'item-star', 36, 42, starItem);
  canvasTexture(scene, 'item-wings', 36, 42, wingsItem);
  canvasTexture(scene, 'wing-up', 36, 30, (c) => wingSprite(c, true));
  canvasTexture(scene, 'wing-down', 36, 30, (c) => wingSprite(c, false));
  canvasTexture(scene, 'aura', 96, 96, aura);
  canvasTexture(scene, 'burst', 48, 48, burst);
  canvasTexture(scene, 'ember', 10, 10, ember);
  for (const f of [0, 1, 2] as const) canvasTexture(scene, `flame-${f}`, FLAME_FRAME.w, FLAME_FRAME.h, (c) => flame(c, f));
}

export function createPowerAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists('flame')) {
    scene.anims.create({ key: 'flame', frames: [0, 1, 2, 1].map((f) => ({ key: `flame-${f}` })), frameRate: 18, repeat: -1 });
  }
}
