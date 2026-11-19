import Phaser from 'phaser';
import { PALETTE, PX } from '../game/constants';

/**
 * Pipeline de arte v1: ilustrações vetoriais originais desenhadas com Canvas2D e
 * convertidas em texturas na inicialização. A arte é definida numa grade de 45 unidades
 * por bloco e escalada por PX, mantendo-a nítida na resolução do jogo (1280x720).
 */

export type Ctx = CanvasRenderingContext2D;

export const OUT = PALETTE.contorno;

export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w * PX), Math.ceil(h * PX));
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.save();
  ctx.scale(PX, PX);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  ctx.restore();
  tex.refresh();
}

/** Gerador pseudoaleatório determinístico (a arte precisa ser reprodutível). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, lineWidth = 2.4, stroke: string = OUT): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

export function polygon(ctx: Ctx, pts: Array<[number, number]>): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

export function star4(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.4): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * inner;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Símbolo da Aurora: sol dourado com raios. Identidade visual do reino. */
export function auroraSymbol(ctx: Ctx, cx: number, cy: number, r: number, color: string, rays = 8): void {
  ctx.fillStyle = color;
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - 0.17) * r * 0.62, cy + Math.sin(a - 0.17) * r * 0.62);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a + 0.17) * r * 0.62, cy + Math.sin(a + 0.17) * r * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  circle(ctx, cx, cy, r * 0.5);
  ctx.fill();
}
