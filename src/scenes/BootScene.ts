import Phaser from 'phaser';
import { createBackgroundTextures } from '../art/backgroundArt';
import { createEnemyAnimations, createEnemyTextures } from '../art/enemyArt';
import { createWorldTextures } from '../art/worldArt';
import { createZionAnimations, createZionTextures } from '../art/zionArt';
import { SCENE_KEYS } from '../game/constants';

/** Gera todas as texturas (arte vetorial original) e as animações, depois abre o menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  create(): void {
    createBackgroundTextures(this);
    createWorldTextures(this);
    createZionTextures(this);
    createEnemyTextures(this);
    createZionAnimations(this);
    createEnemyAnimations(this);
    this.scene.start(SCENE_KEYS.Menu);
  }
}
