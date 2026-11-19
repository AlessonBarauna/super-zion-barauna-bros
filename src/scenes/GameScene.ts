import Phaser from 'phaser';
import { OLIVEIRAS_LAYERS } from '../art/backgroundArt';
import { CogumeloSombrio } from '../entities/enemies/CogumeloSombrio';
import { Player } from '../entities/characters/Player';
import { buildLevel, type BuiltLevel, type CheckpointObject } from '../game/LevelBuilder';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PALETTE, PX, SCENE_KEYS, TILE } from '../game/constants';
import { saveManager } from '../game/saveStore';
import { FIRST_LEVEL_ID, LEVELS } from '../levels';
import { TileGrid } from '../levels/TileGrid';
import type { LevelData } from '../levels/types';
import { KeyboardControls, INPUT_PROFILES } from '../systems/input';
import { ZION_PARAMS } from '../systems/movement';
import { POWERS } from '../systems/powers';
import { GameProgress } from '../systems/progress';
import { Sfx } from '../systems/sfx';
import { createButton, UI_FONT } from '../ui/Button';
import { ParallaxBackground } from '../ui/ParallaxBackground';
import { HUD_EVENT, LEVEL_INTRO_EVENT, type HudSnapshot } from './UIScene';

interface GameSceneData {
  levelId?: string;
}

const COIN_SCORE = 50;
const STOMP_SCORE = 100;
const TIME_BONUS_PER_SECOND = 10;
const RESPAWN_DELAY_MS = 1400;
const ITEM_SCORE = 200;
const FIREBALL_SPEED = 560;

/** Cena principal: monta a fase a partir dos dados e coordena as regras de jogo. */
export class GameScene extends Phaser.Scene {
  private level!: LevelData;
  private grid!: TileGrid;
  private built!: BuiltLevel;
  private player!: Player;
  private enemies: CogumeloSombrio[] = [];
  private progress!: GameProgress;
  private sfx!: Sfx;
  private bg!: ParallaxBackground;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireballs!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;

  private lookAhead = 0;
  private timeLeft = 0;
  private elapsed = 0;
  private finished = false;
  private awaitingRespawn = false;
  private bumpedThisFrame = false;
  private checkpoint: { x: number; bottom: number } = { x: 0, bottom: 0 };

  constructor() {
    super(SCENE_KEYS.Game);
  }

  create(data: GameSceneData): void {
    this.level = LEVELS[data.levelId ?? FIRST_LEVEL_ID] ?? LEVELS[FIRST_LEVEL_ID]!;
    this.grid = new TileGrid(this.level);
    this.progress = new GameProgress();
    this.sfx = new Sfx(this);
    this.sfx.muted = saveManager.data.settings.muted;
    this.timeLeft = this.level.timeLimit;
    this.elapsed = 0;
    this.finished = false;
    this.awaitingRespawn = false;
    this.enemies = [];
    this.lookAhead = 0;
    this.bumpedThisFrame = false;

    const worldW = this.level.widthTiles * TILE;
    const worldH = this.level.heightTiles * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH, true, true, true, false);

    this.bg = new ParallaxBackground(this, OLIVEIRAS_LAYERS);
    this.built = buildLevel(this, this.level, this.grid);
    this.checkpoint = { ...this.built.spawn };

