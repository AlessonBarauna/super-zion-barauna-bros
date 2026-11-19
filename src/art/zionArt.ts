import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import type { PlayerAnimation } from '../systems/movement';
import { auroraSymbol, canvasTexture, circle, ellipse, fillStroke, OUT, roundRectPath, type Ctx } from './canvasArt';

/** Zion Baraúna: roupa azul e verde, botas marrons, mochila, símbolo da Aurora no peito. */

export const ZION_FRAME = { w: 64, h: 80 } as const;
/** Deslocamento vertical do desenho dentro do quadro (folga para o topo da mecha de cabelo). */
const DRAW_OFFSET_Y = 8;
/** Corpo de colisão em unidades de arte (dentro do quadro). */
export const ZION_BODY = { w: 26, h: 54, offsetX: 19, offsetY: 22 } as const;

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

const SKIN = '#F2C29B';
const SKIN_SHADE = '#E0A57B';
const HAIR = '#6A3F22';
const PANTS = '#2F9A3B';
const BOOT = '#7A4A28';
const BOOT_LIGHT = '#9A6238';
const SHIRT_SHADE = '#2467B0';

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

function boot(ctx: Ctx, x: number, y: number): void {
  ellipse(ctx, x + 3, y - 2, 10, 6.2);
  fillStroke(ctx, BOOT, 2.4);
  ellipse(ctx, x + 5, y - 4, 4.5, 2.2);
  ctx.fillStyle = BOOT_LIGHT;
  ctx.fill();
}

function leg(ctx: Ctx, hipX: number, hipY: number, o: Offset, floorY: number): void {
  const fx = hipX + o.dx;
  const fy = floorY + o.dy - 6;
  limb(ctx, hipX, hipY, fx, fy, 8, PANTS);
  boot(ctx, fx, floorY + o.dy);
}

function arm(ctx: Ctx, sx: number, sy: number, o: Offset): void {
  const hx = sx + 3 + o.dx;
  const hy = sy + 11 + o.dy;
  limb(ctx, sx, sy, hx, hy, 7, PALETTE.azulZion);
  circle(ctx, hx, hy + 1, 4.4);
  fillStroke(ctx, SKIN, 2.2);
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

export function drawZion(ctx: Ctx, p: Pose): void {
  ctx.save();
  ctx.translate(0, DRAW_OFFSET_Y);
  const top = p.bob + p.squash;
  const lx = p.lean;
  const floorY = 68;
  const hipY = 52 + p.squash;
  const headCx = 33 + lx;
  const headCy = 19 + top;

  // braço de trás
  arm(ctx, 26 + lx, 37 + top, p.armB);

  // mochila de aventura
  roundRectPath(ctx, 10 + lx, 32 + top, 16, 20, 6);
  fillStroke(ctx, PALETTE.laranja, 2.4);
  roundRectPath(ctx, 12.5 + lx, 40 + top, 11, 8, 3);
  fillStroke(ctx, '#C9631F', 2);
  circle(ctx, 18 + lx, 44 + top, 1.3);
  ctx.fillStyle = PALETTE.douradoAurora;
  ctx.fill();

  // pernas (atrás do tronco)
  leg(ctx, 28 + lx * 0.4, hipY, p.legB, floorY);
  leg(ctx, 38 + lx * 0.4, hipY, p.legF, floorY);

  // tronco
  roundRectPath(ctx, 21 + lx, 31 + top, 24, 23, 8);
  fillStroke(ctx, PALETTE.azulZion, 2.6);
  ctx.save();
  roundRectPath(ctx, 21 + lx, 31 + top, 24, 23, 8);
  ctx.clip();
  ctx.fillStyle = SHIRT_SHADE;
  ctx.fillRect(21 + lx, 46 + top, 24, 8);
  ctx.fillStyle = '#5BA8EE';
  ctx.fillRect(21 + lx, 31 + top, 24, 3);
  ctx.restore();
  // cinto verde
  roundRectPath(ctx, 21 + lx, 47 + top, 24, 6, 3);
  fillStroke(ctx, PALETTE.verdeBarauna, 2.2);
  // símbolo dourado da Aurora
  circle(ctx, 34 + lx, 39 + top, 6.2);
  fillStroke(ctx, PALETTE.douradoAurora, 2);
  auroraSymbol(ctx, 34 + lx, 39 + top, 4.6, PALETTE.laranja, 6);

  // braço da frente
  arm(ctx, 41 + lx, 37 + top, p.armF);

  // cabeça
  circle(ctx, headCx - 14, headCy + 3, 4.2); // orelha
  fillStroke(ctx, SKIN_SHADE, 2.2);
  circle(ctx, headCx, headCy, 15.5);
  fillStroke(ctx, SKIN, 2.6);

  // cabelo
  ctx.beginPath();
  ctx.arc(headCx, headCy, 15.5, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(headCx + 8, headCy - 9, headCx + 2, headCy - 7);
  ctx.quadraticCurveTo(headCx - 7, headCy - 11, headCx - 15, headCy - 3);
  ctx.closePath();
  fillStroke(ctx, HAIR, 2.4);
  // mecha rebelde
  ctx.beginPath();
  ctx.moveTo(headCx + 2, headCy - 15);
  ctx.quadraticCurveTo(headCx + 8, headCy - 23, headCx + 14, headCy - 17);
  ctx.quadraticCurveTo(headCx + 8, headCy - 17, headCx + 6, headCy - 13);
  ctx.closePath();
  fillStroke(ctx, HAIR, 2.2);

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

  drawEyes(ctx, headCx, headCy, p.eyes);
  // bochecha
  circle(ctx, headCx + 13.5, headCy + 7, 2.6);
  ctx.fillStyle = 'rgba(242,139,120,0.55)';
  ctx.fill();
  drawMouth(ctx, headCx + 8.5, headCy + 9, p.mouth);
  ctx.restore();
}

export function zionFrameKey(anim: PlayerAnimation, i: number): string {
  return `zion-${anim}-${i}`;
}

export function createZionTextures(scene: Phaser.Scene): void {
  for (const [anim, def] of Object.entries(ZION_ANIMS) as Array<[PlayerAnimation, (typeof ZION_ANIMS)[PlayerAnimation]]>) {
    for (let i = 0; i < def.frames; i++) {
      canvasTexture(scene, zionFrameKey(anim, i), ZION_FRAME.w, ZION_FRAME.h, (ctx) => drawZion(ctx, def.pose(i)));
    }
  }
}

export function createZionAnimations(scene: Phaser.Scene): void {
  for (const [anim, def] of Object.entries(ZION_ANIMS) as Array<[PlayerAnimation, (typeof ZION_ANIMS)[PlayerAnimation]]>) {
    const key = `zion-${anim}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: def.frames }, (_, i) => ({ key: zionFrameKey(anim, i) })),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}
