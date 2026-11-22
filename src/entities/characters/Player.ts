import Phaser from 'phaser';
import { ZION_FRAME } from '../../art/characterArt';
import { DEPTH, PX } from '../../game/constants';
import type { ControlSource } from '../../systems/input';
import {
  createMovementState,
  CROUCH_SCALE_Y,
  deriveAnimation,
  nextCrouch,
  NEUTRAL_INPUT,
  stepMovement,
  type MovementState,
  type PlayerAnimation,
} from '../../systems/movement';
import { PowerState } from '../../systems/powers';
import { START_HP, Vitality } from '../../systems/vitality';
import type { CharacterDef } from './characters';

const LAND_ANIM_TIME = 0.1;
const STUN_TIME = 0.4;
const ATTACK_ANIM_TIME = 0.22;
const HARD_LANDING = 420 * PX;

export type PlayerEvent = 'jump' | 'airjump' | 'land' | 'hurt' | 'died' | 'fire' | 'grow';

/** Escala do personagem pequeno (1 coração) em relação ao grande. */
export const SMALL_SCALE = 0.78;

/** Personagem jogável (Zion ou Bara). A lógica de movimento fica em systems/movement; aqui só há integração com o Phaser. */
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
  private sizeScale = 1;
  /** ↓ foi apertado neste quadro (lido pela cena para entrar em canos e portas). */
  downPressed = false;
  /** Está agachado (corpo mais baixo, não anda). */
  crouching = false;
  /** Altura dos pés no início do quadro (antes de agachar/levantar), para entrar em canos e portas. */
  feetY = 0;
  private bodyCrouched = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    bottomY: number,
    private readonly controls: ControlSource,
    readonly def: CharacterDef,
  ) {
    super(scene, x, 0, `${def.id}-idle-0`);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    const body = this.arcadeBody;
    body.setSize(def.body.w * PX, def.body.h * PX, false);
    body.setOffset(def.body.offsetX * PX, def.body.offsetY * PX);
    body.setMaxVelocity(def.params.runSpeed * 1.6, def.params.maxFallSpeed * 1.5);
    this.setCollideWorldBounds(true);
    this.vitality.reset(START_HP);
    this.sizeScale = SMALL_SCALE;
    this.setScale(SMALL_SCALE);
    this.placeOnGround(x, bottomY);
    this.play(`${def.id}-idle`);
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
    const centerToBodyBottom = (body.offset.y + body.sourceHeight - (ZION_FRAME.h * PX) / 2) * this.scaleY;
    body.reset(x, bottomY - centerToBodyBottom);
  }

  /** Grande a partir de 2 corações; pequeno com 1. */
  get isBig(): boolean {
    return this.vitality.isBig;
  }

  /** Ajusta a escala ao tamanho atual mantendo os pés no mesmo lugar e a velocidade. */
  private applySize(): void {
    const target = this.isBig ? 1 : SMALL_SCALE;
    if (target === this.sizeScale) return;
    const body = this.arcadeBody;
    const { x: vx, y: vy } = body.velocity;
    const bottom = body.bottom;
    this.sizeScale = target;
    this.setScale(target);
    this.placeOnGround(this.x, bottom);
    body.setVelocity(vx, vy);
    this.bodyCrouched = false;
    this.applyCrouchBody();
  }

  /** Agachado: o corpo físico encolhe por cima (a base fica no mesmo lugar). */
  private applyCrouchBody(): void {
    if (this.bodyCrouched === this.crouching) return;
    const body = this.arcadeBody;
    const h = this.def.body.h * PX;
    const offY = this.def.body.offsetY * PX;
    const crouchH = h * CROUCH_SCALE_Y;
    body.setSize(this.def.body.w * PX, this.crouching ? crouchH : h, false);
    body.setOffset(this.def.body.offsetX * PX, this.crouching ? offY + (h - crouchH) : offY);
    this.bodyCrouched = this.crouching;
  }

  /** Há algo sólido onde a cabeça ficaria ao levantar? */
  private headBlocked(): boolean {
    const body = this.arcadeBody;
    const standH = this.def.body.h * PX * this.sizeScale;
    const extra = standH - body.height;
    if (extra <= 1) return false;
    const hits = this.scene.physics.overlapRect(body.x + 2, body.bottom - standH, body.width - 4, extra - 1, false, true);
    return hits.length > 0;
  }

  /** Move o jogador para outro ponto sem perder tamanho, poderes nem vida. */
  teleport(x: number, bottomY: number): void {
    const body = this.arcadeBody;
    body.enable = true;
    this.setAlpha(1);
    this.placeOnGround(x, bottomY);
    body.setVelocity(0, 0);
    this.mv = { ...createMovementState(), facing: this.mv.facing };
  }

  /** Pegou a Fruta de Baraúna. */
  grow(): void {
    const wasBig = this.isBig;
    this.vitality.grow();
    this.vitality.grantInvulnerability(0.6);
    this.applySize();
    if (!wasBig) this.emit('grow' satisfies PlayerEvent);
  }

  override update(dt: number, time: number): void {
    const body = this.arcadeBody;
    this.vitality.update(dt);
    this.powers.update(dt);
    const polled = this.controls.poll();
    const groundedBefore = this.onGround;
    this.feetY = this.arcadeBody.bottom;
    const wasCrouching = this.crouching;
    this.crouching = !this.locked && !this.dead && nextCrouch(wasCrouching, this.onGround, polled.downHeld === true, wasCrouching && this.headBlocked());
    this.applySize();
    this.applyCrouchBody();
    this.jumpHeld = polled.jumpHeld;
    this.downPressed = polled.downPressed === true && !this.locked && groundedBefore;

    if (this.dead) {
      this.setAlpha(1);
      return;
    }

    this.landTimer = Math.max(0, this.landTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const input = this.locked || this.stunTimer > 0 ? NEUTRAL_INPUT : this.crouching ? { ...polled, moveX: 0 as const, run: false } : polled;
    if (!this.locked && this.stunTimer <= 0 && polled.powerPressed && this.powers.canFire(this.activeShots)) {
      this.powers.registerShot();
      this.attackTimer = ATTACK_ANIM_TIME;
      this.emit('fire' satisfies PlayerEvent);
    }
    const onGround = this.onGround;
    const s = stepMovement(this.mv, input, dt, this.def.params, onGround, body.velocity.x, body.velocity.y);
    this.mv = s;

    if (this.stunTimer <= 0) body.setVelocityX(s.vx);
    body.setVelocityY(s.vy);
    body.setGravityY(this.def.params.gravity * (s.gravityScale - 1));

    if (s.justJumped) this.emit('jump' satisfies PlayerEvent);
    if (s.justAirJumped) this.emit('airjump' satisfies PlayerEvent);
    if (s.justLanded && s.impactSpeed > HARD_LANDING) {
      this.landTimer = LAND_ANIM_TIME;
      this.emit('land' satisfies PlayerEvent, s.impactSpeed);
    }

    this.setFlipX(s.facing === -1);
    this.setAnimation(
      this.crouching && this.stunTimer <= 0 ? 'crouch' : deriveAnimation(
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
        this.def.params,
      ),
    );

    const blink = this.vitality.invulnerable && Math.floor(time / 55) % 2 === 0;
    this.setAlpha(blink ? 0.35 : 1);
  }

  private setAnimation(anim: PlayerAnimation): void {
    if (anim === this.currentAnim) return;
    this.currentAnim = anim;
    this.play(`${this.def.id}-${anim}`, true);
  }

  /** Quique ao pisar em um inimigo. Segurar o pulo dá um quique maior. */
  bounce(): void {
    const held = this.jumpHeld;
    const v = this.def.params.jumpVelocity * (held ? 0.85 : 0.55);
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
    body.setVelocity(0, -this.def.params.jumpVelocity * 0.75);
    this.setCollideWorldBounds(false);
    this.setAlpha(1);
    this.currentAnim = 'dead';
    this.play(`${this.def.id}-dead`, true);
    this.emit('died' satisfies PlayerEvent);
  }

  respawn(x: number, bottomY: number): void {
    this.crouching = false;
    this.dead = false;
    this.locked = false;
    this.victory = false;
    this.stunTimer = 0;
    this.landTimer = 0;
    this.mv = createMovementState();
    this.powers.lose();
    this.attackTimer = 0;
    this.vitality.reset(START_HP);
    this.vitality.grantInvulnerability(2.2);
    this.applySize();
    const body = this.arcadeBody;
    body.checkCollision.none = false;
    this.setCollideWorldBounds(true);
    this.placeOnGround(x, bottomY);
    this.currentAnim = 'idle';
    this.play(`${this.def.id}-idle`, true);
  }

  celebrate(): void {
    this.victory = true;
    this.locked = true;
  }
}
