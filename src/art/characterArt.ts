import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import type { PlayerAnimation } from '../systems/movement';
import { auroraSymbol, canvasTexture, circle, ellipse, fillStroke, OUT, roundRectPath, type Ctx } from './canvasArt';

/**
 * Personagens jogáveis desenhados em código (arte original, provisória).
 * Zion Baraúna: roupa azul e verde, botas marrons, mochila, símbolo da Aurora no peito.
 * Bara: mais baixa e ágil, roupa coral e turquesa, coques com laços dourados, bolsa a tiracolo.
 */

export const ZION_FRAME = { w: 64, h: 80 } as const;
/** Deslocamento vertical do desenho dentro do quadro (folga para o topo da mecha de cabelo). */
const DRAW_OFFSET_Y = 8;
/** Corpo de colisão em unidades de arte (dentro do quadro). */
export const ZION_BODY = { w: 26, h: 54, offsetX: 19, offsetY: 22 } as const;
/** Bara é 12% menor: a base do corpo continua tocando a base do quadro (y = 76). */
export const BARA_SCALE = 0.88;
export const BARA_BODY = { w: 23, h: 47, offsetX: 20, offsetY: 29 } as const;

export type CharacterId = 'zion' | 'bara';

/** Visual de um personagem: cores e estilo. A pose/animação é compartilhada. */
export interface Look {
  scale: number;
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  shirtLight: string;
  pants: string;
  boot: string;
  bootLight: string;
  belt: string;
  pack: string;
  packShade: string;
  symbol: string;
  hairStyle: 'tuft' | 'buns';
}

interface Offset {
  dx: number;
  dy: number;
}

type Eyes = 'open' | 'blink' | 'hurt' | 'happy' | 'wide';
type Mouth = 'smile' | 'open' | 'o' | 'grin';

interface Pose {
  legF: Offset;
  legB: Offset;
  armF: Offset;
  armB: Offset;
  bob: number;
  squash: number;
  lean: number;
  eyes: Eyes;
  mouth: Mouth;
}


function pose(partial: Partial<Pose>): Pose {
  return {
    legF: { dx: 0, dy: 0 },
    legB: { dx: 0, dy: 0 },
    armF: { dx: 0, dy: 0 },
    armB: { dx: 0, dy: 0 },
    bob: 0,
    squash: 0,
    lean: 0,
    eyes: 'open',
    mouth: 'smile',
    ...partial,
  };
}

function walkPose(i: number, amp: number, lean: number, lift: number): Pose {
  const p = (i / 4) * Math.PI * 2;
  return pose({
    legF: { dx: Math.sin(p) * amp, dy: -Math.max(0, Math.cos(p)) * lift },
    legB: { dx: -Math.sin(p) * amp, dy: -Math.max(0, -Math.cos(p)) * lift },
    armF: { dx: -Math.sin(p) * amp * 0.6, dy: 0 },
    armB: { dx: Math.sin(p) * amp * 0.6, dy: 0 },
    bob: -Math.abs(Math.sin(p)) * 2.4,
    lean,
    mouth: lean > 2 ? 'open' : 'smile',
  });
}

export const ZION_ANIMS: Record<
  PlayerAnimation,
  { frames: number; frameRate: number; repeat: number; pose: (i: number) => Pose }
