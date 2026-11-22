import { BOSS_BY_WORLD } from '../systems/boss';
import { caveRoom, houseRoom, ROOM_W, roomEntry } from './rooms';
import type { BlockReward, BlockSpec, DoorSpec, EnemySpec, GroundSegment, LevelData, MovingPlatformSpec, PipeSpec, PlatformSpec, TilePoint, WorldTheme } from './types';

/**
 * Gerador determinístico de fases a partir de "trechos" (chunks) validados.
 * A mesma (mundo, fase) sempre gera a mesma fase; o resultado passa pelo validador
 * de fases como qualquer fase feita à mão. O objetivo é dar estrutura jogável aos
 * mundos 1–8 enquanto o desenho manual fino de cada fase fica para uma etapa futura.
 */

export const GROUND_ROW = 9;
const HEIGHT = 12;

export interface WorldInfo {
  world: number;
  theme: WorldTheme;
  name: string;
  /** Tons multiplicados sobre fundo e terreno (variação provisória de paleta). */
  bgTint: number;
  tileTint: number;
}

export const WORLDS: WorldInfo[] = [
  { world: 1, theme: 'oliveiras', name: 'Campos de Baraúna', bgTint: 0xffffff, tileTint: 0xffffff },
  { world: 2, theme: 'cavernas', name: 'Cavernas Cristalinas', bgTint: 0x7f93d9, tileTint: 0xa9b8f0 },
  { world: 3, theme: 'deserto', name: 'Deserto Dourado', bgTint: 0xffd98a, tileTint: 0xffe0a0 },
  { world: 4, theme: 'montanhas', name: 'Montanhas Congeladas', bgTint: 0xbfe4ff, tileTint: 0xd5f0ff },
  { world: 5, theme: 'selva', name: 'Selva dos Antigos', bgTint: 0x86d49a, tileTint: 0x9be0a8 },
  { world: 6, theme: 'engrenagens', name: 'Cidade das Engrenagens', bgTint: 0xc8b8a8, tileTint: 0xd8c8b8 },
  { world: 7, theme: 'nuvens', name: 'Reino das Nuvens', bgTint: 0xffc6e8, tileTint: 0xffdff3 },
  { world: 8, theme: 'abismo', name: 'Abismo das Sombras', bgTint: 0x7a5aa8, tileTint: 0x9a7ac8 },
];

export const worldInfo = (world: number): WorldInfo => WORLDS[world - 1] ?? WORLDS[0]!;

