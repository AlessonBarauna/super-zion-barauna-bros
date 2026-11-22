import Phaser from 'phaser';
import { PALETTE } from '../game/constants';
import type { BossKind } from '../levels/types';
import { BOSS_BY_WORLD } from '../systems/boss';
import { BOSS_DRAWERS } from './bossArt';
import { canvasTexture, circle, ellipse, fillStroke, OUT, polygon, roundRectPath, type Ctx } from './canvasArt';

/** Corvo Umbral, Ouriço de Cristal e o chefão (um corpo base, recolorido por mundo). Arte original e provisória. */

export const CORVO_FRAME = { w: 52, h: 44 } as const;
export const CORVO_BODY = { w: 30, h: 22, offsetX: 11, offsetY: 14 } as const;
export const OURICO_FRAME = { w: 52, h: 44 } as const;
export const OURICO_BODY = { w: 38, h: 26, offsetX: 7, offsetY: 16 } as const;
/** Moldura com folga de 24 px no topo (coroas, chifres, antenas); o corpo desce junto. */
export const BOSS_TOP_PAD = 24;
export const BOSS_FRAME = { w: 132, h: 124 + BOSS_TOP_PAD } as const;
export const BOSS_BODY = { w: 84, h: 84, offsetX: 24, offsetY: 36 + BOSS_TOP_PAD } as const;

function drawCorvo(ctx: Ctx, wingsUp: boolean): void {
  const wy = wingsUp ? -12 : 8;
  for (const side of [-1, 1]) {
    polygon(ctx, [[26 + side * 6, 22], [26 + side * 24, 22 + wy], [26 + side * 20, 30 + wy / 2], [26 + side * 6, 28]]);
    fillStroke(ctx, '#3D2466', 2.4);
  }
  ellipse(ctx, 26, 25, 13, 11);
  fillStroke(ctx, PALETTE.roxoUmbrax, 2.6);
  circle(ctx, 26, 14, 9);
  fillStroke(ctx, PALETTE.roxoUmbrax, 2.6);
  polygon(ctx, [[26, 15], [38, 18], [26, 22]]);
  fillStroke(ctx, PALETTE.laranja, 2);
  for (const x of [22, 30]) {
    circle(ctx, x, 12, 3);
    fillStroke(ctx, '#FFFFFF', 1.6);
    circle(ctx, x + (x < 26 ? 0.8 : -0.8), 12.5, 1.2);
    ctx.fillStyle = OUT;
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(19, 8);
  ctx.lineTo(25, 10.5);
  ctx.moveTo(33, 8);
  ctx.lineTo(27, 10.5);
  ctx.stroke();
}

function drawOurico(ctx: Ctx, step: 0 | 1): void {
  const off = step === 0 ? 3 : -3;
  ellipse(ctx, 16 + off, 40, 7, 3.4);
  fillStroke(ctx, '#4A2E1A', 2);
  ellipse(ctx, 36 - off, 40, 7, 3.4);
  fillStroke(ctx, '#4A2E1A', 2);
  // espinhos de cristal
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const cx = 26 + Math.cos(a) * 15;
    const cy = 28 + Math.sin(a) * 14;
    const tx = 26 + Math.cos(a) * 25;
    const ty = 28 + Math.sin(a) * 25;
    const nx = -Math.sin(a) * 4;
    const ny = Math.cos(a) * 4;
    polygon(ctx, [[cx + nx, cy + ny], [tx, ty], [cx - nx, cy - ny]]);
    fillStroke(ctx, i % 2 ? '#8FE3F5' : '#B9F0FA', 2);
  }
  ellipse(ctx, 26, 31, 17, 12);
  fillStroke(ctx, '#7A5AA8', 2.6);
  circle(ctx, 38, 32, 7);
  fillStroke(ctx, PALETTE.creme, 2.4);
  circle(ctx, 40, 31, 2);
  ctx.fillStyle = OUT;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(36, 27);
  ctx.lineTo(43, 29.5);
  ctx.stroke();
}

type BossPose = 'walk0' | 'walk1' | 'windup' | 'stunned';

/** Cores de cada chefão (o mesmo corpo-base, pintado por mundo: setTint não funciona no Canvas). */
const BOSS_COLORS: Record<BossKind, { body: string; head: string; belly: string; horn: string }> = {
  gronk: { body: '#6B7A3E', head: '#7D8E48', belly: '#A8B96A', horn: PALETTE.creme },
  kragor: { body: '#4A63B8', head: '#5B77D0', belly: '#9FB8F5', horn: '#CFF3FF' },
  sakhur: { body: '#C98A2E', head: '#DDA040', belly: '#F5D58A', horn: '#FFF3C4' },
  frostak: { body: '#7FB6D6', head: '#98CBEA', belly: '#E3F6FF', horn: '#FFFFFF' },
  vyrak: { body: '#2F8F5B', head: '#3FA66C', belly: '#8FE3A8', horn: '#E9F5C0' },
  mechazord: { body: '#6C7480', head: '#818A98', belly: '#B9C0CB', horn: '#F2C94C' },
  auron: { body: '#D9A11E', head: '#F2B92E', belly: '#FFE58A', horn: '#FFFFFF' },
  umbrax: { body: '#5A2D85', head: '#773EAA', belly: '#9B66CC', horn: '#E8D2FF' },
};

