import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import { canvasTexture, circle, ellipse, polygon, seeded, type Ctx } from './canvasArt';

/**
 * Camadas de parallax da Vila das Oliveiras. Cada camada tem 960 unidades de
 * largura (= largura da tela) e é perfeitamente repetível na horizontal.
 */

export const BG_W = 960;
export const BG_H = 540;
export const BG_GROUND_Y = 405;

export const OLIVEIRAS_LAYERS = [
  { key: 'bg-sky', factor: 0, auto: 0 },
  { key: 'bg-clouds', factor: 0.04, auto: 0.012 },
  { key: 'bg-mountains', factor: 0.08, auto: 0 },
  { key: 'bg-hills-far', factor: 0.16, auto: 0 },
  { key: 'bg-hills-village', factor: 0.32, auto: 0 },
  { key: 'bg-olive-trees', factor: 0.58, auto: 0 },
] as const;

/** Soma de senos com harmônicos inteiros: periódica em BG_W, logo repetível sem emenda. */
function wave(x: number, terms: Array<[number, number, number]>): number {
  let y = 0;
  for (const [k, amp, phase] of terms) y += Math.sin(((x / BG_W) * Math.PI * 2 * k) + phase) * amp;
  return y;
}

function hillPath(ctx: Ctx, base: number, terms: Array<[number, number, number]>): void {
  ctx.beginPath();
  ctx.moveTo(0, BG_H);
  for (let x = 0; x <= BG_W; x += 6) ctx.lineTo(x, base + wave(x, terms));
  ctx.lineTo(BG_W, BG_H);
  ctx.closePath();
}

function wrapped(draw: (offset: number) => void): void {
  for (const off of [-BG_W, 0, BG_W]) draw(off);
}

function sky(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, BG_H);
  g.addColorStop(0, '#6EC3F0');
  g.addColorStop(0.55, '#B8E3F7');
  g.addColorStop(0.8, '#FCEFC9');
  g.addColorStop(1, '#FDE2A6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BG_W, BG_H);
  const sun = ctx.createRadialGradient(740, 120, 8, 740, 120, 190);
  sun.addColorStop(0, 'rgba(255,248,200,1)');
  sun.addColorStop(0.18, 'rgba(255,236,150,0.85)');
  sun.addColorStop(1, 'rgba(255,236,150,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, BG_W, BG_H);
  circle(ctx, 740, 120, 38);
  ctx.fillStyle = '#FFF4B8';
  ctx.fill();
  // raios suaves
  ctx.fillStyle = 'rgba(255,244,184,0.18)';
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(740, 120);
    ctx.lineTo(740 + Math.cos(a - 0.06) * 420, 120 + Math.sin(a - 0.06) * 420);
    ctx.lineTo(740 + Math.cos(a + 0.06) * 420, 120 + Math.sin(a + 0.06) * 420);
    ctx.closePath();
    ctx.fill();
  }
}

