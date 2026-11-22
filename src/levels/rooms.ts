import type { BlockReward, BlockSpec, DoorSpec, GroundSegment, PipeSpec, RoomSpec, TilePoint } from './types';

/** Salas secretas prontas (caverna de moedas e casa com presente). Usadas pelas fases à mão e pelo gerador. */

export const ROOM_W = 24;
const GROUND_ROW = 9;

export interface RoomKit {
  room: RoomSpec;
  ground: GroundSegment;
  blocks: BlockSpec[];
  platforms: Array<{ x: number; y: number; w: number }>;
  coins: TilePoint[];
  pipes: PipeSpec[];
  doors: DoorSpec[];
}

const line = (x0: number, x1: number, y: number): TilePoint[] => {
  const out: TilePoint[] = [];
  for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
};

/** Onde o jogador aparece ao entrar na sala. */
export const roomEntry = (room: RoomSpec): TilePoint => ({ x: room.x + 2, y: GROUND_ROW - 1 });

function walls(room: RoomSpec): BlockSpec[] {
  const out: BlockSpec[] = [];
  for (let y = 0; y < GROUND_ROW; y++) out.push({ kind: 'stone', x: room.x, y }, { kind: 'stone', x: room.x + room.w - 1, y });
  return out;
}

interface RoomParts {
  platforms: Array<{ x: number; y: number; w: number }>;
  blocks: BlockSpec[];
  coins: TilePoint[];
}
type Layout = (c: (dx: number) => number, v: number) => RoomParts;

const stoneStack = (x: number, h: number): BlockSpec[] => Array.from({ length: h }, (_, i) => ({ kind: 'stone' as const, x, y: GROUND_ROW - 1 - i }));

/**
 * Desenhos de caverna. Cada um tem 3 variações (v = 0..2) que mudam de verdade o conteúdo.
 * Regra: nada sólido depois da coluna 17 (a saída fica na 20) nem antes da 5 (a entrada fica na 2).
 */