function drawBoss(ctx: Ctx, pose: BossPose, kind: BossKind): void {
  ctx.save();
  ctx.translate(0, BOSS_TOP_PAD);
  drawBossBody(ctx, pose, kind);
  ctx.restore();
}

function drawBossBody(ctx: Ctx, pose: BossPose, kind: BossKind): void {
  const own = BOSS_DRAWERS[kind];
  if (own) {
    ctx.save();
    if (pose === 'windup') {
      ctx.translate(66, 124);
      ctx.scale(1.04, 0.95);
      ctx.translate(-66, -124);
    }
    own(ctx, pose);
    ctx.restore();
    return;
  }
  const c = BOSS_COLORS[kind];
  ctx.save();
  const sx = pose === 'windup' ? 1.04 : 1;
  ctx.translate(66, 124);
  ctx.scale(sx, pose === 'windup' ? 0.94 : 1);
  ctx.translate(-66, -124);
  const off = pose === 'walk0' ? 4 : pose === 'walk1' ? -4 : 0;
  ellipse(ctx, 42 + off, 116, 15, 7);
  fillStroke(ctx, '#3A2616', 2.6);
  ellipse(ctx, 90 - off, 116, 15, 7);
  fillStroke(ctx, '#3A2616', 2.6);
  // corpo
  roundRectPath(ctx, 22, 44, 88, 70, 30);
  fillStroke(ctx, c.body, 3.4);
  ellipse(ctx, 66, 92, 26, 18);
  fillStroke(ctx, c.belly, 2.4);
  // braços
  const armY = pose === 'stunned' ? 84 : 66;
  for (const side of [-1, 1]) {
    ellipse(ctx, 66 + side * 52, armY, 13, 20, side * 0.3);
    fillStroke(ctx, c.body, 3);
  }
  // cabeça
  roundRectPath(ctx, 28, 8, 76, 60, 24);
  fillStroke(ctx, c.head, 3.4);
  // chifres / espinhos
  for (const x of [38, 66, 94]) {
    polygon(ctx, [[x - 8, 14], [x, -2], [x + 8, 14]]);
    fillStroke(ctx, c.horn, 2.6);
  }
  if (pose === 'stunned') {
    for (const x of [48, 84]) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(x - 7, 34);
      ctx.lineTo(x + 7, 46);
      ctx.moveTo(x + 7, 34);
      ctx.lineTo(x - 7, 46);
      ctx.stroke();
    }
    ellipse(ctx, 66, 58, 10, 5);
    fillStroke(ctx, '#2A1530', 2.4);
  } else {
    for (const x of [48, 84]) {
      ellipse(ctx, x, 38, 10, 11);
      fillStroke(ctx, '#FFFFFF', 2.4);
      circle(ctx, x + (x < 66 ? 2.5 : -2.5), 40, 4.2);
      ctx.fillStyle = pose === 'windup' ? '#E03030' : OUT;
      ctx.fill();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(34, 22);
    ctx.lineTo(58, 31);
    ctx.moveTo(98, 22);
    ctx.lineTo(74, 31);
    ctx.stroke();
    ellipse(ctx, 66, 58, 18, 8);
    fillStroke(ctx, '#2A1530', 2.6);
    for (const x of [56, 66, 76]) polygon(ctx, [[x - 3, 53], [x, 60], [x + 3, 53]]), fillStroke(ctx, '#FFFFFF', 1.4);
  }
  ctx.restore();
}

export function createCreatureTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'corvo-0', CORVO_FRAME.w, CORVO_FRAME.h, (c) => drawCorvo(c, true));
  canvasTexture(scene, 'corvo-1', CORVO_FRAME.w, CORVO_FRAME.h, (c) => drawCorvo(c, false));
  canvasTexture(scene, 'ourico-0', OURICO_FRAME.w, OURICO_FRAME.h, (c) => drawOurico(c, 0));
  canvasTexture(scene, 'ourico-1', OURICO_FRAME.w, OURICO_FRAME.h, (c) => drawOurico(c, 1));
  for (const kind of BOSS_BY_WORLD) {
    for (const pose of ['walk0', 'walk1', 'windup', 'stunned'] as const) {
      canvasTexture(scene, `boss-${kind}-${pose}`, BOSS_FRAME.w, BOSS_FRAME.h, (cx) => drawBoss(cx, pose, kind));
    }
  }
}

export function createCreatureAnimations(scene: Phaser.Scene): void {
  const make = (key: string, frames: string[], frameRate: number): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((k) => ({ key: k })), frameRate, repeat: -1 });
  };
  make('corvo-fly', ['corvo-0', 'corvo-1'], 8);
  make('ourico-walk', ['ourico-0', 'ourico-1'], 5);
  for (const kind of BOSS_BY_WORLD) make(`boss-${kind}-walk`, [`boss-${kind}-walk0`, `boss-${kind}-walk1`], 5);
}