function cloud(ctx: Ctx, x: number, y: number, s: number): void {
  const blobs: Array<[number, number, number]> = [
    [0, 0, 26],
    [30, -12, 32],
    [64, -2, 28],
    [92, 8, 20],
    [-26, 10, 18],
  ];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (const [bx, by, r] of blobs) {
    circle(ctx, bx, by + 6, r);
    ctx.fillStyle = '#DCEFFA';
    ctx.fill();
  }
  for (const [bx, by, r] of blobs) {
    circle(ctx, bx, by, r);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
}

function clouds(ctx: Ctx): void {
  const spots: Array<[number, number, number]> = [
    [90, 90, 1],
    [330, 150, 0.7],
    [520, 70, 1.15],
    [760, 190, 0.8],
    [900, 100, 0.65],
  ];
  wrapped((off) => spots.forEach(([x, y, s]) => cloud(ctx, x + off, y, s)));
}

function mountains(ctx: Ctx): void {
  const peaks: Array<[number, number, number]> = [
    [120, 250, 150],
    [330, 210, 190],
    [560, 270, 140],
    [760, 220, 180],
    [930, 260, 130],
  ];
  wrapped((off) => {
    for (const [x, top, half] of peaks) {
      polygon(ctx, [
        [x + off - half, 400],
        [x + off, top],
        [x + off + half, 400],
      ]);
      ctx.fillStyle = '#A9CBE0';
      ctx.fill();
      polygon(ctx, [
        [x + off, top],
        [x + off + half * 0.34, top + (400 - top) * 0.34],
        [x + off + half * 0.1, top + (400 - top) * 0.3],
        [x + off - half * 0.12, top + (400 - top) * 0.36],
        [x + off - half * 0.34, top + (400 - top) * 0.34],
      ]);
      ctx.fillStyle = '#EAF6FC';
      ctx.fill();
    }
  });
  const fade = ctx.createLinearGradient(0, 340, 0, 420);
  fade.addColorStop(0, 'rgba(184,227,247,0)');
  fade.addColorStop(1, 'rgba(184,227,247,0.9)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 340, BG_W, 100);
}

function hillsFar(ctx: Ctx): void {
  const terms: Array<[number, number, number]> = [
    [2, 22, 0.6],
    [5, 9, 2.1],
    [9, 4, 0.3],
  ];
  hillPath(ctx, 350, terms);
  const g = ctx.createLinearGradient(0, 300, 0, 540);
  g.addColorStop(0, '#9DD7A3');
  g.addColorStop(1, '#7FC48B');
  ctx.fillStyle = g;
  ctx.fill();
  // campos de cultivo em faixas
  ctx.save();
  hillPath(ctx, 350, terms);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    for (let x = 0; x <= BG_W; x += 8) {
      const y = 372 + i * 14 + wave(x, [[3, 3 + i * 0.4, i]]);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function miniHouse(ctx: Ctx, x: number, y: number, s: number, wall: string, roof: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = wall;
  ctx.fillRect(-18, -20, 36, 22);
  polygon(ctx, [
    [-23, -18],
    [0, -38],
    [23, -18],
  ]);
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.fillStyle = '#7A4A28';
  ctx.fillRect(-4, -14, 8, 16);
  ctx.fillStyle = '#BFE6FA';
  ctx.fillRect(-14, -14, 6, 6);
  ctx.fillRect(8, -14, 6, 6);
  ctx.restore();
}

function hillsVillage(ctx: Ctx): void {
  const terms: Array<[number, number, number]> = [
    [3, 26, 1.7],
    [4, 10, 0.4],
    [8, 4, 2.6],
  ];
  const base = 372;
  hillPath(ctx, base, terms);
  const g = ctx.createLinearGradient(0, 330, 0, 540);
  g.addColorStop(0, '#6FC878');
  g.addColorStop(1, '#4FAE5E');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,90,45,0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // vilarejo: casas pequenas sobre a colina
  const houses: Array<[number, number, string, string]> = [
    [70, 0.9, PALETTE.creme, PALETTE.laranja],
    [200, 0.7, '#F7E3B0', '#C9533D'],
    [330, 1.0, PALETTE.creme, '#C9533D'],
    [470, 0.75, '#F7E3B0', PALETTE.laranja],
    [610, 0.95, PALETTE.creme, PALETTE.laranja],
    [760, 0.7, '#F7E3B0', '#C9533D'],
    [880, 0.85, PALETTE.creme, '#C9533D'],
  ];
  wrapped((off) => {
    for (const [x, s, wall, roof] of houses) {
      const y = base + wave(x, terms) + 8;
      miniHouse(ctx, x + off, y, s, wall, roof);
    }
  });
}

function miniOlive(ctx: Ctx, x: number, baseY: number, s: number, tone: number): void {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.bezierCurveTo(-3, -22, -9, -30, -4, -48);
  ctx.lineTo(7, -48);
  ctx.bezierCurveTo(4, -30, 11, -22, 6, 0);
  ctx.closePath();
  ctx.fillStyle = '#6A4529';
  ctx.fill();
  const blobs: Array<[number, number, number]> = [
    [-22, -62, 24],
    [24, -62, 25],
    [0, -82, 30],
    [0, -56, 24],
  ];
  const cols = [
    ['#7A9A66', '#8FB07A'],
    ['#6C8C5A', '#7E9E6B'],
    ['#85A671', '#9BBB86'],
  ][tone % 3] as [string, string];
  for (const [bx, by, r] of blobs) {
    circle(ctx, bx, by, r);
    ctx.fillStyle = cols[0];
    ctx.fill();
  }
  for (const [bx, by, r] of blobs) {
    circle(ctx, bx - 3, by - 4, r * 0.62);
    ctx.fillStyle = cols[1];
    ctx.fill();
  }
  ctx.restore();
}

function oliveTrees(ctx: Ctx): void {
  const rnd = seeded(913);
  // chão de fundo sob as árvores (continua a colina até o terreno da fase)
  const g = ctx.createLinearGradient(0, 380, 0, BG_GROUND_Y + 30);
  g.addColorStop(0, '#5DBB68');
  g.addColorStop(1, '#3E9D50');
  ctx.fillStyle = g;
  ctx.fillRect(0, 395, BG_W, 145);
  const trees = 8;
  wrapped((off) => {
    for (let i = 0; i < trees; i++) {
      const x = (i + 0.5) * (BG_W / trees) + Math.sin(i * 2.3) * 22;
      miniOlive(ctx, x + off, BG_GROUND_Y + 8, 0.9 + (i % 3) * 0.14, i);
    }
  });
  // moitas
  rnd();
  for (let i = 0; i < 14; i++) {
    const x = rnd() * BG_W;
    const rx = 20 + rnd() * 10;
    wrapped((off) => {
      ellipse(ctx, x + off, BG_GROUND_Y + 10, rx, 9);
      ctx.fillStyle = '#3E9D50';
      ctx.fill();
    });
  }
}

export function createBackgroundTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'bg-sky', BG_W, BG_H, sky);
  canvasTexture(scene, 'bg-clouds', BG_W, BG_H, clouds);
  canvasTexture(scene, 'bg-mountains', BG_W, BG_H, mountains);
  canvasTexture(scene, 'bg-hills-far', BG_W, BG_H, hillsFar);
  canvasTexture(scene, 'bg-hills-village', BG_W, BG_H, hillsVillage);
  canvasTexture(scene, 'bg-olive-trees', BG_W, BG_H, oliveTrees);
}
