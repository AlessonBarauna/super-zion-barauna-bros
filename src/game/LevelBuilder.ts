import Phaser from 'phaser';
import { TILE_VARIANTS } from '../art/worldArt';
import { seeded } from '../art/canvasArt';
import { MovingPlatform } from '../entities/objects/MovingPlatform';
import { DEPTH, PX, TILE } from './constants';
import { TileGrid, type CellKind } from '../levels/TileGrid';
import type { LevelData } from '../levels/types';

export interface CheckpointObject {
  sprite: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  x: number;
  bottom: number;
  active: boolean;
}

export interface BuiltLevel {
  solids: Phaser.Physics.Arcade.StaticGroup;
  movers: MovingPlatform[];
  coins: Phaser.Physics.Arcade.StaticGroup;
  spikes: Phaser.Physics.Arcade.StaticGroup;
  checkpoints: CheckpointObject[];
  goalZone: Phaser.GameObjects.Zone;
  banner: Phaser.GameObjects.Image;
  /** Mastro e bandeira (escondidos até o fim, nas arenas de chefão). */
  goalVisuals: Phaser.GameObjects.Image[];
  bannerRestY: number;
  bannerLowY: number;
  spawn: { x: number; bottom: number };
}

const center = (tile: number): number => (tile + 0.5) * TILE;

function tileTexture(kind: CellKind, col: number, row: number, grid: TileGrid): string {
  const variant = (col * 7 + row * 13) % TILE_VARIANTS;
  switch (kind) {
    case 'ground':
      return grid.isSolid(col, row - 1) ? `tile-dirt-${variant}` : `tile-grass-${variant}`;
    case 'platform':
      return 'tile-platform';
    case 'brick':
      return 'tile-brick';
    case 'surprise':
      return 'tile-surprise';
    case 'stone':
      return 'tile-stone';
  }
}

