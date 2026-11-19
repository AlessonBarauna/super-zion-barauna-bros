import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { LEVEL_1_1 } from '../src/levels/data/world1';
import { TileGrid } from '../src/levels/TileGrid';
import { validateLevel } from '../src/levels/validateLevel';
import { maxJumpDistanceTiles, ZION_PARAMS } from '../src/systems/movement';
import type { LevelData } from '../src/levels/types';

const maxGapTiles = Math.floor(maxJumpDistanceTiles(ZION_PARAMS)) - 1;

describe('fases orientadas a dados', () => {
  it('todas as fases registradas são válidas e atravessáveis pela física real do Zion', () => {
    for (const level of Object.values(LEVELS)) {
      expect(validateLevel(level, { maxGapTiles }), level.id).toEqual([]);
    }
  });

  it('a fase 1-1 tem o tamanho e os elementos esperados', () => {
    expect(LEVEL_1_1.name).toBe('Vila das Oliveiras');
    expect(LEVEL_1_1.widthTiles).toBeGreaterThanOrEqual(100);
    expect(LEVEL_1_1.coins.length).toBeGreaterThan(30);
    expect(LEVEL_1_1.enemies.length).toBeGreaterThan(5);
    expect(LEVEL_1_1.checkpoints.length).toBeGreaterThanOrEqual(1);
  });

  it('detecta vão grande demais, item sem chão e sobreposição', () => {
    const bad: LevelData = {
      ...LEVEL_1_1,
      ground: [
        { from: 0, to: 10 },
        { from: 30, to: 129 },
      ],
      enemies: [{ kind: 'cogumelo-sombrio', x: 20, y: 8 }],
      blocks: [{ kind: 'brick', x: 5, y: 6 }],
      platforms: [{ x: 5, y: 6, w: 2 }],
    };
    const errors = validateLevel(bad, { maxGapTiles }).join('\n');
    expect(errors).toMatch(/vão de 19 blocos/);
    expect(errors).toMatch(/enemy\[0\].*sem chão/);
    expect(errors).toMatch(/sobreposto/);
  });

  it('detecta meta antes do início', () => {
    const bad: LevelData = { ...LEVEL_1_1, goal: { x: 1, y: 8 } };
    expect(validateLevel(bad, { maxGapTiles }).join('\n')).toMatch(/meta/);
  });
});

describe('TileGrid', () => {
  const grid = new TileGrid(LEVEL_1_1);
  it('reconhece terreno, abismos e paredes do mundo', () => {
    expect(grid.isSolid(0, LEVEL_1_1.groundRow)).toBe(true);
    expect(grid.isSolid(36, LEVEL_1_1.groundRow)).toBe(false);
    expect(grid.isSolid(-1, 0)).toBe(true);
    expect(grid.isSolid(LEVEL_1_1.widthTiles, 0)).toBe(true);
  });
  it('reconhece blocos e plataformas', () => {
    expect(grid.kindAt(8, 6)).toBe('surprise');
    expect(grid.kindAt(14, 6)).toBe('platform');
    expect(grid.kindAt(113, 5)).toBe('stone');
  });
});
