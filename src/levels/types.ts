/** Coordenadas sempre em blocos. y = 0 é a linha do topo. */
export interface TilePoint {
  x: number;
  y: number;
}

export interface GroundSegment {
  /** Colunas inclusivas. O topo do terreno fica em `groundRow`. */
  from: number;
  to: number;
}

export type BlockKind = 'brick' | 'surprise' | 'stone';

export interface BlockSpec extends TilePoint {
  kind: BlockKind;
}

export interface PlatformSpec extends TilePoint {
  /** Largura em blocos. */
  w: number;
}

export type EnemyKind = 'cogumelo-sombrio';

export interface EnemySpec extends TilePoint {
  kind: EnemyKind;
}

export type WorldTheme = 'oliveiras';

/**
 * Definição de fase orientada a dados. Criar uma fase nova deve exigir apenas
 * um objeto como este — o motor (LevelBuilder/GameScene) não muda.
 */
export interface LevelData {
  id: string;
  name: string;
  world: number;
  theme: WorldTheme;
  widthTiles: number;
  heightTiles: number;
  /** Linha do topo do terreno. */
  groundRow: number;
  /** Segundos para concluir. */
  timeLimit: number;
  spawn: TilePoint;
  ground: GroundSegment[];
  platforms: PlatformSpec[];
  blocks: BlockSpec[];
  coins: TilePoint[];
  enemies: EnemySpec[];
  spikes: TilePoint[];
  checkpoints: TilePoint[];
  goal: TilePoint;
}
