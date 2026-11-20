import { circle, ellipse, fillStroke, OUT, polygon, roundRectPath, type Ctx } from './canvasArt';
import type { BossKind } from '../levels/types';

/**
 * Corpos próprios dos chefões dos mundos 2 a 8 (o Gronk, do mundo 1, fica em creatureArt).
 * Moldura 132×124, pés em y≈118. Arte original e provisória, em Canvas2D.
 */
export type BossPose = 'walk0' | 'walk1' | 'windup' | 'stunned';

type Drawer = (ctx: Ctx, pose: BossPose) => void;

const stepOf = (pose: BossPose): number => (pose === 'walk0' ? 4 : pose === 'walk1' ? -4 : 0);

function xEyes(ctx: Ctx, xs: number[], y: number, s = 6): void {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  for (const x of xs) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
  }
}

function eyes(ctx: Ctx, pose: BossPose, xs: number[], y: number, r = 9, glow = '#E03030'): void {
  if (pose === 'stunned') return xEyes(ctx, xs, y);
  for (const x of xs) {
    ellipse(ctx, x, y, r, r * 1.1);
    fillStroke(ctx, '#FFFFFF', 2.4);
    circle(ctx, x + (x < 66 ? 2 : -2), y + 2, r * 0.45);
    ctx.fillStyle = pose === 'windup' ? glow : OUT;
    ctx.fill();
  }
}

/** KRAGOR — golem de cristal: corpo de pedra facetada e cristais brotando dos ombros. */
const kragor: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const stone = '#5D6490';
  const dark = '#444A72';
  for (const [x, off] of [[44, o], [88, -o]] as const) {
    roundRectPath(ctx, x - 14, 96 + off / 2, 28, 22, 6);
    fillStroke(ctx, dark, 3);
  }
  polygon(ctx, [[30, 56], [102, 56], [112, 106], [20, 106]]);
  fillStroke(ctx, stone, 3.4);
  polygon(ctx, [[48, 72], [84, 72], [92, 100], [40, 100]]);
  fillStroke(ctx, '#7E86B8', 2.4);
  // cristal do peito
  polygon(ctx, [[66, 70], [76, 86], [66, 102], [56, 86]]);
  fillStroke(ctx, pose === 'windup' ? '#FFE98A' : '#7FE9FF', 2.4);
  // ombros com cristais
  for (const side of [-1, 1]) {
    polygon(ctx, [[66 + side * 40, 56], [66 + side * 62, 46], [66 + side * 56, 74], [66 + side * 38, 76]]);
    fillStroke(ctx, dark, 3);
    polygon(ctx, [[66 + side * 52, 50], [66 + side * 58, 22], [66 + side * 64, 52]]);
    fillStroke(ctx, side < 0 ? '#C58BFF' : '#7FE9FF', 2.6);
    const armY = pose === 'stunned' ? 98 : pose === 'windup' ? 56 : 84;
    roundRectPath(ctx, 66 + side * 52 - 13, armY, 26, 28, 9);
    fillStroke(ctx, stone, 3);
  }
  // cabeça
  polygon(ctx, [[42, 34], [54, 10], [78, 10], [90, 34], [82, 58], [50, 58]]);
  fillStroke(ctx, '#737BAA', 3.4);
  polygon(ctx, [[58, 12], [66, -6], [74, 12]]);
  fillStroke(ctx, '#7FE9FF', 2.6);
  if (pose === 'stunned') xEyes(ctx, [56, 76], 34);
  else {
    for (const x of [56, 76]) {
      polygon(ctx, [[x - 8, 28], [x + 8, 28], [x + 5, 41], [x - 5, 41]]);
      fillStroke(ctx, pose === 'windup' ? '#FFE98A' : '#7FE9FF', 2.2);
    }
  }
  ellipse(ctx, 66, 51, 11, 4);
  fillStroke(ctx, '#2A1530', 2.2);
};

