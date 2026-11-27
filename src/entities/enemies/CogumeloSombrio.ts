import Phaser from 'phaser';
import { OURICO_BODY, OURICO_FRAME } from '../../art/creatureArt';
import { COGUMELO_BODY, COGUMELO_FRAME } from '../../art/enemyArt';
import { BESOURO_BODY, BESOURO_FRAME, TATU_BODY, TATU_FRAME } from '../../art/newCreatureArt';
import { DEPTH, PX, TILE } from '../../game/constants';
import type { TileGrid } from '../../levels/TileGrid';
import type { EnemyKind } from '../../levels/types';
import { stepWalker, type WalkerState } from '../../systems/walkerAI';

const ACTIVATION_RANGE = 1100;

export interface WalkerConfig {
  kind: EnemyKind;
  texture: string;
  anim: string;
  frame: { w: number; h: number };
  body: { w: number; h: number; offsetX: number; offsetY: number };
  /** Pode ser derrotado pisando? Espinhosos não podem. */
  stompable: boolean;
  /** Persegue o jogador ao vê-lo? */
  chases: boolean;
  /** Multiplicador de velocidade (patrulha e perseguição). */
  speedMul?: number;
  /** Pula de tempos em tempos (a cada `every` s, com impulso `vy`). */
  hop?: { every: number; vy: number };
  /** Textura ao ser esmagado (só para quem pode ser pisado). */
  squashTexture?: string;
}

const COGUMELO_CONFIG: WalkerConfig = {
  kind: 'cogumelo-sombrio',
  texture: 'cogumelo-walk-0',
  anim: 'cogumelo-walk',
  frame: COGUMELO_FRAME,
  body: COGUMELO_BODY,
  stompable: true,
  chases: true,
  squashTexture: 'cogumelo-squash',
};

export const OURICO_CONFIG: WalkerConfig = {
  kind: 'ourico-cristal',
  texture: 'ourico-0',
  anim: 'ourico-walk',
  frame: OURICO_FRAME,
  body: OURICO_BODY,
  stompable: false,
  chases: false,
};

export const BESOURO_CONFIG: WalkerConfig = {
  kind: 'besouro-saltador',
  texture: 'besouro-0',
  anim: 'besouro-walk',
  frame: BESOURO_FRAME,
  body: BESOURO_BODY,
  stompable: true,
  chases: false,
  speedMul: 1.25,
  hop: { every: 1.5, vy: 560 },
  squashTexture: 'besouro-squash',
};

export const TATU_CONFIG: WalkerConfig = {
  kind: 'tatu-couracado',
  texture: 'tatu-0',
  anim: 'tatu-walk',
  frame: TATU_FRAME,
  body: TATU_BODY,
  stompable: false,
  chases: true,
  speedMul: 1.35,
};

export class CogumeloSombrio extends Phaser.Physics.Arcade.Sprite {
  dead = false;
  readonly kind: EnemyKind;
  readonly stompable: boolean;
  private readonly config: WalkerConfig;
  private ai: WalkerState = { dir: -1, mode: 'patrol' };
  private hopTimer = 0.6;

  constructor(scene: Phaser.Scene, x: number, bottomY: number, config: WalkerConfig = COGUMELO_CONFIG) {
    super(scene, x, 0, config.texture);
    this.config = config;
    this.kind = config.kind;
    this.stompable = config.stompable;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
    const body = this.arcadeBody;
    body.setSize(config.body.w * PX, config.body.h * PX, false);
    body.setOffset(config.body.offsetX * PX, config.body.offsetY * PX);
    const centerToBodyBottom = body.offset.y + body.height - (config.frame.h * PX) / 2;
    body.reset(x, bottomY - centerToBodyBottom);
    this.play(config.anim);
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get mode(): string {
    return this.ai.mode;
  }

  /** Atualiza a IA. Retorna false se o inimigo caiu do mundo e deve ser removido. */
  tick(grid: TileGrid, playerX: number, playerY: number, playerAlive: boolean, cameraCenterX: number): boolean {
    if (this.dead) return true;
    const body = this.arcadeBody;
    if (this.y > grid.level.heightTiles * TILE + 300) return false;
    if (Math.abs(this.x - cameraCenterX) > ACTIVATION_RANGE) {
      body.setVelocityX(0);
      return true;
    }

    const halfW = body.width / 2;
    const midRow = Math.floor((body.y + body.height / 2) / TILE);
    const belowRow = Math.floor((body.bottom + 6) / TILE);
    const canAdvance = (dir: 1 | -1): boolean => {
      const col = Math.floor((body.center.x + dir * (halfW + 6)) / TILE);
      if (grid.isSolid(col, midRow)) return false;
      return !body.blocked.down || grid.isSolid(col, belowRow);
    };

    const result = stepWalker(this.ai, {
      canAdvance,
      playerDx: playerX - this.x,
      playerDy: playerY - this.y,
      playerAlive: playerAlive && this.config.chases,
    });
    this.ai = result.state;
    body.setVelocityX(this.ai.dir * result.speed * (this.config.speedMul ?? 1));
    const hop = this.config.hop;
    if (hop) {
      this.hopTimer -= this.scene.game.loop.delta / 1000;
      if (this.hopTimer <= 0 && body.blocked.down) {
        body.setVelocityY(-hop.vy * PX);
        this.hopTimer = hop.every * (0.8 + Math.random() * 0.4);
      }
    }
    this.setFlipX(this.ai.dir === 1);
    this.anims.timeScale = this.ai.mode === 'chase' ? 1.7 : 1;
    return true;
  }

  /** Derrotado por fogo: gira para trás e cai para fora da tela. */
  knockOut(dir: 1 | -1): void {
    if (this.dead) return;
    this.dead = true;
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.anims.stop();
    this.setFlipY(true);
    this.scene.tweens.add({ targets: this, x: this.x + dir * 150, angle: dir * 200, duration: 900 });
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: this.y - 80, duration: 220, ease: 'Quad.easeOut' },
        { y: this.y + 700, duration: 800, ease: 'Quad.easeIn' },
      ],
      onComplete: () => this.destroy(),
    });
  }

  squash(): void {
    if (this.dead || !this.stompable) return;
    this.dead = true;
    const body = this.arcadeBody;
    body.setVelocity(0, 0);
    body.enable = false;
    this.anims.stop();
    this.setTexture(this.config.squashTexture ?? 'cogumelo-squash');
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 350,
      duration: 250,
      onComplete: () => this.destroy(),
    });
  }
}
