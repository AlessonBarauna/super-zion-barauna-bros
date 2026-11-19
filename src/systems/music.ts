import Phaser from 'phaser';
import type { WorldTheme } from '../levels/types';
import { beatSeconds, composeLoop, LOOP_BEATS, STYLES, type Note } from './musicTheory';

const VOICE_GAIN = { lead: 0.05, bass: 0.07, pad: 0.018 } as const;

/** Toca o laço do tema com um agendador de antecipação (Web Audio). Parar/silenciar é imediato. */
export class MusicPlayer {
  private timer: number | undefined;
  private notes: Note[] = [];
  private loopStart = 0;
  private cursor = 0;
  private gain?: GainNode;
  private theme: WorldTheme = 'oliveiras';
  muted = false;

  constructor(private readonly scene: Phaser.Scene) {}

  private get ctx(): AudioContext | null {
    const m = this.scene.sound;
    return m instanceof Phaser.Sound.WebAudioSoundManager ? m.context : null;
  }

  play(theme: WorldTheme, boss: boolean): void {
    this.stop();
    const ctx = this.ctx;
    const manager = this.scene.sound;
    if (!ctx || !(manager instanceof Phaser.Sound.WebAudioSoundManager)) return;
    this.theme = theme;
    this.notes = composeLoop(theme, boss).sort((a, b) => a.beat - b.beat);
    this.gain = ctx.createGain();
    this.gain.gain.value = this.muted ? 0 : 1;
    this.gain.connect(manager.masterVolumeNode);
    this.loopStart = ctx.currentTime + 0.1;
    this.cursor = 0;
    this.timer = window.setInterval(() => this.schedule(), 100);
    this.schedule();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gain) this.gain.gain.value = muted ? 0 : 1;
  }

  stop(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    this.gain?.disconnect();
    this.gain = undefined;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.gain) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const style = STYLES[this.theme];
    const beat = beatSeconds(style);
    const horizon = ctx.currentTime + 0.4;
    for (let guard = 0; guard < 200; guard++) {
      const note = this.notes[this.cursor];
      if (!note) {
        this.cursor = 0;
        this.loopStart += LOOP_BEATS * beat;
        continue;
      }
      const swing = style.swing && Math.floor(note.beat * 2) % 2 === 1 ? beat * 0.12 : 0;
      const t = this.loopStart + note.beat * beat + swing;
      if (t > horizon) break;
      this.cursor += 1;
      if (t < ctx.currentTime - 0.05) continue;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = note.voice === 'lead' ? style.lead : note.voice === 'bass' ? 'triangle' : 'sine';
      osc.frequency.value = note.freq;
      const peak = VOICE_GAIN[note.voice];
      const dur = note.dur * beat;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.gain);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }
  }
}
