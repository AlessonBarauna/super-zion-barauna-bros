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

/** Caverna do tesouro: muitas moedas pelo chão, plataforma e arcos no alto; sai por um cano. */
export function caveRoom(x0: number, returnTo: TilePoint, variant = 0): RoomKit {
  const room: RoomSpec = { x: x0, w: ROOM_W, kind: 'caverna' };
  const c = (dx: number): number => x0 + dx;
  const coins: TilePoint[] = [
    ...line(c(4), c(8), 8),
    ...line(c(5), c(7), 6),
    ...line(c(13), c(17), variant % 2 === 0 ? 7 : 8),
    ...line(c(12), c(18), 5),
    ...line(c(14), c(16), 3),
  ];
  return {
    room,
    ground: { from: x0, to: x0 + ROOM_W - 1 },
    blocks: walls(room),
    platforms: [{ x: c(9), y: 6, w: 3 }],
    coins: [...coins, ...line(c(9), c(11), 5)],
    pipes: [{ x: c(20), h: 2, to: returnTo }],
    doors: [],
  };
}

/** Casa secreta: um presente (bloco surpresa) que ajuda o personagem; sai por uma porta. */
export function houseRoom(x0: number, returnTo: TilePoint, reward: BlockReward): RoomKit {
  const room: RoomSpec = { x: x0, w: ROOM_W, kind: 'casa' };
  return {
    room,
    ground: { from: x0, to: x0 + ROOM_W - 1 },
    blocks: [...walls(room), { kind: 'surprise', x: x0 + 11, y: 6, reward }, { kind: 'surprise', x: x0 + 13, y: 6, reward: 'coin' }],
    platforms: [],
    coins: line(x0 + 6, x0 + 9, 8),
    pipes: [],
    doors: [{ x: x0 + 19, to: returnTo, exit: true }],
  };
}
