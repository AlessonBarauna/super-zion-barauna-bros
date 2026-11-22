import { describe, expect, it } from 'vitest';
import { nextPowerDrop } from '../src/systems/powerDrop';

describe('bloco de poder', () => {
  it('pequeno ganha a fruta', () => expect(nextPowerDrop({ isBig: false, hasFire: false })).toBe('grow'));
  it('grande sem poder ganha a flor', () => expect(nextPowerDrop({ isBig: true, hasFire: false })).toBe('flor-de-fogo'));
  it('grande com poder ganha moeda (não precisa de outro)', () => expect(nextPowerDrop({ isBig: true, hasFire: true })).toBe('coin'));
  it('depois de perder tudo, volta a dar a fruta', () => {
    expect(nextPowerDrop({ isBig: true, hasFire: true })).toBe('coin');
    expect(nextPowerDrop({ isBig: false, hasFire: false })).toBe('grow');
  });
});
