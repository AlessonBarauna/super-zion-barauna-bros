import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import {
  auroraSymbol,
  canvasTexture,
  circle,
  ellipse,
  fillStroke,
  OUT,
  polygon,
  roundRectPath,
  seeded,
  star4,
  type Ctx,
} from './canvasArt';

const T = 45;
const DIRT = '#8B5A34';
const DIRT_DARK = '#6F4526';
const DIRT_LIGHT = '#A8703F';
const GRASS = PALETTE.verdeBarauna;
const GRASS_DARK = '#2E8A35';
const GRASS_LIGHT = '#6FD974';

export const TILE_VARIANTS = 3;

export interface GroundPalette {
  dirt: string;
  dirtDark: string;
  dirtLight: string;
  pebble: string;
  pebbleLine: string;
  top: string;
  topDark: string;
  topLight: string;
}

const MEADOW: GroundPalette = {
  dirt: DIRT,
  dirtDark: DIRT_DARK,
  dirtLight: DIRT_LIGHT,
  pebble: '#B9A98E',
  pebbleLine: '#6B5A44',
  top: GRASS,
  topDark: GRASS_DARK,
  topLight: GRASS_LIGHT,
};

/** Terreno de cada mundo (cor da terra e da camada de cima). */
export const GROUND_PALETTES: Record<string, GroundPalette> = {
  cavernas: { dirt: '#4C4A7C', dirtDark: '#383563', dirtLight: '#6663A0', pebble: '#8FA3D8', pebbleLine: '#2C2A52', top: '#5FB8D6', topDark: '#3A8CAB', topLight: '#9CE4F2' },
  deserto: { dirt: '#C99A55', dirtDark: '#A97A3B', dirtLight: '#E0B873', pebble: '#EBD3A0', pebbleLine: '#8A6430', top: '#EBCB86', topDark: '#C9A25A', topLight: '#F8E3AE' },
  montanhas: { dirt: '#76809A', dirtDark: '#5B657E', dirtLight: '#93A0BA', pebble: '#C9D6E8', pebbleLine: '#47516A', top: '#F4FAFF', topDark: '#AFC8E0', topLight: '#FFFFFF' },
  selva: { dirt: '#5C3A22', dirtDark: '#432714', dirtLight: '#7A4E2E', pebble: '#8FA06A', pebbleLine: '#2F2412', top: '#1F9D45', topDark: '#0F6E2E', topLight: '#4CCB6A' },
  engrenagens: { dirt: '#62626E', dirtDark: '#4A4A55', dirtLight: '#7C7C8A', pebble: '#B89060', pebbleLine: '#33333C', top: '#B8693A', topDark: '#85441F', topLight: '#E09560' },
  nuvens: { dirt: '#E4D8F7', dirtDark: '#C6B6E6', dirtLight: '#F6F0FF', pebble: '#FFFFFF', pebbleLine: '#9C8CC4', top: '#FFD3EE', topDark: '#E8A2CE', topLight: '#FFF0FA' },
  abismo: { dirt: '#2E2244', dirtDark: '#1E1530', dirtLight: '#45346A', pebble: '#7A5AB0', pebbleLine: '#150E24', top: '#8A52C8', topDark: '#5A2E92', topLight: '#B58AF0' },
};


function dirtBase(ctx: Ctx, rnd: () => number, pal: GroundPalette = MEADOW): void {
  ctx.fillStyle = pal.dirt;
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, rnd() * T, rnd() * T, 2 + rnd() * 3, 1.4 + rnd() * 2, rnd() * 3);
    ctx.fillStyle = i % 2 ? pal.dirtDark : pal.dirtLight;
    ctx.fill();
  }
  // pedrinhas
  for (let i = 0; i < 2; i++) {
    ellipse(ctx, 6 + rnd() * 33, 18 + rnd() * 22, 3.4, 2.6, rnd());
    fillStroke(ctx, pal.pebble, 1.4, pal.pebbleLine);
  }
}

