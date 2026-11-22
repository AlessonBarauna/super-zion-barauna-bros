import { describe, expect, it } from 'vitest';
import { THEME_DECOR } from '../src/art/themeArt';
import { layersForTheme } from '../src/art/backgroundArt';
import { WORLDS } from '../src/levels/generator';
import { LEVELS } from '../src/levels/index';

const stage = (w: number, s: number) => LEVELS[`${w}-${s}`]!;

describe('identidade e dificuldade dos mundos', () => {
  it('todo mundo fora do 1 tem cenário e fundo próprios', () => {
    for (const w of WORLDS.filter((x) => x.theme !== 'oliveiras')) {
      expect(THEME_DECOR[w.theme], w.theme).toBeDefined();
      expect(layersForTheme(w.theme).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('os mundos jogam diferente: espinhos nas cavernas/selva, pontes nas engrenagens, vãos no deserto', () => {
    const total = (w: number, f: (l: (typeof LEVELS)[string]) => number) => [1, 2, 3].reduce((a, s) => a + f(stage(w, s)), 0);
    expect(total(5, (l) => l.spikes.length)).toBeGreaterThan(total(3, (l) => l.spikes.length) + 20);
    expect(total(6, (l) => l.movingPlatforms.length)).toBeGreaterThan(total(1, (l) => l.movingPlatforms.length));
    expect(total(3, (l) => l.ground.length)).toBeGreaterThan(total(1, (l) => l.ground.length));
  });

  it('a dificuldade cresce: mais inimigos nos mundos finais do que no primeiro', () => {
    const enemies = (w: number) => [1, 2, 3].reduce((a, s) => a + stage(w, s).enemies.length, 0);
    expect(enemies(8)).toBeGreaterThan(enemies(1));
    expect(enemies(4)).toBeGreaterThan(enemies(1));
  });

  it('a fase 1-1 tem mais obstáculos que antes (pares de espinhos além dos originais)', () => {
    expect(stage(1, 1).spikes.length).toBeGreaterThanOrEqual(8);
  });
});
