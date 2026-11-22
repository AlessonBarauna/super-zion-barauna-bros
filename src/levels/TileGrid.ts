import type { LevelData } from './types';

export type CellKind = 'ground' | 'platform' | 'brick' | 'surprise' | 'stone' | 'pipe';

/** Só tijolos podem ser quebrados; pedra e terreno não. */
export const isBreakable = (kind: CellKind | undefined): boolean => kind === 'brick';

/** Grade de células sólidas de uma fase. Lógica pura, usada por IA, validação e construção. */
export class TileGrid {
  private readonly cells = new Map<string, CellKind>();

  constructor(readonly level: LevelData) {
    for (const seg of level.ground) {
      for (let col = seg.from; col <= seg.to; col++) {
        for (let row = level.groundRow; row < level.heightTiles; row++) {
          this.cells.set(TileGrid.key(col, row), 'ground');
        }
      }
    }
    for (const p of level.platforms) {
      for (let i = 0; i < p.w; i++) this.cells.set(TileGrid.key(p.x + i, p.y), 'platform');
    }
    for (const b of level.blocks) this.cells.set(TileGrid.key(b.x, b.y), b.kind);
    for (const pipe of level.pipes) {
      for (let dx = 0; dx < 2; dx++) {
        for (let h = 1; h <= pipe.h; h++) this.cells.set(TileGrid.key(pipe.x + dx, level.groundRow - h), 'pipe');
      }
    }
  }

  static key(col: number, row: number): string {
    return `${col},${row}`;
  }

  kindAt(col: number, row: number): CellKind | undefined {
    return this.cells.get(TileGrid.key(col, row));
  }

  /** Paredes laterais do mundo contam como sólidas; abaixo do mundo não há chão. */
  isSolid(col: number, row: number): boolean {
    if (col < 0 || col >= this.level.widthTiles) return true;
    return this.cells.has(TileGrid.key(col, row));
  }

  /** Remove uma célula (bloco quebrado). Retorna false se não havia nada ali. */
  removeCell(col: number, row: number): boolean {
    return this.cells.delete(TileGrid.key(col, row));
  }

  entries(): IterableIterator<[string, CellKind]> {
    return this.cells.entries();
  }
}