> = {
  idle: {
    frames: 2,
    frameRate: 2.5,
    repeat: -1,
    pose: (i) => pose({ bob: i === 0 ? 0 : 1.2, armF: { dx: 0, dy: i }, armB: { dx: 0, dy: i }, eyes: i === 1 ? 'blink' : 'open' }),
  },
  walk: { frames: 4, frameRate: 9, repeat: -1, pose: (i) => walkPose(i, 7, 1, 4) },
  run: { frames: 4, frameRate: 14, repeat: -1, pose: (i) => walkPose(i, 11, 4, 7) },
  jump: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 7, dy: -7 },
        legB: { dx: -5, dy: -3 },
        armF: { dx: 4, dy: -16 },
        armB: { dx: -2, dy: -14 },
        bob: -2,
        lean: 1,
        eyes: 'wide',
        mouth: 'open',
      }),
  },
  fall: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 6, dy: -1 },
        legB: { dx: -6, dy: -1 },
        armF: { dx: 6, dy: -10 },
        armB: { dx: -6, dy: -9 },
        eyes: 'wide',
        mouth: 'o',
      }),
  },
  land: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 8, dy: 0 },
        legB: { dx: -8, dy: 0 },
        armF: { dx: 5, dy: -2 },
        armB: { dx: -5, dy: -2 },
        squash: 5,
        eyes: 'blink',
        mouth: 'grin',
      }),
  },
  // Agachado: tronco desce até a altura dos joelhos, pernas dobradas para os lados, braços apoiados.
  crouch: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 11, dy: 0 },
        legB: { dx: -9, dy: 0 },
        armF: { dx: 7, dy: 1 },
        armB: { dx: -5, dy: 1 },
        squash: 16,
        lean: 2,
        eyes: 'open',
        mouth: 'smile',
      }),
  },
  hurt: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 6, dy: -2 },
        legB: { dx: -7, dy: 0 },
        armF: { dx: 7, dy: -14 },
        armB: { dx: -7, dy: -14 },
        lean: -3,
        eyes: 'hurt',
        mouth: 'o',
      }),
  },
  victory: {
    frames: 2,
    frameRate: 4,
    repeat: -1,
    pose: (i) =>
      pose({
        legF: { dx: 4, dy: i === 0 ? 0 : -3 },
        legB: { dx: -4, dy: 0 },
        armF: { dx: 4, dy: -24 },
        armB: { dx: -3, dy: i === 0 ? -8 : -22 },
        bob: i === 0 ? 0 : -3,
        eyes: 'happy',
        mouth: 'grin',
      }),
  },
  attack: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 7, dy: 0 },
        legB: { dx: -7, dy: 0 },
        armF: { dx: 14, dy: -9 },
        armB: { dx: -5, dy: 2 },
        lean: 2,
        eyes: 'open',
        mouth: 'open',
      }),
  },
  dead: {
    frames: 1,
    frameRate: 1,
    repeat: 0,
    pose: () =>
      pose({
        legF: { dx: 8, dy: -2 },
        legB: { dx: -8, dy: -2 },
        armF: { dx: 10, dy: -12 },
        armB: { dx: -10, dy: -12 },
        eyes: 'hurt',
        mouth: 'o',
      }),
  },
};

function limb(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, color: string): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = width + 4.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function boot(ctx: Ctx, x: number, y: number, look: Look): void {
  ellipse(ctx, x + 3, y - 2, 10, 6.2);
  fillStroke(ctx, look.boot, 2.4);
  ellipse(ctx, x + 5, y - 4, 4.5, 2.2);
  ctx.fillStyle = look.bootLight;
  ctx.fill();
}

function leg(ctx: Ctx, hipX: number, hipY: number, o: Offset, floorY: number, look: Look): void {
  const fx = hipX + o.dx;
  const fy = floorY + o.dy - 6;
  limb(ctx, hipX, hipY, fx, fy, 8, look.pants);
  boot(ctx, fx, floorY + o.dy, look);
}

function arm(ctx: Ctx, sx: number, sy: number, o: Offset, look: Look): void {
  const hx = sx + 3 + o.dx;
  const hy = sy + 11 + o.dy;
  limb(ctx, sx, sy, hx, hy, 7, look.shirt);
  circle(ctx, hx, hy + 1, 4.4);
  fillStroke(ctx, look.skin, 2.2);
}

function drawEyes(ctx: Ctx, hx: number, hy: number, eyes: Eyes): void {
  const spots: Array<[number, number]> = [
    [hx + 3.5, hy + 2],
    [hx + 12, hy + 2],
  ];
  for (const [ex, ey] of spots) {
    if (eyes === 'blink') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey + 1);
      ctx.quadraticCurveTo(ex, ey + 3.5, ex + 3, ey + 1);
      ctx.stroke();
    } else if (eyes === 'happy') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(ex - 3.4, ey + 2);
      ctx.quadraticCurveTo(ex, ey - 3.2, ex + 3.4, ey + 2);
      ctx.stroke();
    } else if (eyes === 'hurt') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - 3);
      ctx.lineTo(ex + 3, ey + 3);
      ctx.moveTo(ex + 3, ey - 3);
      ctx.lineTo(ex - 3, ey + 3);
      ctx.stroke();
    } else {
      const ry = eyes === 'wide' ? 6 : 5;
      ellipse(ctx, ex, ey, 3.8, ry);
      fillStroke(ctx, '#FFFFFF', 1.8);
      circle(ctx, ex + 1.1, ey + 0.6, eyes === 'wide' ? 1.9 : 2.3);
      ctx.fillStyle = OUT;
      ctx.fill();
      circle(ctx, ex + 1.9, ey - 0.8, 0.9);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }
}

