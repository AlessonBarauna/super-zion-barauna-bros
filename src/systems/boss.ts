import type { BossKind } from '../levels/types';

/**
 * Lógica pura dos chefões (sem Phaser). Todos seguem o mesmo ciclo:
 * anda → prepara (treme) → investe → bate na parede e fica atordoado → recupera.
 * Só o atordoamento deixa o chefão vulnerável ao pisão; o fogo machuca quase sempre.
 */

export interface BossDef {
  id: BossKind;
  name: string;
  world: number;
  hp: number;
  /** Multiplica as velocidades-base. */
  speed: number;
}

export const BOSSES: Record<BossKind, BossDef> = {
  gronk: { id: 'gronk', name: 'Gronk', world: 1, hp: 6, speed: 1.0 },
  kragor: { id: 'kragor', name: 'Kragor', world: 2, hp: 6, speed: 1.05 },
  sakhur: { id: 'sakhur', name: 'Sakhur', world: 3, hp: 7, speed: 1.1 },
  frostak: { id: 'frostak', name: 'Frostak', world: 4, hp: 7, speed: 1.15 },
  vyrak: { id: 'vyrak', name: 'Vyrak', world: 5, hp: 8, speed: 1.2 },
  mechazord: { id: 'mechazord', name: 'Mechazord', world: 6, hp: 8, speed: 1.25 },
  auron: { id: 'auron', name: 'Auron', world: 7, hp: 9, speed: 1.3 },
  umbrax: { id: 'umbrax', name: 'Umbrax', world: 8, hp: 10, speed: 1.4 },
};

export const BOSS_BY_WORLD: BossKind[] = ['gronk', 'kragor', 'sakhur', 'frostak', 'vyrak', 'mechazord', 'auron', 'umbrax'];

export type BossMode = 'walk' | 'windup' | 'charge' | 'stunned' | 'recover' | 'dead';

export interface BossState {
  hp: number;
  mode: BossMode;
  /** Tempo restante no modo atual (segundos). */
  timer: number;
  dir: 1 | -1;
  /** Imunidade curta depois de levar dano. */
  invuln: number;
}

export const BOSS_TIMING = {
  walk: 1.8,
  windup: 0.8,
  stunned: 2.4,
  recover: 0.6,
  chargeMax: 2.6,
  invuln: 0.9,
  /** Velocidades-base em px/s (antes do multiplicador do chefão). */
  walkSpeed: 70,
  chargeSpeed: 300,
} as const;

export const STOMP_DAMAGE = 2;
export const FIRE_DAMAGE = 1;

export interface BossContext {
  /** Posição do jogador vivo mais próximo em relação ao chefão (positivo = à direita). */
  playerDx: number;
  /** O corpo encostou numa parede neste quadro. */
  hitWall: boolean;
}

export function createBoss(def: BossDef): BossState {
  return { hp: def.hp, mode: 'walk', timer: BOSS_TIMING.walk, dir: -1, invuln: 0 };
}

/** Fase 2 do chefão: com metade da vida ou menos, ele fica mais rápido e menos paciente. */
export const isEnraged = (state: BossState, def: BossDef): boolean => state.hp <= def.hp / 2;

/** Avança o chefão e devolve a velocidade horizontal desejada (px/s, com sinal). */
export function stepBoss(prev: BossState, def: BossDef, dt: number, ctx: BossContext): { state: BossState; vx: number } {
  if (prev.mode === 'dead') return { state: prev, vx: 0 };
  const s: BossState = { ...prev, timer: prev.timer - dt, invuln: Math.max(0, prev.invuln - dt) };
  const rage = isEnraged(s, def);
  const faceTarget = (): void => {
    if (ctx.playerDx !== 0) s.dir = ctx.playerDx > 0 ? 1 : -1;
  };
  let vx = 0;

  switch (s.mode) {
    case 'walk':
      faceTarget();
      vx = s.dir * BOSS_TIMING.walkSpeed * def.speed;
      if (s.timer <= 0) {
        s.mode = 'windup';
        s.timer = BOSS_TIMING.windup * (rage ? 0.7 : 1);
      }
      break;
    case 'windup':
      faceTarget();
      if (s.timer <= 0) {
        s.mode = 'charge';
        s.timer = BOSS_TIMING.chargeMax;
      }
      break;
    case 'charge':
      vx = s.dir * BOSS_TIMING.chargeSpeed * def.speed * (rage ? 1.25 : 1);
      if (ctx.hitWall) {
        s.mode = 'stunned';
        s.timer = BOSS_TIMING.stunned;
        vx = 0;
      } else if (s.timer <= 0) {
        s.mode = 'recover';
        s.timer = BOSS_TIMING.recover;
      }
      break;
    case 'stunned':
      if (s.timer <= 0) {
        s.mode = 'recover';
        s.timer = BOSS_TIMING.recover;
      }
      break;
    case 'recover':
      if (s.timer <= 0) {
        s.mode = 'walk';
        s.timer = BOSS_TIMING.walk * (rage ? 0.6 : 1);
      }
      break;
  }
  return { state: s, vx };
}

export interface DamageResult {
  state: BossState;
  /** O golpe causou dano. */
  hit: boolean;
  defeated: boolean;
}

/** Aplica um golpe. Pisão só machuca atordoado; fogo machuca exceto em imunidade ou durante a recuperação. */
export function damageBoss(prev: BossState, kind: 'stomp' | 'fire'): DamageResult {
  if (prev.mode === 'dead' || prev.invuln > 0) return { state: prev, hit: false, defeated: false };
  if (kind === 'stomp' && prev.mode !== 'stunned') return { state: prev, hit: false, defeated: false };
  if (kind === 'fire' && prev.mode === 'recover') return { state: prev, hit: false, defeated: false };
  const hp = Math.max(0, prev.hp - (kind === 'stomp' ? STOMP_DAMAGE : FIRE_DAMAGE));
  if (hp === 0) return { state: { ...prev, hp, mode: 'dead', timer: 0, invuln: 0 }, hit: true, defeated: true };
  const next: BossState = { ...prev, hp, invuln: BOSS_TIMING.invuln };
  if (kind === 'stomp') {
    next.mode = 'recover';
    next.timer = BOSS_TIMING.recover;
  }
  return { state: next, hit: true, defeated: false };
}