const CAVE_LAYOUTS: Layout[] = [
  // 0 · arcos de moedas
  (c, v) => ({
    platforms: [{ x: c(9), y: 6, w: 3 }],
    blocks: [],
    coins: [...line(c(4), c(8), 8), ...line(c(5), c(7), 6), ...line(c(13), c(17), 8 - v), ...line(c(12), c(18), 5), ...line(c(14), c(16), 3), ...line(c(9), c(11), 5)],
  }),
  // 1 · escada de pedra que sobe e desce
  (c, v) => ({
    platforms: [],
    blocks: [...stoneStack(c(7 + v), 1), ...stoneStack(c(8 + v), 2), ...stoneStack(c(9 + v), 3), ...stoneStack(c(10 + v), 2), ...stoneStack(c(11 + v), 1)],
    coins: [{ x: c(7 + v), y: 7 }, { x: c(8 + v), y: 6 }, { x: c(9 + v), y: 5 }, { x: c(10 + v), y: 6 }, { x: c(11 + v), y: 7 }, ...line(c(13 + v), c(16), 8)],
  }),
  // 2 · plataformas em dois andares
  (c, v) => ({
    platforms: [{ x: c(5 + v), y: 6, w: 3 }, { x: c(10 + v), y: 6, w: 3 }, { x: c(8 + v), y: 4, w: 2 }],
    blocks: [],
    coins: [...line(c(5 + v), c(7 + v), 5), ...line(c(10 + v), c(12 + v), 5), ...line(c(8 + v), c(9 + v), 3), ...line(c(5), c(17), 8).filter((_, i) => i % 2 === 0)],
  }),
  // 3 · fileira de blocos-surpresa (um dá coração)
  (c, v) => ({
    platforms: [],
    blocks: [8, 10, 12].map((dx, i) => ({ kind: 'surprise' as const, x: c(dx + (v > 1 ? 1 : 0)), y: 6, reward: (i === v ? 'heart' : 'coin') as BlockReward })),
    coins: [...line(c(5), c(7), 8), ...line(c(14), c(17), 8), ...line(c(9), c(13), 3 + (v % 2))],
  }),
  // 4 · diamante de moedas
  (c, v) => {
    const mid = 9 + v * 2;
    const coins: TilePoint[] = [{ x: c(mid), y: 3 }, ...line(c(mid - 1), c(mid + 1), 4), ...line(c(mid - 2), c(mid + 2), 5), ...line(c(mid - 1), c(mid + 1), 6), { x: c(mid), y: 7 }];
    return { platforms: [], blocks: [], coins: [...coins, ...line(c(5), c(7), 8)] };
  },
  // 5 · ondas de moedas
  (c, v) => ({
    platforms: [],
    blocks: [],
    coins: Array.from({ length: 13 }, (_, i) => ({ x: c(5 + i), y: 7 + Math.round(Math.sin(i * 0.8 + v * 2)) })),
  }),
  // 6 · torre de pedra com moedas no alto
  (c, v) => ({
    platforms: [],
    blocks: [...stoneStack(c(10 + v), 3), ...stoneStack(c(11 + v), 3)],
    coins: [...line(c(9 + v), c(12 + v), 5), ...line(c(5), c(8), 8), ...line(c(14 + v), c(17), 8)],
  }),
  // 7 · plataforma comprida
  (c, v) => ({
    platforms: [{ x: c(6 + v), y: 6, w: 8 - v }],
    blocks: [],
    coins: [...line(c(7 + v), c(12 + v), 5), ...line(c(5), c(17), 8).filter((_, i) => i % 2 === 1)],
  }),
  // 8 · zigue-zague
  (c, v) => ({
    platforms: [],
    blocks: [],
    coins: [...Array.from({ length: 6 }, (_, i) => ({ x: c(5 + i), y: 8 - i })), ...Array.from({ length: 6 }, (_, i) => ({ x: c(11 + v + i), y: 3 + i })).filter((p) => p.x <= c(17))],
  }),
  // 9 · muro de tijolos com surpresa
  (c, v) => ({
    platforms: [],
    blocks: [8, 9, 10, 11, 12].map((dx) => (dx === 8 + v * 2 ? { kind: 'surprise' as const, x: c(dx), y: 6, reward: 'coin' as BlockReward } : { kind: 'brick' as const, x: c(dx), y: 6 })),
    coins: [...line(c(8), c(12), 4), ...line(c(5), c(17), 8).filter((_, i) => i % 3 === 0)],
  }),
  // 10 · dois pilares com moedas entre eles e por cima
  (c, v) => ({
    platforms: [],
    blocks: [...stoneStack(c(7 + v), 2), ...stoneStack(c(13 + v), 2)],
    coins: [...line(c(8 + v), c(12 + v), 8), ...line(c(7 + v), c(8 + v), 6), ...line(c(12 + v), c(14 + v), 6), ...line(c(8 + v), c(13 + v), 4)],
  }),
  // 11 · duas pontes de tijolo com uma coluna de moedas no vão
  (c, v) => ({
    platforms: [],
    blocks: [...[6, 7, 8, 9].map((dx) => ({ kind: 'brick' as const, x: c(dx), y: 6 })), ...[13 + v, 14 + v, 15 + v, 16 + v].map((dx) => ({ kind: 'brick' as const, x: c(dx), y: 6 }))].filter((b) => b.x < c(18)),
    coins: [...line(c(6), c(9), 5), ...Array.from({ length: 5 }, (_, i) => ({ x: c(11 + Math.floor(v / 2)), y: 4 + i })), ...line(c(13 + v), c(16 + v), 5).filter((p) => p.x < c(18))],
  }),
  // 12 · coração de moedas
  (c, v) => {
    const m = 9 + v * 2;
    const rows: Array<[number, number, number]> = [[3, -3, -1], [3, 1, 3], [4, -4, 4], [5, -3, 3], [6, -2, 2], [7, -1, 1]];
    const coins: TilePoint[] = [];
    for (const [y, a, b] of rows) for (let dx = a; dx <= b; dx++) coins.push({ x: c(m + dx), y });
    return { platforms: [], blocks: [], coins: [...coins.filter((p) => p.x >= c(5) && p.x <= c(17)), ...line(c(5), c(6), 8)] };
  },
  // 13 · degraus de plataforma até o alto
  (c, v) => ({
    platforms: [{ x: c(6 + v), y: 6, w: 2 }, { x: c(9 + v), y: 5, w: 2 }, { x: c(12 + v), y: 4, w: 2 }],
    blocks: [],
    coins: [{ x: c(6 + v), y: 5 }, { x: c(7 + v), y: 5 }, { x: c(9 + v), y: 4 }, { x: c(10 + v), y: 4 }, { x: c(12 + v), y: 3 }, { x: c(13 + v), y: 3 }, ...line(c(5), c(8), 8)],
  }),
  // 14 · colunas de moedas
  (c, v) => ({
    platforms: [],
    blocks: [],
    coins: [8 + v, 11 + v, 14].flatMap((dx, i) => Array.from({ length: 5 }, (_, k) => ({ x: c(dx), y: i % 2 === 0 ? 4 + k : 3 + k }))),
  }),
  // 15 · duas ilhas com um coração no meio
  (c, v) => ({
    platforms: [{ x: c(6), y: 6, w: 3 }, { x: c(14), y: 6, w: 3 }],
    blocks: [{ kind: 'surprise', x: c(11 + (v > 1 ? 1 : 0)), y: 4, reward: v === 0 ? 'heart' : 'coin' }],
    coins: [...line(c(6), c(8), 5), ...line(c(14), c(16), 5), ...line(c(9), c(13), 8)],
  }),
];