function grassTile(ctx: Ctx, variant: number, pal: GroundPalette = MEADOW): void {
  const rnd = seeded(101 + variant * 17);
  dirtBase(ctx, rnd, pal);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(T, 0);
  ctx.lineTo(T, 11);
  for (let x = T; x > 0; x -= 9) ctx.quadraticCurveTo(x - 4.5, 18 + rnd() * 3.5, x - 9, 11);
  ctx.closePath();
  ctx.fillStyle = pal.top;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = pal.topLight;
  ctx.fillRect(0, 0, T, 4);
  ctx.restore();
  // contorno inferior do gramado
  ctx.beginPath();
  ctx.moveTo(T, 11);
  for (let x = T; x > 0; x -= 9) ctx.quadraticCurveTo(x - 4.5, 18 + rnd() * 3.5, x - 9, 11);
  ctx.strokeStyle = pal.topDark;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

function dirtTile(ctx: Ctx, variant: number, pal: GroundPalette = MEADOW): void {
  dirtBase(ctx, seeded(401 + variant * 29), pal);
}

function blockFrame(ctx: Ctx, fill: string, light: string, dark: string): void {
  roundRectPath(ctx, 1.5, 1.5, T - 3, T - 3, 6);
  fillStroke(ctx, fill, 3);
  ctx.fillStyle = light;
  roundRectPath(ctx, 4.5, 4.5, T - 9, 6, 3);
  ctx.fill();
  ctx.fillStyle = dark;
  roundRectPath(ctx, 4.5, T - 11, T - 9, 6, 3);
  ctx.fill();
}

function brickTile(ctx: Ctx): void {
  blockFrame(ctx, '#E0792B', '#F8A35A', '#B85C1C');
  ctx.strokeStyle = '#8F4514';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, 15);
  ctx.lineTo(41, 15);
  ctx.moveTo(4, 30);
  ctx.lineTo(41, 30);
  ctx.moveTo(22, 4);
  ctx.lineTo(22, 15);
  ctx.moveTo(12, 15);
  ctx.lineTo(12, 30);
  ctx.moveTo(33, 15);
  ctx.lineTo(33, 30);
  ctx.moveTo(22, 30);
  ctx.lineTo(22, 41);
  ctx.stroke();
}

function surpriseTile(ctx: Ctx): void {
  blockFrame(ctx, PALETTE.douradoAurora, '#FFE98A', '#D9A21E');
  for (const [x, y] of [
    [8, 8],
    [37, 8],
    [8, 37],
    [37, 37],
  ] as Array<[number, number]>) {
    circle(ctx, x, y, 2);
    fillStroke(ctx, '#B9811A', 1.2, '#7A5510');
  }
  circle(ctx, 22.5, 22.5, 10.5);
  fillStroke(ctx, '#FFF2B0', 2, '#B9811A');
  auroraSymbol(ctx, 22.5, 22.5, 9.4, PALETTE.laranja, 8);
  circle(ctx, 22.5, 22.5, 3.4);
  ctx.fillStyle = '#FFF2B0';
  ctx.fill();
}

function usedTile(ctx: Ctx): void {
  blockFrame(ctx, '#A39478', '#BFB291', '#85785F');
  circle(ctx, 22.5, 22.5, 8);
  ctx.strokeStyle = '#6E6350';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function stoneTile(ctx: Ctx): void {
  blockFrame(ctx, '#8E9BAE', '#B5C0CF', '#6C7A8F');
  ctx.strokeStyle = '#5C6A80';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(14, 12);
  ctx.lineTo(20, 20);
  ctx.lineTo(16, 28);
  ctx.moveTo(30, 26);
  ctx.lineTo(34, 33);
  ctx.stroke();
}

function platformTile(ctx: Ctx): void {
  roundRectPath(ctx, 1.5, 1.5, T - 3, T - 3, 7);
  fillStroke(ctx, '#B57B3E', 3);
  ctx.strokeStyle = '#7C4F24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const y of [15, 29]) {
    ctx.moveTo(4, y);
    ctx.lineTo(41, y);
  }
  ctx.stroke();
  ctx.fillStyle = GRASS;
  roundRectPath(ctx, 2.5, 2.5, T - 5, 9, 4);
  ctx.fill();
  ctx.fillStyle = GRASS_LIGHT;
  roundRectPath(ctx, 4, 3.5, T - 8, 3, 2);
  ctx.fill();
  for (const [x, y] of [
    [10, 36],
    [32, 22],
  ] as Array<[number, number]>) {
    ellipse(ctx, x, y, 3, 1.8);
    ctx.fillStyle = '#7C4F24';
    ctx.fill();
  }
}