/** SAKHUR — escorpião do deserto: corpo baixo e largo, pinças enormes e cauda com ferrão. */
const sakhur: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const shell = '#C98A2E';
  const light = '#E8B35A';
  // pernas
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(66 + side * 22, 100 + i * 5);
      ctx.lineTo(66 + side * (42 + i * 6), 114 + (i % 2 === 0 ? o : -o) / 2);
      ctx.stroke();
    }
  }
  // cauda curvada por trás, com ferrão
  const tail: Array<[number, number, number]> = [[96, 92, 9], [106, 74, 8.5], [106, 54, 8], [96, 36, 8], [80, 26, 8]];
  const lift = pose === 'windup' ? -10 : pose === 'stunned' ? 18 : 0;
  tail.forEach(([x, y, r], i) => {
    circle(ctx, x, y + (i > 1 ? lift : 0), r);
    fillStroke(ctx, i % 2 === 0 ? shell : light, 2.6);
  });
  polygon(ctx, [[74, 28 + lift], [84, 18 + lift], [64, 14 + lift]]);
  fillStroke(ctx, pose === 'windup' ? '#E03030' : '#F2E2B0', 2.4);
  // corpo
  ellipse(ctx, 66, 92, 44, 24);
  fillStroke(ctx, shell, 3.4);
  ellipse(ctx, 66, 96, 28, 13);
  fillStroke(ctx, light, 2.2);
  // pinças
  const clawY = pose === 'stunned' ? 100 : pose === 'windup' ? 56 : 74;
  for (const side of [-1, 1]) {
    ellipse(ctx, 66 + side * 52, clawY + 8, 12, 14);
    fillStroke(ctx, shell, 3);
    polygon(ctx, [[66 + side * 44, clawY - 4], [66 + side * 54, clawY - 28], [66 + side * 62, clawY - 2], [66 + side * 56, clawY + 6]]);
    fillStroke(ctx, light, 3);
    polygon(ctx, [[66 + side * 60, clawY - 2], [66 + side * 70, clawY - 18], [66 + side * 68, clawY + 8]]);
    fillStroke(ctx, shell, 3);
  }
  // cabeça
  roundRectPath(ctx, 40, 52, 52, 36, 16);
  fillStroke(ctx, shell, 3.4);
  eyes(ctx, pose, [54, 78], 66, 8);
  ellipse(ctx, 66, 82, 12, 4);
  fillStroke(ctx, '#2A1530', 2);
  for (const x of [58, 74]) polygon(ctx, [[x - 3, 80], [x, 86], [x + 3, 80]]), fillStroke(ctx, '#FFFFFF', 1.2);
};

/** FROSTAK — yeti de gelo: pelagem de pontas, coroa de gelo e presas. */
const frostak: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const fur = '#DDF3FF';
  const shade = '#9FCBE6';
  for (const [x, off] of [[44, o], [88, -o]] as const) {
    ellipse(ctx, x, 114, 17, 8 + (off > 0 ? 1 : 0));
    fillStroke(ctx, shade, 3);
  }
  // pelagem em zigue-zague
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (Math.PI * i) / 18;
    const r = i % 2 === 0 ? 1 : 0.88;
    pts.push([66 + Math.cos(a) * 48 * r, 108 + Math.sin(a) * 58 * r]);
  }
  pts.push([114, 108], [18, 108]);
  polygon(ctx, pts);
  fillStroke(ctx, fur, 3.4);
  ellipse(ctx, 66, 90, 24, 18);
  fillStroke(ctx, '#FFFFFF', 2.2);
  // braços com garras de gelo
  const armY = pose === 'stunned' ? 90 : pose === 'windup' ? 52 : 72;
  for (const side of [-1, 1]) {
    ellipse(ctx, 66 + side * 54, armY, 14, 22, side * 0.3);
    fillStroke(ctx, fur, 3);
    for (const dx of [-6, 0, 6]) {
      polygon(ctx, [[66 + side * 54 + dx - 3, armY + 16], [66 + side * 54 + dx, armY + 30], [66 + side * 54 + dx + 3, armY + 16]]);
      fillStroke(ctx, '#7FD3FF', 1.8);
    }
  }
  // cabeça e rosto
  roundRectPath(ctx, 30, 12, 72, 58, 26);
  fillStroke(ctx, fur, 3.4);
  roundRectPath(ctx, 40, 26, 52, 38, 16);
  fillStroke(ctx, '#5E92C4', 2.6);
  // coroa de gelo
  for (const [x, h] of [[40, 20], [53, 30], [66, 38], [79, 30], [92, 20]] as const) {
    polygon(ctx, [[x - 7, 18], [x, 18 - h], [x + 7, 18]]);
    fillStroke(ctx, '#BDEBFF', 2.4);
  }
  eyes(ctx, pose, [54, 78], 40, 8, '#FFE066');
  ellipse(ctx, 66, 58, 14, 6);
  fillStroke(ctx, '#2A1530', 2.4);
  for (const x of [56, 76]) polygon(ctx, [[x - 4, 55], [x, 70], [x + 4, 55]]), fillStroke(ctx, '#FFFFFF', 1.8);
};