function drawMouth(ctx: Ctx, mx: number, my: number, mouth: Mouth): void {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  if (mouth === 'smile') {
    ctx.beginPath();
    ctx.moveTo(mx - 3.5, my);
    ctx.quadraticCurveTo(mx, my + 3.6, mx + 3.5, my);
    ctx.stroke();
  } else if (mouth === 'open' || mouth === 'grin') {
    ctx.beginPath();
    ctx.moveTo(mx - 4.2, my - 1);
    ctx.quadraticCurveTo(mx, my + (mouth === 'grin' ? 7 : 6), mx + 4.2, my - 1);
    ctx.closePath();
    fillStroke(ctx, '#8E2B2B', 2);
    ctx.fillStyle = '#F4A0A0';
    ctx.beginPath();
    ctx.ellipse(mx, my + 3.2, 2.2, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ellipse(ctx, mx, my + 1.5, 2.4, 3);
    fillStroke(ctx, '#8E2B2B', 2);
  }
}

export const ZION_LOOK: Look = {
  scale: 1,
  skin: '#F2C29B',
  skinShade: '#E0A57B',
  hair: '#6A3F22',
  shirt: PALETTE.azulZion,
  shirtShade: '#2467B0',
  shirtLight: '#5BA8EE',
  pants: '#2F9A3B',
  boot: '#7A4A28',
  bootLight: '#9A6238',
  belt: PALETTE.verdeBarauna,
  pack: PALETTE.laranja,
  packShade: '#C9631F',
  symbol: PALETTE.laranja,
  hairStyle: 'tuft',
};

export const BARA_LOOK: Look = {
  scale: BARA_SCALE,
  skin: '#C98B5E',
  skinShade: '#B2724A',
  hair: '#2E1B3F',
  shirt: '#EF6F5E',
  shirtShade: '#C84E45',
  shirtLight: '#FF9A86',
  pants: '#1F9C9A',
  boot: '#5A3A68',
  bootLight: '#7A5590',
  belt: PALETTE.creme,
  pack: '#8E5BD0',
  packShade: '#6E3FB0',
  symbol: '#C84E45',
  hairStyle: 'buns',
};

export const LOOKS: Record<CharacterId, Look> = { zion: ZION_LOOK, bara: BARA_LOOK };

export function drawCharacter(ctx: Ctx, p: Pose, look: Look): void {
  ctx.save();
  // Escala ancorada na base do quadro, para que os pés continuem alinhados ao corpo de colisão.
  ctx.translate(ZION_FRAME.w / 2, ZION_FRAME.h);
  ctx.scale(look.scale, look.scale);
  ctx.translate(-ZION_FRAME.w / 2, -ZION_FRAME.h);
  ctx.translate(0, DRAW_OFFSET_Y);
  const top = p.bob + p.squash;
  const lx = p.lean;
  const floorY = 68;
  const hipY = 52 + p.squash;
  const headCx = 33 + lx;
  const headCy = 19 + top;

  // braço de trás
  arm(ctx, 26 + lx, 37 + top, p.armB, look);

  // mochila (Zion) ou bolsa (Bara)
  roundRectPath(ctx, 10 + lx, 32 + top, 16, 20, 6);
  fillStroke(ctx, look.pack, 2.4);
  roundRectPath(ctx, 12.5 + lx, 40 + top, 11, 8, 3);
  fillStroke(ctx, look.packShade, 2);
  circle(ctx, 18 + lx, 44 + top, 1.3);
  ctx.fillStyle = PALETTE.douradoAurora;
  ctx.fill();

  // pernas (atrás do tronco)
  leg(ctx, 28 + lx * 0.4, hipY, p.legB, floorY, look);
  leg(ctx, 38 + lx * 0.4, hipY, p.legF, floorY, look);

  // tronco
  roundRectPath(ctx, 21 + lx, 31 + top, 24, 23, 8);
  fillStroke(ctx, look.shirt, 2.6);
  ctx.save();
  roundRectPath(ctx, 21 + lx, 31 + top, 24, 23, 8);
  ctx.clip();
  ctx.fillStyle = look.shirtShade;
  ctx.fillRect(21 + lx, 46 + top, 24, 8);
  ctx.fillStyle = look.shirtLight;
  ctx.fillRect(21 + lx, 31 + top, 24, 3);
  ctx.restore();
  // cinto
  roundRectPath(ctx, 21 + lx, 47 + top, 24, 6, 3);
  fillStroke(ctx, look.belt, 2.2);
  // símbolo dourado da Aurora
  circle(ctx, 34 + lx, 39 + top, 6.2);
  fillStroke(ctx, PALETTE.douradoAurora, 2);
  auroraSymbol(ctx, 34 + lx, 39 + top, 4.6, look.symbol, 6);

  // braço da frente
  arm(ctx, 41 + lx, 37 + top, p.armF, look);

  if (look.hairStyle === 'buns') {
    // coques atrás da cabeça
    circle(ctx, headCx - 9, headCy - 14, 7);
    fillStroke(ctx, look.hair, 2.4);
    circle(ctx, headCx + 9, headCy - 15, 7);
    fillStroke(ctx, look.hair, 2.4);
  }

  // cabeça
  circle(ctx, headCx - 14, headCy + 3, 4.2); // orelha
  fillStroke(ctx, look.skinShade, 2.2);
  circle(ctx, headCx, headCy, 15.5);
  fillStroke(ctx, look.skin, 2.6);

  // cabelo
  ctx.beginPath();
  ctx.arc(headCx, headCy, 15.5, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(headCx + 8, headCy - 9, headCx + 2, headCy - 7);
  ctx.quadraticCurveTo(headCx - 7, headCy - 11, headCx - 15, headCy - 3);
  ctx.closePath();
  fillStroke(ctx, look.hair, 2.4);

  if (look.hairStyle === 'tuft') {
    // mecha rebelde
    ctx.beginPath();
    ctx.moveTo(headCx + 2, headCy - 15);
    ctx.quadraticCurveTo(headCx + 8, headCy - 23, headCx + 14, headCy - 17);
    ctx.quadraticCurveTo(headCx + 8, headCy - 17, headCx + 6, headCy - 13);
    ctx.closePath();
    fillStroke(ctx, look.hair, 2.2);

    // faixa verde com gema dourada
    ctx.save();
    circle(ctx, headCx, headCy, 15.2);
    ctx.clip();
    ctx.fillStyle = PALETTE.verdeBarauna;
    ctx.fillRect(headCx - 16, headCy - 8, 32, 5.5);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(headCx - 16, headCy - 8, 32, 5.5);
    ctx.restore();
    circle(ctx, headCx + 10, headCy - 5.2, 2.6);
    fillStroke(ctx, PALETTE.douradoAurora, 1.6);
  } else {
    // franja curta e laços dourados nos coques
    ctx.beginPath();
    ctx.moveTo(headCx - 13, headCy - 6);
    ctx.quadraticCurveTo(headCx - 4, headCy - 1, headCx + 3, headCy - 8);
    ctx.quadraticCurveTo(headCx + 9, headCy - 2, headCx + 14, headCy - 8);
    ctx.lineTo(headCx + 14, headCy - 12);
    ctx.lineTo(headCx - 13, headCy - 12);
    ctx.closePath();
    fillStroke(ctx, look.hair, 2.2);
    for (const bx of [headCx - 9, headCx + 9]) {
      roundRectPath(ctx, bx - 4.5, headCy - 11.5, 9, 3.6, 1.8);
      fillStroke(ctx, PALETTE.douradoAurora, 1.6);
    }
  }

  drawEyes(ctx, headCx, headCy, p.eyes);
  // bochecha
  circle(ctx, headCx + 13.5, headCy + 7, 2.6);
  ctx.fillStyle = 'rgba(242,139,120,0.55)';
  ctx.fill();
  drawMouth(ctx, headCx + 8.5, headCy + 9, p.mouth);
  ctx.restore();
}

export function characterFrameKey(id: CharacterId, anim: PlayerAnimation, i: number): string {
  return `${id}-${anim}-${i}`;
}

type AnimEntry = [PlayerAnimation, (typeof ZION_ANIMS)[PlayerAnimation]];

export function createCharacterTextures(scene: Phaser.Scene, id: CharacterId): void {
  const look = LOOKS[id];
  for (const [anim, def] of Object.entries(ZION_ANIMS) as AnimEntry[]) {
    for (let i = 0; i < def.frames; i++) {
      canvasTexture(scene, characterFrameKey(id, anim, i), ZION_FRAME.w, ZION_FRAME.h, (ctx) => drawCharacter(ctx, def.pose(i), look));
    }
  }
}

export function createCharacterAnimations(scene: Phaser.Scene, id: CharacterId): void {
  for (const [anim, def] of Object.entries(ZION_ANIMS) as AnimEntry[]) {
    const key = `${id}-${anim}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: def.frames }, (_, i) => ({ key: characterFrameKey(id, anim, i) })),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}