/** Plataforma móvel: laje de pedra azulada com acabamento dourado (diferente da plataforma de madeira fixa). */
function movingTile(ctx: Ctx): void {
  roundRectPath(ctx, 1.5, 1.5, T - 3, 24, 7);
  fillStroke(ctx, '#5E7FA8', 3);
  ctx.save();
  roundRectPath(ctx, 1.5, 1.5, T - 3, 24, 7);
  ctx.clip();
  ctx.fillStyle = '#9DB9DA';
  ctx.fillRect(0, 0, T, 7);
  ctx.fillStyle = '#44628A';
  ctx.fillRect(0, 18, T, 9);
  ctx.restore();
  ctx.strokeStyle = PALETTE.douradoAurora;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, 9);
  ctx.lineTo(T - 6, 9);
  ctx.stroke();
  for (const x of [7, T - 7]) {
    circle(ctx, x, 15, 1.8);
    fillStroke(ctx, '#FFE98A', 1, '#B9811A');
  }
  circle(ctx, T / 2, 15, 4.2);
  fillStroke(ctx, PALETTE.douradoAurora, 1.4);
}

function brickShard(ctx: Ctx): void {
  polygon(ctx, [
    [1, 4],
    [10, 1],
    [13, 9],
    [4, 13],
  ]);
  fillStroke(ctx, '#D9743A', 1.8);
  ctx.fillStyle = '#F4A35F';
  ctx.fillRect(4, 4, 4, 2);
}

function spikesTile(ctx: Ctx): void {
  for (let i = 0; i < 3; i++) {
    const x = 1.5 + i * 14;
    polygon(ctx, [
      [x, 28],
      [x + 7, 3],
      [x + 14, 28],
    ]);
    fillStroke(ctx, '#C9D4E3', 2.4);
    polygon(ctx, [
      [x + 7, 3],
      [x + 14, 28],
      [x + 8, 28],
    ]);
    ctx.fillStyle = '#9AA9BE';
    ctx.fill();
  }
  roundRectPath(ctx, 0.5, 26, 44, 7, 3);
  fillStroke(ctx, '#6C7A8F', 2.2);
}

interface PipePalette {
  base: string;
  hi: string;
  mid: string;
  lo: string;
  decor?: 'rings' | 'rivets' | 'snow' | 'glow' | 'crystals';
  accent?: string;
}

const PIPE_GREEN: PipePalette = { base: '#2F8F3A', hi: '#7BE27F', mid: '#43B649', lo: '#2A7F34' };

/** Cada mundo tem seu cano: mesma forma (2 blocos), material e detalhes próprios. */
export const PIPE_PALETTES: Record<string, PipePalette> = {
  cavernas: { base: '#4A56B8', hi: '#9CB0FF', mid: '#6C7CE0', lo: '#3A438F', decor: 'crystals', accent: '#9CF2FF' },
  deserto: { base: '#B8703A', hi: '#F0B27A', mid: '#D58F55', lo: '#8F5428', decor: 'rings', accent: '#6E3F1A' },
  montanhas: { base: '#6FB4DC', hi: '#E4F7FF', mid: '#9AD2F0', lo: '#4F94BE', decor: 'snow', accent: '#FFFFFF' },
  selva: { base: '#6B8E23', hi: '#C4E066', mid: '#93B93A', lo: '#4D6A16', decor: 'rings', accent: '#2F4A0E' },
  engrenagens: { base: '#5F6672', hi: '#B9C0CB', mid: '#8A929E', lo: '#444A55', decor: 'rivets', accent: '#E07A2E' },
  nuvens: { base: '#E58FC4', hi: '#FFE0F2', mid: '#F4B3DA', lo: '#C46AA0', decor: 'rings', accent: '#FFFFFF' },
  abismo: { base: '#4B2A78', hi: '#9A6BD6', mid: '#6D41A6', lo: '#33195A', decor: 'glow', accent: '#FF5FD2' },
};