/** VYRAK — planta carnívora gigante: raízes, caule grosso, folhas e boca de armadilha. */
const vyrak: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const green = '#2F8F5B';
  const light = '#6FD08F';
  // raízes
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const [dx, off] of [[-28, o], [-10, -o], [10, o], [28, -o]] as const) {
    ctx.beginPath();
    ctx.moveTo(66 + dx / 2, 104);
    ctx.quadraticCurveTo(66 + dx, 118, 66 + dx * 1.4, 118 + off / 4);
    ctx.stroke();
  }
  // folhas-braço
  const leafUp = pose === 'windup' ? -0.9 : pose === 'stunned' ? 0.9 : -0.3;
  for (const side of [-1, 1]) {
    ellipse(ctx, 66 + side * 46, 82, 26, 10, side * leafUp);
    fillStroke(ctx, light, 3);
    ellipse(ctx, 66 + side * 52, 80, 14, 4, side * leafUp);
    fillStroke(ctx, green, 1.4);
  }
  // caule
  roundRectPath(ctx, 46, 62, 40, 52, 16);
  fillStroke(ctx, green, 3.4);
  ellipse(ctx, 66, 96, 12, 12);
  fillStroke(ctx, light, 2);
  // cabeça: mandíbula de baixo + boca + mandíbula de cima
  const open = pose === 'windup' ? 22 : pose === 'stunned' ? 3 : 10;
  const drop = pose === 'stunned' ? 14 : 0;
  ellipse(ctx, 66, 62 + open / 2 + drop, 38, 14);
  fillStroke(ctx, '#B32D3A', 3);
  for (let x = 36; x <= 96; x += 12) polygon(ctx, [[x - 4, 62 + drop], [x, 52 + drop + open / 3], [x + 4, 62 + drop]]), fillStroke(ctx, '#FFFFFF', 1.4);
  ellipse(ctx, 66, 36 + drop - open / 3, 42, 28);
  fillStroke(ctx, green, 3.4);
  ellipse(ctx, 66, 24 + drop - open / 3, 26, 12);
  fillStroke(ctx, light, 2);
  for (let x = 38; x <= 94; x += 14) polygon(ctx, [[x - 5, 52 + drop - open / 3], [x, 62 + drop - open / 3], [x + 5, 52 + drop - open / 3]]), fillStroke(ctx, '#FFFFFF', 1.4);
  eyes(ctx, pose, [52, 80], 32 + drop - open / 3, 8, '#FFE066');
  // flor na cabeça
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    ellipse(ctx, 66 + Math.cos(a) * 9, -2 + Math.sin(a) * 9 + drop / 2, 7, 5, a);
    fillStroke(ctx, '#FF8FB1', 2);
  }
  circle(ctx, 66, -2 + drop / 2, 5);
  fillStroke(ctx, '#FFE066', 2);
};

