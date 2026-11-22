import Phaser from 'phaser';
import { BOSS_BODY, BOSS_FRAME } from '../../art/creatureArt';
import { DEPTH, PX } from '../../game/constants';
import { BOSSES, createBoss, damageBoss, stepBoss, type BossAction, type BossDef, type BossMode, type BossState } from '../../systems/boss';
import type { BossKind } from '../../levels/types';

export type BossEvent = 'hit' | 'defeated' | 'wall';

/** Chefão de arena. A lógica vive em systems/boss; aqui só movimento, arte e efeitos. */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly def: BossDef;
  private readonly kind: BossKind;
  ai: BossState;
  private lastMode: BossMode = 'walk';
  onEvent?: (e: BossEvent) => void;

  constructor(scene: Phaser.Scene, kind: BossKind, x: number, bottomY: number) {
    super(scene, x, 0, `boss-${kind}-walk0`);
    this.kind = kind;
    this.def = BOSSES[kind];
    this.ai = createBoss(this.def);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
    const body = this.arcadeBody;
    body.setSize(BOSS_BODY.w * PX, BOSS_BODY.h * PX, false);
    body.setOffset(BOSS_BODY.offsetX * PX, BOSS_BODY.offsetY * PX);
    body.reset(x, bottomY - (body.offset.y + body.height - (BOSS_FRAME.h * PX) / 2));
    this.play(`boss-${kind}-walk`);
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get defeated(): boolean {
    return this.ai.mode === 'dead';
  }

  get vulnerableToStomp(): boolean {
    return this.ai.mode === 'stunned' && this.ai.invuln <= 0;
  }

  /** Velocidade vertical do salto (px de design/s, para cima). */
  static readonly LEAP_VY = 700;

  step(dt: number, playerDx: number): BossAction | undefined {
    if (this.defeated) return undefined;
    const body = this.arcadeBody;
    const hitWall = this.ai.mode === 'charge' && (body.blocked.left || body.blocked.right);
    const { state, vx, action } = stepBoss(this.ai, this.def, dt, { playerDx, hitWall, onGround: body.blocked.down });
    this.ai = state;
    if (action?.kind === 'leap') body.setVelocityY(-Boss.LEAP_VY * PX);
    body.setVelocityX(vx * PX);
    this.setFlipX(state.dir === 1);
    if (hitWall && state.mode === 'stunned') this.onEvent?.('wall');

    if (state.mode !== this.lastMode) {
      this.lastMode = state.mode;
      if (state.mode === 'walk' || state.mode === 'recover') this.play(`boss-${this.kind}-walk`, true);
      else {
        this.anims.stop();
        this.setTexture(state.mode === 'stunned' ? `boss-${this.kind}-stunned` : `boss-${this.kind}-windup`);
      }
    }
    this.anims.timeScale = state.hp <= this.def.hp / 2 ? 1.5 : 1;
    // Pisca durante a imunidade.
    this.setAlpha(state.invuln > 0 ? (Math.floor(state.invuln * 14) % 2 === 0 ? 0.45 : 1) : 1);
    if (state.mode === 'windup' || state.mode === 'cast') this.setX(this.x + Math.sin(this.scene.time.now / 20) * 1.5);
    return action;
  }

  hurt(kind: 'stomp' | 'fire'): boolean {
    const result = damageBoss(this.ai, kind);
    this.ai = result.state;
    if (!result.hit) return false;
    this.onEvent?.(result.defeated ? 'defeated' : 'hit');
    if (result.defeated) this.fall();
    return true;
  }

  private fall(): void {
    const body = this.arcadeBody;
    body.setVelocity(0, 0);
    body.enable = false;
    this.anims.stop();
    this.setTexture(`boss-${this.kind}-stunned`).setAlpha(1);
    this.scene.tweens.add({ targets: this, angle: 14, duration: 500, yoyo: true, repeat: 2 });
    this.scene.tweens.add({ targets: this, alpha: 0, scale: 0.6, delay: 1300, duration: 700, onComplete: () => this.destroy() });
  }
}
