import type { BlockSpec, LevelData, TilePoint } from '../types';

const line = (x0: number, x1: number, y: number): TilePoint[] => {
  const out: TilePoint[] = [];
  for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
};

/** Escada de blocos de pedra: a coluna i tem altura i+1. */
const stairs = (startX: number, steps: number, groundRow: number): BlockSpec[] => {
  const out: BlockSpec[] = [];
  for (let i = 0; i < steps; i++) {
    for (let h = 1; h <= i + 1; h++) out.push({ kind: 'stone', x: startX + i, y: groundRow - h });
  }
  return out;
};

const GROUND_ROW = 9;

/** 1-1 Vila das Oliveiras */
export const LEVEL_1_1: LevelData = {
  id: '1-1',
  name: 'Vila das Oliveiras',
  world: 1,
  theme: 'oliveiras',
  widthTiles: 130,
  heightTiles: 12,
  groundRow: GROUND_ROW,
  timeLimit: 300,
  spawn: { x: 3, y: 8 },
  ground: [
    { from: 0, to: 34 },
    { from: 38, to: 59 },
    { from: 63, to: 79 },
    { from: 89, to: 129 },
  ],
  platforms: [
    { x: 14, y: 6, w: 3 },
    { x: 22, y: 5, w: 2 },
    { x: 41, y: 6, w: 4 },
    { x: 47, y: 4, w: 3 },
    { x: 66, y: 6, w: 3 },
    { x: 72, y: 5, w: 3 },
    { x: 78, y: 6, w: 3 },
    { x: 92, y: 6, w: 4 },
    { x: 98, y: 4, w: 3 },
  ],
  movingPlatforms: [
    // Elevador: sobe de perto do chão até o alto, onde ficam moedas.
    { x: 25, y: 8, w: 3, axis: 'y', range: 4, period: 6 },
    // Ponte sobre o abismo largo (9 blocos): vai de uma borda do terreno até a outra.
    { x: 80, y: 9, w: 3, axis: 'x', range: 6, period: 7 },
  ],
  blocks: [
    { kind: 'brick', x: 7, y: 6 },
    { kind: 'surprise', x: 8, y: 6 },
    { kind: 'brick', x: 9, y: 6 },
    { kind: 'surprise', x: 10, y: 6, reward: 'flor-de-fogo' },
    { kind: 'brick', x: 11, y: 6 },
    { kind: 'surprise', x: 30, y: 6 },
    { kind: 'surprise', x: 53, y: 6, reward: 'flor-de-fogo' },
    { kind: 'surprise', x: 70, y: 6, reward: 'heart' },
    { kind: 'surprise', x: 105, y: 6, reward: 'flor-de-fogo' },
    ...stairs(110, 4, GROUND_ROW),
  ],
  coins: [
    ...line(5, 6, 8),
    ...line(14, 16, 4),
    { x: 22, y: 3 },
    { x: 23, y: 3 },
    ...line(25, 27, 2),
    { x: 35, y: 7 },
    { x: 36, y: 6 },
    { x: 37, y: 7 },
    ...line(41, 44, 4),
    ...line(47, 49, 2),
    ...line(56, 58, 8),
    { x: 60, y: 7 },
    { x: 61, y: 6 },
    { x: 62, y: 7 },
    ...line(66, 68, 4),
    ...line(72, 74, 3),
    ...line(78, 80, 4),
    { x: 85, y: 7 },
    { x: 86, y: 6 },
    { x: 87, y: 6 },
    { x: 88, y: 7 },
    ...line(92, 95, 4),
    ...line(98, 100, 2),
    ...line(116, 119, 8),
  ],
  enemies: [
    { kind: 'cogumelo-sombrio', x: 18, y: 8 },
    { kind: 'cogumelo-sombrio', x: 28, y: 8 },
    { kind: 'cogumelo-sombrio', x: 44, y: 8 },
    { kind: 'cogumelo-sombrio', x: 55, y: 8 },
    { kind: 'cogumelo-sombrio', x: 70, y: 8 },
    { kind: 'cogumelo-sombrio', x: 73, y: 8 },
    { kind: 'cogumelo-sombrio', x: 99, y: 8 },
    { kind: 'cogumelo-sombrio', x: 101, y: 8 },
    { kind: 'cogumelo-sombrio', x: 106, y: 8 },
  ],
  spikes: [
    { x: 50, y: 8 },
    { x: 51, y: 8 },
    { x: 96, y: 8 },
  ],
  checkpoints: [
    { x: 57, y: 8 },
    { x: 104, y: 8 },
  ],
  goal: { x: 124, y: 8 },
};
