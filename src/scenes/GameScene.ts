import Phaser from 'phaser';
import { OLIVEIRAS_LAYERS } from '../art/backgroundArt';
import { CogumeloSombrio, OURICO_CONFIG } from '../entities/enemies/CogumeloSombrio';
import { CorvoUmbral } from '../entities/enemies/CorvoUmbral';
import type { Enemy } from '../entities/enemies/Enemy';
import { BossFight } from '../game/BossFight';
import { worldInfo } from '../levels/generator';
import { CHARACTERS } from '../entities/characters/characters';
import { Player } from '../entities/characters/Player';
import { buildLevel, type BuiltLevel, type CheckpointObject, type WarpPoint } from '../game/LevelBuilder';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PALETTE, PX, SCENE_KEYS, TILE } from '../game/constants';
import { saveManager } from '../game/saveStore';
import { FIRST_LEVEL_ID, LEVELS, nextLevelId } from '../levels';
import { computeStars } from '../systems/worldMap';
import { isBreakable, TileGrid } from '../levels/TileGrid';
import type { LevelData } from '../levels/types';
import { GoalTracker, cameraFocusX, charactersFor, clampToView, nearestAlive, resolveDeath, type GameMode } from '../systems/coop';
import { CombinedControls, GamepadControls, KeyboardControls, INPUT_PROFILES } from '../systems/input';
import { MusicPlayer } from '../systems/music';
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
const BOSS_SCORE = 2000;
const TIME_BONUS_PER_SECOND = 10;
const RESPAWN_DELAY_MS = 1400;
const ITEM_SCORE = 200;
const BRICK_SCORE = 20;
const FIREBALL_SPEED = 560;
/** Distância horizontal entre os personagens ao começar e ao renascer no checkpoint. */
const PLAYER_SPACING = 56;
/** O mundo tem uma única gravidade (a mesma para todos os personagens). */
const WORLD_GRAVITY = ZION_PARAMS.gravity;

interface SafeSpot {
  x: number;
  bottom: number;
}

/** Cena principal: monta a fase a partir dos dados e coordena as regras de jogo (1 ou 2 jogadores). */
export class GameScene extends Phaser.Scene {
  private level!: LevelData;
  private grid!: TileGrid;
  private built!: BuiltLevel;
  /** Região da câmera: a fase principal (-1) ou o índice de uma sala secreta. */
  private region = -1;
  private warping = false;
  private mode: GameMode = 'solo';
  private players: Player[] = [];
  private enemies: Enemy[] = [];
  private bossFight?: BossFight;
  private goalOpen = true;
  private progress!: GameProgress;
  private sfx!: Sfx;
  private music!: MusicPlayer;
  private bg!: ParallaxBackground;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireballs!: Phaser.Physics.Arcade.Group;
  private items!: Phaser.Physics.Arcade.Group;
  private camTarget!: Phaser.GameObjects.Zone;

  private platformClock = 0;
  /** Jogadores que pisaram numa plataforma móvel neste quadro (marcado pelo colisor). */
  private riding = new Set<Player>();
  private goal = new GoalTracker();
  private lastSafe = new Map<Player, SafeSpot>();
  private lookAhead = 0;
  private timeLeft = 0;
  private elapsed = 0;
  private finished = false;
  private fading = false;
  private gameOverShown = false;
  /** Mortes simultâneas (tempo esgotado) que não custam vida extra à equipe. */
  private freeDeaths = 0;
  private bumpedThisFrame = false;
  private checkpoint: SafeSpot = { x: 0, bottom: 0 };

  constructor() {
    super(SCENE_KEYS.Game);
  }

  /** Jogador 1 (Zion). Atalho usado no modo individual e pelos scripts de validação. */
  private get player(): Player {
    return this.players[0]!;
  }

