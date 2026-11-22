import { describe, expect, it } from 'vitest';
import { SOUNDS, type SfxName } from '../src/systems/sfxData';

const NEW: SfxName[] = ['airjump', 'grow', 'warp', 'warn', 'orb', 'rock', 'quake', 'immune', 'bossdown'];

describe('efeitos sonoros', () => {
  it('todo efeito tem tons válidos (frequências e durações positivas, volume 0-1)', () => {
    for (const [name, tones] of Object.entries(SOUNDS)) {
      expect(tones.length, name).toBeGreaterThan(0);
      for (const t of tones) {
        expect(t.from, name).toBeGreaterThan(0);
        expect(t.to, name).toBeGreaterThan(0);
        expect(t.dur, name).toBeGreaterThan(0);
        expect(t.dur, name).toBeLessThan(2);
        expect(t.vol, name).toBeGreaterThan(0);
        expect(t.vol, name).toBeLessThanOrEqual(1);
        expect(t.delay ?? 0, name).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('os efeitos novos existem e o pulo duplo soa mais agudo que o pulo', () => {
    for (const n of NEW) expect(SOUNDS[n], n).toBeDefined();
    expect(SOUNDS.airjump[0]!.from).toBeGreaterThan(SOUNDS.jump[0]!.from);
    expect(SOUNDS.airjump[0]!.dur).toBeLessThan(SOUNDS.jump[0]!.dur);
  });

  it('o aviso do chefão é grave e dá tempo de reagir (termina antes do ataque, 0,85 s)', () => {
    const end = Math.max(...SOUNDS.warn.map((t) => (t.delay ?? 0) + t.dur));
    expect(end).toBeLessThan(0.85);
    for (const t of SOUNDS.warn) expect(t.from).toBeLessThan(300);
  });
});
