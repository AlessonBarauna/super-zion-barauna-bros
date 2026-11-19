import Phaser from 'phaser';
import { PALETTE } from '../game/constants';

export const UI_FONT = "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 360;
  const h = opts.height ?? 74;
  const fill = opts.fill ?? Phaser.Display.Color.HexStringToColor(PALETTE.verdeBarauna).color;
  const gfx = scene.add.graphics();
  const draw = (hover: boolean): void => {
    gfx.clear();
    gfx.fillStyle(0x000000, 0.28);
    gfx.fillRoundedRect(-w / 2 + 3, -h / 2 + 7, w, h, 22);
    gfx.fillStyle(hover ? 0xffe27a : 0xf7c948, 1);
    gfx.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 24);
    gfx.fillStyle(0x1b2a3a, 1);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    gfx.fillStyle(fill, 1);
    gfx.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 17);
    gfx.fillStyle(0xffffff, 0.22);
    gfx.fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, (h - 16) * 0.38, 12);
  };
  draw(false);
  const text = scene.add
    .text(0, -1, label, {
      fontFamily: UI_FONT,
      fontStyle: 'bold',
      fontSize: `${opts.fontSize ?? 34}px`,
      color: PALETTE.creme,
      stroke: PALETTE.contorno,
      strokeThickness: 6,
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [gfx, text]);
  container.setSize(w + 8, h + 8);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 1.05, duration: 90 });
  });
  container.on('pointerout', () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 90 });
  });
  container.on('pointerdown', onClick);
  return container;
}
