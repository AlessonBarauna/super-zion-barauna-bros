import { PX, TILE } from '../game/constants';

/**
 * Morcego de Cristal: voa em ondas largas e previsíveis (esquerda–direita com subida e descida).
 * Em grupo, cada um começa numa fase diferente (a "fase" nasce da coluna onde ele foi colocado),
 * formando uma "cobra" de morcegos: dá para ler o ritmo e passar no vão entre eles.
 */
export const BAT = {
  range: 3.4 * TILE,
  horizontalSpeed: 0.85, // rad/s
  verticalSpeed: 1.7, // rad/s
  amplitude: 46 * PX,
} as const;

export interface BatPose {
  x: number;
  y: number;
  /** Para onde está indo (para virar o desenho). */
  dir: 1 | -1;
}

/** Fase de cada morcego a partir da coluna do mapa (colunas vizinhas → fases diferentes). */
export function batPhase(tileX: number): number {
  return (tileX % 8) * 0.8;
}

export function batPose(homeX: number, homeY: number, t: number, phase: number): BatPose {
  const a = t * BAT.horizontalSpeed + phase;
  return {
    x: homeX + Math.sin(a) * BAT.range,
    y: homeY + Math.sin(t * BAT.verticalSpeed + phase * 2) * BAT.amplitude,
    dir: Math.cos(a) >= 0 ? 1 : -1,
  };
}
