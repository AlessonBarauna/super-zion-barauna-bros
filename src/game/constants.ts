/**
 * Constantes globais. Este módulo NÃO pode importar Phaser: ele é usado por
 * lógica pura que roda nos testes (ambiente Node).
 */

/** Tamanho lógico de um bloco, em pixels de jogo. */
export const TILE = 60;
/** A arte é desenhada numa grade de 45 unidades por bloco e escalada por PX. */
export const DESIGN_TILE = 45;
export const PX = TILE / DESIGN_TILE;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const LEVEL_ROWS = GAME_HEIGHT / TILE;

export const PALETTE = {
  verdeBarauna: '#43B649',
  douradoAurora: '#F7C948',
  azulZion: '#3189DC',
  laranja: '#F28B36',
  roxoUmbrax: '#773EAA',
  creme: '#F4F0DC',
  contorno: '#1B2A3A',
} as const;

export const SCENE_KEYS = {
  Boot: 'BootScene',
  Menu: 'MenuScene',
  Game: 'GameScene',
  UI: 'UIScene',
  Pause: 'PauseScene',
} as const;

export const DEPTH = {
  background: -100,
  decorBack: -10,
  tiles: 0,
  items: 5,
  enemies: 10,
  player: 20,
  fx: 30,
  hud: 100,
  overlay: 1000,
} as const;

export const GAME_VERSION = '0.1.0';
