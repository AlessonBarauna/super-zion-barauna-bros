import type { BossKind } from '../levels/types';

/**
 * Lógica pura dos chefões (sem Phaser). Todos seguem o mesmo ciclo:
 * anda → prepara (treme) → investe → bate na parede e fica atordoado → recupera.
 * Só o atordoamento deixa o chefão vulnerável ao pisão; o fogo machuca quase sempre.
 */

/** Ataques especiais: disparo de orbes rasteiros, salto com onda de choque e chuva de pedras. */
export type SpecialKind = 'shot' | 'leap' | 'rain';

/** O que deixa o chefão atordoado (e, por isso, vulnerável ao pisão). */
export type StunSource = 'wall' | 'quake' | 'shot' | 'rain' | 'rocks';

/**
 * Como cada chefão é vencido.
 * - stomp[fonte]: dano do pisão enquanto atordoado por essa fonte (ausente/0 = pisão não machuca; a fonte nem atordoa);
 * - stomp.cast: dano do pisão enquanto ele se prepara para atacar (interrompe o ataque);
 * - fire: dano da bola de fogo (0 = imune);
 * - rocks: dano quando uma pedra da própria chuva cai nele (0 = imune).
 */
export interface BossWeakness {
  stomp: Partial<Record<StunSource | 'cast', number>>;
  fire: number;
  rocks: number;
}

export interface BossDef {
  id: BossKind;
  name: string;
  world: number;
  hp: number;
  /** Multiplica as velocidades-base. */
  speed: number;
  /** Ataques que o chefão alterna (vazio = só a investida). */
  specials: SpecialKind[];
  weakness: BossWeakness;
  /** Dica mostrada no início da luta. */
  hint: string;
}

