import Phaser from 'phaser';

export type SfxName = 'jump' | 'coin' | 'stomp' | 'hurt' | 'bump' | 'checkpoint' | 'life' | 'win' | 'death' | 'land';

interface Tone {
  from: number;
  to: number;
  dur: number;
  type: OscillatorType;
  vol: number;
  delay?: number;
}

const SOUNDS: Record<SfxName, Tone[]> = {
  jump: [{ from: 320, to: 640, dur: 0.16, type: 'square', vol: 0.5 }],
  coin: [
    { from: 988, to: 988, dur: 0.07, type: 'triangle', vol: 0.7 },
    { from: 1319, to: 1319, dur: 0.22, type: 'triangle', vol: 0.7, delay: 0.07 },
  ],
  stomp: [{ from: 260, to: 70, dur: 0.14, type: 'square', vol: 0.6 }],
  hurt: [{ from: 340, to: 90, dur: 0.32, type: 'sawtooth', vol: 0.5 }],
  bump: [{ from: 140, to: 90, dur: 0.1, type: 'sine', vol: 0.9 }],
  land: [{ from: 110, to: 60, dur: 0.07, type: 'sine', vol: 0.6 }],
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
};

/** Efeitos sonoros sintetizados via Web Audio (temporários até a trilha/SFX originais). */
export class Sfx {
  muted = false;

  constructor(private readonly scene: Phaser.Scene) {}

  play(name: SfxName): void {
    if (this.muted) return;
    const manager = this.scene.sound;
    if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) return;
    const ctx = manager.context;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const t of SOUNDS[name]) {
      const start = now + (t.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.from, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.dur);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14 * t.vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
      osc.connect(gain).connect(manager.masterVolumeNode);
      osc.start(start);
      osc.stop(start + t.dur + 0.02);
    }
  }
}