/** MECHAZORD — robô de engrenagens: corpo de placas rebitadas, visor vermelho e pistões. */
const mechazord: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const metal = '#6C7480';
  const light = '#A7AFBB';
  // pernas-pistão
  for (const [x, off] of [[42, o], [90, -o]] as const) {
    roundRectPath(ctx, x - 6, 92, 12, 18 + off / 2, 3);
    fillStroke(ctx, light, 2.6);
    polygon(ctx, [[x - 18, 118], [x + 18, 118], [x + 13, 104 + off / 2], [x - 13, 104 + off / 2]]);
    fillStroke(ctx, '#4A515C', 3);
  }
  // tronco
  roundRectPath(ctx, 24, 48, 84, 58, 10);
  fillStroke(ctx, metal, 3.6);
  roundRectPath(ctx, 38, 60, 56, 34, 6);
  fillStroke(ctx, '#2F353F', 2.6);
  // engrenagem no peito
  ctx.save();
  ctx.translate(66, 77);
  ctx.rotate(pose === 'walk1' ? 0.4 : pose === 'windup' ? 0.2 : 0);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16;
    const r = i % 2 === 0 ? 17 : 12;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  fillStroke(ctx, pose === 'windup' ? '#FF7A3D' : '#F2C94C', 2.4);
  circle(ctx, 0, 0, 5);
  fillStroke(ctx, '#2F353F', 2);
  ctx.restore();
  for (const [x, y] of [[32, 54], [100, 54], [32, 100], [100, 100]] as const) {
    circle(ctx, x, y, 2.6);
    fillStroke(ctx, light, 1.4);
  }
  // braços com garras
  const armY = pose === 'stunned' ? 92 : pose === 'windup' ? 54 : 74;
  for (const side of [-1, 1]) {
    roundRectPath(ctx, 66 + side * 56 - 10, armY - 18, 20, 38, 6);
    fillStroke(ctx, light, 3);
    polygon(ctx, [[66 + side * 56 - 12, armY + 18], [66 + side * 56 + 12, armY + 18], [66 + side * 56 + 8, armY + 34], [66 + side * 56, armY + 26], [66 + side * 56 - 8, armY + 34]]);
    fillStroke(ctx, '#4A515C', 2.6);
  }
  // cabeça
  const tilt = pose === 'stunned' ? 0.18 : 0;
  ctx.save();
  ctx.translate(66, 30);
  ctx.rotate(tilt);
  roundRectPath(ctx, -32, -26, 64, 48, 10);
  fillStroke(ctx, metal, 3.6);
  roundRectPath(ctx, -24, -12, 48, 20, 6);
  fillStroke(ctx, '#1B1F27', 2.6);
  if (pose === 'stunned') xEyes(ctx, [-10, 10], -2, 5);
  else {
    roundRectPath(ctx, -20, -8, 40, 12, 4);
    ctx.fillStyle = pose === 'windup' ? '#FF3B30' : '#E0453A';
    ctx.fill();
    if (pose === 'walk0') {
      roundRectPath(ctx, -20, -8, 14, 12, 4);
      ctx.fillStyle = '#FFB3AD';
      ctx.fill();
    }
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, -38);
  ctx.stroke();
  circle(ctx, 0, -40, 5);
  fillStroke(ctx, pose === 'windup' ? '#FF3B30' : '#F2C94C', 2.4);
  ctx.restore();
};

/** AURON — guardião solar: corpo dourado, asas abertas e coroa de raios. */
const auron: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const gold = '#E7A71C';
  const light = '#FFE58A';
  const wingLift = pose === 'windup' ? -22 : pose === 'stunned' ? 26 : o * 1.5;
  for (const side of [-1, 1]) {
    // asas em penas
    for (let i = 0; i < 4; i++) {
      const y = 50 + i * 12;
      polygon(ctx, [[66 + side * 26, y], [66 + side * (60 + i * 3), y + wingLift - 6 + i * 4], [66 + side * (56 + i * 3), y + wingLift + 12 + i * 4], [66 + side * 26, y + 14]]);
      fillStroke(ctx, i % 2 === 0 ? '#FFF6D0' : light, 2.6);
    }
  }
  // patas
  for (const [x, off] of [[50, o], [82, -o]] as const) {
    polygon(ctx, [[x - 10, 118], [x + 10, 118], [x + 6, 104 + off / 3], [x - 6, 104 + off / 3]]);
    fillStroke(ctx, '#F2873A', 2.8);
  }
  // corpo
  ellipse(ctx, 66, 84, 34, 30);
  fillStroke(ctx, gold, 3.6);
  ellipse(ctx, 66, 90, 20, 20);
  fillStroke(ctx, light, 2.4);
  // símbolo solar no peito
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    polygon(ctx, [[66 + Math.cos(a - 0.2) * 7, 90 + Math.sin(a - 0.2) * 7], [66 + Math.cos(a) * 15, 90 + Math.sin(a) * 15], [66 + Math.cos(a + 0.2) * 7, 90 + Math.sin(a + 0.2) * 7]]);
    ctx.fillStyle = pose === 'windup' ? '#FF7A3D' : '#F2873A';
    ctx.fill();
  }
  // cabeça com máscara
  circle(ctx, 66, 36, 28);
  fillStroke(ctx, gold, 3.6);
  ellipse(ctx, 66, 40, 20, 18);
  fillStroke(ctx, '#FFF6D0', 2.4);
  // raios da coroa
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / 7;
    polygon(ctx, [[66 + Math.cos(a - 0.14) * 30, 36 + Math.sin(a - 0.14) * 30], [66 + Math.cos(a) * 46, 36 + Math.sin(a) * 46], [66 + Math.cos(a + 0.14) * 30, 36 + Math.sin(a + 0.14) * 30]]);
    fillStroke(ctx, i % 2 === 0 ? '#FFD34D' : '#FFF6D0', 2.4);
  }
  eyes(ctx, pose, [57, 75], 38, 6.5, '#FF3B30');
  polygon(ctx, [[60, 46], [66, 56], [72, 46]]);
  fillStroke(ctx, '#F2873A', 2);
};

