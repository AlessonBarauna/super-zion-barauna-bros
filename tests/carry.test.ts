import { describe, expect, it } from 'vitest';
import { captureCarry, carryFor } from '../src/systems/carry';
import { START_HP } from '../src/systems/vitality';

describe('poderes entre fases', () => {
  it('guarda tamanho e poder de quem terminou a fase', () => {
    const c = captureCarry([{ characterId: 'zion', dead: false, hp: 2, power: 'flor-de-fogo' }]);
    expect(carryFor(c, 'zion')).toEqual({ characterId: 'zion', hp: 2, power: 'flor-de-fogo' });
  });
  it('quem estava morto no cooperativo volta pequeno e sem poder', () => {
    const c = captureCarry([
      { characterId: 'zion', dead: false, hp: 3, power: 'flor-de-fogo' },
      { characterId: 'bara', dead: true, hp: 0, power: null },
    ]);
    expect(carryFor(c, 'bara')).toEqual({ characterId: 'bara', hp: START_HP, power: null });
    expect(carryFor(c, 'zion')!.power).toBe('flor-de-fogo');
  });
  it('sem carry (começou pelo mapa) não muda nada', () => {
    expect(carryFor(undefined, 'zion')).toBeUndefined();
  });
});
