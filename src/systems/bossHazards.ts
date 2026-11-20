import type { BossDef } from './boss';

/**
 * Perigos criados pelos ataques especiais dos chefões (lógica pura, em px de design).
 * - orb: orbe rasteiro que cruza a arena (pule por cima);
 * - wave: onda de choque pelo chão depois de um salto (pule);
 * - rock: pedra que cai de cima depois de um aviso no chão (saia de baixo).
 */
export type HazardKind = 'orb' | 'wave' | 'rock';

export interface Hazard {
  kind: HazardKind;
  /** Centro. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  /** Rocha: tempo de aviso restante antes de cair. */
  warn: number;
  /** Tempo de vida restante (orbes e ondas). */
  life: number;
}

export const HAZARD = {
  orbSpeed: 230,
  waveSpeed: 240,
  rockFall: 560,
  rockWarn: 0.95,
  orb: { w: 34, h: 34, lift: 30 },
  wave: { w: 44, h: 34 },
  rock: { w: 46, h: 54, startY: -80 },
  orbLife: 6,
  waveLife: 3,
  orbSpacing: 150,
} as const;

export interface Arena {
  left: number;
  right: number;
  /** Y da superfície do chão. */
  groundY: number;
}

/** Orbes disparados na direção `dir`; chefões mais avançados (ou enfurecidos) disparam mais de uma. */
export function spawnShot(def: BossDef, x: number, dir: 1 | -1, arena: Arena, rage: boolean): Hazard[] {
  const count = 1 + (rage ? 1 : 0) + (def.world >= 7 ? 1 : 0);
  const out: Hazard[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      kind: 'orb',
      x: x + dir * 40 - dir * i * HAZARD.orbSpacing,
      y: arena.groundY - HAZARD.orb.lift - HAZARD.orb.h / 2,
      vx: dir * HAZARD.orbSpeed * def.speed,
      vy: 0,
      w: HAZARD.orb.w,
      h: HAZARD.orb.h,
      warn: 0,
      life: HAZARD.orbLife,
    });
  }
  return out;
}

/** Ondas de choque para os dois lados, saindo do ponto de pouso. */
export function spawnQuake(def: BossDef, x: number, arena: Arena): Hazard[] {
  return ([-1, 1] as const).map((dir) => ({
    kind: 'wave' as const,
    x: x + dir * 50,
    y: arena.groundY - HAZARD.wave.h / 2,
    vx: dir * HAZARD.waveSpeed * def.speed,
    vy: 0,
    w: HAZARD.wave.w,
    h: HAZARD.wave.h,
    warn: 0,
    life: HAZARD.waveLife,
  }));
}

/**
 * Chuva de pedras: uma sobre o jogador e as demais ao redor, sempre dentro da arena.
 * Para chefões fracos à própria chuva (def.weakness.rocks > 0), a segunda pedra cai no meio do caminho
 * entre o jogador e o chefão: quem ficar perto (sem encostar) faz a pedra acertar o chefão.
 */
export function spawnRain(def: BossDef, targetX: number, arena: Arena, rage: boolean, bossX?: number): Hazard[] {
  const count = 2 + (rage ? 1 : 0) + (def.world >= 6 ? 1 : 0);
  const margin = HAZARD.rock.w;
  const clamp = (v: number): number => Math.min(arena.right - margin, Math.max(arena.left + margin, v));
  const xs: number[] = [clamp(targetX)];
  if (def.weakness.rocks > 0 && bossX !== undefined) xs.push(clamp((targetX + bossX) / 2));
  for (let i = 1; xs.length < count; i++) {
    const side = i % 2 === 1 ? 1 : -1;
    xs.push(clamp(targetX + side * 170 * Math.ceil(i / 2)));
  }
  return xs.map((x, i) => ({
    kind: 'rock' as const,
    x,
    y: HAZARD.rock.startY,
    vx: 0,
    vy: 0,
    w: HAZARD.rock.w,
    h: HAZARD.rock.h,
    warn: HAZARD.rockWarn + i * 0.18,
    life: 0,
  }));
}

/** Avança um perigo; devolve null quando ele sai de cena. */
export function stepHazard(h: Hazard, dt: number, arena: Arena): Hazard | null {
  if (h.kind === 'rock') {
    if (h.warn > 0) return { ...h, warn: h.warn - dt };
    const vy = HAZARD.rockFall;
    const y = h.y + vy * dt;
    if (y + h.h / 2 >= arena.groundY) return null;
    return { ...h, y, vy };
  }
  const life = h.life - dt;
  const x = h.x + h.vx * dt;
  if (life <= 0 || x < arena.left - h.w || x > arena.right + h.w) return null;
  return { ...h, x, life };
}

/** Só machuca quando já está em jogo (pedra em aviso é inofensiva). */
export const isHarmful = (h: Hazard): boolean => h.kind !== 'rock' || h.warn <= 0;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Interseção entre o perigo (caixa um pouco menor que o desenho) e uma caixa (canto superior esquerdo). */
export function hazardHits(h: Hazard, box: Box): boolean {
  if (!isHarmful(h)) return false;
  const hw = h.w * 0.4;
  const hh = h.h * 0.4;
  return h.x - hw < box.x + box.w && h.x + hw > box.x && h.y - hh < box.y + box.h && h.y + hh > box.y;
}