/** UMBRAX — senhor das sombras: manto sem pés, capuz com chifres e olhos acesos. */
const umbrax: Drawer = (ctx, pose) => {
  const o = stepOf(pose);
  const cloak = '#3A1D5E';
  const mid = '#5A2D85';
  // aura
  ellipse(ctx, 66, 76, 54, 46);
  ctx.fillStyle = pose === 'windup' ? 'rgba(214,120,255,0.28)' : 'rgba(150,80,220,0.18)';
  ctx.fill();
  // manto com barra ondulada
  const hem: Array<[number, number]> = [[18, 116 + o / 2]];
  for (let i = 1; i <= 8; i++) hem.push([18 + i * 12, i % 2 === 0 ? 112 + o / 2 : 120 - o / 2]);
  polygon(ctx, [[34, 44], [98, 44], [118, 108], ...hem.reverse().map(([x, y]) => [x, y] as [number, number]), [14, 108]]);
  fillStroke(ctx, cloak, 3.6);
  polygon(ctx, [[50, 60], [82, 60], [92, 108], [40, 108]]);
  fillStroke(ctx, mid, 2.4);
  // mãos em garra
  const handY = pose === 'stunned' ? 100 : pose === 'windup' ? 48 : 78;
  for (const side of [-1, 1]) {
    ellipse(ctx, 66 + side * 54, handY + 6, 11, 16, side * 0.4);
    fillStroke(ctx, mid, 3);
    for (const dx of [-5, 0, 5]) {
      polygon(ctx, [[66 + side * 54 + dx - 2.5, handY + 16], [66 + side * 54 + dx, handY + 30], [66 + side * 54 + dx + 2.5, handY + 16]]);
      fillStroke(ctx, pose === 'windup' ? '#E6A7FF' : '#C58BFF', 1.6);
    }
  }
  // capuz
  polygon(ctx, [[34, 56], [40, 22], [66, 8], [92, 22], [98, 56], [82, 64], [50, 64]]);
  fillStroke(ctx, cloak, 3.6);
  ellipse(ctx, 66, 40, 24, 20);
  fillStroke(ctx, '#0E0618', 2.4);
  // chifres em meia-lua
  for (const side of [-1, 1]) {
    polygon(ctx, [[66 + side * 26, 20], [66 + side * 50, 6], [66 + side * 56, -10], [66 + side * 40, 8], [66 + side * 24, 28]]);
    fillStroke(ctx, '#E8D2FF', 2.6);
  }
  if (pose === 'stunned') {
    ctx.strokeStyle = '#FFE066';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    for (const x of [56, 76]) {
      ctx.beginPath();
      ctx.moveTo(x - 6, 40);
      ctx.lineTo(x + 6, 40);
      ctx.stroke();
    }
  } else {
    for (const x of [56, 76]) {
      polygon(ctx, [[x - 9, 36], [x + 9, 36], [x + 4, 46], [x - 4, 46]]);
      fillStroke(ctx, pose === 'windup' ? '#FF3B30' : '#FFE066', 2);
    }
  }
  ellipse(ctx, 66, 56, 11, 3.6);
  fillStroke(ctx, '#C58BFF', 1.6);
};

export const BOSS_DRAWERS: Partial<Record<BossKind, Drawer>> = {
  kragor,
  sakhur,
  frostak,
  vyrak,
  mechazord,
  auron,
  umbrax,
};
