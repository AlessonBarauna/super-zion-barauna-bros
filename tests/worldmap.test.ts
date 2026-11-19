import { describe, expect, it } from 'vitest';
import { defaultSave, migrateSave, sanitizeSave, SaveManager, SAVE_KEY, type StorageLike } from '../src/systems/save';
import { computeStars, isLevelUnlocked, isWorldUnlocked, suggestedLevel, totalStars } from '../src/systems/worldMap';

const mem = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('mapa de mundos', () => {
  it('começa só com 1-1 aberto', () => {
    const s = defaultSave();
    expect(isLevelUnlocked(s, '1-1')).toBe(true);
    expect(isLevelUnlocked(s, '1-2')).toBe(false);
    expect(isLevelUnlocked(s, '2-1')).toBe(false);
    expect(isWorldUnlocked(s, 2)).toBe(false);
    expect(suggestedLevel(s)).toBe('1-1');
  });

  it('concluir uma fase abre a seguinte; concluir as 4 abre o próximo mundo', () => {
    const m = new SaveManager(mem());
    m.recordLevelComplete('1-1', 100, 10);
    expect(isLevelUnlocked(m.data, '1-2')).toBe(true);
    expect(isLevelUnlocked(m.data, '1-3')).toBe(false);
    for (const id of ['1-2', '1-3', '1-4']) m.recordLevelComplete(id, 100, 0);
    expect(isWorldUnlocked(m.data, 2)).toBe(true);
    expect(isLevelUnlocked(m.data, '2-1')).toBe(true);
    expect(suggestedLevel(m.data)).toBe('2-1');
  });

  it('estrelas: conclusão, 80% das moedas e 40% do tempo; guarda o melhor resultado', () => {
    expect(computeStars({ coinsCollected: 0, totalCoins: 50, timeLeft: 0, timeLimit: 300 })).toBe(1);
    expect(computeStars({ coinsCollected: 40, totalCoins: 50, timeLeft: 0, timeLimit: 300 })).toBe(2);
    expect(computeStars({ coinsCollected: 40, totalCoins: 50, timeLeft: 120, timeLimit: 300 })).toBe(3);
    expect(computeStars({ coinsCollected: 0, totalCoins: 0, timeLeft: 0, timeLimit: 300 })).toBe(1);
    const m = new SaveManager(mem());
    m.recordLevelComplete('1-1', 1, 0, 3);
    m.recordLevelComplete('1-1', 1, 0, 1);
    expect(m.data.stars['1-1']).toBe(3);
    expect(totalStars(m.data)).toBe(3);
  });

  it('migra save v1: quem já concluiu ganha 1 estrela e nada se perde', () => {
    const v1 = { version: 1, unlockedWorlds: 2, completedLevels: ['1-1', '1-2'], bestScores: { '1-1': 500 }, totalCoins: 7, mode: 'coop', settings: { muted: true } };
    const r = migrateSave(v1);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const d = sanitizeSave(r.data);
    expect(d.stars).toEqual({ '1-1': 1, '1-2': 1 });
    expect(d.bestScores['1-1']).toBe(500);
    expect(d.mode).toBe('coop');
    expect(d.version).toBe(2);
  });

  it('save v1 no armazenamento é carregado e migrado sem virar "corrompido"', () => {
    const st = mem();
    st.setItem(SAVE_KEY, JSON.stringify({ version: 1, unlockedWorlds: 1, completedLevels: ['1-1'], bestScores: {}, totalCoins: 0, mode: 'solo', settings: { muted: false } }));
    const m = new SaveManager(st);
    const r = m.load();
    expect(r.status).toBe('ok');
    expect(m.data.stars['1-1']).toBe(1);
  });

  it('estrelas inválidas são limpas', () => {
    const d = sanitizeSave({ version: 2, stars: { '1-1': 9, '9-9': 2, '1-2': -4, '1-3': 'x' } });
    expect(d.stars).toEqual({ '1-1': 3, '1-2': 0 });
  });
});