export const CAVE_LAYOUT_COUNT = CAVE_LAYOUTS.length;

/** `seq` = posição da fase no jogo (0..23): cada fase cai num desenho/variação diferente. */
export function caveRoom(x0: number, returnTo: TilePoint, seq = 0): RoomKit {
  const room: RoomSpec = { x: x0, w: ROOM_W, kind: 'caverna' };
  const c = (dx: number): number => x0 + dx;
  const part = CAVE_LAYOUTS[seq % CAVE_LAYOUTS.length]!(c, Math.floor(seq / CAVE_LAYOUTS.length) % 3);
  return {
    room,
    ground: { from: x0, to: x0 + ROOM_W - 1 },
    blocks: [...walls(room), ...part.blocks],
    platforms: part.platforms,
    coins: part.coins,
    pipes: [{ x: c(20), h: 2, to: returnTo }],
    doors: [],
  };
}

/** Casas secretas: cada desenho muda onde fica o presente e como se chega nele. */
const HOUSE_LAYOUTS: Array<(c: (dx: number) => number, v: number, reward: BlockReward) => RoomParts> = [
  (c, v, reward) => ({ platforms: [], blocks: [{ kind: 'surprise', x: c(11 + v), y: 6, reward }, { kind: 'surprise', x: c(13 + v), y: 6, reward: 'coin' }], coins: line(c(6), c(9), 8) }),
  (c, v, reward) => ({ platforms: [], blocks: [{ kind: 'brick', x: c(9 + v), y: 6 }, { kind: 'surprise', x: c(10 + v), y: 6, reward }, { kind: 'brick', x: c(11 + v), y: 6 }, { kind: 'surprise', x: c(10 + v), y: 3, reward: 'coin' }], coins: line(c(13 + v), c(16), 8) }),
  (c, v, reward) => ({ platforms: [], blocks: [...stoneStack(c(8 + v), 1), ...stoneStack(c(9 + v), 2), { kind: 'surprise', x: c(12 + v), y: 5, reward }], coins: line(c(14 + v), c(17), 8) }),
  (c, v, reward) => ({ platforms: [{ x: c(8 + v), y: 6, w: 4 }], blocks: [{ kind: 'surprise', x: c(10 + v), y: 3, reward }], coins: [...line(c(8 + v), c(11 + v), 5), ...line(c(14), c(17), 8)] }),
  (c, v, reward) => ({ platforms: [], blocks: [{ kind: 'surprise', x: c(9 + v), y: 6, reward: 'coin' }, { kind: 'surprise', x: c(12 + v), y: 6, reward }, { kind: 'surprise', x: c(15), y: 6, reward: 'coin' }], coins: line(c(5), c(8), 8) }),
  (c, v, reward) => ({ platforms: [], blocks: [{ kind: 'brick', x: c(9 + v), y: 6 }, { kind: 'surprise', x: c(10 + v), y: 6, reward }, { kind: 'brick', x: c(11 + v), y: 6 }], coins: [...line(c(8 + v), c(12 + v), 4), ...line(c(14), c(17), 8)] }),
];

export const HOUSE_LAYOUT_COUNT = HOUSE_LAYOUTS.length;

/** Casa secreta: um presente (bloco surpresa) que ajuda o personagem; sai por uma porta. */
export function houseRoom(x0: number, returnTo: TilePoint, reward: BlockReward, seq = 0): RoomKit {
  const room: RoomSpec = { x: x0, w: ROOM_W, kind: 'casa' };
  const c = (dx: number): number => x0 + dx;
  const part = HOUSE_LAYOUTS[seq % HOUSE_LAYOUTS.length]!(c, Math.floor(seq / HOUSE_LAYOUTS.length) % 4, reward);
  return {
    room,
    ground: { from: x0, to: x0 + ROOM_W - 1 },
    blocks: [...walls(room), ...part.blocks],
    platforms: part.platforms,
    coins: part.coins,
    pipes: [],
    doors: [{ x: x0 + 19, to: returnTo, exit: true }],
  };
}
