import Phaser from 'phaser';
import { ZION_BODY, ZION_FRAME } from '../../art/zionArt';
import { DEPTH, PX } from '../../game/constants';
import type { ControlSource } from '../../systems/input';
import {
  createMovementState,
  deriveAnimation,
  NEUTRAL_INPUT,
  stepMovement,
  ZION_PARAMS,
  type MovementState,
  type PlayerAnimation,
} from '../../systems/movement';
import { PowerState } from '../../systems/powers';
import { Vitality } from '../../systems/vitality';

const LAND_ANIM_TIME = 0.1;
const STUN_TIME = 0.4;
const ATTACK_ANIM_TIME = 0.22;
const HARD_LANDING = 420 * PX;

export type PlayerEvent = 'jump' | 'land' | 'hurt' | 'died' | 'fire';

/** Zion Baraúna. A lógica de movimento fica em systems/movement; aqui só há integração com o Phaser. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly vitality = new Vitality(3);
  readonly powers = new PowerState();
  /** Projéteis deste jogador ainda em cena (atualizado pela cena). */
  activeShots = 0;
  dead = false;
  locked = false;
  victory = false;

  private mv: MovementState = createMovementState();
  private landTimer = 0;
  private stunTimer = 0;
  private attackTimer = 0;
  private currentAnim: PlayerAnimation = 'idle';
  private jumpHeld = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    bottomY: number,
    private readonly controls: ControlSource,
  ) {
    super(scene, x, 0, 'zion-idle-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    const body = this.arcadeBody;
    body.setSize(ZION_BODY.w * PX, ZION_BODY.h * PX, false);
    body.setOffset(ZION_BODY.offsetX * PX, ZION_BODY.offsetY * PX);
    body.setMaxVelocity(ZION_PARAMS.runSpeed * 1.6, ZION_PARAMS.maxFallSpeed * 1.5);
    this.setCollideWorldBounds(true);
    this.placeOnGround(x, bottomY);
    this.play('zion-idle');
  }

  get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get facing(): 1 | -1 {
    return this.mv.facing;
  }

  get onGround(): boolean {
    return this.arcadeBody.blocked.down || this.arcadeBody.touching.down;
  }

  /** Posiciona de modo que a base do corpo toque `bottomY`. */
  placeOnGround(x: number, bottomY: number): void {
    const body = this.arcadeBody;
    const centerToBodyBottom = body.offset.y + body.height - (ZION_FRAME.h * PX) / 2;
    body.reset(x, bottomY - centerToBodyBottom);
  }

  override update(dt: number, time: number): void {
    const body = this.arcadeBody;
    this.vitality.update(dt);
    this.powers.update(dt);
    const polled = this.controls.poll();
    this.jumpHeld = polled.jumpHeld;

    if (this.dead) {
      this.setAlpha(1);
      return;
    }

    this.landTimer = Math.max(0, this.landTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const input = this.locked || this.stunTimer > 0 ? NEUTRAL_INPUT : polled;
    if (!this.locked && this.stunTimer <= 0 && polled.powerPressed && this.powers.canFire(this.activeShots)) {
      this.powers.registerShot();
      this.attackTimer = ATTACK_ANIM_TIME;
      this.emit('fire' satisfies PlayerEvent);
    }
    const onGround = this.onGround;
    const s = stepMovement(this.mv, input, dt, ZION_PARAMS, onGround, body.velocity.x, body.velocity.y);
    this.mv = s;

    if (this.stunTimer <= 0) body.setVelocityX(s.vx);
    body.setVelocityY(s.vy);
    body.setGravityY(ZION_PARAMS.gravity * (s.gravityScale - 1));

    if (s.justJumped) this.emit('jump' satisfies PlayerEvent);
    if (s.justLanded && s.impactSpeed > HARD_LANDING) {
      this.landTimer = LAND_ANIM_TIME;
      this.emit('land' satisfies PlayerEvent, s.impactSpeed);
    }

    this.setFlipX(s.facing === -1);
    this.setAnimation(
      deriveAnimation(
        {
          onGround,
          vx: body.velocity.x,
          vy: body.velocity.y,
          landTimer: this.landTimer,
          hurt: this.stunTimer > 0,
          dead: false,
          victory: this.victory,
          attacking: this.attackTimer > 0,
        },
        ZION_PARAMS,
      ),
    );

    const blink = this.vitality.invulnerable && Math.floor(time / 55) % 2 === 0;
    this.setAlpha(blink ? 0.35 : 1);
  }

  private setAnimation(anim: PlayerAnimation): void {
    if (anim === this.currentAnim) return;
    this.currentAnim = anim;
    this.play(`zion-${anim}`, true);
  }

  /** Quique ao pisar em um inimigo. Segurar o pulo dá um quique maior. */
  bounce(): void {
    const held = this.jumpHeld;
    const v = ZION_PARAMS.jumpVelocity * (held ? 0.85 : 0.55);
    this.arcadeBody.setVelocityY(-v);
    this.mv = { ...this.mv, jumping: held, airVy: 0, onGround: false };
  }

  takeHit(sourceX: number): void {
    if (this.dead || this.victory) return;
    const result = this.vitality.hit();
    if (result === 'ignored') return;
    this.powers.lose();
    if (result === 'dead') {
      this.die();
      return;
    }
    this.stunTimer = STUN_TIME;
    const dir = this.x >= sourceX ? 1 : -1;
    this.arcadeBody.setVelocity(dir * 230 * PX, -400 * PX);
    this.emit('hurt' satisfies PlayerEvent);
  }

  /** Morte instantânea (abismo, tempo esgotado). */
  kill(): void {
    if (this.dead) return;
    this.vitality.kill();
    this.powers.lose();
    this.die();
  }

  private die(): void {
    this.dead = true;
    const body = this.arcadeBody;
    body.checkCollision.none = true;
    body.setGravityY(0);
    body.setVelocity(0, -ZION_PARAMS.jumpVelocity * 0.75);
    this.setCollideWorldBounds(false);
    this.setAlpha(1);
    this.currentAnim = 'dead';
    this.play('zion-dead', true);
    this.emit('died' satisfies PlayerEvent);
  }

  respawn(x: number, bottomY: number): void {
    this.dead = false;
    this.locked = false;
    this.victory = false;
    this.stunTimer = 0;
    this.landTimer = 0;
    this.mv = createMovementState();
    this.powers.lose();
    this.attackTimer = 0;
    this.vitality.reset();
    this.vitality.grantInvulnerability(2.2);
    const body = this.arcadeBody;
    body.checkCollision.none = false;
    this.setCollideWorldBounds(true);
    this.placeOnGround(x, bottomY);
    this.currentAnim = 'idle';
    this.play('zion-idle', true);
  }

  celebrate(): void {
    this.victory = true;
    this.locked = true;
  }
}
