import Phaser from 'phaser';
import { canvasTexture, circle, ellipse, fillStroke, polygon, roundRectPath, type Ctx } from './canvasArt';

/**
 * Cenário de cada mundo: plantas, rochas e cristais próprios, para que as fases não pareçam
 * o mesmo campo com outra cor. Tudo desenhado em vetor, com a base do desenho encostada no chão.
 */

type Painter = (ctx: Ctx) => void;

const cactus: Painter = (c) => {
  roundRectPath(c, 20, 8, 18, 88, 9);
  fillStroke(c, '#4FAE4A', 2.6);
  roundRectPath(c, 4, 38, 16, 9, 4.5);
  fillStroke(c, '#4FAE4A', 2.4);
  roundRectPath(c, 4, 24, 9, 22, 4.5);
  fillStroke(c, '#4FAE4A', 2.4);
  roundRectPath(c, 38, 52, 16, 9, 4.5);
  fillStroke(c, '#4FAE4A', 2.4);
  roundRectPath(c, 45, 36, 9, 25, 4.5);
  fillStroke(c, '#4FAE4A', 2.4);
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(24, 14, 4, 72);
  circle(c, 29, 10, 4);
  fillStroke(c, '#F28B78', 1.8);
};

const rock: Painter = (c) => {
  polygon(c, [[3, 38], [10, 14], [26, 6], [44, 10], [58, 26], [61, 38]]);
  fillStroke(c, '#B9A98F', 2.6);
  polygon(c, [[10, 14], [26, 6], [30, 18], [16, 24]]);
  fillStroke(c, '#D4C7AE', 1.8);
};

const crystalA: Painter = (c) => {
  polygon(c, [[18, 86], [12, 34], [26, 4], [40, 34], [36, 86]]);
  fillStroke(c, '#5FD6E8', 2.6);
  polygon(c, [[26, 4], [40, 34], [36, 86], [28, 86]]);
  fillStroke(c, '#38AEC8', 2);
  polygon(c, [[4, 86], [2, 56], [10, 44], [16, 60], [16, 86]]);
  fillStroke(c, '#8EE6F2', 2.2);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(21, 16, 3, 30);
};

const crystalB: Painter = (c) => {
  polygon(c, [[10, 62], [8, 26], [22, 4], [34, 28], [32, 62]]);
  fillStroke(c, '#B58CF0', 2.6);
  polygon(c, [[22, 4], [34, 28], [32, 62], [24, 62]]);
  fillStroke(c, '#8B5CD0', 2);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fillRect(15, 14, 3, 24);
};

const pine: Painter = (c) => {
  c.fillStyle = '#7A4A28';
  c.fillRect(31, 92, 10, 26);
  for (const [top, w, h] of [[4, 34, 38], [32, 44, 42], [62, 56, 46]] as const) {
    polygon(c, [[36, top], [36 + w / 2, top + h], [36 - w / 2, top + h]]);
    fillStroke(c, '#2F7F55', 2.6);
    polygon(c, [[36, top], [36 + w / 4, top + h * 0.38], [36 - w / 4, top + h * 0.38]]);
    fillStroke(c, '#FFFFFF', 1.8);
  }
};

const ice: Painter = (c) => {
  polygon(c, [[10, 66], [8, 30], [22, 4], [34, 26], [40, 66]]);
  fillStroke(c, '#CDEFFF', 2.6);
  polygon(c, [[22, 4], [34, 26], [40, 66], [26, 66]]);
  fillStroke(c, '#9FD6F0', 2);
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.fillRect(16, 16, 3, 28);
};

const jungleTree: Painter = (c) => {
  roundRectPath(c, 36, 60, 18, 98, 6);
  fillStroke(c, '#6B4423', 2.8);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(46, 64, 6, 92);
  for (const [x, y, r, col] of [[24, 54, 24, '#2F9E44'], [66, 50, 26, '#37A94B'], [45, 28, 30, '#43B95A'], [18, 80, 14, '#2A8B3D'], [74, 78, 15, '#2A8B3D']] as const) {
    circle(c, x, y, r);
    fillStroke(c, col, 2.6);
  }
  for (const [x, y] of [[50, 100], [50, 130]] as const) {
    c.strokeStyle = '#2A8B3D';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 12, y + 14, x + 4, y + 26);
    c.stroke();
  }
};

const fern: Painter = (c) => {
  for (const [dx, rot] of [[-16, -0.9], [-8, -0.45], [0, 0], [8, 0.45], [16, 0.9]] as const) {
    ellipse(c, 30 + dx, 30, 5.5, 24, rot);
    fillStroke(c, dx === 0 ? '#3DBA54' : '#2E9E45', 2.2);
  }
};

const gear: Painter = (c) => {
  const cx = 35;
  const cy = 35;
  c.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 3 === 0 ? 33 : 26;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  fillStroke(c, '#B7793F', 2.8);
  circle(c, cx, cy, 11);
  fillStroke(c, '#7A4A28', 2.4);
  circle(c, cx, cy, 4);
  fillStroke(c, '#E9B84E', 1.8);
};

