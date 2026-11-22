import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { validateLevel } from '../src/levels/validateLevel';
import { CAVE_LAYOUT_COUNT, HOUSE_LAYOUT_COUNT } from '../src/levels/rooms';
import type { LevelData } from '../src/levels/types';

const withRooms: LevelData[] = Object.values(LEVELS).filter((l) => l.rooms.length > 0);

/** Assinatura do conteúdo de uma sala (relativa à sua coluna inicial). */
function signature(level: LevelData, room: LevelData['rooms'][number]): string {
  const inside = (x: number): boolean => x >= room.x && x < room.x + room.w;
  const rel = <T extends { x: number }>(items: T[]): T[] => items.filter((i) => inside(i.x)).map((i) => ({ ...i, x: i.x - room.x }));
  const sort = (a: { x: number; y?: number }, b: { x: number; y?: number }): number => a.x - b.x || (a.y ?? 0) - (b.y ?? 0);
  return JSON.stringify({
    kind: room.kind,
    blocks: rel(level.blocks).sort(sort),
    platforms: rel(level.platforms).sort(sort),
    coins: rel(level.coins).sort(sort),
  });
}

describe('túneis de cano', () => {
  it('as fases com sala passam na validação (inclui: saída em outro cano à frente)', () => {
    for (const l of withRooms) expect(validateLevel(l, { maxGapTiles: 4 }), l.id).toEqual([]);
  });

  it('o cano de entrada leva a uma sala e a saída reaparece em cima de outro cano, 12+ blocos à frente', () => {
    for (const l of withRooms) {
      const entries = l.pipes.filter((p) => p.to && l.rooms.some((r) => p.to!.x >= r.x && p.to!.x < r.x + r.w) && !l.rooms.some((r) => p.x >= r.x && p.x < r.x + r.w));
      expect(entries.length, l.id).toBeGreaterThan(0);
      for (const e of entries) {
        const room = l.rooms.find((r) => e.to!.x >= r.x && e.to!.x < r.x + r.w)!;
        const exit = l.pipes.find((p) => p.to && p.x >= room.x && p.x < room.x + room.w)!;
        const target = l.pipes.find((p) => p.x === exit.to!.x && l.groundRow - p.h - 1 === exit.to!.y);
        expect(target, l.id).toBeDefined();
        expect(target!.x, l.id).toBeGreaterThanOrEqual(e.x + 12);
      }
    }
  });

  it('nenhuma sala secreta repete o conteúdo de outra, em nenhuma fase', () => {
    const seen = new Map<string, string>();
    for (const l of withRooms) {
      for (const r of l.rooms) {
        const sig = signature(l, r);
        const other = seen.get(sig);
        expect(other, `${l.id} (${r.kind}) repete ${other}`).toBeUndefined();
        seen.set(sig, `${l.id} (${r.kind})`);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(40);
  });

  it('há bastante variedade de desenhos', () => {
    expect(CAVE_LAYOUT_COUNT).toBeGreaterThanOrEqual(16);
    expect(HOUSE_LAYOUT_COUNT).toBeGreaterThanOrEqual(6);
  });
});