/** Constrói a fase (visual + corpos físicos) a partir dos dados. */
export function buildLevel(scene: Phaser.Scene, level: LevelData, grid: TileGrid): BuiltLevel {
  const solids = scene.physics.add.staticGroup();
  const rewards = new Map(level.blocks.filter((b) => b.reward).map((b) => [TileGrid.key(b.x, b.y), b.reward]));

  for (const [key, kind] of grid.entries()) {
    const [colS, rowS] = key.split(',');
    const col = Number(colS);
    const row = Number(rowS);
    const texture = tileTexture(kind, col, row, grid);
    const exposed = !grid.isSolid(col, row - 1) || !grid.isSolid(col - 1, row) || !grid.isSolid(col + 1, row);
    if (kind === 'ground' && !exposed) {
      scene.add.image(center(col), center(row), texture).setDepth(DEPTH.tiles);
      continue;
    }
    const tile = solids.create(center(col), center(row), texture) as Phaser.Physics.Arcade.Sprite;
    tile.setDepth(DEPTH.tiles);
    tile.setData('kind', kind);
    tile.setData('col', col);
    tile.setData('row', row);
    if (kind === 'surprise') tile.setData('reward', rewards.get(key) ?? 'coin');
  }

  const movers = level.movingPlatforms.map((spec) => new MovingPlatform(scene, spec));

  buildPitFill(scene, level);
  buildDecor(scene, level);

  const coins = scene.physics.add.staticGroup();
  level.coins.forEach((c, i) => {
    const coin = coins.create(center(c.x), center(c.y), 'coin-0') as Phaser.Physics.Arcade.Sprite;
    coin.setDepth(DEPTH.items);
    coin.anims.play({ key: 'coin-spin', startFrame: i % 4 });
  });

  const spikes = scene.physics.add.staticGroup();
  for (const s of level.spikes) {
    const spike = spikes.create(center(s.x), (s.y + 1) * TILE - 17 * PX + 1 * PX, 'spikes') as Phaser.Physics.Arcade.Sprite;
    spike.setDepth(DEPTH.items);
    const body = spike.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(TILE * 0.74, 20 * PX, false);
    body.setOffset(TILE * 0.13, 12 * PX);
    spike.refreshBody();
  }

  const checkpoints: CheckpointObject[] = level.checkpoints.map((c) => {
    const x = center(c.x);
    const bottom = (c.y + 1) * TILE;
    const sprite = scene.add.image(x, bottom, 'checkpoint-off').setOrigin(0.5, 1).setDepth(DEPTH.items);
    const zone = scene.add.zone(x, bottom - TILE * 0.6, TILE * 0.9, TILE * 1.2);
    scene.physics.add.existing(zone, true);
    return { sprite, zone, x, bottom, active: false };
  });

  const goalX = center(level.goal.x);
  const goalBottom = (level.goal.y + 1) * TILE;
  const pole = scene.add.image(goalX, goalBottom + 4 * PX, 'flag-pole').setOrigin(0.5, 1).setDepth(DEPTH.items);
  const poleTop = goalBottom + 4 * PX - pole.height;
  const bannerRestY = poleTop + 16 * PX;
  const bannerLowY = goalBottom - 60 * PX;
  const banner = scene.add.image(goalX + 4 * PX, bannerRestY, 'flag-banner').setOrigin(0, 0).setDepth(DEPTH.items);
  scene.tweens.add({
    targets: banner,
    scaleX: 0.9,
    angle: 2,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const goalZone = scene.add.zone(goalX, goalBottom - pole.height / 2, TILE * 0.7, pole.height);
  scene.physics.add.existing(goalZone, true);

  return {
    solids,
    movers,
    coins,
    spikes,
    checkpoints,
    goalZone,
    banner,
    goalVisuals: [pole, banner],
    bannerRestY,
    bannerLowY,
    spawn: { x: center(level.spawn.x), bottom: (level.spawn.y + 1) * TILE },
  };
}

/** Preenche os vãos entre trechos de terreno com um fundo escuro (abismo). */
function buildPitFill(scene: Phaser.Scene, level: LevelData): void {
  const segs = [...level.ground].sort((a, b) => a.from - b.from);
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1];
    const next = segs[i];
    if (!prev || !next || next.from - prev.to <= 1) continue;
    const x0 = (prev.to + 1) * TILE;
    const w = (next.from - prev.to - 1) * TILE;
    const top = level.groundRow * TILE;
    scene.add
      .image(x0, top, 'pit-fill')
      .setOrigin(0, 0)
      .setDisplaySize(w, (level.heightTiles - level.groundRow) * TILE + 60)
      .setDepth(DEPTH.decorBack - 5);
  }
}

/** Elementos decorativos determinísticos: oliveiras, casas, arbustos e flores. */
function buildDecor(scene: Phaser.Scene, level: LevelData): void {
  const rnd = seeded(2026);
  const groundTop = level.groundRow * TILE;
  const houseCols = new Set([6, 20, 30, 94, 118]);
  let nextTreeCol = 0;

  for (const seg of level.ground) {
    for (let col = seg.from; col <= seg.to; col++) {
      const interior = col >= seg.from + 3 && col <= seg.to - 3;
      const x = center(col);

      if (interior && houseCols.has(col)) {
        scene.add
          .image(x, groundTop + 4 * PX, `house-${col % 2}`)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.decorBack - 1)
          .setScale(0.95);
        nextTreeCol = col + 4;
        continue;
      }
      if (interior && col >= nextTreeCol && rnd() < 0.16) {
        scene.add
          .image(x, groundTop + 6 * PX, 'tree-olive')
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.decorBack)
          .setScale(0.8 + rnd() * 0.35);
        nextTreeCol = col + 6;
      }
      const r = rnd();
      if (col > 1 && r < 0.12) {
        scene.add
          .image(x + (rnd() - 0.5) * TILE * 0.5, groundTop + 3 * PX, `bush-${r < 0.06 ? 0 : 1}`)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.items - 1);
      } else if (r < 0.34) {
        const flower = scene.add
          .image(x + (rnd() - 0.5) * TILE * 0.7, groundTop + 4 * PX, `flower-${Math.floor(rnd() * 4)}`)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.items - 1);
        scene.tweens.add({
          targets: flower,
          angle: { from: -5, to: 5 },
          duration: 1200 + rnd() * 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: rnd() * 800,
        });
      }
    }
  }
}
