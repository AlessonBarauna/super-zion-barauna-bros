import { PX, TILE } from '../game/constants';

/**
 * Corvo Umbral: patrulha em voo ondulado e, ao ver o jogador abaixo e à frente,
 * mergulha na posição dele, volta ao ponto de origem e espera antes de repetir.
 */

export type FlyerMode = 'patrol' | 'dive' | 'return';

export interface FlyerState {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  dir: 1 | -1;
  mode: FlyerMode;
  /** Relógio de voo (para a ondulação). */
  t: number;
  cooldown: number;
  diveTime: number;
  targetX: number;
  targetY: number;
}

export const FLYER = {
  patrolSpeed: 70 * PX,
  diveSpeed: 240 * PX,
  returnSpeed: 150 * PX,
  range: 3 * TILE,
  bobAmp: 22 * PX,
  bobPeriod: 1.8,
  sightX: 240 * PX,
  sightBelow: 380 * PX,
  cooldown: 3,
  maxDive: 1.1,
} as const;

export interface FlyerTarget {
  dx: number;
  dy: number;
  alive: boolean;
  /** Menor y permitido para o alvo do mergulho (acima do chão). */
  floorY: number;
}

export function createFlyer(x: number, y: number): FlyerState {
  return { x, y, homeX: x, homeY: y, dir: -1, mode: 'patrol', t: 0, cooldown: 1, diveTime: 0, targetX: x, targetY: y };
}

const moveToward = (s: FlyerState, tx: number, ty: number, speed: number, dt: number): boolean => {
  const dx = tx - s.x;
  const dy = ty - s.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step) {
    s.x = tx;
    s.y = ty;
    return true;
  }
  s.x += (dx / dist) * step;
  s.y += (dy / dist) * step;
  return false;
};

/** Avança o corvo por `dt` segundos. Não altera o estado recebido. */
export function stepFlyer(prev: FlyerState, dt: number, target: FlyerTarget | null): FlyerState {
  const s: FlyerState = { ...prev, t: prev.t + dt, cooldown: Math.max(0, prev.cooldown - dt) };

  if (s.mode === 'patrol') {
    s.x += s.dir * FLYER.patrolSpeed * dt;
    if (s.x > s.homeX + FLYER.range) {
      s.x = s.homeX + FLYER.range;
      s.dir = -1;
    } else if (s.x < s.homeX - FLYER.range) {
      s.x = s.homeX - FLYER.range;
      s.dir = 1;
    }
    s.y = s.homeY + Math.sin((s.t / FLYER.bobPeriod) * Math.PI * 2) * FLYER.bobAmp;
    if (
      target?.alive &&
      s.cooldown === 0 &&
      Math.abs(target.dx) <= FLYER.sightX &&
      target.dy > 0 &&
      target.dy <= FLYER.sightBelow
    ) {
      s.mode = 'dive';
      s.diveTime = 0;
      s.targetX = s.x + target.dx;
      s.targetY = Math.min(s.y + target.dy, target.floorY);
      s.dir = target.dx >= 0 ? 1 : -1;
    }
  } else if (s.mode === 'dive') {
    s.diveTime += dt;
    const arrived = moveToward(s, s.targetX, s.targetY, FLYER.diveSpeed, dt);
    if (arrived || s.diveTime >= FLYER.maxDive) s.mode = 'return';
  } else {
    s.dir = s.homeX >= s.x ? 1 : -1;
    if (moveToward(s, s.homeX, s.homeY, FLYER.returnSpeed, dt)) {
      s.mode = 'patrol';
      s.cooldown = FLYER.cooldown;
    }
  }
  return s;
}
