import type { MovingPlatformSpec } from '../levels/types';

/**
 * Movimento das plataformas móveis em lógica pura (sem Phaser).
 * O deslocamento segue um cosseno suave: a plataforma desacelera nas pontas, o que facilita embarcar e desembarcar.
 */

/** Deslocamento em blocos (0 a `range`) no instante `t` (segundos). */
export function platformOffset(spec: MovingPlatformSpec, t: number): number {
  const cycle = t / spec.period + (spec.phase ?? 0);
  return spec.range * (0.5 - 0.5 * Math.cos(cycle * Math.PI * 2));
}

/** Posição (canto superior esquerdo, em blocos) no instante `t`. */
export function platformPosition(spec: MovingPlatformSpec, t: number): { x: number; y: number } {
  const o = platformOffset(spec, t);
  return spec.axis === 'x' ? { x: spec.x + o, y: spec.y } : { x: spec.x, y: spec.y - o };
}

/** Velocidade máxima (blocos por segundo) — útil para validar se dá para embarcar. */
export function platformMaxSpeed(spec: MovingPlatformSpec): number {
  return (spec.range * Math.PI) / spec.period;
}

/** Colunas e linhas que a plataforma ocupa em algum momento do trajeto (todas as células da varredura). */
export function platformSweptCells(spec: MovingPlatformSpec): Array<{ col: number; row: number }> {
  const cells: Array<{ col: number; row: number }> = [];
  const cols = spec.axis === 'x' ? Math.ceil(spec.range) + spec.w : spec.w;
  const rows = spec.axis === 'y' ? Math.ceil(spec.range) + 1 : 1;
  const topRow = spec.axis === 'y' ? spec.y - Math.ceil(spec.range) : spec.y;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push({ col: spec.x + c, row: topRow + r });
  }
  return cells;
}