    this.dustEmitter = this.add
      .particles(0, 0, 'dust', {
        speed: { min: 40 * PX, max: 120 * PX },
        angle: { min: 195, max: 345 },
        lifespan: 380,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.8, end: 0 },
        gravityY: 260,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.sparkEmitter = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 70 * PX, max: 210 * PX },
        angle: { min: 0, max: 360 },
        lifespan: 520,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        emitting: false,
      })
      .setDepth(DEPTH.fx);

    this.player = new Player(this, this.built.spawn.x, this.built.spawn.bottom, new KeyboardControls(this, INPUT_PROFILES.player1));
    this.player.on('jump', () => {
      this.sfx.play('jump');
      this.puff(this.player.x, this.player.arcadeBody.bottom, 3);
    });
    this.player.on('land', () => {
      this.sfx.play('land');
      this.puff(this.player.x, this.player.arcadeBody.bottom, 6);
    });
    this.player.on('hurt', () => this.sfx.play('hurt'));
    this.player.on('fire', () => this.shootFireball());
    this.player.on('died', () => this.onPlayerDied());

    for (const spec of this.level.enemies) {
      const enemy = new CogumeloSombrio(this, (spec.x + 0.5) * TILE, (spec.y + 1) * TILE);
      this.enemies.push(enemy);
      this.physics.add.collider(enemy, this.built.solids);
      this.physics.add.overlap(this.player, enemy, () => this.onEnemyTouch(enemy));
    }

    this.fireballs = this.physics.add.group({ allowGravity: true });
    this.items = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.fireballs, this.built.solids, (f) => this.onFireballSolid(f as Phaser.Physics.Arcade.Sprite));
    this.physics.add.collider(
      this.items,
      this.built.solids,
      (i) => this.onItemSolid(i as Phaser.Physics.Arcade.Sprite),
      (i) => (i as Phaser.Physics.Arcade.Sprite).getData('ready') === true,
    );
    this.physics.add.overlap(this.player, this.items, (_p, i) => this.collectItem(i as Phaser.Physics.Arcade.Sprite));

    this.physics.add.collider(this.player, this.built.solids, (_p, tile) => this.onSolidTouch(tile as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.built.coins, (_p, coin) => this.collectCoin(coin as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.built.spikes, (_p, spike) => {
      if (!this.player.dead) this.player.takeHit((spike as Phaser.Physics.Arcade.Sprite).x);
    });
    for (const cp of this.built.checkpoints) {
      this.physics.add.overlap(this.player, cp.zone, () => this.activateCheckpoint(cp));
    }
    this.physics.add.overlap(this.player, this.built.goalZone, () => this.onGoal());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setBackgroundColor('#6EC3F0');
    cam.startFollow(this.player, true, 0.12, 1);
    cam.setScroll(0, 0);
    cam.fadeIn(350, 16, 32, 44);

    this.input.keyboard?.on('keydown-P', () => this.pause());
    this.input.keyboard?.on('keydown-ESC', () => this.pause());
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.keyboard?.on('keydown-M', () => {
      this.sfx.muted = !this.sfx.muted;
      saveManager.setMuted(this.sfx.muted);
    });

    this.scene.launch(SCENE_KEYS.UI);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENE_KEYS.UI));
    this.time.delayedCall(120, () => this.game.events.emit(LEVEL_INTRO_EVENT, this.level.id, this.level.name));
  }

  override update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    const cam = this.cameras.main;
    this.bumpedThisFrame = false;

    this.player.update(dt, time);

    const body = this.player.arcadeBody;
    if (!this.player.dead && !this.finished) {
      // Não deixa o jogador sair pela borda esquerda da tela.
      if (body.x < cam.scrollX + 6) {
        body.x = cam.scrollX + 6;
        if (body.velocity.x < 0) body.setVelocityX(0);
      }
      if (this.player.y > GAME_HEIGHT + 140) this.player.kill();
      this.elapsed += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft === 0) this.player.kill();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy) continue;
      if (!enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }
      const alive = enemy.tick(this.grid, this.player.x, this.player.y, !this.player.dead, cam.scrollX + GAME_WIDTH / 2);
      if (!alive) {
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }

    // Câmera olha um pouco à frente na direção do movimento.
    const targetLook = Math.abs(body.velocity.x) > 40 ? this.player.facing * 90 : 0;
    this.lookAhead += (targetLook - this.lookAhead) * Math.min(1, dt * 3);
    cam.setFollowOffset(-this.lookAhead, 0);

    this.updateFireballs(time);
    this.bg.update(cam.scrollX, time);
    this.emitHud();
  }

  private emitHud(): void {
    const snapshot: HudSnapshot = {
      lives: this.progress.lives,
      coins: this.progress.coins,
      score: this.progress.score,
      hp: this.player.vitality.hp,
      maxHp: this.player.vitality.maxHp,
      timeLeft: this.timeLeft,
      levelId: this.level.id,
      levelName: this.level.name,
      power: this.player.powers.current,
    };
    this.game.events.emit(HUD_EVENT, snapshot);
  }

  private puff(x: number, y: number, count: number): void {
    this.dustEmitter.explode(count, x, y);
  }

  private onSolidTouch(tile: Phaser.Physics.Arcade.Sprite): void {
    const kind = tile.getData('kind') as string | undefined;
    if ((kind !== 'brick' && kind !== 'surprise') || this.bumpedThisFrame) return;
    if (!this.player.arcadeBody.touching.up || tile.getData('bumping') === true) return;
    this.bumpedThisFrame = true;
    tile.setData('bumping', true);
    this.tweens.add({
      targets: tile,
      y: tile.y - 11 * PX,
      duration: 80,
      yoyo: true,
      onComplete: () => tile.setData('bumping', false),
    });
    if (kind === 'surprise') {
      tile.setTexture('tile-used');
      tile.setData('kind', 'used');
      const reward = (tile.getData('reward') as string | undefined) ?? 'coin';
      if (reward === 'coin') this.popCoin(tile.x, tile.y - TILE);
      else this.spawnItem(reward === 'heart' ? 'heart' : 'flor-de-fogo', tile.x, tile.y);
    } else {
      this.sfx.play('bump');
    }
  }

  private popCoin(x: number, y: number): void {
    const coin = this.add.image(x, y + TILE * 0.4, 'coin-0').setDepth(DEPTH.items + 1);
    this.tweens.add({
      targets: coin,
      y: y - TILE * 1.1,
      duration: 380,
      ease: 'Quad.easeOut',
      yoyo: false,
      onComplete: () => {
        this.sparkEmitter.explode(6, coin.x, coin.y);
        coin.destroy();
      },
    });
    this.grantCoin(1);
  }

  private spawnItem(kind: 'flor-de-fogo' | 'heart', x: number, y: number): void {
    const key = kind === 'heart' ? 'heart-full' : 'item-flower';
    const item = this.items.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    item.setDepth(DEPTH.tiles - 1);
    item.setData('kind', kind);
    item.setData('ready', false);
    if (kind === 'heart') item.setScale(1.5);
    const body = item.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.sfx.play('bump');
    this.tweens.add({
      targets: item,
      y: y - TILE,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!item.active) return;
        item.setData('ready', true);
        item.setDepth(DEPTH.items + 1);
        body.setAllowGravity(true);
        body.setVelocityX(110 * PX);
      },
    });
  }

  private onItemSolid(item: Phaser.Physics.Arcade.Sprite): void {
    const body = item.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.right || body.touching.right) body.setVelocityX(-110 * PX);
    else if (body.blocked.left || body.touching.left) body.setVelocityX(110 * PX);
  }

  private collectItem(item: Phaser.Physics.Arcade.Sprite): void {
    if (item.getData('ready') !== true || this.player.dead || !item.active) return;
    const kind = item.getData('kind') as string;
    this.sparkEmitter.explode(10, item.x, item.y);
    item.destroy();
    this.progress.addScore(ITEM_SCORE);
    this.sfx.play('powerup');
    if (kind === 'heart') this.player.vitality.heal(1);
    else this.player.powers.collect('flor-de-fogo');
  }

  private shootFireball(): void {
    const dir = this.player.facing;
    const fb = this.fireballs.create(this.player.x + dir * 30 * PX, this.player.y + 4 * PX, 'fireball') as Phaser.Physics.Arcade.Sprite;
    fb.setDepth(DEPTH.items + 2);
    fb.setData('born', this.time.now);
    fb.setData('dir', dir);
    const body = fb.body as Phaser.Physics.Arcade.Body;
    body.setSize(14 * PX, 14 * PX);
    body.setGravityY(-ZION_PARAMS.gravity * 0.55);
    body.setVelocity(dir * FIREBALL_SPEED * PX, 60 * PX);
    this.sfx.play('fire');
  }

  private onFireballSolid(fb: Phaser.Physics.Arcade.Sprite): void {
    const body = fb.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.left || body.blocked.right || body.touching.left || body.touching.right || body.touching.up) {
      this.explodeFireball(fb);
    } else if (body.blocked.down || body.touching.down) {
      body.setVelocityY(-340 * PX);
    }
  }

  private explodeFireball(fb: Phaser.Physics.Arcade.Sprite): void {
    if (!fb.active) return;
    this.sparkEmitter.explode(6, fb.x, fb.y);
    fb.destroy();
  }

  private updateFireballs(time: number): void {
    const cam = this.cameras.main;
    const lifetime = POWERS['flor-de-fogo'].projectileLifetime * 1000;
    const worldH = this.level.heightTiles * TILE;
    for (const child of this.fireballs.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!child.active) continue;
      const dir = child.getData('dir') as 1 | -1;
      child.angle += dir * 18;
      const expired = time - (child.getData('born') as number) > lifetime;
      const outside = child.x < cam.scrollX - 200 || child.x > cam.scrollX + GAME_WIDTH + 200 || child.y > worldH + 100;
      if (expired || outside) {
        this.explodeFireball(child);
        continue;
      }
      const box = child.getBounds();
      for (const enemy of this.enemies) {
        if (enemy.dead || !enemy.active) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(box, enemy.getBounds())) {
          enemy.knockOut(dir);
          this.progress.addScore(STOMP_SCORE);
          this.sfx.play('stomp');
          this.explodeFireball(child);
          break;
        }
      }
    }
    this.player.activeShots = this.fireballs.countActive(true);
  }

  private grantCoin(value: number): void {
    const result = this.progress.collectCoin(value);
    this.progress.addScore(COIN_SCORE * value);
    this.sfx.play(result.lifeGained ? 'life' : 'coin');
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active || this.player.dead) return;
    coin.disableBody(true, true);
    this.sparkEmitter.explode(5, coin.x, coin.y);
    this.grantCoin(1);
  }

  private onEnemyTouch(enemy: CogumeloSombrio): void {
    if (enemy.dead || this.player.dead || this.finished) return;
    const pb = this.player.arcadeBody;
    const eb = enemy.arcadeBody;
    const falling = pb.velocity.y > 40 * PX;
    const fromAbove = pb.bottom - eb.top < eb.height * 0.6;
    if (falling && fromAbove) {
      enemy.squash();
      this.player.bounce();
      this.progress.addScore(STOMP_SCORE);
      this.sfx.play('stomp');
      this.puff(enemy.x, eb.bottom, 5);
      return;
    }
    this.player.takeHit(enemy.x);
  }

  private activateCheckpoint(cp: CheckpointObject): void {
    if (cp.active || this.player.dead) return;
    cp.active = true;
    cp.sprite.setTexture('checkpoint-on');
    this.checkpoint = { x: cp.x, bottom: cp.bottom };
    this.sparkEmitter.explode(10, cp.x, cp.bottom - TILE * 1.1);
    this.sfx.play('checkpoint');
  }

  private onPlayerDied(): void {
    if (this.awaitingRespawn) return;
    this.awaitingRespawn = true;
    this.sfx.play('death');
    const gameOver = this.progress.loseLife();
    this.time.delayedCall(RESPAWN_DELAY_MS, () => {
      if (gameOver) {
        this.showEndOverlay('FIM DE JOGO', ['Zion precisa de mais coragem!'], 'TENTAR DE NOVO');
        return;
      }
      const cam = this.cameras.main;
      cam.fadeOut(260, 16, 32, 44);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.timeLeft = Math.max(this.timeLeft, 120);
        this.player.respawn(this.checkpoint.x, this.checkpoint.bottom);
        const maxScroll = this.level.widthTiles * TILE - GAME_WIDTH;
        cam.setScroll(Phaser.Math.Clamp(this.checkpoint.x - GAME_WIDTH / 2, 0, maxScroll), 0);
        this.awaitingRespawn = false;
        cam.fadeIn(260, 16, 32, 44);
      });
    });
  }

  private onGoal(): void {
    if (this.finished || this.player.dead) return;
    this.finished = true;
    this.player.celebrate();
    this.sfx.play('win');
    this.tweens.add({
      targets: this.built.banner,
      y: this.built.bannerLowY,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
    this.sparkEmitter.explode(24, this.player.x, this.player.y - 40);

    const bonus = Math.floor(this.timeLeft) * TIME_BONUS_PER_SECOND;
    this.progress.addScore(bonus);
    const previousBest = saveManager.data.bestScores[this.level.id] ?? 0;
    saveManager.recordLevelComplete(this.level.id, this.progress.score, this.progress.totalCoinsCollected);
    const seconds = Math.floor(this.elapsed);
    const lines = [
      `Tempo: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
      `Bônus de tempo: ${bonus}`,
      `Pontuação: ${String(this.progress.score).padStart(6, '0')}${this.progress.score > previousBest ? '  ★ Novo recorde!' : ''}`,
    ];
    this.time.delayedCall(1700, () => this.showEndOverlay('FASE CONCLUÍDA!', lines, 'JOGAR DE NOVO'));
  }

  private pause(): void {
    if (this.finished || this.awaitingRespawn || this.scene.isPaused()) return;
    this.scene.launch(SCENE_KEYS.Pause);
    this.scene.pause();
  }

  private showEndOverlay(title: string, lines: string[], primaryLabel: string): void {
    const cx = GAME_WIDTH / 2;
    const fixed = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(
      obj: T,
    ): T => {
      obj.setScrollFactor(0).setDepth(DEPTH.overlay);
      return obj;
    };
    fixed(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b1620, 0.6).setOrigin(0, 0));
    const panel = this.add.graphics();
    panel.fillStyle(0x1b2a3a, 1);
    panel.fillRoundedRect(cx - 330, 110, 660, 500, 36);
    panel.fillStyle(0xf7c948, 1);
    panel.fillRoundedRect(cx - 322, 118, 644, 484, 30);
    panel.fillStyle(0x2a4258, 1);
    panel.fillRoundedRect(cx - 312, 128, 624, 464, 24);
    fixed(panel);
    fixed(
      this.add
        .text(cx, 190, title, {
          fontFamily: UI_FONT,
          fontStyle: 'bold',
          fontSize: '62px',
          color: PALETTE.douradoAurora,
          stroke: PALETTE.contorno,
          strokeThickness: 10,
        })
        .setOrigin(0.5),
    );
    lines.forEach((line, i) =>
      fixed(
        this.add
          .text(cx, 285 + i * 48, line, {
            fontFamily: UI_FONT,
            fontStyle: 'bold',
            fontSize: '30px',
            color: PALETTE.creme,
            stroke: PALETTE.contorno,
            strokeThickness: 5,
          })
          .setOrigin(0.5),
      ),
    );
    fixed(createButton(this, cx, 470, primaryLabel, () => this.scene.restart()));
    fixed(
      createButton(
        this,
        cx,
        556,
        'MENU PRINCIPAL',
        () => {
          this.scene.stop(SCENE_KEYS.UI);
          this.scene.start(SCENE_KEYS.Menu);
        },
        { height: 56, fontSize: 26, fill: Phaser.Display.Color.HexStringToColor(PALETTE.roxoUmbrax).color },
      ),
    );
  }

  /** Utilitário de depuração/validação (usado pelos scripts de teste visual). */
  debugState(): Record<string, unknown> {
    return {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      vx: Math.round(this.player.arcadeBody.velocity.x),
      vy: Math.round(this.player.arcadeBody.velocity.y),
      onGround: this.player.onGround,
      hp: this.player.vitality.hp,
      lives: this.progress.lives,
      coins: this.progress.coins,
      score: this.progress.score,
      dead: this.player.dead,
      finished: this.finished,
      enemies: this.enemies.filter((e) => e.active && !e.dead).length,
      checkpoint: this.checkpoint.x,
      power: this.player.powers.current,
      shots: this.fireballs.countActive(true),
      items: this.items.countActive(true),
      totalCoins: this.progress.totalCoinsCollected,
      timeLeft: Math.round(this.timeLeft),
      jumpVelocity: ZION_PARAMS.jumpVelocity,
    };
  }
}