export const BOSSES: Record<BossKind, BossDef> = {
  gronk: {
    id: 'gronk', name: 'Gronk', world: 1, hp: 6, speed: 1.0, specials: [],
    weakness: { stomp: { wall: 2 }, fire: 1, rocks: 0 },
    hint: 'Espere ele bater na parede e pise nele!',
  },
  kragor: {
    id: 'kragor', name: 'Kragor', world: 2, hp: 6, speed: 1.05, specials: ['rain'],
    weakness: { stomp: { wall: 1, rocks: 2 }, fire: 0, rocks: 3 },
    hint: 'Pele de pedra: fogo não adianta. Fique perto dele para as pedras caírem nele!',
  },
  sakhur: {
    id: 'sakhur', name: 'Sakhur', world: 3, hp: 7, speed: 1.1, specials: ['leap'],
    weakness: { stomp: { quake: 3 }, fire: 1, rocks: 0 },
    hint: 'Desvie do salto e pise nele quando pousar cansado!',
  },
  frostak: {
    id: 'frostak', name: 'Frostak', world: 4, hp: 7, speed: 1.15, specials: ['shot'],
    weakness: { stomp: { wall: 1 }, fire: 2, rocks: 0 },
    hint: 'É de gelo: o fogo derrete (dói o dobro). Pisão faz pouco efeito.',
  },
  vyrak: {
    id: 'vyrak', name: 'Vyrak', world: 5, hp: 8, speed: 1.2, specials: ['shot', 'rain'],
    weakness: { stomp: { cast: 2 }, fire: 1, rocks: 0 },
    hint: 'Casca dura: só dá pra pisar nele enquanto ele se prepara para atacar!',
  },
  mechazord: {
    id: 'mechazord', name: 'Mechazord', world: 6, hp: 8, speed: 1.25, specials: ['leap', 'shot'],
    weakness: { stomp: { wall: 1, shot: 3 }, fire: 0, rocks: 0 },
    hint: 'Fogo não adianta. Depois de atirar ele superaquece: pise nele!',
  },
  auron: {
    id: 'auron', name: 'Auron', world: 7, hp: 9, speed: 1.3, specials: ['rain', 'shot', 'rain'],
    weakness: { stomp: { rain: 3 }, fire: 1, rocks: 0 },
    hint: 'Ele cansa depois de chamar a chuva de pedras. Pise nele ou use fogo!',
  },
  umbrax: {
    id: 'umbrax', name: 'Umbrax', world: 8, hp: 10, speed: 1.4, specials: ['leap', 'rain', 'shot'],
    weakness: { stomp: { wall: 1, quake: 2, shot: 2, rain: 2, rocks: 2 }, fire: 1, rocks: 2 },
    hint: 'Qualquer cansaço dele vale: pise! Fogo e as próprias pedras dele também ferem.',
  },
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
  /** O que causou o atordoamento atual. */
  stunBy: StunSource | null;
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

export const FIRE_DAMAGE = 1;

export interface BossContext {
  /** Posição do jogador vivo mais próximo em relação ao chefão (positivo = à direita). */
  playerDx: number;
  /** O corpo encostou numa parede neste quadro. */
  hitWall: boolean;
  /** O corpo está apoiado no chão (usado para terminar o salto). */
  onGround?: boolean;
}

function stun(s: BossState, by: StunSource): void {
  s.mode = 'stunned';
  s.stunBy = by;
  s.timer = BOSS_TIMING.stunned;
}

export function createBoss(def: BossDef): BossState {
  return { hp: def.hp, mode: 'walk', timer: BOSS_TIMING.walk, dir: -1, invuln: 0, cycle: 0, special: null, stunBy: null };
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
        vx = 0;
        if ((def.weakness.stomp.wall ?? 0) > 0) stun(s, 'wall');
        else {
          s.mode = 'recover';
          s.timer = BOSS_TIMING.recover;
        }
      } else if (s.timer <= 0) {
        s.mode = 'recover';
        s.timer = BOSS_TIMING.recover;
      }
      break;
    case 'stunned':
      if (s.timer <= 0) {
        s.stunBy = null;
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
          if (s.special && (def.weakness.stomp[s.special] ?? 0) > 0) stun(s, s.special);
          else {
            s.mode = 'recover';
            s.timer = BOSS_TIMING.recover;
          }
          s.special = null;
        }
      }
      break;
    case 'leap': {
      vx = s.dir * BOSS_TIMING.leapSpeed * def.speed;
      const airborne = BOSS_TIMING.leapMax - s.timer;
      if ((airborne >= BOSS_TIMING.leapMin && ctx.onGround) || s.timer <= 0) {
        s.special = null;
        vx = 0;
        action = { kind: 'quake' };
        if ((def.weakness.stomp.quake ?? 0) > 0) stun(s, 'quake');
        else {
          s.mode = 'recover';
          s.timer = BOSS_TIMING.recover;
        }
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
  /** O golpe foi inútil por causa da fraqueza do chefão (imune a este golpe agora). */
  immune?: boolean;
}

export type DamageKind = 'stomp' | 'fire' | 'rock';

const GRONK_WEAKNESS: BossWeakness = { stomp: { wall: 2 }, fire: 1, rocks: 0 };

/**
 * Aplica um golpe segundo a fraqueza do chefão.
 * Pisão: só machuca atordoado pela fonte certa (ou durante o preparo, se for a fraqueza dele).
 * Fogo: dano próprio de cada chefão (0 = imune), exceto em imunidade ou durante a recuperação.
 * Pedra: só machuca quem é fraco à própria chuva; atordoa o chefão.
 */
export function damageBoss(prev: BossState, kind: DamageKind, weakness: BossWeakness = GRONK_WEAKNESS): DamageResult {
  const miss = (immune = false): DamageResult => ({ state: prev, hit: false, defeated: false, immune });
  if (prev.mode === 'dead' || prev.invuln > 0) return miss();
  let amount = 0;
  if (kind === 'stomp') {
    if (prev.mode === 'stunned' && prev.stunBy) amount = weakness.stomp[prev.stunBy] ?? 0;
    else if (prev.mode === 'cast') amount = weakness.stomp.cast ?? 0;
    else return miss();
    if (amount <= 0) return miss(true);
  } else if (kind === 'fire') {
    if (prev.mode === 'recover') return miss();
    amount = weakness.fire;
    if (amount <= 0) return miss(true);
  } else {
    if (weakness.rocks <= 0) return miss();
    amount = weakness.rocks;
  }
  const hp = Math.max(0, prev.hp - amount);
  if (hp === 0) return { state: { ...prev, hp, mode: 'dead', timer: 0, invuln: 0, special: null, stunBy: null }, hit: true, defeated: true };
  const next: BossState = { ...prev, hp, invuln: BOSS_TIMING.invuln };
  if (kind === 'stomp') {
    next.mode = 'recover';
    next.timer = BOSS_TIMING.recover;
    next.special = null;
    next.stunBy = null;
  } else if (kind === 'rock') {
    next.mode = 'stunned';
    next.stunBy = 'rocks';
    next.timer = BOSS_TIMING.stunned;
    next.special = null;
  }
  return { state: next, hit: true, defeated: false };
}
