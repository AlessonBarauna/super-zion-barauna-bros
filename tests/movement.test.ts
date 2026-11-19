import { describe, expect, it } from 'vitest';
import {
  createMovementState,
  deriveAnimation,
  maxJumpDistanceTiles,
  maxJumpHeightTiles,
  NEUTRAL_INPUT,
  stepMovement,
  ZION_PARAMS as P,
  type MovementInput,
  type MovementState,
} from '../src/systems/movement';

const DT = 1 / 60;
const right: MovementInput = { ...NEUTRAL_INPUT, moveX: 1 };

function run(
  s: MovementState,
  input: MovementInput,
  frames: number,
  onGround = true,
  vy = 0,
): MovementState {
  let cur = s;
  for (let i = 0; i < frames; i++) cur = stepMovement(cur, input, DT, P, onGround, cur.vx, onGround ? 0 : vy || cur.vy);
  return cur;
}

describe('movimentação horizontal', () => {
  it('acelera até a velocidade de caminhada e não passa dela', () => {
    const s = run(createMovementState(), right, 120);
    expect(s.vx).toBeCloseTo(P.walkSpeed, 5);
  });

  it('corre mais rápido que caminha', () => {
    const s = run(createMovementState(), { ...right, run: true }, 120);
    expect(s.vx).toBeCloseTo(P.runSpeed, 5);
    expect(s.vx).toBeGreaterThan(P.walkSpeed);
  });

  it('para rapidamente no chão ao soltar a direção (sem deslizar)', () => {
    const moving = run(createMovementState(), { ...right, run: true }, 120);
    const stopped = run(moving, NEUTRAL_INPUT, 20);
    expect(stopped.vx).toBe(0);
  });

  it('inverte a direção mais rápido do que acelera do zero', () => {
    const moving = run(createMovementState(), right, 120);
    const turning = stepMovement(moving, { ...NEUTRAL_INPUT, moveX: -1 }, DT, P, true, moving.vx, 0);
    const fromRest = stepMovement(createMovementState(), right, DT, P, true, 0, 0);
    expect(Math.abs(turning.vx - moving.vx)).toBeGreaterThan(Math.abs(fromRest.vx));
    expect(turning.facing).toBe(-1);
  });

  it('mantém mais momento no ar do que no chão ao soltar a direção', () => {
    const moving = run(createMovementState(), { ...right, run: true }, 120);
    const ground = stepMovement(moving, NEUTRAL_INPUT, DT, P, true, moving.vx, 0);
    const air = stepMovement(moving, NEUTRAL_INPUT, DT, P, false, moving.vx, 100);
    expect(air.vx).toBeGreaterThan(ground.vx);
  });
});

describe('pulo', () => {
  it('pula quando está no chão e o botão foi pressionado', () => {
    const s = stepMovement(createMovementState(), { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, true, 0, 0);
    expect(s.justJumped).toBe(true);
    expect(s.vy).toBe(-P.jumpVelocity);
  });

  it('não permite pulo duplo no ar (depois do coyote time)', () => {
    let s = stepMovement(createMovementState(), { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, true, 0, 0);
    for (let i = 0; i < 15; i++) s = stepMovement(s, { ...NEUTRAL_INPUT, jumpHeld: true }, DT, P, false, 0, -300);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, false, 0, -300);
    expect(s.justJumped).toBe(false);
  });

  it('coyote time permite pular logo depois de sair da borda', () => {
    let s = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, true, 0, 0);
    for (let i = 0; i < 3; i++) s = stepMovement(s, NEUTRAL_INPUT, DT, P, false, 0, 50);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, false, 0, 50);
    expect(s.justJumped).toBe(true);
  });

  it('coyote time expira', () => {
    let s = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, true, 0, 0);
    for (let i = 0; i < 12; i++) s = stepMovement(s, NEUTRAL_INPUT, DT, P, false, 0, 50);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, false, 0, 50);
    expect(s.justJumped).toBe(false);
  });

  it('jump buffer: pulo apertado um pouco antes de pousar é executado ao pousar', () => {
    let s = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, false, 0, 400);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, false, 0, 400);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpHeld: true }, DT, P, false, 0, 400);
    s = stepMovement(s, { ...NEUTRAL_INPUT, jumpHeld: true }, DT, P, true, 0, 0);
    expect(s.justJumped).toBe(true);
  });

  it('soltar o botão corta o pulo (altura variável)', () => {
    const jumped = stepMovement(createMovementState(), { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true }, DT, P, true, 0, 0);
    const held = stepMovement(jumped, { ...NEUTRAL_INPUT, jumpHeld: true }, DT, P, false, 0, jumped.vy);
    const released = stepMovement(jumped, NEUTRAL_INPUT, DT, P, false, 0, jumped.vy);
    expect(held.vy).toBe(jumped.vy);
    expect(released.vy).toBeCloseTo(jumped.vy * P.jumpCutScale, 5);
  });

  it('a queda usa gravidade mais pesada que a subida', () => {
    const rising = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, false, 0, -200);
    const falling = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, false, 0, 200);
    expect(rising.gravityScale).toBe(1);
    expect(falling.gravityScale).toBe(P.fallGravityScale);
  });

  it('limita a velocidade de queda', () => {
    const s = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, false, 0, P.maxFallSpeed * 3);
    expect(s.vy).toBe(P.maxFallSpeed);
  });

  it('registra pouso e a velocidade de impacto', () => {
    let s = stepMovement(createMovementState(), NEUTRAL_INPUT, DT, P, false, 0, 700);
    s = stepMovement(s, NEUTRAL_INPUT, DT, P, true, 0, 0);
    expect(s.justLanded).toBe(true);
    expect(s.impactSpeed).toBe(700);
  });

  it('o pulo cabe em ~3 blocos de altura e vence vãos de 4 blocos correndo', () => {
    expect(maxJumpHeightTiles(P)).toBeGreaterThan(2.8);
    expect(maxJumpHeightTiles(P)).toBeLessThan(4);
    expect(maxJumpDistanceTiles(P)).toBeGreaterThan(5);
  });
});

describe('animação derivada', () => {
  const base = { onGround: true, vx: 0, vy: 0, landTimer: 0, hurt: false, dead: false, victory: false, attacking: false };
  it('escolhe o estado conforme a física', () => {
    expect(deriveAnimation(base, P)).toBe('idle');
    expect(deriveAnimation({ ...base, vx: P.walkSpeed }, P)).toBe('walk');
    expect(deriveAnimation({ ...base, vx: P.runSpeed }, P)).toBe('run');
    expect(deriveAnimation({ ...base, onGround: false, vy: -100 }, P)).toBe('jump');
    expect(deriveAnimation({ ...base, onGround: false, vy: 100 }, P)).toBe('fall');
    expect(deriveAnimation({ ...base, landTimer: 0.1 }, P)).toBe('land');
    expect(deriveAnimation({ ...base, attacking: true, vx: P.runSpeed }, P)).toBe('attack');
    expect(deriveAnimation({ ...base, attacking: true, hurt: true }, P)).toBe('hurt');
  });
  it('morte, vitória e dano têm prioridade', () => {
    expect(deriveAnimation({ ...base, dead: true, hurt: true }, P)).toBe('dead');
    expect(deriveAnimation({ ...base, victory: true, onGround: false }, P)).toBe('victory');
    expect(deriveAnimation({ ...base, hurt: true, vx: P.runSpeed }, P)).toBe('hurt');
  });
});
