import Phaser from 'phaser';

import { SOUNDS, type SfxName } from './sfxData';

export type { SfxName } from './sfxData';

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
