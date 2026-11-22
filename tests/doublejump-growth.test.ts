import { nextCrouch } from '../src/systems/movement';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { createMovementState, NEUTRAL_INPUT, stepMovement, ZION_PARAMS, BARA_PARAMS, type MovementState } from '../src/systems/movement';
import { BIG_HP, START_HP, Vitality } from '../src/systems/vitality';

const press = { ...NEUTRAL_INPUT, jumpPressed: true, jumpHeld: true };
const held = { ...NEUTRAL_INPUT, jumpHeld: true };

function airborne(p = ZION_PARAMS): MovementState {
  let s = createMovementState();
  s = stepMovement(s, NEUTRAL_INPUT, 1 / 60, p, true, 0, 0);
  s = stepMovement(s, press, 1 / 60, p, true, 0, 0); // pulo normal
  // sobe e deixa o coyote expirar
  for (let i = 0; i < 12; i++) s = stepMovement(s, held, 1 / 60, p, false, 0, s.vy);
  return s;
}

describe('pulo duplo', () => {
  for (const [nome, p] of [['Zion', ZION_PARAMS], ['Bara', BARA_PARAMS]] as const) {
    it(`${nome}: um pulo extra no ar, mais fraco que o primeiro`, () => {
      const s = airborne(p);
      const r = stepMovement(s, press, 1 / 60, p, false, 0, s.vy);
      expect(r.justAirJumped).toBe(true);
      expect(r.vy).toBeCloseTo(-p.jumpVelocity * p.airJumpScale);
      expect(r.airJumpsLeft).toBe(0);
      expect(p.airJumpScale).toBeLessThan(1);
    });
    it(`${nome}: não há terceiro pulo`, () => {
      let s = airborne(p);
      s = stepMovement(s, press, 1 / 60, p, false, 0, s.vy);
      const r = stepMovement(s, press, 1 / 60, p, false, 0, s.vy);
      expect(r.justAirJumped).toBe(false);
    });
  }

  it('o pulo extra volta ao tocar o chão', () => {
    let s = airborne();
    s = stepMovement(s, press, 1 / 60, ZION_PARAMS, false, 0, s.vy);
    s = stepMovement(s, NEUTRAL_INPUT, 1 / 60, ZION_PARAMS, true, 0, 0);
    expect(s.airJumpsLeft).toBe(ZION_PARAMS.airJumps);
  });

  it('no chão o primeiro pulo é normal, não consome o pulo extra', () => {
    let s = createMovementState();
    s = stepMovement(s, NEUTRAL_INPUT, 1 / 60, ZION_PARAMS, true, 0, 0);
    const r = stepMovement(s, press, 1 / 60, ZION_PARAMS, true, 0, 0);
    expect(r.justJumped).toBe(true);
    expect(r.justAirJumped).toBe(false);
    expect(r.airJumpsLeft).toBe(1);
  });

  it('alcança mais longe e mais alto que um pulo simples', () => {
    const height = (double: boolean): number => {
      let s = createMovementState();
      let y = 0, vy = 0, peak = 0;
      s = stepMovement(s, NEUTRAL_INPUT, 1 / 60, ZION_PARAMS, true, 0, 0);
      s = stepMovement(s, press, 1 / 60, ZION_PARAMS, true, 0, 0);
      vy = s.vy;
      for (let i = 0; i < 400; i++) {
        const input = double && i === 25 ? press : held;
        s = stepMovement(s, input, 1 / 60, ZION_PARAMS, false, 0, vy);
        vy = s.vy + ZION_PARAMS.gravity * s.gravityScale * (1 / 60);
        y += vy / 60;
        peak = Math.min(peak, y);
        if (y > 0 && i > 30) break;
      }
      return -peak;
    };
    expect(height(true)).toBeGreaterThan(height(false) * 1.3);
  });
});

describe('tamanho e crescimento', () => {
  it('começa pequeno (1 coração) e a fruta faz crescer', () => {
    const v = new Vitality(3);
    v.reset(START_HP);
    expect(v.hp).toBe(1);
    expect(v.isBig).toBe(false);
    v.grow();
    expect(v.hp).toBe(BIG_HP);
    expect(v.isBig).toBe(true);
  });
  it('crescer não reduz quem já tem mais corações', () => {
    const v = new Vitality(3);
    expect(v.hp).toBe(3);
    v.grow();
    expect(v.hp).toBe(3);
  });
  it('grande leva um golpe e volta a ser pequeno; pequeno morre', () => {
    const v = new Vitality(3);
    v.reset(2);
    expect(v.hit()).toBe('hurt');
    expect(v.isBig).toBe(false);
    v.update(5);
    expect(v.hit()).toBe('dead');
  });
  it('coração também faz o pequeno crescer', () => {
    const v = new Vitality(3);
    v.reset(1);
    v.heal(1);
    expect(v.isBig).toBe(true);
  });
  it('morto não cresce', () => {
    const v = new Vitality(3);
    v.kill();
    v.grow();
    expect(v.hp).toBe(0);
  });
});

describe('fruta nas fases', () => {
  it('toda fase de percurso tem uma Fruta de Baraúna perto do início; arenas também', () => {
    for (const level of Object.values(LEVELS)) {
      const grow = level.blocks.find((b) => b.reward === 'grow');
      expect(grow, level.id).toBeDefined();
      expect(grow!.x).toBeLessThan(15);
    }
  });
});

describe('agachar', () => {
  it('só agacha no chão com ↓ segurado e continua agachado sem espaço para levantar', () => {
    expect(nextCrouch(false, true, true, false)).toBe(true);
    expect(nextCrouch(false, false, true, false)).toBe(false);
    expect(nextCrouch(true, true, false, false)).toBe(false);
    expect(nextCrouch(true, true, false, true)).toBe(true);
    expect(nextCrouch(true, false, false, true)).toBe(false);
  });
});
