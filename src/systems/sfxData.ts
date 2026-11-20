/** Receitas dos efeitos sonoros (sem Phaser, para poder testar em Node). */

export type SfxName = 'jump' | 'coin' | 'stomp' | 'hurt' | 'bump' | 'checkpoint' | 'powerup' | 'fire' | 'break' | 'life' | 'win' | 'death' | 'land' | 'airjump' | 'grow' | 'warp' | 'warn' | 'orb' | 'rock' | 'quake' | 'immune' | 'bossdown';

export interface Tone {
  from: number;
  to: number;
  dur: number;
  type: OscillatorType;
  vol: number;
  delay?: number;
}

export const SOUNDS: Record<SfxName, Tone[]> = {
  jump: [{ from: 320, to: 640, dur: 0.16, type: 'square', vol: 0.5 }],
  coin: [
    { from: 988, to: 988, dur: 0.07, type: 'triangle', vol: 0.7 },
    { from: 1319, to: 1319, dur: 0.22, type: 'triangle', vol: 0.7, delay: 0.07 },
  ],
  stomp: [{ from: 260, to: 70, dur: 0.14, type: 'square', vol: 0.6 }],
  hurt: [{ from: 340, to: 90, dur: 0.32, type: 'sawtooth', vol: 0.5 }],
  bump: [{ from: 140, to: 90, dur: 0.1, type: 'sine', vol: 0.9 }],
  land: [{ from: 110, to: 60, dur: 0.07, type: 'sine', vol: 0.6 }],
  break: [
    { from: 240, to: 60, dur: 0.2, type: 'sawtooth', vol: 0.45 },
    { from: 160, to: 50, dur: 0.14, type: 'square', vol: 0.4, delay: 0.02 },
  ],
  fire: [{ from: 900, to: 260, dur: 0.12, type: 'sawtooth', vol: 0.35 }],
  powerup: [
    { from: 392, to: 392, dur: 0.07, type: 'square', vol: 0.4 },
    { from: 523, to: 523, dur: 0.07, type: 'square', vol: 0.4, delay: 0.07 },
    { from: 659, to: 659, dur: 0.07, type: 'square', vol: 0.4, delay: 0.14 },
    { from: 784, to: 1175, dur: 0.22, type: 'square', vol: 0.4, delay: 0.21 },
  ],
  checkpoint: [
    { from: 660, to: 660, dur: 0.1, type: 'triangle', vol: 0.6 },
    { from: 880, to: 880, dur: 0.1, type: 'triangle', vol: 0.6, delay: 0.1 },
    { from: 1175, to: 1175, dur: 0.25, type: 'triangle', vol: 0.6, delay: 0.2 },
  ],
  life: [
    { from: 523, to: 523, dur: 0.1, type: 'square', vol: 0.4 },
    { from: 659, to: 659, dur: 0.1, type: 'square', vol: 0.4, delay: 0.1 },
    { from: 784, to: 784, dur: 0.1, type: 'square', vol: 0.4, delay: 0.2 },
    { from: 1047, to: 1047, dur: 0.3, type: 'square', vol: 0.4, delay: 0.3 },
  ],
  win: [
    { from: 523, to: 523, dur: 0.14, type: 'triangle', vol: 0.7 },
    { from: 659, to: 659, dur: 0.14, type: 'triangle', vol: 0.7, delay: 0.14 },
    { from: 784, to: 784, dur: 0.14, type: 'triangle', vol: 0.7, delay: 0.28 },
    { from: 1047, to: 1047, dur: 0.5, type: 'triangle', vol: 0.7, delay: 0.42 },
  ],
  death: [{ from: 420, to: 60, dur: 0.7, type: 'sawtooth', vol: 0.5 }],
  // Pulo duplo: mais agudo e curto que o primeiro pulo.
  airjump: [{ from: 560, to: 1120, dur: 0.12, type: 'square', vol: 0.4 }],
  // Fruta de Baraúna: sobe em ondas, mais "cheio" que o powerup comum.
  grow: [
    { from: 262, to: 523, dur: 0.12, type: 'triangle', vol: 0.7 },
    { from: 330, to: 659, dur: 0.12, type: 'triangle', vol: 0.7, delay: 0.1 },
    { from: 392, to: 784, dur: 0.12, type: 'triangle', vol: 0.7, delay: 0.2 },
    { from: 523, to: 1319, dur: 0.3, type: 'square', vol: 0.4, delay: 0.3 },
  ],
  // Entrar em cano/porta: sopro descendente.
  warp: [
    { from: 700, to: 140, dur: 0.32, type: 'triangle', vol: 0.8 },
    { from: 350, to: 70, dur: 0.32, type: 'sine', vol: 0.8, delay: 0.04 },
  ],
  // Aviso do chefão: dois toques graves (dá tempo de reagir).
  warn: [
    { from: 180, to: 180, dur: 0.14, type: 'square', vol: 0.55 },
    { from: 150, to: 150, dur: 0.2, type: 'square', vol: 0.55, delay: 0.18 },
  ],
  orb: [{ from: 1400, to: 300, dur: 0.22, type: 'sawtooth', vol: 0.4 }],
  rock: [
    { from: 200, to: 50, dur: 0.22, type: 'sawtooth', vol: 0.6 },
    { from: 90, to: 40, dur: 0.18, type: 'sine', vol: 0.9, delay: 0.02 },
  ],
  quake: [
    { from: 100, to: 35, dur: 0.5, type: 'sine', vol: 1 },
    { from: 220, to: 60, dur: 0.3, type: 'sawtooth', vol: 0.5, delay: 0.02 },
  ],
  // Golpe inútil (chefão imune): "tlim" metálico curto.
  immune: [
    { from: 1500, to: 1500, dur: 0.05, type: 'square', vol: 0.4 },
    { from: 1100, to: 1100, dur: 0.12, type: 'triangle', vol: 0.5, delay: 0.04 },
  ],
  bossdown: [
    { from: 400, to: 80, dur: 0.6, type: 'sawtooth', vol: 0.6 },
    { from: 523, to: 523, dur: 0.12, type: 'triangle', vol: 0.6, delay: 0.7 },
    { from: 659, to: 659, dur: 0.12, type: 'triangle', vol: 0.6, delay: 0.82 },
    { from: 784, to: 784, dur: 0.12, type: 'triangle', vol: 0.6, delay: 0.94 },
    { from: 1047, to: 1047, dur: 0.6, type: 'triangle', vol: 0.7, delay: 1.06 },
  ],
};