/** Cano (2 blocos de largura): cada metade é uma textura de 45x45. */
function pipeTile(ctx: Ctx, top: boolean, side: 'l' | 'r', pal: PipePalette = PIPE_GREEN): void {
  const body = top ? 0 : 3;
  ctx.fillStyle = pal.base;
  ctx.fillRect(body, 0, T - body, T);
  const g = ctx.createLinearGradient(0, 0, T, 0);
  g.addColorStop(0, side === 'l' ? pal.hi : pal.mid);
  g.addColorStop(1, side === 'l' ? pal.mid : pal.lo);
  ctx.fillStyle = g;
  const left = side === 'l' ? (top ? 1.2 : 4.2) : 0;
  const right = side === 'r' ? (top ? 1.2 : 4.2) : 0;
  ctx.fillRect(left, top ? 6 : 0, T - left - right, top ? T - 6 : T);
  if (top) {
    roundRectPath(ctx, side === 'l' ? 1.2 : -4, 1.2, T + (side === 'l' ? -1.2 : 4) - (side === 'r' ? 1.2 : 0), 17, 5);
    fillStroke(ctx, g, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(side === 'l' ? 7 : 4, 5, 6, 10);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(side === 'l' ? 11 : 4, 0, 5, T);
  }
  pipeDecor(ctx, top, side, pal);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  if (side === 'l') {
    ctx.moveTo(top ? 1.2 : 4.2, top ? 17 : 0);
    ctx.lineTo(top ? 1.2 : 4.2, T);
  } else {
    ctx.moveTo(T - (top ? 1.2 : 4.2), top ? 17 : 0);
    ctx.lineTo(T - (top ? 1.2 : 4.2), T);
  }
  ctx.stroke();
}

/** Detalhes do material do cano (anéis, rebites, neve, brilho, cristais). */
function pipeDecor(ctx: Ctx, top: boolean, side: 'l' | 'r', pal: PipePalette): void {
  const acc = pal.accent ?? pal.lo;
  const x0 = side === 'l' ? 4 : 0;
  const x1 = side === 'l' ? T : T - 4;
  switch (pal.decor) {
    case 'rings':
      if (!top) {
        ctx.fillStyle = acc;
        ctx.fillRect(x0, 20, x1 - x0, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x0, 24, x1 - x0, 2);
      }
      break;
    case 'rivets':
      for (const y of top ? [11] : [10, 34]) {
        circle(ctx, side === 'l' ? 14 : T - 14, y, 3);
        fillStroke(ctx, acc, 1.6);
      }
      if (!top) {
        ctx.fillStyle = acc;
        ctx.fillRect(x0, 21, x1 - x0, 3);
      }
      break;
    case 'snow':
      if (top) {
        roundRectPath(ctx, side === 'l' ? 0.5 : -4, -2, T + (side === 'l' ? 0 : 4) - 1, 9, 4);
        fillStroke(ctx, '#FFFFFF', 2);
      }
      break;
    case 'glow':
      ctx.strokeStyle = acc;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      if (top) {
        ctx.moveTo(side === 'l' ? 3 : 0, 15);
        ctx.lineTo(side === 'l' ? T : T - 3, 15);
      } else {
        ctx.moveTo(side === 'l' ? 20 : 12, 0);
        ctx.lineTo(side === 'l' ? 20 : 12, T);
      }
      ctx.stroke();
      break;
    case 'crystals':
      if (top) {
        polygon(ctx, [[side === 'l' ? 22 : 8, 6], [side === 'l' ? 27 : 13, -4], [side === 'l' ? 32 : 18, 6]]);
        fillStroke(ctx, acc, 1.8);
      } else {
        polygon(ctx, [[side === 'l' ? 14 : 22, 22], [side === 'l' ? 19 : 27, 12], [side === 'l' ? 24 : 32, 22]]);
        fillStroke(ctx, acc, 1.6);
      }
      break;
    default:
      break;
  }
}

/** Porta de saída das salas secretas. */
function exitDoor(ctx: Ctx): void {
  roundRectPath(ctx, 4, 4, 38, 78, 14);
  fillStroke(ctx, '#7A4A28', 3);
  roundRectPath(ctx, 10, 12, 26, 66, 9);
  ctx.strokeStyle = '#5A3418';
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, 32, 48, 2.6);
  ctx.fillStyle = PALETTE.douradoAurora;
  ctx.fill();
}

