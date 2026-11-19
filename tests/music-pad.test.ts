import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/levels/generator';
import { BARS, composeLoop, LOOP_BEATS, midiToFreq, scaleNote, STYLES } from '../src/systems/musicTheory';
import { DEADZONE, mapPad } from '../src/systems/gamepadMap';

describe('música procedural', () => {
  it('todo mundo tem estilo e um laço de 8 compassos válido', () => {
    for (const w of WORLDS) {
      const style = STYLES[w.theme];
      expect(style, w.theme).toBeDefined();
      const notes = composeLoop(w.theme);
      expect(notes.length).toBeGreaterThan(40);
      for (const n of notes) {
        expect(n.beat).toBeGreaterThanOrEqual(0);
        expect(n.beat + n.dur).toBeLessThanOrEqual(LOOP_BEATS + 0.01);
        expect(n.freq).toBeGreaterThan(20);
        expect(n.freq).toBeLessThan(4000);
      }
      expect(notes.some((n) => n.voice === 'lead') && notes.some((n) => n.voice === 'bass') && notes.some((n) => n.voice === 'pad')).toBe(true);
      expect(BARS).toBe(8);
    }
  });

  it('é determinística e o chefão tem versão própria, mais agitada', () => {
    expect(composeLoop('cavernas')).toEqual(composeLoop('cavernas'));
    const bassNormal = composeLoop('oliveiras').filter((n) => n.voice === 'bass').length;
    const bassBoss = composeLoop('oliveiras', true).filter((n) => n.voice === 'bass').length;
    expect(bassBoss).toBeGreaterThan(bassNormal);
  });

  it('mundos soam diferentes entre si', () => {
    const sig = (t: Parameters<typeof composeLoop>[0]) => composeLoop(t).slice(0, 30).map((n) => Math.round(n.freq)).join(',');
    const all = new Set(WORLDS.map((w) => sig(w.theme)));
    expect(all.size).toBe(WORLDS.length);
  });

  it('converte nota em frequência e respeita a escala', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
    expect(scaleNote(STYLES.oliveiras, 0)).toBe(60);
    expect(scaleNote(STYLES.oliveiras, 7)).toBe(72);
    expect(scaleNote(STYLES.oliveiras, -1)).toBe(59);
  });
});

describe('controle (gamepad)', () => {
  const idle = { axes: [0, 0], buttons: [] as boolean[] };
  const press = (...idx: number[]) => { const b: boolean[] = []; for (const i of idx) b[i] = true; return b; };

  it('sem toque, nada acontece', () => {
    expect(mapPad(idle)).toEqual({ moveX: 0, run: false, jump: false, power: false, pause: false });
  });
  it('analógico respeita a zona morta', () => {
    expect(mapPad({ axes: [DEADZONE - 0.05, 0], buttons: [] }).moveX).toBe(0);
    expect(mapPad({ axes: [0.9, 0], buttons: [] }).moveX).toBe(1);
    expect(mapPad({ axes: [-0.9, 0], buttons: [] }).moveX).toBe(-1);
  });
  it('direcional também move; esquerda+direita se anulam', () => {
    expect(mapPad({ axes: [0, 0], buttons: press(14) }).moveX).toBe(-1);
    expect(mapPad({ axes: [0, 0], buttons: press(15) }).moveX).toBe(1);
    expect(mapPad({ axes: [0, 0], buttons: press(14, 15) }).moveX).toBe(0);
  });
  it('botões: A pula, X/gatilhos correm, B/Y poder, Start pausa', () => {
    expect(mapPad({ axes: [], buttons: press(0) }).jump).toBe(true);
    expect(mapPad({ axes: [], buttons: press(2) }).run).toBe(true);
    expect(mapPad({ axes: [], buttons: press(7) }).run).toBe(true);
    expect(mapPad({ axes: [], buttons: press(1) }).power).toBe(true);
    expect(mapPad({ axes: [], buttons: press(3) }).power).toBe(true);
    expect(mapPad({ axes: [], buttons: press(9) }).pause).toBe(true);
  });
});
