import type { BossKind } from '../levels/types';

/**
 * Lógica pura dos chefões (sem Phaser). Todos seguem o mesmo ciclo:
 * anda → prepara (treme) → investe → bate na parede e fica atordoado → recupera.
 * Só o atordoamento deixa o chefão vulnerável ao pisão; o fogo machuca quase sempre.
 */

/** Ataques especiais: disparo de orbes rasteiros, salto com onda de choque e chuva de pedras. */
export type SpecialKind = 'shot' | 'leap' | 'rain';

export interface BossDef {
  id: BossKind;
  name: string;
  world: number;
  hp: number;
  /** Multiplica as velocidades-base. */
  speed: number;
  /** Ataques que o chefão alterna (vazio = só a investida). */
  specials: SpecialKind[];
}

export const BOSSES: Record<BossKind, BossDef> = {
  gronk: { id: 'gronk', name: 'Gronk', world: 1, hp: 6, speed: 1.0, specials: [] },
  kragor: { id: 'kragor', name: 'Kragor', world: 2, hp: 6, speed: 1.05, specials: ['rain'] },
  sakhur: { id: 'sakhur', name: 'Sakhur', world: 3, hp: 7, speed: 1.1, specials: ['leap'] },
  frostak: { id: 'frostak', name: 'Frostak', world: 4, hp: 7, speed: 1.15, specials: ['shot'] },
  vyrak: { id: 'vyrak', name: 'Vyrak', world: 5, hp: 8, speed: 1.2, specials: ['shot', 'rain'] },
  mechazord: { id: 'mechazord', name: 'Mechazord', world: 6, hp: 8, speed: 1.25, specials: ['leap', 'shot'] },
  auron: { id: 'auron', name: 'Auron', world: 7, hp: 9, speed: 1.3, specials: ['rain', 'shot'] },
  umbrax: { id: 'umbrax', name: 'Umbrax', world: 8, hp: 10, speed: 1.4, specials: ['leap', 'rain', 'shot'] },
};

export const BOSS_BY_WORLD: BossKind[] = ['gronk', 'kragor', 'sakhur', 'frostak', 'vyrak', 'mechazord', 'auron', 'umbrax'];

export type BossMode = 'walk' | 'windup' | 'charge' | 'stunned' | 'recover' | 'cast' | 'leap' | 'dead';

export interface BossState {
  hp: number;
  mode: BossMode;
  /** Tempo restante no modo atual (segundos). */
  timer: number;
  dir: 1 | -1;
  /** Imunidade curta depois de levar dano. */
  invuln: number;
  /** Ciclos de investida concluídos (a cada dois, entra um ataque especial). */
  cycle: number;
  /** Ataque especial em preparo/execução. */
  special: SpecialKind | null;
}

/** Algo que o chefão quer fazer neste quadro; quem desenha cria os perigos. */
export type BossAction = { kind: 'shot' } | { kind: 'rain' } | { kind: 'leap' } | { kind: 'quake' };

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
  /** Tempo de preparo (telegrafado) de um ataque especial. */
  cast: 0.85,
  /** Salto: tempo máximo no ar e velocidade horizontal. */
  leapMax: 1.3,
  leapMin: 0.25,
  leapSpeed: 190,
} as const;

export const STOMP_DAMAGE = 2;
export const FIRE_DAMAGE = 1;

export interface BossContext {
  /** Posição do jogador vivo mais próximo em relação ao chefão (positivo = à direita). */
  playerDx: number;
  /** O corpo encostou numa parede neste quadro. */
  hitWall: boolean;
  /** O corpo está apoiado no chão (usado para terminar o salto). */
  onGround?: boolean;
}

export function createBoss(def: BossDef): BossState {
  return { hp: def.hp, mode: 'walk', timer: BOSS_TIMING.walk, dir: -1, invuln: 0, cycle: 0, special: null };
}

/** Fase 2 do chefão: com metade da vida ou menos, ele fica mais rápido e menos paciente. */
export const isEnraged = (state: BossState, def: BossDef): boolean => state.hp <= def.hp / 2;

/** Avança o chefão e devolve a velocidade horizontal desejada (px/s, com sinal). */
export function stepBoss(prev: BossState, def: BossDef, dt: number, ctx: BossContext): { state: BossState; vx: number; action?: BossAction } {
  if (prev.mode === 'dead') return { state: prev, vx: 0 };
  const s: BossState = { ...prev, timer: prev.timer - dt, invuln: Math.max(0, prev.invuln - dt) };
  const rage = isEnraged(s, def);
  const faceTarget = (): void => {
    if (ctx.playerDx !== 0) s.dir = ctx.playerDx > 0 ? 1 : -1;
  };
  let vx = 0;
  let action: BossAction | undefined;

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
        s.cycle += 1;
        if (def.specials.length > 0 && s.cycle % 2 === 0) {
          s.special = def.specials[(s.cycle / 2 - 1) % def.specials.length] ?? null;
          s.mode = 'cast';
          s.timer = BOSS_TIMING.cast * (rage ? 0.75 : 1);
        } else {
          s.mode = 'walk';
          s.timer = BOSS_TIMING.walk * (rage ? 0.6 : 1);
        }
      }
      break;
    case 'cast':
      faceTarget();
      if (s.timer <= 0) {
        if (s.special === 'leap') {
          s.mode = 'leap';
          s.timer = BOSS_TIMING.leapMax;
          action = { kind: 'leap' };
        } else {
          if (s.special) action = { kind: s.special };
          s.mode = 'recover';
          s.timer = BOSS_TIMING.recover;
        }
      }
      break;
    case 'leap': {
      vx = s.dir * BOSS_TIMING.leapSpeed * def.speed;
      const airborne = BOSS_TIMING.leapMax - s.timer;
      if ((airborne >= BOSS_TIMING.leapMin && ctx.onGround) || s.timer <= 0) {
        s.mode = 'recover';
        s.timer = BOSS_TIMING.recover;
        s.special = null;
        vx = 0;
        action = { kind: 'quake' };
      }
      break;
    }
  }
  return { state: s, vx, action };
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
