import { describe, expect, it } from 'vitest';
import { LEVEL_1_1 } from '../src/levels/data/world1';
import { isBreakable, TileGrid } from '../src/levels/TileGrid';
import type { LevelData, MovingPlatformSpec } from '../src/levels/types';
import { validateLevel } from '../src/levels/validateLevel';
import { BARA_PARAMS, maxJumpDistanceTiles, ZION_PARAMS } from '../src/systems/movement';
import { platformMaxSpeed, platformOffset, platformPosition, platformSweptCells } from '../src/systems/movingPlatform';

const spec = (over: Partial<MovingPlatformSpec> = {}): MovingPlatformSpec => ({ x: 10, y: 9, w: 3, axis: 'x', range: 6, period: 8, ...over });
const maxGapTiles = Math.floor(Math.min(maxJumpDistanceTiles(ZION_PARAMS), maxJumpDistanceTiles(BARA_PARAMS))) - 1;

describe('movimento das plataformas', () => {
  it('começa no ponto inicial, chega ao fim na metade do ciclo e volta', () => {
    const m = spec();
    expect(platformOffset(m, 0)).toBeCloseTo(0, 6);
    expect(platformOffset(m, 4)).toBeCloseTo(6, 6);
    expect(platformOffset(m, 8)).toBeCloseTo(0, 6);
  });

  it('é periódico e nunca sai do intervalo [0, range]', () => {
    const m = spec({ phase: 0.3 });
    for (let t = 0; t < 40; t += 0.37) {
      const o = platformOffset(m, t);
      expect(o).toBeGreaterThanOrEqual(-1e-9);
      expect(o).toBeLessThanOrEqual(m.range + 1e-9);
      expect(platformOffset(m, t + m.period)).toBeCloseTo(o, 6);
    }
  });

  it('a fase desloca o início do ciclo', () => {
    expect(platformOffset(spec({ phase: 0.5 }), 0)).toBeCloseTo(6, 6);
  });

  it('eixo x vai para a direita; eixo y sobe', () => {
    const x = platformPosition(spec({ axis: 'x' }), 4);
    expect(x).toEqual({ x: 16, y: 9 });
    const y = platformPosition(spec({ axis: 'y', y: 8, range: 4 }), 4);
    expect(y.x).toBe(10);
    expect(y.y).toBeCloseTo(4, 6);
  });

  it('desacelera nas pontas (velocidade quase zero ao embarcar)', () => {
    const m = spec();
    const v = (t: number) => Math.abs(platformOffset(m, t + 0.01) - platformOffset(m, t)) / 0.01;
    expect(v(0)).toBeLessThan(0.05);
    expect(v(2)).toBeCloseTo(platformMaxSpeed(m), 1);
  });

  it('as células varridas cobrem todo o trajeto', () => {
    const horiz = platformSweptCells(spec({ x: 10, y: 9, w: 3, range: 6 }));
    expect(horiz).toHaveLength(9);
    expect(horiz.every((c) => c.row === 9)).toBe(true);
    expect(Math.min(...horiz.map((c) => c.col))).toBe(10);
    expect(Math.max(...horiz.map((c) => c.col))).toBe(18);
    const vert = platformSweptCells(spec({ axis: 'y', x: 5, y: 8, w: 2, range: 4 }));
    expect(vert).toHaveLength(10);
    expect(Math.min(...vert.map((c) => c.row))).toBe(4);
    expect(Math.max(...vert.map((c) => c.row))).toBe(8);
  });
});

describe('blocos quebráveis', () => {
  it('só tijolo é quebrável', () => {
    expect(isBreakable('brick')).toBe(true);
    for (const k of ['stone', 'surprise', 'ground', 'platform'] as const) expect(isBreakable(k)).toBe(false);
    expect(isBreakable(undefined)).toBe(false);
  });

  it('remover um tijolo libera a célula para a IA e a física', () => {
    const grid = new TileGrid(LEVEL_1_1);
    expect(grid.isSolid(7, 6)).toBe(true);
    expect(grid.removeCell(7, 6)).toBe(true);
    expect(grid.isSolid(7, 6)).toBe(false);
    expect(grid.kindAt(7, 6)).toBeUndefined();
    expect(grid.removeCell(7, 6)).toBe(false);
  });
});

