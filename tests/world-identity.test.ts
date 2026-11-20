import { describe, expect, it } from 'vitest';
import { THEME_DECOR } from '../src/art/themeArt';
import { layersForTheme } from '../src/art/backgroundArt';
import { WORLDS, generateLevel } from '../src/levels/generator';
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

describe('justiça das fases geradas', () => {
  const landingsOf = (ground: Array<{ from: number; to: number }>): number[] => {
    const g = [...ground].sort((a, b) => a.from - b.from);
    return g.flatMap((seg, i) => (g[i - 1] && seg.from > g[i - 1]!.to + 1 ? [seg.from] : []));
  };

  it('nenhum inimigo de chão nos 5 blocos depois de um vão ou ponte', () => {
    for (let w = 1; w <= 8; w++) {
      for (let st = 1; st <= 3; st++) {
        const level = generateLevel(w, st);
        const landings = landingsOf(level.ground);
        for (const e of level.enemies) {
          if (e.kind === 'corvo-umbral') continue;
          for (const l of landings) expect(e.x >= l && e.x < l + 5, `${level.id} ${e.kind}@${e.x} pouso ${l}`).toBe(false);
        }
      }
    }
  });

  it('corvos não patrulham sobre o pouso (entrada do trecho + 3 blocos de patrulha)', () => {
    for (let w = 1; w <= 8; w++) {
      for (let st = 1; st <= 3; st++) {
        const level = generateLevel(w, st);
        for (const l of landingsOf(level.ground)) {
          for (const e of level.enemies) if (e.kind === 'corvo-umbral') expect(e.x - 3 >= l - 0.5 || e.x + 3 < l, `${level.id} corvo@${e.x} pouso ${l}`).toBe(true);
        }
      }
    }
  });
});

describe('canos por tema', () => {
  it('todo mundo (exceto o 1) tem paleta de cano própria e todas são diferentes', async () => {
    const { PIPE_PALETTES } = await import('../src/art/worldArt');
    const themes = WORLDS.map((w) => w.theme).filter((t) => t !== 'oliveiras');
    for (const t of themes) expect(PIPE_PALETTES[t], t).toBeDefined();
    const bases = Object.values(PIPE_PALETTES).map((p) => p.base);
    expect(new Set(bases).size).toBe(bases.length);
  });
});
