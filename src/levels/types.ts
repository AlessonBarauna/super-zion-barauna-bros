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

/** O que um bloco surpresa entrega (padrão: moeda). */
export type BlockReward = 'coin' | 'flor-de-fogo' | 'heart' | 'grow' | 'estrela' | 'asas';

export interface BlockSpec extends TilePoint {
  kind: BlockKind;
  reward?: BlockReward;
}

export interface PlatformSpec extends TilePoint {
  /** Largura em blocos. */
  w: number;
}

/**
 * Plataforma móvel de passagem única (só o topo colide). (x, y) é a posição inicial:
 * no eixo 'x' ela vai para a direita até `range` blocos; no eixo 'y' ela começa embaixo e sobe `range` blocos.
 */
export interface MovingPlatformSpec extends PlatformSpec {
  axis: 'x' | 'y';
  /** Distância percorrida, em blocos. */
  range: number;
  /** Segundos para ir e voltar. */
  period: number;
  /** Fase inicial do ciclo, de 0 a 1. */
  phase?: number;
}

/** Cano de 2 blocos de largura apoiado no chão. Com `to`, dá para entrar nele (tecla ↓) e ir para uma sala secreta (ou voltar dela). */
export interface PipeSpec {
  /** Coluna da esquerda. */
  x: number;
  /** Altura em blocos (2 a 3). */
  h: number;
  /** Destino ao entrar: bloco onde o jogador reaparece em pé. */
  to?: TilePoint;
}

/** Porta de casa (ou de saída de uma sala): entrar com ↓. */
export interface DoorSpec {
  /** Coluna central da porta. */
  x: number;
  to: TilePoint;
  /** Porta de saída dentro de uma sala (desenhada como porta, sem casa). */
  exit?: boolean;
}

/** Sala secreta: trecho do mundo à direita da fase, só alcançado por canos e portas. */
export interface RoomSpec {
  /** Coluna inicial e largura em blocos. */
  x: number;
  w: number;
  kind: 'caverna' | 'casa';
}

export type EnemyKind = 'cogumelo-sombrio' | 'corvo-umbral' | 'ourico-cristal' | 'besouro-saltador' | 'tatu-couracado' | 'morcego-cristal';

/** Inimigos que voam: não precisam de chão embaixo. */
export const FLYING_ENEMIES: readonly EnemyKind[] = ['corvo-umbral', 'morcego-cristal'];

export type BossKind = 'gronk' | 'kragor' | 'sakhur' | 'frostak' | 'vyrak' | 'mechazord' | 'auron' | 'umbrax';

export interface BossSpec extends TilePoint {
  kind: BossKind;
}

export interface EnemySpec extends TilePoint {
  kind: EnemyKind;
}

export type WorldTheme = 'oliveiras' | 'cavernas' | 'deserto' | 'montanhas' | 'selva' | 'engrenagens' | 'nuvens' | 'abismo';

/**
 * Definição de fase orientada a dados. Criar uma fase nova deve exigir apenas
 * um objeto como este — o motor (LevelBuilder/GameScene) não muda.
 */
export interface LevelData {
  id: string;
  name: string;
  world: number;
  theme: WorldTheme;
  /** Largura total, incluindo as salas secretas à direita. */
  widthTiles: number;
  /** Largura da fase principal (até a meta); o restante são salas secretas. Padrão: widthTiles. */
  mainWidthTiles?: number;
  heightTiles: number;
  /** Linha do topo do terreno. */
  groundRow: number;
  /** Segundos para concluir. */
  timeLimit: number;
  spawn: TilePoint;
  ground: GroundSegment[];
  platforms: PlatformSpec[];
  movingPlatforms: MovingPlatformSpec[];
  pipes: PipeSpec[];
  doors: DoorSpec[];
  rooms: RoomSpec[];
  blocks: BlockSpec[];
  coins: TilePoint[];
  enemies: EnemySpec[];
  spikes: TilePoint[];
  checkpoints: TilePoint[];
  goal: TilePoint;
  /** Arena de chefão: a meta só aparece quando o chefão é derrotado. */
  boss?: BossSpec;
}
