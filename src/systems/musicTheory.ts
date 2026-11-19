import type { WorldTheme } from '../levels/types';

/**
 * Composição procedural original (sem Phaser, testável): cada mundo tem escala, andamento,
 * progressão de acordes e uma melodia gerada de forma determinística. Tudo é provisório
 * até existir uma trilha gravada.
 */

export interface Note {
  /** Início em batidas. */
  beat: number;
  /** Duração em batidas. */
  dur: number;
  /** Frequência em Hz. */
  freq: number;
  voice: 'lead' | 'bass' | 'pad';
}

export interface MusicStyle {
  bpm: number;
  /** Graus da escala em semitons a partir da tônica. */
  scale: number[];
  /** Tônica como nota MIDI. */
  root: number;
  /** Progressão (grau da escala do baixo por compasso). */
  chords: number[];
  lead: OscillatorType;
  swing: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 2, 4, 7, 9];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export const STYLES: Record<WorldTheme, MusicStyle> = {
  oliveiras: { bpm: 132, scale: MAJOR, root: 60, chords: [0, 3, 4, 0], lead: 'square', swing: false },
  cavernas: { bpm: 104, scale: DORIAN, root: 57, chords: [0, 5, 3, 4], lead: 'triangle', swing: false },
  deserto: { bpm: 118, scale: PHRYGIAN, root: 59, chords: [0, 1, 0, 6], lead: 'sawtooth', swing: true },
  montanhas: { bpm: 96, scale: PENTA, root: 62, chords: [0, 2, 4, 2], lead: 'triangle', swing: false },
  selva: { bpm: 126, scale: DORIAN, root: 58, chords: [0, 4, 3, 4], lead: 'square', swing: true },
  engrenagens: { bpm: 140, scale: MINOR, root: 57, chords: [0, 0, 5, 4], lead: 'sawtooth', swing: false },
  nuvens: { bpm: 108, scale: MAJOR, root: 65, chords: [0, 4, 5, 3], lead: 'triangle', swing: false },
  abismo: { bpm: 112, scale: MINOR, root: 52, chords: [0, 5, 6, 4], lead: 'sawtooth', swing: false },
};

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

const BEATS_PER_BAR = 4;
export const BARS = 8;
export const LOOP_BEATS = BARS * BEATS_PER_BAR;

/** Altura em MIDI para o grau `degree` (pode passar de uma oitava) da escala. */
export function scaleNote(style: MusicStyle, degree: number): number {
  const len = style.scale.length;
  const oct = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return style.root + oct * 12 + (style.scale[idx] ?? 0);
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gera um laço de 8 compassos (baixo, pad de acorde e melodia) para o tema. */
export function composeLoop(theme: WorldTheme, boss = false): Note[] {
  const style = STYLES[theme];
  const rand = mulberry([...theme].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) + (boss ? 99 : 0));
  const notes: Note[] = [];
  for (let bar = 0; bar < BARS; bar++) {
    const chord = style.chords[bar % style.chords.length] ?? 0;
    const start = bar * BEATS_PER_BAR;
    // baixo: tônica do acorde em colcheias (mais agitado nos chefões)
    const bassSteps = boss ? 8 : 4;
    for (let i = 0; i < bassSteps; i++) {
      const degree = chord - 7 + (i % 4 === 2 ? 4 : 0);
      notes.push({ beat: start + (i * BEATS_PER_BAR) / bassSteps, dur: (BEATS_PER_BAR / bassSteps) * 0.85, freq: midiToFreq(scaleNote(style, degree)), voice: 'bass' });
    }
    // pad: tríade do acorde sustentada
    for (const offset of [0, 2, 4]) {
      notes.push({ beat: start, dur: BEATS_PER_BAR * 0.95, freq: midiToFreq(scaleNote(style, chord + offset - 7)), voice: 'pad' });
    }
    // melodia: movimento por graus próximos, sempre terminando em nota do acorde
    let degree = chord + 2;
    let beat = 0;
    while (beat < BEATS_PER_BAR) {
      const dur = rand() < 0.35 ? 0.5 : rand() < 0.5 ? 1 : 1.5;
      const d = Math.min(dur, BEATS_PER_BAR - beat);
      if (rand() > 0.12) {
        notes.push({ beat: start + beat, dur: d * 0.9, freq: midiToFreq(scaleNote(style, degree)), voice: 'lead' });
      }
      degree += Math.floor(rand() * 5) - 2;
      degree = Math.max(chord - 1, Math.min(chord + 7, degree));
      beat += d;
    }
  }
  return notes;
}

export const beatSeconds = (style: MusicStyle): number => 60 / style.bpm;
