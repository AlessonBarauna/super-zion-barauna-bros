import Phaser from 'phaser';
import { createBackgroundTextures } from '../art/backgroundArt';
import { createCreatureAnimations, createCreatureTextures } from '../art/creatureArt';
import { createEnemyAnimations, createEnemyTextures } from '../art/enemyArt';
import { createWorldTextures } from '../art/worldArt';
import { createCharacterAnimations, createCharacterTextures } from '../art/characterArt';
import { SCENE_KEYS } from '../game/constants';

/** Gera todas as texturas (arte vetorial original) e as animações, depois abre o menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  create(): void {
    createBackgroundTextures(this);
    createWorldTextures(this);
    for (const id of ['zion', 'bara'] as const) createCharacterTextures(this, id);
    createEnemyTextures(this);
    createCreatureTextures(this);
    for (const id of ['zion', 'bara'] as const) createCharacterAnimations(this, id);
    createEnemyAnimations(this);
    createCreatureAnimations(this);
    this.scene.start(SCENE_KEYS.Menu);
  }
}