/** Gerador pseudoaleatório pequeno e estável (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const line = (x0: number, x1: number, y: number): TilePoint[] => {
  const out: TilePoint[] = [];
  for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
};

type ChunkKind = 'flat' | 'gap' | 'platforms' | 'bridge' | 'spikes' | 'stairs' | 'pipes' | 'warp-pipe' | 'warp-door';

/** Fase gerada: etapa 1..3 (a 4 é a arena do chefão). */
export function generateLevel(world: number, stage: number): LevelData {
  if (stage === 4) return generateBossArena(world);
  const info = worldInfo(world);
  const rand = rng(world * 1000 + stage * 17 + 3);
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)]!;
  const difficulty = (world - 1) / 7 + (stage - 1) * 0.12; // 0 .. ~1.2

  const ground: GroundSegment[] = [];
  const platforms: PlatformSpec[] = [];
  const movingPlatforms: MovingPlatformSpec[] = [];
  const blocks: BlockSpec[] = [];
  const coins: TilePoint[] = [];
  // Perto do início sempre há uma Fruta de Baraúna, pois o personagem começa pequeno.
  const introRow = 5 + Math.floor(rand() * 2);
  blocks.push({ kind: 'brick', x: 7, y: introRow }, { kind: 'surprise', x: 8, y: introRow, reward: 'grow' }, { kind: 'brick', x: 9, y: introRow });
  if (rand() < 0.5) blocks.push({ kind: 'surprise', x: 8, y: introRow - 3, reward: 'coin' });
  const enemies: EnemySpec[] = [];
  const spikes: TilePoint[] = [];
  const pipes: PipeSpec[] = [];
  const doors: DoorSpec[] = [];
  /** Atalhos para as salas secretas: preenchidos quando os trechos de cano/porta são criados. */
  const warpSlots: Array<{ kind: 'cano' | 'porta'; pipeIndex?: number; doorIndex?: number; exitX: number }> = [];
  const flatSpans: Array<{ from: number; to: number }> = [];

  let x = 0;
  const startEnd = 11;
  ground.push({ from: 0, to: startEnd });
  flatSpans.push({ from: 0, to: startEnd });
  x = startEnd + 1;
  coins.push(...line(5, 7, 8));

  const chunkCount = 9 + stage * 2 + Math.round(difficulty * 4);
  const kinds: ChunkKind[] = ['flat', 'gap', 'platforms', 'spikes', 'stairs', 'pipes'];
  if (world >= 2 || stage >= 2) kinds.push('bridge');

  let lastKind: ChunkKind = 'flat';
  for (let n = 0; n < chunkCount; n++) {
    let kind = n === 2 ? 'warp-pipe' : n === 5 ? 'warp-door' : pick(kinds);
    if (n === 2 || n === 5) lastKind = 'flat';
    // Evita repetir trechos perigosos em sequência e sempre intercala terreno firme.
    if (kind !== 'flat' && kind === lastKind) kind = 'flat';
    if (lastKind === 'gap' || lastKind === 'bridge') kind = 'flat';
    lastKind = kind;
    const start = x;

    if (kind === 'flat') {
      const len = 9 + Math.floor(rand() * 5);
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      if (rand() < 0.7) coins.push(...line(start + 2, start + 4 + Math.floor(rand() * 2), 8));
      const enemyKinds: EnemySpec['kind'][] = ['cogumelo-sombrio'];
      if (world >= 2) enemyKinds.push('ourico-cristal');
      const count = 1 + Math.floor(rand() * (1 + difficulty * 2));
      for (let e = 0; e < count; e++) {
        enemies.push({ kind: pick(enemyKinds), x: start + 3 + Math.floor(rand() * (len - 6)), y: 8 });
      }
      if (world >= 2 && rand() < 0.4 + difficulty * 0.3) {
        enemies.push({ kind: 'corvo-umbral', x: start + 2 + Math.floor(rand() * (len - 4)), y: 5 });
      }
      x = start + len;
    } else if (kind === 'gap') {
      const len = 8 + Math.floor(rand() * 3);
      const gap = 2 + Math.floor(rand() * 2); // 2..3
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      coins.push({ x: start + len, y: 6 }, { x: start + len + 1, y: 5 }, { x: start + len + (gap > 2 ? 2 : 1), y: 6 });
      x = start + len + gap;
    } else if (kind === 'bridge') {
      const gap = 9;
      ground.push({ from: start, to: start + 7 });
      flatSpans.push({ from: start, to: start + 7 });
      const prevTo = start + 7;
      movingPlatforms.push({ x: prevTo + 1, y: GROUND_ROW, w: 3, axis: 'x', range: gap - 3, period: 7 });
      coins.push(...line(prevTo + 3, prevTo + 6, 7));
      x = prevTo + 1 + gap;
    } else if (kind === 'pipes') {
      const len = 13;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      const h1 = 2 + Math.floor(rand() * 2);
      pipes.push({ x: start + 3, h: h1 }, { x: start + 9, h: 2 });
      coins.push({ x: start + 3, y: 8 - h1 }, { x: start + 4, y: 8 - h1 }, { x: start + 9, y: 6 }, { x: start + 10, y: 6 });
      x = start + len;
    } else if (kind === 'warp-pipe') {
      const len = 14;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      pipes.push({ x: start + 5, h: 2 });
      warpSlots.push({ kind: 'cano', pipeIndex: pipes.length - 1, exitX: start + 9 });
      coins.push(...line(start + 11, start + 12, 8));
      x = start + len;
    } else if (kind === 'warp-door') {
      const len = 14;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      doors.push({ x: start + 6, to: { x: 0, y: 8 } });
      warpSlots.push({ kind: 'porta', doorIndex: doors.length - 1, exitX: start + 9 });
      x = start + len;
    } else if (kind === 'platforms') {
      const len = 12;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      platforms.push({ x: start + 2, y: 6, w: 3 }, { x: start + 7, y: 4, w: 3 });
      coins.push(...line(start + 2, start + 4, 5), ...line(start + 7, start + 9, 3));
      const reward = rand() < 0.5 ? 'flor-de-fogo' : 'heart';
      const rowA = pick([4, 5, 6]);
      const rowB = pick([5, 6]);
      blocks.push({ kind: 'surprise', x: start + 5, y: rowA }, { kind: 'brick', x: start + 10, y: rowB });
      if (rand() < 0.6) blocks.push({ kind: 'surprise', x: start + 11, y: rowB === 6 ? 5 : 6, reward });
      enemies.push({ kind: 'cogumelo-sombrio', x: start + 9, y: 8 });
      x = start + len;
    } else if (kind === 'spikes') {
      const len = 11;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      const sx = start + 4 + Math.floor(rand() * 2);
      spikes.push({ x: sx, y: 8 }, { x: sx + 1, y: 8 });
      coins.push(...line(sx - 1, sx + 2, 5));
      x = start + len;
    } else {
      const len = 12;
      ground.push({ from: start, to: start + len - 1 });
      flatSpans.push({ from: start, to: start + len - 1 });
      for (let i = 0; i < 3; i++) for (let h = 1; h <= i + 1; h++) blocks.push({ kind: 'stone', x: start + 3 + i, y: GROUND_ROW - h });
      coins.push(...line(start + 8, start + 10, 8));
      x = start + len;
    }
  }

  // Trecho final plano com a meta.
  const endStart = x;
  ground.push({ from: endStart, to: endStart + 13 });
  flatSpans.push({ from: endStart, to: endStart + 13 });
  const goalX = endStart + 10;
  const mainWidth = endStart + 14;

  // Salas secretas depois do fim da fase: cada cano/porta tem a sua e a saída volta para perto da entrada.
  const rooms: LevelData['rooms'] = [];
  const roomKits: Array<ReturnType<typeof caveRoom>> = [];
  let roomX = mainWidth + 10;
  for (const slot of warpSlots) {
    const back = { x: slot.exitX, y: 8 };
    const grow: BlockReward = rand() < 0.5 ? 'flor-de-fogo' : 'heart';
    const kit = slot.kind === 'cano' ? caveRoom(roomX, back, world) : houseRoom(roomX, back, grow);
    roomKits.push(kit);
    rooms.push(kit.room);
    const entry = roomEntry(kit.room);
    if (slot.pipeIndex !== undefined) pipes[slot.pipeIndex] = { ...pipes[slot.pipeIndex]!, to: entry };
    if (slot.doorIndex !== undefined) doors[slot.doorIndex] = { ...doors[slot.doorIndex]!, to: entry };
    roomX += ROOM_W + 4;
  }
  for (const kit of roomKits) {
    ground.push(kit.ground);
    blocks.push(...kit.blocks);
    platforms.push(...kit.platforms);
    coins.push(...kit.coins);
    pipes.push(...kit.pipes);
    doors.push(...kit.doors);
  }
  for (let y = 0; y < GROUND_ROW; y++) blocks.push({ kind: 'stone', x: mainWidth - 1, y });
  const widthTiles = rooms.length > 0 ? roomX - 4 : mainWidth;

  // Checkpoints no meio de trechos planos livres de espinhos, inimigos e blocos.
  const taken = (c: number): boolean =>
    spikes.some((s) => Math.abs(s.x - c) <= 1) ||
    enemies.some((e) => Math.abs(e.x - c) <= 1) ||
    blocks.some((b) => Math.abs(b.x - c) <= 0) ||
    pipes.some((p) => c >= p.x - 2 && c <= p.x + 3) ||
    doors.some((d) => Math.abs(d.x - c) <= 2);
  const checkpoints: TilePoint[] = [];
  for (const frac of [0.4, 0.7]) {
    const target = Math.floor(widthTiles * frac);
    const span = flatSpans.find((f) => f.to - f.from >= 8 && f.from > 12 && f.to >= target && f.to < mainWidth);
    if (!span) continue;
    for (let c = Math.max(span.from + 2, target); c <= span.to - 2; c++) {
      if (!taken(c) && !checkpoints.some((k) => Math.abs(k.x - c) < 8) && c < goalX - 6) {
        checkpoints.push({ x: c, y: 8 });
        break;
      }
    }
  }

  // Remove inimigos que ficaram sobre a mesma coluna de espinhos/blocos/checkpoints.
  const cleanEnemies = enemies.filter(
    (e) =>
      e.kind === 'corvo-umbral' ||
      (!spikes.some((s) => Math.abs(s.x - e.x) <= 1) &&
        !blocks.some((b) => b.kind === 'stone' && Math.abs(b.x - e.x) <= 1) &&
        !pipes.some((p) => e.x >= p.x - 1 && e.x <= p.x + 2) &&
        !doors.some((d) => Math.abs(d.x - e.x) <= 2) &&
        !checkpoints.some((c) => Math.abs(c.x - e.x) <= 1) &&
        e.x < goalX - 3),
  );

  return {
    id: `${world}-${stage}`,
    name: `${info.name} ${stage}`,
    world,
    theme: info.theme,
    widthTiles,
    mainWidthTiles: mainWidth,
    heightTiles: HEIGHT,
    groundRow: GROUND_ROW,
    timeLimit: 320 + Math.round(widthTiles * 0.5),
    spawn: { x: 3, y: 8 },
    ground,
    platforms,
    movingPlatforms,
    pipes,
    doors,
    rooms,
    blocks: dedupeBlocks(blocks),
    coins: coins.filter((c) => !blocks.some((b) => b.x === c.x && b.y === c.y)),
    enemies: cleanEnemies,
    spikes,
    checkpoints,
    goal: { x: goalX, y: 8 },
  };
}

