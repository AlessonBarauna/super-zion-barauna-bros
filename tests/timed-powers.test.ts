import { describe, expect, it } from 'vitest';
import { BASE_ZION_PARAMS, createMovementState, stepMovement, type MovementInput } from '../src/systems/movement';
import { TIMED_POWERS, TimedPowerState } from '../src/systems/timedPowers';

const air: MovementInput = { moveX: 0, run: false, jumpPressed: false, jumpHeld: false };

describe('poderes temporários', () => {
  it('dura o tempo definido e depois some', () => {
    const t = new TimedPowerState();
    t.collect('estrela');
    expect(t.has('estrela')).toBe(true);
    t.update(TIMED_POWERS.estrela.duration - 0.1);
    expect(t.has('estrela')).toBe(true);
    expect(t.fraction).toBeGreaterThan(0);
    t.update(0.2);
    expect(t.id).toBeNull();
    expect(t.fraction).toBe(0);
  });
  it('pegar outro poder troca e reinicia o tempo', () => {
    const t = new TimedPowerState();
    t.collect('estrela');
    t.update(5);
    t.collect('asas');
    expect(t.has('asas')).toBe(true);
    expect(t.left).toBe(TIMED_POWERS.asas.duration);
  });
});

describe('asas (voar)', () => {
  const p = BASE_ZION_PARAMS;
  it('permite bater asas várias vezes no ar, sem limite de pulos', () => {
    let s = createMovementState();
    // no ar, já sem pulos extras e sem coyote
    s = { ...s, onGround: false, coyote: 0, airJumpsLeft: 0 };
    const flap = stepMovement(s, { ...air, jumpPressed: true, jumpHeld: true }, 1 / 60, p, false, 0, 200, true);
    expect(flap.justAirJumped).toBe(true);
    expect(flap.vy).toBeLessThan(0);
    const again = stepMovement({ ...flap, coyote: 0, airJumpsLeft: 0 }, { ...air, jumpPressed: true, jumpHeld: true }, 1 / 60, p, false, 0, 100, true);
    expect(again.justAirJumped).toBe(true);
  });
  it('sem asas, sem pulos extras, não bate asas', () => {
    const s = { ...createMovementState(), onGround: false, coyote: 0, airJumpsLeft: 0 };
    const r = stepMovement(s, { ...air, jumpPressed: true, jumpHeld: true }, 1 / 60, p, false, 0, 200, false);
    expect(r.justAirJumped).toBe(false);
  });
  it('segurar o pulo planando limita a velocidade de queda', () => {
    const s = { ...createMovementState(), onGround: false, coyote: 0, airJumpsLeft: 0 };
    const glide = stepMovement(s, { ...air, jumpHeld: true }, 1 / 60, p, false, 0, p.maxFallSpeed, true);
    const fall = stepMovement(s, { ...air, jumpHeld: false }, 1 / 60, p, false, 0, p.maxFallSpeed, true);
    expect(glide.vy).toBeLessThan(fall.vy);
  });
});