describe('validação com plataformas móveis', () => {
  const withGap = (movingPlatforms: MovingPlatformSpec[]): LevelData => ({
    ...LEVEL_1_1,
    ground: [
      { from: 0, to: 20 },
      { from: 32, to: 129 },
    ],
    platforms: [],
    blocks: [],
    coins: [],
    enemies: [],
    spikes: [],
    checkpoints: [],
    movingPlatforms,
    pipes: [],
    doors: [],
    rooms: [],
    widthTiles: 130,
    mainWidthTiles: 130,
  });

  it('a fase 1-1 tem um vão maior que o salto, coberto por uma ponte móvel', () => {
    const gaps = LEVEL_1_1.ground.slice(1).map((s, i) => s.from - LEVEL_1_1.ground[i]!.to - 1);
    expect(Math.max(...gaps)).toBeGreaterThan(maxGapTiles);
    expect(validateLevel(LEVEL_1_1, { maxGapTiles })).toEqual([]);
  });

  it('um vão grande sem ponte é rejeitado', () => {
    expect(validateLevel(withGap([]), { maxGapTiles }).some((e) => e.includes('vão'))).toBe(true);
  });

  it('uma ponte que encosta nas duas bordas torna o vão válido', () => {
    // vão de 11 blocos (21..31): a ponte cobre de 21 até 21 + 8 + 3 = 32
    const bridge = spec({ x: 21, y: 9, w: 3, range: 8, period: 9 });
    expect(validateLevel(withGap([bridge]), { maxGapTiles })).toEqual([]);
  });

  it('uma ponte curta demais, fora da altura do terreno ou vertical não conta', () => {
    const errs = (m: MovingPlatformSpec) => validateLevel(withGap([m]), { maxGapTiles }).some((e) => e.includes('vão'));
    expect(errs(spec({ x: 21, y: 9, w: 3, range: 4, period: 9 }))).toBe(true);
    expect(errs(spec({ x: 21, y: 7, w: 3, range: 8, period: 9 }))).toBe(true);
    expect(errs(spec({ x: 21, y: 9, w: 3, range: 8, period: 9, axis: 'y' }))).toBe(true);
  });

  it('rejeita trajeto que atravessa terreno, parâmetros inválidos e plataforma rápida demais', () => {
    const through = validateLevel(withGap([spec({ x: 15, y: 9, w: 3, range: 6, period: 8 })]), { maxGapTiles });
    expect(through.some((e) => e.includes('atravessa'))).toBe(true);
    expect(validateLevel(withGap([spec({ x: 21, range: 0, period: 8 })]), { maxGapTiles }).some((e) => e.includes('range'))).toBe(true);
    expect(validateLevel(withGap([spec({ x: 21, range: 8, period: 0 })]), { maxGapTiles }).some((e) => e.includes('period'))).toBe(true);
    expect(validateLevel(withGap([spec({ x: 21, range: 8, period: 2 })]), { maxGapTiles }).some((e) => e.includes('rápida'))).toBe(true);
    expect(validateLevel(withGap([spec({ x: 21, range: 8, period: 9, phase: 1.2 })]), { maxGapTiles }).some((e) => e.includes('phase'))).toBe(true);
  });

  it('o trajeto não pode sair do mundo', () => {
    const errs = validateLevel(withGap([spec({ x: 21, y: 1, w: 2, axis: 'y', range: 5, period: 9 })]), { maxGapTiles });
    expect(errs.some((e) => e.includes('sai do mundo'))).toBe(true);
  });
});