function dedupeBlocks(blocks: BlockSpec[]): BlockSpec[] {
  const seen = new Set<string>();
  return blocks.filter((b) => {
    const key = `${b.x},${b.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Arena fechada (paredes de pedra) com o chefão do mundo. A meta aparece quando ele cai. */
export function generateBossArena(world: number): LevelData {
  const info = worldInfo(world);
  const boss = BOSS_BY_WORLD[world - 1] ?? 'gronk';
  const W = 24;
  const walls: BlockSpec[] = [];
  for (let y = 0; y < GROUND_ROW; y++) walls.push({ kind: 'stone', x: 0, y }, { kind: 'stone', x: W - 1, y });
  return {
    id: `${world}-4`,
    name: `Covil do ${boss.charAt(0).toUpperCase()}${boss.slice(1)}`,
    world,
    theme: info.theme,
    widthTiles: W,
    heightTiles: HEIGHT,
    groundRow: GROUND_ROW,
    timeLimit: 240,
    spawn: { x: 3, y: 8 },
    ground: [{ from: 0, to: W - 1 }],
    platforms: [
      { x: 5, y: 6, w: 3 },
      { x: 16, y: 6, w: 3 },
    ],
    movingPlatforms: [],
    pipes: [],
    doors: [],
    rooms: [],
    blocks: [
      ...walls,
      { kind: 'surprise', x: 8, y: 6, reward: 'grow' },
      { kind: 'surprise', x: 10, y: 6, reward: 'flor-de-fogo' },
      { kind: 'surprise', x: 12, y: 6, reward: 'heart' },
    ],
    coins: [...line(5, 7, 5), ...line(16, 18, 5), ...line(9, 13, 8)],
    enemies: [],
    spikes: [],
    checkpoints: [],
    goal: { x: 21, y: 8 },
    boss: { kind: boss, x: 18, y: 8 },
  };
}