const chimney: Painter = (c) => {
  c.fillStyle = '#8D5B3B';
  roundRectPath(c, 8, 18, 32, 92, 3);
  fillStroke(c, '#A8683F', 2.8);
  roundRectPath(c, 4, 8, 40, 16, 3);
  fillStroke(c, '#6B6B77', 2.6);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1.6;
  for (let y = 34; y < 108; y += 14) {
    c.beginPath();
    c.moveTo(9, y);
    c.lineTo(39, y);
    c.stroke();
  }
};

const cloudBush: Painter = (c) => {
  for (const [x, y, r] of [[20, 26, 14], [38, 18, 18], [58, 26, 15], [40, 30, 14]] as const) {
    circle(c, x, y, r);
    fillStroke(c, '#FFFFFF', 2.4);
  }
  c.fillStyle = 'rgba(190,200,255,0.5)';
  c.fillRect(10, 32, 60, 6);
};

const deadTree: Painter = (c) => {
  c.strokeStyle = '#1B1030';
  c.lineWidth = 12;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(40, 130);
  c.quadraticCurveTo(34, 90, 42, 52);
  c.stroke();
  for (const [x1, y1, x2, y2] of [[40, 100, 14, 76], [41, 76, 68, 54], [42, 56, 28, 30], [42, 56, 52, 24]] as const) {
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }
  c.strokeStyle = '#5B3F8E';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(40, 130);
  c.quadraticCurveTo(34, 90, 42, 52);
  c.stroke();
  for (const [x1, y1, x2, y2] of [[40, 100, 14, 76], [41, 76, 68, 54], [42, 56, 28, 30], [42, 56, 52, 24]] as const) {
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }
};

const glowMushroom: Painter = (c) => {
  roundRectPath(c, 14, 18, 8, 16, 3);
  fillStroke(c, '#E8DFF5', 2.2);
  c.beginPath();
  c.ellipse(18, 18, 15, 12, 0, Math.PI, 0);
  c.closePath();
  fillStroke(c, '#E05CC4', 2.4);
  for (const [x, y] of [[11, 12], [20, 9], [25, 14]] as const) {
    circle(c, x, y, 1.8);
    c.fillStyle = '#FFE9FA';
    c.fill();
  }
};

interface PropDef {
  key: string;
  w: number;
  h: number;
  paint: Painter;
}

const PROPS: PropDef[] = [
  { key: 'prop-cactus', w: 58, h: 98, paint: cactus },
  { key: 'prop-rock', w: 64, h: 40, paint: rock },
  { key: 'prop-crystal-a', w: 52, h: 90, paint: crystalA },
  { key: 'prop-crystal-b', w: 44, h: 66, paint: crystalB },
  { key: 'prop-pine', w: 72, h: 120, paint: pine },
  { key: 'prop-ice', w: 50, h: 70, paint: ice },
  { key: 'prop-jungle-tree', w: 92, h: 162, paint: jungleTree },
  { key: 'prop-fern', w: 60, h: 56, paint: fern },
  { key: 'prop-gear', w: 70, h: 70, paint: gear },
  { key: 'prop-chimney', w: 48, h: 112, paint: chimney },
  { key: 'prop-cloud-bush', w: 80, h: 48, paint: cloudBush },
  { key: 'prop-dead-tree', w: 80, h: 132, paint: deadTree },
  { key: 'prop-glow-mushroom', w: 36, h: 36, paint: glowMushroom },
];

export function createThemeTextures(scene: Phaser.Scene): void {
  for (const p of PROPS) canvasTexture(scene, p.key, p.w, p.h, p.paint);
}

export interface ThemeDecor {
  /** Peças altas (uma a cada poucos blocos). */
  big: string[];
  /** Peças baixas, mais frequentes. */
  small: string[];
  /** Escala base das peças altas. */
  bigScale: number;
}

export const THEME_DECOR: Record<string, ThemeDecor> = {
  cavernas: { big: ['prop-crystal-a', 'prop-crystal-b'], small: ['prop-glow-mushroom', 'prop-rock'], bigScale: 0.95 },
  deserto: { big: ['prop-cactus'], small: ['prop-rock'], bigScale: 0.9 },
  montanhas: { big: ['prop-pine'], small: ['prop-ice', 'prop-rock'], bigScale: 0.95 },
  selva: { big: ['prop-jungle-tree'], small: ['prop-fern', 'prop-fern'], bigScale: 0.85 },
  engrenagens: { big: ['prop-chimney'], small: ['prop-gear', 'prop-rock'], bigScale: 0.95 },
  nuvens: { big: ['prop-cloud-bush'], small: ['prop-cloud-bush'], bigScale: 1.1 },
  abismo: { big: ['prop-dead-tree', 'prop-crystal-b'], small: ['prop-glow-mushroom'], bigScale: 0.95 },
};