/** Fundo escuro dos abismos: deixa claro que ali não há chão. */
function pitFill(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, 135);
  g.addColorStop(0, '#2B4A3A');
  g.addColorStop(0.35, '#16293A');
  g.addColorStop(1, '#070D14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, T, 135);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (const [x, y] of [
    [8, 30],
    [30, 62],
    [15, 98],
  ] as Array<[number, number]>) {
    ellipse(ctx, x, y, 5, 2.4);
    ctx.fill();
  }
}

function coinFrame(ctx: Ctx, rx: number): void {
  ellipse(ctx, 12, 12, rx, 10.4);
  fillStroke(ctx, PALETTE.douradoAurora, 2.2);
  if (rx > 5) {
    ellipse(ctx, 12, 12, rx * 0.6, 6.4);
    ctx.strokeStyle = '#D9A21E';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    star4(ctx, 12, 12, Math.min(3.6, rx * 0.36), 0.45);
    ctx.fillStyle = '#FFF2B0';
    ctx.fill();
  }
}

function heartIcon(ctx: Ctx, full: boolean): void {
  ctx.beginPath();
  ctx.moveTo(16, 28);
  ctx.bezierCurveTo(-6, 14, 4, -2, 16, 8);
  ctx.bezierCurveTo(28, -2, 38, 14, 16, 28);
  ctx.closePath();
  fillStroke(ctx, full ? '#E8453C' : '#5B4B55', 2.6);
  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(9, 9, 3.2, 2, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Flor de Fogo: pétalas em chama sobre caule verde. */
function fireFlower(ctx: Ctx): void {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(18, 40);
  ctx.quadraticCurveTo(17, 30, 18, 22);
  ctx.stroke();
  ctx.strokeStyle = '#3BA848';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(18 + side * 7, 32, 7, 3.4, side * -0.5, 0, Math.PI * 2);
    fillStroke(ctx, '#3BA848', 2);
  }
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const px = 18 + Math.cos(a) * 9;
    const py = 15 + Math.sin(a) * 9;
    ctx.beginPath();
    ctx.moveTo(18, 15);
    ctx.quadraticCurveTo(px + Math.cos(a + 1.2) * 7, py + Math.sin(a + 1.2) * 7, px + Math.cos(a) * 5, py + Math.sin(a) * 5);
    ctx.quadraticCurveTo(px + Math.cos(a - 1.2) * 7, py + Math.sin(a - 1.2) * 7, 18, 15);
    fillStroke(ctx, i % 2 ? PALETTE.laranja : '#E8453C', 2.2);
  }
  circle(ctx, 18, 15, 6.4);
  fillStroke(ctx, PALETTE.douradoAurora, 2.2);
  circle(ctx, 16.4, 13.6, 2);
  ctx.fillStyle = '#FFF7C2';
  ctx.fill();
}

