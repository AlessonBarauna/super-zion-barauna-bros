import { PX } from '../game/constants';

/**
 * Inteligência do Cogumelo Sombrio: patrulha e, ao notar o jogador no mesmo nível,
 * entra em perseguição (mais rápido), mas nunca se joga em abismos nem atravessa paredes.
 */

export type WalkerMode = 'patrol' | 'chase';

export interface WalkerState {
  dir: 1 | -1;
  mode: WalkerMode;
}

export interface WalkerContext {
  /** Diz se o inimigo consegue avançar naquela direção (sem parede e sem abismo). */
  canAdvance: (dir: 1 | -1) => boolean;
  playerDx: number;
  playerDy: number;
  playerAlive: boolean;
}

export const WALKER = {
  patrolSpeed: 55 * PX,
  chaseSpeed: 100 * PX,
  sightX: 260 * PX,
  sightY: 70 * PX,
  forgetX: 380 * PX,
} as const;

export function stepWalker(
  state: WalkerState,
  ctx: WalkerContext,
): { state: WalkerState; speed: number } {
  let { dir, mode } = state;
  const absDx = Math.abs(ctx.playerDx);
  const absDy = Math.abs(ctx.playerDy);

  if (mode === 'patrol') {
    if (ctx.playerAlive && absDx <= WALKER.sightX && absDy <= WALKER.sightY) mode = 'chase';
  } else if (!ctx.playerAlive || absDx > WALKER.forgetX || absDy > WALKER.sightY * 2) {
    mode = 'patrol';
  }

  if (mode === 'chase' && ctx.playerDx !== 0) dir = ctx.playerDx > 0 ? 1 : -1;

  let speed = mode === 'chase' ? WALKER.chaseSpeed : WALKER.patrolSpeed;

  if (!ctx.canAdvance(dir)) {
    if (mode === 'patrol') {
      dir = dir === 1 ? -1 : 1;
      if (!ctx.canAdvance(dir)) speed = 0;
    } else {
      speed = 0;
    }
  }

  return { state: { dir, mode }, speed };
}
