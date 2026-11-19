import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  migrateSave,
  SAVE_KEY,
  SAVE_VERSION,
  sanitizeSave,
  SaveManager,
  type Migration,
  type StorageLike,
} from '../src/systems/save';

class MemoryStorage implements StorageLike {
  store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const roundTrip = (storage: MemoryStorage): SaveManager => {
  const m = new SaveManager(storage);
  m.load();
  return m;
};

describe('valores padrão e validação', () => {
  it('padrão: mundo 1 liberado, nada concluído, som ligado', () => {
    const d = defaultSave();
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.unlockedWorlds).toBe(1);
    expect(d.completedLevels).toEqual([]);
    expect(d.settings.muted).toBe(false);
    expect(d.mode).toBe('solo');
  });

  it('lixo vira padrão', () => {
    for (const junk of [null, 42, 'x', [], undefined]) expect(sanitizeSave(junk)).toEqual(defaultSave());
  });

  it('preserva campos válidos e corrige os inválidos individualmente', () => {
    const s = sanitizeSave({
      unlockedWorlds: 99,
      completedLevels: ['1-1', '1-1', '9-9', 'abc', 7, '2-3'],
      bestScores: { '1-1': 1234.9, '1-2': -5, xx: 10, '2-1': 'alto' },
      totalCoins: -3,
      mode: 'coop',
      settings: { muted: true },
    });
    expect(s.unlockedWorlds).toBe(8);
    expect(s.completedLevels).toEqual(['1-1', '2-3']);
    expect(s.bestScores).toEqual({ '1-1': 1234 });
    expect(s.totalCoins).toBe(0);
    expect(s.mode).toBe('coop');
    expect(s.settings.muted).toBe(true);
  });

  it('nunca libera menos que o mundo 1', () => {
    expect(sanitizeSave({ unlockedWorlds: 0 }).unlockedWorlds).toBe(1);
  });
});

describe('migração de versões', () => {
  const chain: Record<number, Migration> = {
    1: (d) => ({ ...d, extra: 'v2' }),
    2: (d) => ({ ...d, extra2: 'v3' }),
  };

  it('aplica as migrações em cadeia até a versão alvo', () => {
    const r = migrateSave({ version: 1, a: 1 }, chain, 3);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.data).toMatchObject({ version: 3, a: 1, extra: 'v2', extra2: 'v3' });
    }
  });

  it('save já na versão atual passa direto', () => {
    expect(migrateSave({ version: SAVE_VERSION }).status).toBe('ok');
  });

  it('versão mais nova que o jogo é reconhecida (não é destruída)', () => {
    expect(migrateSave({ version: SAVE_VERSION + 1 }).status).toBe('newer');
  });

  it('migração ausente ou versão inválida é inválido', () => {
    expect(migrateSave({ version: 1 }, {}, 3).status).toBe('invalid');
    expect(migrateSave({ version: 'x' }).status).toBe('invalid');
    expect(migrateSave({}).status).toBe('invalid');
    expect(migrateSave(null).status).toBe('invalid');
  });
});

describe('SaveManager', () => {
  it('sem save: começa novo', () => {
    const m = new SaveManager(new MemoryStorage());
    expect(m.load().status).toBe('new');
  });

  it('grava e relê o progresso de uma fase concluída', () => {
    const st = new MemoryStorage();
    const m = roundTrip(st);
    m.recordLevelComplete('1-1', 4130, 18);
    const again = roundTrip(st);
    expect(again.status).toBe('ok');
    expect(again.data.completedLevels).toEqual(['1-1']);
    expect(again.data.bestScores['1-1']).toBe(4130);
    expect(again.data.totalCoins).toBe(18);
  });

  it('mantém a melhor pontuação e acumula moedas', () => {
    const m = roundTrip(new MemoryStorage());
    m.recordLevelComplete('1-1', 5000, 10);
    m.recordLevelComplete('1-1', 3000, 5);
    expect(m.data.bestScores['1-1']).toBe(5000);
    expect(m.data.totalCoins).toBe(15);
    expect(m.data.completedLevels).toEqual(['1-1']);
  });

  it('concluir as 4 fases do mundo libera o próximo; menos que isso não', () => {
    const m = roundTrip(new MemoryStorage());
    m.recordLevelComplete('1-1', 1, 0);
    m.recordLevelComplete('1-2', 1, 0);
    m.recordLevelComplete('1-3', 1, 0);
    expect(m.data.unlockedWorlds).toBe(1);
    m.recordLevelComplete('1-4', 1, 0);
    expect(m.data.unlockedWorlds).toBe(2);
  });

  it('ignora id de fase inválido', () => {
    const m = roundTrip(new MemoryStorage());
    m.recordLevelComplete('banana', 100, 5);
    expect(m.data.completedLevels).toEqual([]);
  });

  it('dados corrompidos: volta ao padrão e guarda cópia do original', () => {
    const st = new MemoryStorage();
    st.setItem(SAVE_KEY, '{quebrado');
    const m = new SaveManager(st);
    expect(m.load().status).toBe('corrupt');
    expect(m.data).toEqual(defaultSave());
    expect(st.getItem(`${SAVE_KEY}.corrupt`)).toBe('{quebrado');
  });

  it('JSON válido sem versão também é tratado como corrompido', () => {
    const st = new MemoryStorage();
    st.setItem(SAVE_KEY, JSON.stringify({ completedLevels: ['1-1'] }));
    expect(new SaveManager(st).load().status).toBe('corrupt');
  });

  it('save de versão mais nova não é sobrescrito', () => {
    const st = new MemoryStorage();
    const future = JSON.stringify({ version: SAVE_VERSION + 5, segredo: true });
    st.setItem(SAVE_KEY, future);
    const m = new SaveManager(st);
    expect(m.load().status).toBe('newer');
    m.recordLevelComplete('1-1', 100, 1);
    expect(st.getItem(SAVE_KEY)).toBe(future);
  });

  it('preferência de som é persistida', () => {
    const st = new MemoryStorage();
    roundTrip(st).setMuted(true);
    expect(roundTrip(st).data.settings.muted).toBe(true);
  });

  it('modo de jogo (solo/cooperativo) é persistido', () => {
    const st = new MemoryStorage();
    expect(roundTrip(st).data.mode).toBe('solo');
    roundTrip(st).setMode('coop');
    expect(roundTrip(st).data.mode).toBe('coop');
  });

  it('armazenamento que lança erro não derruba o jogo', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cheio');
      },
    };
    const m = new SaveManager(broken);
    expect(m.load().status).toBe('new');
    expect(() => m.recordLevelComplete('1-1', 1, 1)).not.toThrow();
    expect(m.save()).toBe(false);
  });

  it('sem armazenamento (null) funciona em memória', () => {
    const m = new SaveManager(null);
    expect(m.load().status).toBe('new');
    m.recordLevelComplete('1-1', 10, 2);
    expect(m.data.completedLevels).toEqual(['1-1']);
  });
});