  create(data: GameSceneData): void {
    this.level = LEVELS[data.levelId ?? FIRST_LEVEL_ID] ?? LEVELS[FIRST_LEVEL_ID]!;
    this.grid = new TileGrid(this.level);
    this.progress = new GameProgress();
    this.sfx = new Sfx(this);
    this.sfx.muted = saveManager.data.settings.muted;
    this.music = new MusicPlayer(this);
    this.music.muted = this.sfx.muted;
    this.music.play(worldInfo(this.level.world).theme, this.level.boss !== undefined);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.music.stop());
    this.mode = saveManager.data.mode;
    this.timeLeft = this.level.timeLimit;
    this.elapsed = 0;
    this.finished = false;
    this.fading = false;
    this.gameOverShown = false;
    this.freeDeaths = 0;
    this.enemies = [];
    this.bossFight = undefined;
    this.goalOpen = true;
    this.players = [];
    this.lastSafe = new Map();
    this.goal = new GoalTracker();
    this.lookAhead = 0;
    this.platformClock = 0;
    this.riding = new Set();
    this.bumpedThisFrame = false;
    this.region = -1;
    this.warping = false;

    const worldW = this.level.widthTiles * TILE;
    const worldH = this.level.heightTiles * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH, true, true, true, false);

    const theme = worldInfo(this.level.world);
    this.bg = new ParallaxBackground(this, OLIVEIRAS_LAYERS);
    this.bg.setTint(theme.bgTint);
    this.built = buildLevel(this, this.level, this.grid);
    if (theme.tileTint !== 0xffffff) {
      for (const tile of this.built.solids.getChildren() as Phaser.GameObjects.Image[]) {
        if (tile.getData('kind') === 'ground') tile.setTint(theme.tileTint);
      }
    }
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

    this.fireballs = this.physics.add.group({ allowGravity: true });
    this.items = this.physics.add.group({ allowGravity: false });

    charactersFor(this.mode).forEach((id, i) => {
      const controls = new CombinedControls([
        new KeyboardControls(this, i === 0 ? INPUT_PROFILES.player1 : INPUT_PROFILES.player2),
        new GamepadControls(i),
      ]);
      const player = new Player(this, this.built.spawn.x + i * PLAYER_SPACING, this.built.spawn.bottom, controls, CHARACTERS[id]);
      player.on('jump', () => {
        this.sfx.play('jump');
        this.puff(player.x, player.arcadeBody.bottom, 3);
      });
      player.on('airjump', () => {
        this.sfx.play('jump');
        this.puff(player.x, player.arcadeBody.bottom, 5);
        this.sparkEmitter.explode(4, player.x, player.arcadeBody.bottom);
      });
      player.on('grow', () => {
        this.sfx.play('powerup');
        this.sparkEmitter.explode(14, player.x, player.y);
      });
      player.on('land', () => {
        this.sfx.play('land');
        this.puff(player.x, player.arcadeBody.bottom, 6);
      });
      player.on('hurt', () => this.sfx.play('hurt'));
      player.on('fire', () => this.shootFireball(player));
      player.on('died', () => this.onPlayerDied(player));
      this.players.push(player);
    });

    this.physics.add.collider(this.fireballs, this.built.solids, (f) => this.onFireballSolid(f as Phaser.Physics.Arcade.Sprite));
    this.physics.add.collider(
      this.items,
      this.built.solids,
      (i) => this.onItemSolid(i as Phaser.Physics.Arcade.Sprite),
      (i) => (i as Phaser.Physics.Arcade.Sprite).getData('ready') === true,
    );

    for (const spec of this.level.enemies) {
      const cx = (spec.x + 0.5) * TILE;
      let enemy: Enemy;
      if (spec.kind === 'corvo-umbral') enemy = new CorvoUmbral(this, cx, (spec.y + 0.5) * TILE);
      else if (spec.kind === 'ourico-cristal') enemy = new CogumeloSombrio(this, cx, (spec.y + 1) * TILE, OURICO_CONFIG);
      else enemy = new CogumeloSombrio(this, cx, (spec.y + 1) * TILE);
      this.enemies.push(enemy);
      if (spec.kind !== 'corvo-umbral') this.physics.add.collider(enemy as unknown as Phaser.Physics.Arcade.Sprite, this.built.solids);
      for (const player of this.players) this.physics.add.overlap(player, enemy as unknown as Phaser.Physics.Arcade.Sprite, () => this.onEnemyTouch(player, enemy));
    }

    for (const player of this.players) {
      for (const mover of this.built.movers) this.physics.add.collider(player, mover, () => this.riding.add(player));
      this.physics.add.overlap(player, this.items, (_p, i) => this.collectItem(player, i as Phaser.Physics.Arcade.Sprite));
      this.physics.add.collider(player, this.built.solids, (_p, tile) => this.onSolidTouch(player, tile as Phaser.Physics.Arcade.Sprite));
      this.physics.add.overlap(player, this.built.coins, (_p, coin) => this.collectCoin(player, coin as Phaser.Physics.Arcade.Sprite));
      this.physics.add.overlap(player, this.built.spikes, (_p, spike) => {
        if (!player.dead) player.takeHit((spike as Phaser.Physics.Arcade.Sprite).x);
      });
      for (const cp of this.built.checkpoints) {
        this.physics.add.overlap(player, cp.zone, () => this.activateCheckpoint(cp, player));
      }
      this.physics.add.overlap(player, this.built.goalZone, () => this.onGoal(player));
    }

    if (this.level.boss) {
      this.goalOpen = false;
      for (const visual of this.built.goalVisuals) visual.setVisible(false);
      this.bossFight = new BossFight(this, this.level.boss, this.built.solids, this.players, {
        onHit: () => {
          this.sfx.play('stomp');
          this.cameras.main.shake(160, 0.004);
          this.progress.addScore(STOMP_SCORE);
        },
        onWall: () => {
          this.sfx.play('bump');
          this.cameras.main.shake(260, 0.008);
        },
        onDefeated: () => this.onBossDefeated(),
      });
    }

    // A câmera segue um ponto invisível: o jogador (solo) ou o meio entre os dois (cooperativo).
    this.camTarget = this.add.zone(this.player.x, GAME_HEIGHT / 2, 1, 1);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, (this.level.mainWidthTiles ?? this.level.widthTiles) * TILE, worldH);
    cam.setBackgroundColor('#6EC3F0');
    cam.startFollow(this.camTarget, true, 0.12, 1);
    cam.setScroll(0, 0);
    cam.fadeIn(350, 16, 32, 44);

    this.input.keyboard?.on('keydown-P', () => this.pause());
    this.input.keyboard?.on('keydown-ESC', () => this.pause());
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.keyboard?.on('keydown-M', () => {
      this.sfx.muted = !this.sfx.muted;
      this.music.setMuted(this.sfx.muted);
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

    this.platformClock += dt;
    for (const mover of this.built.movers) mover.follow(this.platformClock, dt);
    for (const p of this.players) p.update(dt, time);

    const view = { scrollX: cam.scrollX, viewWidth: GAME_WIDTH, marginLeft: 6, marginRight: 6 };
    for (const p of this.players) {
      if (p.dead || p.victory || this.finished) continue;
      // Ninguém sai pela esquerda da tela; no cooperativo também não se foge pela direita.
      const body = p.arcadeBody;
      const fit = clampToView(body.x, body.width, view, this.players.length > 1);
      if (fit.clamped !== 0) {
        body.x = fit.x;
        if ((fit.clamped < 0 && body.velocity.x < 0) || (fit.clamped > 0 && body.velocity.x > 0)) body.setVelocityX(0);
      }
      // Não guarda como ponto seguro o que está sobre plataforma móvel (ela se afasta).
      if (p.onGround && !this.riding.has(p)) this.lastSafe.set(p, { x: p.x, bottom: body.bottom });
      if (p.y > GAME_HEIGHT + 140) p.kill();
    }

    if (!this.finished && this.players.some((p) => !p.dead && !p.victory)) {
      this.elapsed += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft === 0) this.onTimeUp();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy) continue;
      if (!enemy.active) {
        this.enemies.splice(i, 1);
        continue;
      }
      const target = this.players[nearestAlive(enemy.x, this.players)];
      const alive = enemy.tick(this.grid, target?.x ?? enemy.x, target?.y ?? enemy.y, target !== undefined, cam.scrollX + GAME_WIDTH / 2);
      if (!alive) {
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }

    this.bossFight?.step(dt, this.players);
    this.riding.clear();
    this.updateWarps();
    this.updateRegion();
    this.updateCamera(dt);
    this.updateFireballs(time);
    this.bg.update(cam.scrollX, time);
    this.emitHud();
  }

  /** ↓ sobre um cano ou diante de uma porta leva a equipe para o destino. */
  private updateWarps(): void {
    if (this.warping || this.finished || this.built.warps.length === 0) return;
    for (const p of this.players) {
      if (p.dead || p.victory || !p.downPressed || !p.onGround) continue;
      const bottom = p.arcadeBody.bottom;
      const warp = this.built.warps.find((w) => Math.abs(p.x - w.x) <= w.halfW && Math.abs(bottom - w.feetY) <= 8);
      if (warp) {
        this.startWarp(warp);
        return;
      }
    }
  }

  private startWarp(warp: WarpPoint): void {
    this.warping = true;
    const team = this.players.filter((p) => !p.dead && !p.victory);
    this.sfx.play('powerup');
    for (const p of team) {
      p.locked = true;
      p.arcadeBody.setVelocity(0, 0);
      this.tweens.add({ targets: p, alpha: 0, y: warp.kind === 'cano' ? p.y + 36 * PX : p.y, duration: 220 });
    }
    const cam = this.cameras.main;
    this.time.delayedCall(200, () => cam.fadeOut(160, 16, 32, 44));
    this.time.delayedCall(380, () => {
      team.forEach((p, i) => {
        if (p.dead) return;
        p.teleport(warp.toX + i * PLAYER_SPACING, warp.toBottom);
        p.locked = false;
        this.lastSafe.set(p, { x: p.x, bottom: warp.toBottom });
      });
      this.updateRegion(true);
      cam.fadeIn(220, 16, 32, 44);
      this.warping = false;
    });
  }

  /** Troca os limites da câmera quando a equipe está numa sala secreta (ou volta à fase). */
  private updateRegion(snap = false): void {
    const lead = this.players.find((p) => !p.dead && !p.victory);
    if (!lead || this.level.rooms.length === 0) return;
    const col = lead.x / TILE;
    const idx = this.level.rooms.findIndex((r) => col >= r.x && col < r.x + r.w);
    if (idx === this.region && !snap) return;
    this.region = idx;
    const room = idx >= 0 ? this.level.rooms[idx] : undefined;
    const x0 = room ? room.x * TILE : 0;
    const x1 = room ? (room.x + room.w) * TILE : (this.level.mainWidthTiles ?? this.level.widthTiles) * TILE;
    const cam = this.cameras.main;
    cam.setBounds(x0, 0, x1 - x0, this.level.heightTiles * TILE);
    this.camTarget.setPosition(lead.x, GAME_HEIGHT / 2);
    cam.setScroll(Math.min(Math.max(lead.x - GAME_WIDTH / 2, x0), x1 - GAME_WIDTH), 0);
  }

  private updateCamera(dt: number): void {
    const focus = cameraFocusX(this.players.map((p) => ({ x: p.x, dead: p.dead, reachedGoal: p.victory })));
    if (focus !== null) this.camTarget.setPosition(focus, GAME_HEIGHT / 2);
    // Olha um pouco à frente na direção do movimento (média dos jogadores em jogo).
    const moving = this.players.filter((p) => !p.dead && !p.victory);
    const looks = moving.map((p) => (Math.abs(p.arcadeBody.velocity.x) > 40 ? p.facing * 90 : 0));
    const targetLook = looks.length > 0 ? looks.reduce((a, b) => a + b, 0) / looks.length : 0;
    this.lookAhead += (targetLook - this.lookAhead) * Math.min(1, dt * 3);
    this.cameras.main.setFollowOffset(-this.lookAhead, 0);
  }

  /** Tempo esgotado: todos os jogadores em jogo perdem, mas a equipe gasta uma única vida. */
  private onTimeUp(): void {
    const victims = this.players.filter((p) => !p.dead && !p.victory);
    this.freeDeaths = victims.length - 1;
    victims.forEach((p) => p.kill());
    this.freeDeaths = 0;
  }

  private emitHud(): void {
    const snapshot: HudSnapshot = {
      lives: this.progress.lives,
      coins: this.progress.coins,
      score: this.progress.score,
      timeLeft: this.timeLeft,
      levelId: this.level.id,
      levelName: this.level.name,
      players: this.players.map((p) => ({
        id: p.def.id,
        hp: p.vitality.hp,
        maxHp: p.vitality.maxHp,
        power: p.powers.current,
        dead: p.dead,
      })),
    };
    this.game.events.emit(HUD_EVENT, snapshot);
  }

  private puff(x: number, y: number, count: number): void {
    this.dustEmitter.explode(count, x, y);
  }

  private onSolidTouch(player: Player, tile: Phaser.Physics.Arcade.Sprite): void {
    const kind = tile.getData('kind') as string | undefined;
    if ((kind !== 'brick' && kind !== 'surprise') || this.bumpedThisFrame) return;
    if (!player.arcadeBody.touching.up || tile.getData('bumping') === true) return;
    this.bumpedThisFrame = true;
    if (kind !== 'brick') {
      tile.setData('bumping', true);
      this.tweens.add({
        targets: tile,
        y: tile.y - 11 * PX,
        duration: 80,
        yoyo: true,
        onComplete: () => tile.setData('bumping', false),
      });
    }
    if (kind === 'brick') {
      this.breakBrick(tile);
      return;
    }
    if (kind === 'surprise') {
      tile.setTexture('tile-used');
      tile.setData('kind', 'used');
      const reward = (tile.getData('reward') as string | undefined) ?? 'coin';
      if (reward === 'coin') this.popCoin(tile.x, tile.y - TILE);
      else {
        // A flor de fogo só aparece para quem já é grande; se alguém está pequeno, o bloco entrega a fruta.
        const anySmall = this.players.some((p) => !p.dead && !p.isBig);
        const kind = reward === 'heart' ? 'heart' : reward === 'grow' || anySmall ? 'grow' : 'flor-de-fogo';
        this.spawnItem(kind, tile.x, tile.y);
      }
    }
  }

  /** Tijolo atingido por baixo: quebra, solta estilhaços, dá pontos e derruba inimigos que estavam em cima. */
  private breakBrick(tile: Phaser.Physics.Arcade.Sprite): void {
    const col = tile.getData('col') as number;
    const row = tile.getData('row') as number;
    if (!isBreakable(this.grid.kindAt(col, row))) return;
    const x = tile.x;
    const top = tile.y - TILE / 2;
    this.grid.removeCell(col, row);
    tile.destroy();
    this.progress.addScore(BRICK_SCORE);
    this.sfx.play('break');
    for (const [i, dir] of ([-1, -1, 1, 1] as const).entries()) {
      const shard = this.add.image(x + dir * 12 * PX, tile.y + (i % 2 === 0 ? -10 : 8) * PX, 'brick-shard').setDepth(DEPTH.fx);
      this.tweens.add({ targets: shard, x: shard.x + dir * (50 + i * 12) * PX, angle: dir * 320, duration: 650, ease: 'Quad.easeOut' });
      this.tweens.add({
        targets: shard,
        y: shard.y - (110 - i * 14) * PX,
        duration: 260,
        ease: 'Quad.easeOut',
        yoyo: true,
        onYoyo: () => this.tweens.add({ targets: shard, y: shard.y + 420 * PX, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => shard.destroy() }),
      });
    }
    for (const enemy of this.enemies) {
      if (enemy.dead || !enemy.active) continue;
      const eb = enemy.arcadeBody;
      const onTop = Math.abs(eb.bottom - top) < 10 * PX && Math.abs(enemy.x - x) < TILE * 0.75;
      if (onTop) {
        enemy.knockOut(enemy.x >= x ? 1 : -1);
        this.progress.addScore(STOMP_SCORE);
      }
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

  private spawnItem(kind: 'flor-de-fogo' | 'heart' | 'grow', x: number, y: number): void {
    const key = kind === 'heart' ? 'heart-full' : kind === 'grow' ? 'item-grow' : 'item-flower';
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

  /** Quem encosta primeiro leva o item: poder e coração são individuais, a pontuação é da equipe. */
  private collectItem(player: Player, item: Phaser.Physics.Arcade.Sprite): void {
    if (item.getData('ready') !== true || player.dead || !item.active) return;
    const kind = item.getData('kind') as string;
    this.sparkEmitter.explode(10, item.x, item.y);
    item.destroy();
    this.progress.addScore(ITEM_SCORE);
    this.sfx.play('powerup');
    if (kind === 'heart') {
      player.vitality.heal(1);
      player.grow();
    } else if (kind === 'grow') player.grow();
    else player.powers.collect('flor-de-fogo');
  }

  private shootFireball(owner: Player): void {
    const dir = owner.facing;
    const fb = this.fireballs.create(owner.x + dir * 30 * PX, owner.y + 4 * PX, 'fireball') as Phaser.Physics.Arcade.Sprite;
    fb.setDepth(DEPTH.items + 2);
    fb.setData('born', this.time.now);
    fb.setData('dir', dir);
    fb.setData('owner', owner);
    const body = fb.body as Phaser.Physics.Arcade.Body;
    body.setSize(14 * PX, 14 * PX);
    body.setGravityY(-WORLD_GRAVITY * 0.55);
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
      if (this.bossFight?.fireHit(box)) {
        this.sfx.play('stomp');
        this.explodeFireball(child);
        continue;
      }
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
    // Cada jogador tem o seu próprio limite de bolas de fogo ao mesmo tempo.
    for (const p of this.players) p.activeShots = 0;
    for (const child of this.fireballs.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!child.active) continue;
      const owner = child.getData('owner') as Player | undefined;
      if (owner) owner.activeShots += 1;
    }
  }

  private grantCoin(value: number): void {
    const result = this.progress.collectCoin(value);
    this.progress.addScore(COIN_SCORE * value);
    this.sfx.play(result.lifeGained ? 'life' : 'coin');
  }

  private collectCoin(player: Player, coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active || player.dead) return;
    coin.disableBody(true, true);
    this.sparkEmitter.explode(5, coin.x, coin.y);
    this.grantCoin(1);
  }

  private onEnemyTouch(player: Player, enemy: Enemy): void {
    if (enemy.dead || player.dead || this.finished) return;
    const pb = player.arcadeBody;
    const eb = enemy.arcadeBody;
    const falling = pb.velocity.y > 40 * PX;
    const fromAbove = pb.bottom - eb.top < eb.height * 0.6;
    if (falling && fromAbove && enemy.stompable) {
      enemy.squash();
      player.bounce();
      this.progress.addScore(STOMP_SCORE);
      this.sfx.play('stomp');
      this.puff(enemy.x, eb.bottom, 5);
      return;
    }
    player.takeHit(enemy.x);
  }

  private activateCheckpoint(cp: CheckpointObject, player: Player): void {
    if (cp.active || player.dead) return;
    cp.active = true;
    cp.sprite.setTexture('checkpoint-on');
    this.checkpoint = { x: cp.x, bottom: cp.bottom };
    this.sparkEmitter.explode(10, cp.x, cp.bottom - TILE * 1.1);
    this.sfx.play('checkpoint');
  }

  /** Cada morte custa uma vida da equipe (exceto mortes simultâneas por tempo) e agenda o renascimento. */
  private onPlayerDied(player: Player): void {
    this.sfx.play('death');
    if (this.freeDeaths > 0) this.freeDeaths -= 1;
    else this.progress.loseLife();
    this.time.delayedCall(RESPAWN_DELAY_MS, () => this.resolveRespawn(player));
  }

  private resolveRespawn(player: Player): void {
    if (!player.dead) return; // já renasceu junto com o parceiro, no checkpoint
    const partner = this.players.find((q) => q !== player && !q.dead);
    const outcome = resolveDeath(this.progress.lives, partner !== undefined);
    if (outcome === 'game-over') {
      if (this.gameOverShown) return;
      this.gameOverShown = true;
      const who = this.players.length > 1 ? 'A equipe precisa de mais coragem!' : 'Zion precisa de mais coragem!';
      this.showEndOverlay('FIM DE JOGO', [who], 'TENTAR DE NOVO');
      return;
    }
    if (outcome === 'respawn-near-partner' && partner) {
      // Volta perto do parceiro, no último ponto firme onde ele pisou (sem tela preta).
      const spot = this.lastSafe.get(partner) ?? this.checkpoint;
      player.respawn(spot.x, spot.bottom);
      return;
    }
    if (this.fading) return;
    this.fading = true;
    const cam = this.cameras.main;
    cam.fadeOut(260, 16, 32, 44);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.timeLeft = Math.max(this.timeLeft, 120);
      this.players
        .filter((q) => q.dead)
        .forEach((q, i) => q.respawn(this.checkpoint.x + i * PLAYER_SPACING, this.checkpoint.bottom));
      const maxScroll = this.level.widthTiles * TILE - GAME_WIDTH;
      this.camTarget.setPosition(this.checkpoint.x, GAME_HEIGHT / 2);
      cam.setScroll(Phaser.Math.Clamp(this.checkpoint.x - GAME_WIDTH / 2, 0, maxScroll), 0);
      this.fading = false;
      cam.fadeIn(260, 16, 32, 44);
    });
  }

  /** Um jogador chegou à bandeira. A fase só termina quando todos os da partida chegarem. */
  private onGoal(player: Player): void {
    if (!this.goalOpen || this.finished || player.dead || player.victory) return;
    const first = this.goal.count === 0;
    this.goal.reach(player.def.id);
    player.celebrate();
    this.sfx.play('win');
    this.sparkEmitter.explode(24, player.x, player.y - 40);
    if (first) {
      this.tweens.add({
        targets: this.built.banner,
        y: this.built.bannerLowY,
        duration: 900,
        ease: 'Sine.easeInOut',
      });
    }
    if (this.goal.isComplete(this.players.map((p) => p.def.id))) this.finishLevel();
  }

  private onBossDefeated(): void {
    this.progress.addScore(BOSS_SCORE);
    this.sfx.play('win');
    this.cameras.main.flash(300, 255, 240, 180);
    this.time.delayedCall(1800, () => {
      this.goalOpen = true;
      for (const visual of this.built.goalVisuals) visual.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.built.goalVisuals, alpha: 1, duration: 600 });
      this.sparkEmitter.explode(30, this.built.goalZone.x, this.built.goalZone.y);
    });
  }

  private finishLevel(): void {
    this.finished = true;
    const bonus = Math.floor(this.timeLeft) * TIME_BONUS_PER_SECOND;
    this.progress.addScore(bonus);
    const previousBest = saveManager.data.bestScores[this.level.id] ?? 0;
    const stars = computeStars({
      coinsCollected: this.progress.totalCoinsCollected,
      totalCoins: this.level.coins.length,
      timeLeft: this.timeLeft,
      timeLimit: this.level.timeLimit,
    });
    saveManager.recordLevelComplete(this.level.id, this.progress.score, this.progress.totalCoinsCollected, stars);
    const seconds = Math.floor(this.elapsed);
    const lines = [
      `Tempo: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}   •   Estrelas: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`,
      `Bônus de tempo: ${bonus}`,
      `Pontuação: ${String(this.progress.score).padStart(6, '0')}${this.progress.score > previousBest ? '  ★ Novo recorde!' : ''}`,
    ];
    const next = nextLevelId(this.level.id);
    if (!next) lines.push('Você derrotou o Imperador Umbrax! Fim da aventura.');
    this.time.delayedCall(1700, () => this.showEndOverlay('FASE CONCLUÍDA!', lines, 'JOGAR DE NOVO', next));
  }

  private pause(): void {
    if (this.finished || this.fading || this.players.some((p) => p.dead) || this.scene.isPaused()) return;
    this.scene.launch(SCENE_KEYS.Pause);
    this.scene.pause();
  }

  private showEndOverlay(title: string, lines: string[], primaryLabel: string, next: string | null = null): void {
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
    const toMap = (): void => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.WorldSelect);
    };
    const small = { height: 56, fontSize: 26, fill: Phaser.Display.Color.HexStringToColor(PALETTE.roxoUmbrax).color };
    if (next) {
      fixed(createButton(this, cx, 440, 'PRÓXIMA FASE', () => this.scene.start(SCENE_KEYS.Game, { levelId: next })));
      fixed(createButton(this, cx, 510, primaryLabel, () => this.scene.restart(), { ...small, fill: Phaser.Display.Color.HexStringToColor(PALETTE.azulZion).color }));
      fixed(createButton(this, cx, 574, 'MAPA DE MUNDOS', toMap, small));
    } else {
      fixed(createButton(this, cx, 470, primaryLabel, () => this.scene.restart()));
      fixed(createButton(this, cx, 556, 'MAPA DE MUNDOS', toMap, small));
    }
  }

  /** Utilitário de depuração/validação (usado pelos scripts de teste visual). */
  debugState(): Record<string, unknown> {
    const p = this.player;
    return {
      x: Math.round(p.x),
      y: Math.round(p.y),
      vx: Math.round(p.arcadeBody.velocity.x),
      vy: Math.round(p.arcadeBody.velocity.y),
      onGround: p.onGround,
      hp: p.vitality.hp,
      lives: this.progress.lives,
      coins: this.progress.coins,
      score: this.progress.score,
      dead: p.dead,
      finished: this.finished,
      enemies: this.enemies.filter((e) => e.active && !e.dead).length,
      checkpoint: this.checkpoint.x,
      power: p.powers.current,
      shots: this.fireballs.countActive(true),
      items: this.items.countActive(true),
      totalCoins: this.progress.totalCoinsCollected,
      timeLeft: Math.round(this.timeLeft),
      jumpVelocity: ZION_PARAMS.jumpVelocity,
      mode: this.mode,
      levelId: this.level.id,
      goalOpen: this.goalOpen,
      boss: this.bossFight ? { hp: this.bossFight.boss.ai.hp, mode: this.bossFight.boss.ai.mode, x: Math.round(this.bossFight.boss.x) } : null,
      enemyKinds: this.enemies.map((e) => e.kind),
      goalReached: this.goal.count,
      scrollX: Math.round(this.cameras.main.scrollX),
      players: this.players.map((q) => ({
        id: q.def.id,
        x: Math.round(q.x),
        y: Math.round(q.y),
        vx: Math.round(q.arcadeBody.velocity.x),
        onGround: q.onGround,
        hp: q.vitality.hp,
        power: q.powers.current,
        dead: q.dead,
        victory: q.victory,
        shots: q.activeShots,
        height: Math.round(q.arcadeBody.height),
      })),
    };
  }
}
