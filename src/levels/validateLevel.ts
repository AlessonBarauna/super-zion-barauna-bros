import { platformMaxSpeed, platformSweptCells } from '../systems/movingPlatform';
import { TileGrid } from './TileGrid';
import { FLYING_ENEMIES, type LevelData, type TilePoint } from './types';

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
  checkPoints('enemy', level.enemies.filter((e) => !FLYING_ENEMIES.includes(e.kind)), true);
  checkPoints('enemy-voador', level.enemies.filter((e) => FLYING_ENEMIES.includes(e.kind)), false);
  if (level.boss) checkPoints('boss', [level.boss], true);
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

  level.movingPlatforms.forEach((m, i) => {
    const name = `movingPlatform[${i}]@${m.x},${m.y}`;
    if (!inBounds(m) || m.w < 1 || m.x + m.w > level.widthTiles) errors.push(`${name}: fora dos limites`);
    if (!(m.range > 0)) errors.push(`${name}: range deve ser positivo`);
    if (!(m.period > 0)) errors.push(`${name}: period deve ser positivo`);
    if (m.phase !== undefined && (m.phase < 0 || m.phase >= 1)) errors.push(`${name}: phase deve estar em [0, 1)`);
    if (m.period > 0 && m.range > 0 && platformMaxSpeed(m) > 6) errors.push(`${name}: rápida demais para embarcar`);
    for (const { col, row } of platformSweptCells(m)) {
      if (row < 0 || row >= level.heightTiles || col < 0 || col >= level.widthTiles) {
        errors.push(`${name}: o trajeto sai do mundo`);
        break;
      }
      if (grid.isSolid(col, row)) {
        errors.push(`${name}: o trajeto atravessa uma célula sólida em ${col},${row}`);
        break;
      }
    }
  });

  // Um vão grande só é válido se uma plataforma móvel horizontal, na altura do terreno,
  // encosta nas duas bordas (início junto ao terreno anterior e fim junto ao próximo).
  const isBridged = (prevTo: number, nextFrom: number): boolean =>
    level.movingPlatforms.some(
      (m) => m.axis === 'x' && m.y === level.groundRow && m.x <= prevTo + 1 && m.x + m.range + m.w >= nextFrom,
    );

  // Vãos intransponíveis.
  const mainWidth = level.mainWidthTiles ?? level.widthTiles;
  const segs = [...level.ground].sort((a, b) => a.from - b.from);
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const next = segs[i];
    if (!prev || !next) continue;
    const gap = next.from - prev.to - 1;
    // Salas secretas ficam isoladas do trecho principal: não há travessia a pé entre elas.
    if (mainWidth <= next.from && prev.to < mainWidth) continue;
    if (gap >= 20) continue;
    if (gap > opts.maxGapTiles && !isBridged(prev.to, next.from)) {
      errors.push(`vão de ${gap} blocos entre ${prev.to} e ${next.from} excede o máximo de ${opts.maxGapTiles}`);
    }
  }

  // Canos, portas e salas secretas.
  const standable = (name: string, p: TilePoint): void => {
    if (!inBounds(p)) errors.push(`${name}: destino fora dos limites`);
    else {
      if (grid.isSolid(p.x, p.y)) errors.push(`${name}: destino dentro de uma célula sólida`);
      if (!grid.isSolid(p.x, p.y + 1)) errors.push(`${name}: destino sem chão embaixo`);
    }
  };
  const inRoom = (col: number): boolean => level.rooms.some((r) => col >= r.x && col < r.x + r.w);
  level.pipes.forEach((pipe, i) => {
    const name = `pipe[${i}]@${pipe.x}`;
    if (pipe.h < 2 || pipe.h > 3) errors.push(`${name}: altura deve ser 2 ou 3`);
    for (let dx = 0; dx < 2; dx++) {
      if (!grid.isSolid(pipe.x + dx, level.groundRow)) errors.push(`${name}: sem chão embaixo`);
      for (let h = 1; h <= pipe.h; h++) claim('pipe', pipe.x + dx, level.groundRow - h);
    }
    if (pipe.to) standable(`${name} destino`, pipe.to);
  });
  level.doors.forEach((d, i) => {
    const name = `door[${i}]@${d.x}`;
    if (!grid.isSolid(d.x, level.groundRow)) errors.push(`${name}: sem chão embaixo`);
    standable(`${name} destino`, d.to);
  });
  level.rooms.forEach((r, i) => {
    const name = `room[${i}]@${r.x}`;
    if (r.x < mainWidth) errors.push(`${name}: a sala precisa ficar à direita da fase principal`);
    if (r.x + r.w > level.widthTiles) errors.push(`${name}: fora dos limites`);
    if (r.w * 60 < 1280) errors.push(`${name}: estreita demais para preencher a tela`);
    const warps = [...level.pipes.map((p) => ({ x: p.x, to: p.to })), ...level.doors.map((d) => ({ x: d.x, to: d.to as TilePoint | undefined }))];
    const here = (col: number): boolean => col >= r.x && col < r.x + r.w;
    const exits = warps.filter((w) => w.to && here(w.x) && !inRoom(w.to.x));
    if (exits.length === 0) errors.push(`${name}: sem saída de volta para a fase`);
    const entries = warps.filter((w) => w.to && here(w.to.x) && !here(w.x));
    if (entries.length === 0) errors.push(`${name}: nenhum cano ou porta leva até a sala`);
    // Túnel de cano: a saída tem que ser em outro cano, bem mais à frente (não onde o jogador entrou).
    const pipeEntries = level.pipes.filter((p) => p.to && here(p.to.x) && !here(p.x));
    const pipeExits = level.pipes.filter((p) => p.to && here(p.x) && !inRoom(p.to.x));
    for (const entry of pipeEntries) {
      for (const exit of pipeExits) {
        const target = level.pipes.find((p) => p.x === exit.to!.x && level.groundRow - p.h - 1 === exit.to!.y);
        if (!target) errors.push(`${name}: a saída do túnel precisa ser em cima de um cano da fase`);
        else if (target.x < entry.x + 12) errors.push(`${name}: a saída do túnel (cano em ${target.x}) precisa ficar bem à frente da entrada (${entry.x})`);
      }
    }
  });
  if (mainWidth > level.widthTiles) errors.push('mainWidthTiles maior que widthTiles');
  if (level.goal.x >= mainWidth) errors.push('a meta precisa ficar na fase principal');

  // Ordem lógica.
  if (level.goal.x <= level.spawn.x) errors.push('a meta precisa ficar à direita do início');
  for (const c of level.checkpoints) {
    if (c.x <= level.spawn.x || c.x >= level.goal.x) errors.push(`checkpoint@${c.x}: fora do trecho entre início e meta`);
  }
  if (level.timeLimit <= 0) errors.push('timeLimit deve ser positivo');

  return errors;
}