/** Fruta de Baraúna: faz o personagem crescer. Fruta dourada com folha e o símbolo da Aurora. */
function growFruit(ctx: Ctx): void {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(18, 12);
  ctx.quadraticCurveTo(18, 6, 22, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(26, 7, 7, 3.6, -0.5, 0, Math.PI * 2);
  fillStroke(ctx, '#3BA848', 2.2);
  const g = ctx.createRadialGradient(14, 20, 2, 18, 26, 16);
  g.addColorStop(0, '#FFF2B0');
  g.addColorStop(0.5, PALETTE.douradoAurora);
  g.addColorStop(1, PALETTE.laranja);
  ctx.beginPath();
  ctx.moveTo(18, 13);
  ctx.bezierCurveTo(30, 8, 38, 22, 31, 34);
  ctx.quadraticCurveTo(18, 44, 5, 34);
  ctx.bezierCurveTo(-2, 22, 6, 8, 18, 13);
  ctx.closePath();
  fillStroke(ctx, g, 2.6);
  star4(ctx, 18, 26, 5.4, 0.45);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

function fireball(ctx: Ctx): void {
  const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
  g.addColorStop(0, '#FFF7C2');
  g.addColorStop(0.45, PALETTE.douradoAurora);
  g.addColorStop(1, PALETTE.laranja);
  ctx.beginPath();
  ctx.moveTo(1, 13);
  ctx.quadraticCurveTo(0, 5, 6, 1);
  ctx.quadraticCurveTo(7, 5, 10, 6);
  ctx.quadraticCurveTo(16, 6, 15, 12);
  ctx.quadraticCurveTo(12, 17, 6, 16);
  ctx.quadraticCurveTo(2, 16, 1, 13);
  ctx.closePath();
  fillStroke(ctx, g, 1.8, '#B8431A');
}

function flagPole(ctx: Ctx): void {
  roundRectPath(ctx, 6, 14, 8, 176, 4);
  fillStroke(ctx, '#F4F0DC', 2.4);
  circle(ctx, 10, 11, 8);
  fillStroke(ctx, PALETTE.douradoAurora, 2.4);
  auroraSymbol(ctx, 10, 11, 5.4, PALETTE.laranja, 6);
  roundRectPath(ctx, 0, 186, 20, 8, 3);
  fillStroke(ctx, '#8E9BAE', 2.4);
}

function flagBanner(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(28, 10, 56, 2);
  ctx.lineTo(48, 18);
  ctx.lineTo(56, 34);
  ctx.quadraticCurveTo(28, 42, 2, 34);
  ctx.closePath();
  fillStroke(ctx, PALETTE.verdeBarauna, 2.6);
  auroraSymbol(ctx, 22, 19, 9, PALETTE.douradoAurora, 8);
}

function checkpoint(ctx: Ctx, on: boolean): void {
  roundRectPath(ctx, 12, 24, 8, 40, 3);
  fillStroke(ctx, '#8E9BAE', 2.4);
  roundRectPath(ctx, 6, 58, 20, 6, 3);
  fillStroke(ctx, '#6C7A8F', 2.2);
  if (on) {
    const g = ctx.createRadialGradient(16, 14, 2, 16, 14, 16);
    g.addColorStop(0, 'rgba(255,240,150,0.95)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  roundRectPath(ctx, 7, 6, 18, 20, 6);
  fillStroke(ctx, on ? PALETTE.douradoAurora : '#9A9478', 2.6);
  ctx.beginPath();
  ctx.moveTo(10, 6);
  ctx.lineTo(16, 0);
  ctx.lineTo(22, 6);
  ctx.closePath();
  fillStroke(ctx, '#6C7A8F', 2.2);
  if (on) {
    circle(ctx, 16, 16, 4);
    ctx.fillStyle = '#FFFBE0';
    ctx.fill();
  }
}

function bush(ctx: Ctx, variant: number): void {
  const w = variant === 0 ? 56 : 44;
  const blobs: Array<[number, number, number]> =
    variant === 0
      ? [
          [14, 22, 13],
          [28, 16, 15],
          [43, 22, 12],
        ]
      : [
          [12, 22, 11],
          [26, 16, 13],
          [36, 23, 9],
        ];
  for (const pass of [0, 1]) {
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y, r);
      if (pass === 0) {
        ctx.fillStyle = OUT;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = OUT;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#3BA848';
        ctx.fill();
      }
    }
  }
  for (const [x, y, r] of blobs) {
    circle(ctx, x - 2, y - 3, r * 0.55);
    ctx.fillStyle = '#5BC866';
    ctx.fill();
  }
  roundRectPath(ctx, 2, 30, w - 4, 4, 2);
  ctx.fillStyle = '#2E8A35';
  ctx.fill();
}

function flower(ctx: Ctx, color: string): void {
  ctx.strokeStyle = '#2E8A35';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(9, 24);
  ctx.quadraticCurveTo(8, 16, 9, 10);
  ctx.stroke();
  ctx.fillStyle = '#3BA848';
  ctx.beginPath();
  ctx.ellipse(13, 19, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    circle(ctx, 9 + Math.cos(a) * 4.2, 8 + Math.sin(a) * 4.2, 3.2);
    fillStroke(ctx, color, 1.4);
  }
  circle(ctx, 9, 8, 2.4);
  fillStroke(ctx, PALETTE.douradoAurora, 1.2);
}

/** Oliveira: tronco retorcido e copa prateada com azeitonas. */
function oliveTree(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(52, 170);
  ctx.bezierCurveTo(58, 140, 44, 128, 52, 100);
  ctx.lineTo(70, 100);
  ctx.bezierCurveTo(64, 126, 80, 140, 70, 170);
  ctx.closePath();
  fillStroke(ctx, '#7A5232', 3);
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(58, 160);
  ctx.quadraticCurveTo(62, 140, 59, 118);
  ctx.stroke();
  const blobs: Array<[number, number, number, string]> = [
    [34, 78, 28, '#7E9E6B'],
    [88, 74, 30, '#7E9E6B'],
    [60, 52, 36, '#8FB07A'],
    [60, 86, 28, '#6E8F5C'],
  ];
  for (const [x, y, r] of blobs) {
    circle(ctx, x, y, r);
    ctx.fillStyle = OUT;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  for (const [x, y, r, c] of blobs) {
    circle(ctx, x, y, r);
    ctx.fillStyle = c;
    ctx.fill();
  }
  const rnd = seeded(77);
  for (let i = 0; i < 18; i++) {
    const x = 22 + rnd() * 76;
    const y = 36 + rnd() * 62;
    ellipse(ctx, x, y, 3.8, 2.4, rnd() * 3);
    ctx.fillStyle = i % 3 === 0 ? '#3B4A2A' : '#C3D8A8';
    ctx.fill();
  }
}

function house(ctx: Ctx, wall: string, roof: string): void {
  roundRectPath(ctx, 8, 46, 104, 60, 5);
  fillStroke(ctx, wall, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.fillRect(10, 90, 100, 14);
  polygon(ctx, [
    [0, 52],
    [60, 4],
    [120, 52],
  ]);
  fillStroke(ctx, roof, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(60 - i * 13, 4 + i * 11.5);
    ctx.lineTo(60 + i * 13, 4 + i * 11.5);
  }
  ctx.stroke();
  roundRectPath(ctx, 50, 66, 22, 40, 10);
  fillStroke(ctx, '#7A4A28', 2.6);
  circle(ctx, 67, 88, 1.8);
  ctx.fillStyle = PALETTE.douradoAurora;
  ctx.fill();
  for (const x of [18, 82]) {
    roundRectPath(ctx, x, 62, 20, 20, 4);
    fillStroke(ctx, '#BFE6FA', 2.4);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + 10, 62);
    ctx.lineTo(x + 10, 82);
    ctx.moveTo(x, 72);
    ctx.lineTo(x + 20, 72);
    ctx.stroke();
  }
  circle(ctx, 60, 30, 6);
  fillStroke(ctx, PALETTE.creme, 2);
}

export function createWorldTextures(scene: Phaser.Scene): void {
  for (let v = 0; v < TILE_VARIANTS; v++) {
    canvasTexture(scene, `tile-grass-${v}`, T, T, (c) => grassTile(c, v));
    canvasTexture(scene, `tile-dirt-${v}`, T, T, (c) => dirtTile(c, v));
    for (const [theme, pal] of Object.entries(GROUND_PALETTES)) {
      canvasTexture(scene, `tile-grass-${theme}-${v}`, T, T, (c) => grassTile(c, v, pal));
      canvasTexture(scene, `tile-dirt-${theme}-${v}`, T, T, (c) => dirtTile(c, v, pal));
    }
  }
  canvasTexture(scene, 'tile-brick', T, T, brickTile);
  canvasTexture(scene, 'tile-surprise', T, T, surpriseTile);
  canvasTexture(scene, 'tile-used', T, T, usedTile);
  canvasTexture(scene, 'tile-stone', T, T, stoneTile);
  canvasTexture(scene, 'tile-platform', T, T, platformTile);
  canvasTexture(scene, 'tile-moving', T, 27, movingTile);
  canvasTexture(scene, 'brick-shard', 14, 14, brickShard);
  canvasTexture(scene, 'spikes', T, 34, spikesTile);
  canvasTexture(scene, 'pit-fill', T, 135, pitFill);
  for (const top of [true, false]) {
    for (const side of ['l', 'r'] as const) {
      canvasTexture(scene, `pipe-${top ? 'top' : 'body'}-${side}`, T, T, (c) => pipeTile(c, top, side));
      for (const [theme, pal] of Object.entries(PIPE_PALETTES)) {
        canvasTexture(scene, `pipe-${theme}-${top ? 'top' : 'body'}-${side}`, T, T, (c) => pipeTile(c, top, side, pal));
      }
    }
  }
  canvasTexture(scene, 'door-exit', 46, 86, exitDoor);

  [10.4, 6.6, 2.6, 6.6].forEach((rx, i) => canvasTexture(scene, `coin-${i}`, 24, 24, (c) => coinFrame(c, rx)));
  canvasTexture(scene, 'heart-full', 32, 30, (c) => heartIcon(c, true));
  canvasTexture(scene, 'heart-empty', 32, 30, (c) => heartIcon(c, false));

  canvasTexture(scene, 'item-flower', 36, 42, fireFlower);
  canvasTexture(scene, 'item-grow', 36, 42, growFruit);
  canvasTexture(scene, 'fireball', 18, 18, fireball);
  canvasTexture(scene, 'flag-pole', 20, 196, flagPole);
  canvasTexture(scene, 'flag-banner', 58, 44, flagBanner);
  canvasTexture(scene, 'checkpoint-off', 32, 66, (c) => checkpoint(c, false));
  canvasTexture(scene, 'checkpoint-on', 32, 66, (c) => checkpoint(c, true));

  canvasTexture(scene, 'bush-0', 56, 36, (c) => bush(c, 0));
  canvasTexture(scene, 'bush-1', 44, 36, (c) => bush(c, 1));
  ['#F7C948', '#F28B36', '#FFFFFF', '#E8708C'].forEach((col, i) =>
    canvasTexture(scene, `flower-${i}`, 18, 26, (c) => flower(c, col)),
  );
  canvasTexture(scene, 'tree-olive', 120, 172, oliveTree);
  canvasTexture(scene, 'house-0', 120, 108, (c) => house(c, PALETTE.creme, PALETTE.laranja));
  canvasTexture(scene, 'house-1', 120, 108, (c) => house(c, '#F7E3B0', '#C9533D'));

  canvasTexture(scene, 'dust', 12, 12, (c) => {
    circle(c, 6, 6, 5);
    c.fillStyle = 'rgba(244,240,220,0.9)';
    c.fill();
  });
  canvasTexture(scene, 'spark', 16, 16, (c) => {
    star4(c, 8, 8, 7.5, 0.35);
    c.fillStyle = '#FFF2B0';
    c.fill();
    c.strokeStyle = PALETTE.douradoAurora;
    c.lineWidth = 1.2;
    c.stroke();
  });
}
