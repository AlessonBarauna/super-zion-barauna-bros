import { PX, TILE } from '../game/constants';

/**
 * Movimentação de plataforma em lógica pura (sem Phaser).
 * A entidade do jogador apenas lê o corpo físico, chama stepMovement e aplica o resultado.
 */

export interface MovementParams {
  walkSpeed: number;
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  airAccel: number;
  airDecel: number;
  /** Multiplicador de aceleração ao inverter a direção (evita sensação de "deslizar"). */
  turnBoost: number;
  /** Velocidade inicial do pulo (módulo, para cima). */
  jumpVelocity: number;
  gravity: number;
  /** A queda é mais pesada que a subida, para um pulo mais "firme". */
  fallGravityScale: number;
  /** Fator aplicado à velocidade vertical ao soltar o botão de pulo durante a subida. */
  jumpCutScale: number;
  maxFallSpeed: number;
  /** Tolerância (s) para pular logo depois de sair de uma plataforma. */
  coyoteTime: number;
  /** Tolerância (s) para registrar o pulo antes de tocar o chão. */
  jumpBuffer: number;
  /** Pulos extras no ar (1 = pulo duplo). */
  airJumps: number;
  /** Força do pulo extra em relação ao primeiro. */
  airJumpScale: number;
}

export interface MovementInput {
  moveX: -1 | 0 | 1;
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface MovementState {
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number;
  buffer: number;
  jumping: boolean;
  facing: 1 | -1;
  /** Maior velocidade de queda observada no ar (para medir o impacto do pouso). */
  airVy: number;
  gravityScale: number;
  justJumped: boolean;
  /** Fez o pulo extra neste quadro. */
  justAirJumped: boolean;
  airJumpsLeft: number;
  justLanded: boolean;
  impactSpeed: number;
}

/** Parâmetros em unidades de arte (grade de 45 px por bloco). */
export const BASE_ZION_PARAMS: MovementParams = {
  walkSpeed: 220,
  runSpeed: 360,
  groundAccel: 1700,
  groundDecel: 2600,
  airAccel: 1200,
  airDecel: 650,
  turnBoost: 2.2,
  jumpVelocity: 820,
  gravity: 2200,
  fallGravityScale: 1.35,
  jumpCutScale: 0.45,
  maxFallSpeed: 900,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  airJumps: 1,
  airJumpScale: 0.88,
};

/** Converte distâncias (mantendo os tempos), para a escala real do jogo. */
export function scaleMovementParams(p: MovementParams, k: number): MovementParams {
  return {
    ...p,
    walkSpeed: p.walkSpeed * k,
    runSpeed: p.runSpeed * k,
    groundAccel: p.groundAccel * k,
    groundDecel: p.groundDecel * k,
    airAccel: p.airAccel * k,
    airDecel: p.airDecel * k,
    jumpVelocity: p.jumpVelocity * k,
    gravity: p.gravity * k,
    maxFallSpeed: p.maxFallSpeed * k,
  };
}

export const ZION_PARAMS: MovementParams = scaleMovementParams(BASE_ZION_PARAMS, PX);

/**
 * Bara: mais ágil (acelera e freia mais rápido, controle melhor no ar) e salta mais alto.
 * Gravidade igual à do Zion, pois o mundo tem uma única gravidade. Corre um pouco menos,
 * mas o salto mais longo compensa: qualquer vão que o Zion cruza, a Bara também cruza.
 */
export const BASE_BARA_PARAMS: MovementParams = {
  ...BASE_ZION_PARAMS,
  walkSpeed: 230,
  runSpeed: 350,
  groundAccel: 2200,
  groundDecel: 3200,
  airAccel: 1600,
  airDecel: 800,
  turnBoost: 2.6,
  jumpVelocity: 900,
};

export const BARA_PARAMS: MovementParams = scaleMovementParams(BASE_BARA_PARAMS, PX);

export const NEUTRAL_INPUT: MovementInput = {
  moveX: 0,
  run: false,
  jumpPressed: false,
  jumpHeld: false,
};

/** Comandos completos de um jogador: movimento + botão de poder (apertado neste quadro). */
export interface PlayerControls extends MovementInput {
  powerPressed: boolean;
  /** ↓ apertado neste quadro (entrar em cano ou porta). */
  downPressed?: boolean;
  /** ↓ segurado (abaixar). */
  downHeld?: boolean;
}

/** Agachar: só no chão, enquanto ↓ está segurado; sem espaço para levantar, continua agachado. */
export function nextCrouch(wasCrouching: boolean, onGround: boolean, downHeld: boolean, headBlocked: boolean): boolean {
  return onGround && (downHeld || (wasCrouching && headBlocked));
}

/** Altura relativa do corpo agachado. */
export const CROUCH_SCALE_Y = 0.72;

export function createMovementState(): MovementState {
  return {
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: 0,
    buffer: 0,
    jumping: false,
    facing: 1,
    airVy: 0,
    gravityScale: 1,
    justJumped: false,
    justAirJumped: false,
    airJumpsLeft: 0,
    justLanded: false,
    impactSpeed: 0,
  };
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

export function stepMovement(
  prev: MovementState,
  input: MovementInput,
  dt: number,
  p: MovementParams,
  onGround: boolean,
  bodyVx: number,
  bodyVy: number,
): MovementState {
  const s: MovementState = { ...prev, justJumped: false, justAirJumped: false, justLanded: false, impactSpeed: 0 };
  let vx = bodyVx;
  let vy = bodyVy;

  if (onGround) {
    s.coyote = p.coyoteTime;
    s.airJumpsLeft = p.airJumps;
    s.jumping = false;
    if (!prev.onGround) {
      s.justLanded = true;
      s.impactSpeed = prev.airVy;
    }
    s.airVy = 0;
  } else {
    s.coyote = Math.max(0, s.coyote - dt);
    s.airVy = Math.max(s.airVy, vy);
  }

  s.buffer = input.jumpPressed ? p.jumpBuffer : Math.max(0, s.buffer - dt);

  const topSpeed = input.run ? p.runSpeed : p.walkSpeed;
  const target = input.moveX * topSpeed;
  const accel = onGround ? p.groundAccel : p.airAccel;
  const decel = onGround ? p.groundDecel : p.airDecel;
  let rate: number;
  if (input.moveX === 0) rate = decel;
  else if (vx !== 0 && Math.sign(vx) !== input.moveX) rate = accel * p.turnBoost;
  else if (Math.abs(vx) > topSpeed) rate = decel;
  else rate = accel;
  vx = approach(vx, target, rate * dt);
  if (input.moveX !== 0) s.facing = input.moveX;

  if (s.buffer > 0 && s.coyote > 0) {
    vy = -p.jumpVelocity;
    s.jumping = true;
    s.buffer = 0;
    s.coyote = 0;
    s.justJumped = true;
  } else if (!onGround && s.coyote === 0 && input.jumpPressed && s.airJumpsLeft > 0) {
    vy = -p.jumpVelocity * p.airJumpScale;
    s.airJumpsLeft -= 1;
    s.jumping = true;
    s.buffer = 0;
    s.justAirJumped = true;
  } else if (s.jumping && !input.jumpHeld && vy < 0) {
    vy *= p.jumpCutScale;
    s.jumping = false;
  }
  if (vy >= 0 && !s.justJumped && !s.justAirJumped) s.jumping = false;

  vy = Math.min(vy, p.maxFallSpeed);
  s.vx = vx;
  s.vy = vy;
  s.gravityScale = vy > 0 ? p.fallGravityScale : 1;
  s.onGround = onGround;
  return s;
}

/** Distância horizontal máxima, em blocos, de um pulo em terreno plano correndo. */
export function maxJumpDistanceTiles(p: MovementParams): number {
  const rise = p.jumpVelocity / p.gravity;
  const apex = (p.jumpVelocity * p.jumpVelocity) / (2 * p.gravity);
  const fall = Math.sqrt((2 * apex) / (p.gravity * p.fallGravityScale));
  return (p.runSpeed * (rise + fall)) / TILE;
}

/** Altura máxima do pulo, em blocos. */
export function maxJumpHeightTiles(p: MovementParams): number {
  return (p.jumpVelocity * p.jumpVelocity) / (2 * p.gravity) / TILE;
}

export type PlayerAnimation =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'hurt'
  | 'dead'
  | 'victory'
  | 'attack';

export interface AnimationContext {
  onGround: boolean;
  vx: number;
  vy: number;
  landTimer: number;
  hurt: boolean;
  dead: boolean;
  victory: boolean;
  attacking: boolean;
}

export function deriveAnimation(c: AnimationContext, p: MovementParams): PlayerAnimation {
  if (c.dead) return 'dead';
  if (c.victory) return 'victory';
  if (c.hurt) return 'hurt';
  if (c.attacking) return 'attack';
  if (!c.onGround) return c.vy < 0 ? 'jump' : 'fall';
  if (c.landTimer > 0) return 'land';
  const speed = Math.abs(c.vx);
  if (speed < p.walkSpeed * 0.1) return 'idle';
  return speed > p.walkSpeed * 1.15 ? 'run' : 'walk';
}
