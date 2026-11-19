import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { SCENE_KEYS } from './game/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { UIScene } from './scenes/UIScene';
import { ZION_PARAMS } from './systems/movement';

const forceCanvas = new URLSearchParams(window.location.search).get('renderer') === 'canvas';

const game = new Phaser.Game({
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10202c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: ZION_PARAMS.gravity }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene],
});

// Gancho para validação automatizada (Playwright) e depuração.
(window as unknown as { __ZION__: unknown }).__ZION__ = {
  game,
  state: (): unknown => {
    const scene = game.scene.getScene(SCENE_KEYS.Game) as GameScene | null;
    return scene?.scene.isActive() ? scene.debugState() : null;
  },
};
