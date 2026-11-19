import { TileGrid } from './TileGrid';
import type { LevelData, TilePoint } from './types';

export interface ValidationOptions {
  /** Maior vão (em blocos) que o jogador consegue atravessar. */
  maxGapTiles: number;
}

/** Retorna a lista de problemas encontrados. Lista vazia = fase válida. */
export function validateLevel(level: LevelData, opts: ValidationOptions): string[] {
  const errors: string[] = [];
  const grid = new TileGrid(level);
  const inBounds = (p: TilePoint): boolean =>
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.x < level.widthTiles &&
    p.y >= 0 &&
    p.y < level.heightTiles;

  const checkPoints = (label: string, points: TilePoint[], needsGround: boolean): void => {
    points.forEach((p, i) => {
      const name = `${label}[${i}]@${p.x},${p.y}`;
      if (!inBounds(p)) {
        errors.push(`${name}: fora dos limites`);
        return;
      }
      if (grid.isSolid(p.x, p.y)) errors.push(`${name}: dentro de uma célula sólida`);
      if (needsGround && !grid.isSolid(p.x, p.y + 1)) errors.push(`${name}: sem chão embaixo`);
    });
  };

  checkPoints('spawn', [level.spawn], true);
  checkPoints('goal', [level.goal], true);
  checkPoints('checkpoint', level.checkpoints, true);
  checkPoints('enemy', level.enemies, true);
  checkPoints('spike', level.spikes, true);
  checkPoints('coin', level.coins, false);

  level.blocks.forEach((b, i) => {
    if (!inBounds(b)) errors.push(`block[${i}]@${b.x},${b.y}: fora dos limites`);
    if (b.reward && b.kind !== 'surprise') errors.push(`block[${i}]@${b.x},${b.y}: só blocos surpresa têm recompensa`);
  });
  level.platforms.forEach((p, i) => {
    if (!inBounds(p) || p.x + p.w > level.widthTiles || p.w < 1) {
      errors.push(`platform[${i}]@${p.x},${p.y}: fora dos limites`);
    }
  });

  // Sobreposição entre blocos, plataformas e terreno.
  const seen = new Set<string>();
  const claim = (label: string, col: number, row: number): void => {
    const key = TileGrid.key(col, row);
    if (seen.has(key)) errors.push(`${label}@${key}: sobreposto a outro elemento sólido`);
    seen.add(key);
  };
  for (const seg of level.ground) {
    for (let c = seg.from; c <= seg.to; c++) claim('ground', c, level.groundRow);
  }
  level.platforms.forEach((p) => {
    for (let i = 0; i < p.w; i++) claim('platform', p.x + i, p.y);
  });
  level.blocks.forEach((b) => claim(`block:${b.kind}`, b.x, b.y));

  // Vãos intransponíveis.
  const segs = [...level.ground].sort((a, b) => a.from - b.from);
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const next = segs[i];
    if (!prev || !next) continue;
    const gap = next.from - prev.to - 1;
    if (gap > opts.maxGapTiles) {
      errors.push(`vão de ${gap} blocos entre ${prev.to} e ${next.from} excede o máximo de ${opts.maxGapTiles}`);
    }
  }

  // Ordem lógica.
  if (level.goal.x <= level.spawn.x) errors.push('a meta precisa ficar à direita do início');
  for (const c of level.checkpoints) {
    if (c.x <= level.spawn.x || c.x >= level.goal.x) errors.push(`checkpoint@${c.x}: fora do trecho entre início e meta`);
  }
  if (level.timeLimit <= 0) errors.push('timeLimit deve ser positivo');

  return errors;
}
