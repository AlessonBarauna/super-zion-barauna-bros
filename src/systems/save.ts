/**
 * Salvamento persistente com versão de schema, validação, tratamento de dados
 * corrompidos, valores padrão e migração. Lógica pura (sem Phaser): o armazenamento
 * entra por uma interface mínima, de modo que os testes rodam em Node.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'szbb.save';
export const MAX_WORLDS = 8;

export type GameMode = 'solo' | 'coop';

export interface SaveData {
  version: number;
  unlockedWorlds: number;
  completedLevels: string[];
  bestScores: Record<string, number>;
  totalCoins: number;
  mode: GameMode;
  settings: { muted: boolean };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Migrações de versões anteriores: a chave N converte um save da versão N para N+1. */
export const MIGRATIONS: Record<number, Migration> = {};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlockedWorlds: 1,
    completedLevels: [],
    bestScores: {},
    totalCoins: 0,
    mode: 'solo',
    settings: { muted: false },
  };
}

const LEVEL_ID = /^[1-8]-[1-4]$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonNegInt = (v: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : fallback;

/** Valida campo a campo: o que for inválido volta ao padrão, o que for válido é preservado. */
export function sanitizeSave(raw: unknown): SaveData {
  const base = defaultSave();
  if (!isRecord(raw)) return base;

  const completed = Array.isArray(raw.completedLevels)
    ? [...new Set(raw.completedLevels.filter((l): l is string => typeof l === 'string' && LEVEL_ID.test(l)))]
    : [];

  const scores: Record<string, number> = {};
  if (isRecord(raw.bestScores)) {
    for (const [level, value] of Object.entries(raw.bestScores)) {
      if (LEVEL_ID.test(level) && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        scores[level] = Math.floor(value);
      }
    }
  }

  const settings = isRecord(raw.settings) ? raw.settings : {};
  return {
    version: SAVE_VERSION,
    unlockedWorlds: Math.max(1, nonNegInt(raw.unlockedWorlds, 1, MAX_WORLDS)),
    completedLevels: completed,
    bestScores: scores,
    totalCoins: nonNegInt(raw.totalCoins, 0),
    mode: raw.mode === 'coop' ? 'coop' : 'solo',
    settings: { muted: settings.muted === true },
  };
}

export type MigrationOutcome =
  | { status: 'ok'; data: Record<string, unknown> }
  | { status: 'newer' }
  | { status: 'invalid' };

/** Leva um save antigo até a versão atual, aplicando as migrações em cadeia. */
export function migrateSave(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  target: number = SAVE_VERSION,
): MigrationOutcome {
  if (!isRecord(raw)) return { status: 'invalid' };
  let version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return { status: 'invalid' };
  if (version > target) return { status: 'newer' };
  let data: Record<string, unknown> = { ...raw };
  while (version < target) {
    const step = migrations[version];
    if (!step) return { status: 'invalid' };
    data = step(data);
    version += 1;
    data.version = version;
  }
  return { status: 'ok', data };
}

export type LoadStatus = 'new' | 'ok' | 'corrupt' | 'newer';

export interface LoadResult {
  data: SaveData;
  status: LoadStatus;
}

export function worldOf(levelId: string): number {
  return Number(levelId.split('-')[0]);
}

/** Gerencia leitura/escrita do progresso. Nunca lança exceção por falha de armazenamento. */
export class SaveManager {
  data: SaveData = defaultSave();
  status: LoadStatus = 'new';
  /** Quando o save é de uma versão mais nova, não sobrescrevemos para não destruir progresso. */
  private readOnly = false;

  constructor(private readonly storage: StorageLike | null) {}

  load(): LoadResult {
    this.readOnly = false;
    let text: string | null = null;
    try {
      text = this.storage?.getItem(SAVE_KEY) ?? null;
    } catch {
      text = null;
    }
    if (text === null) return this.finish(defaultSave(), 'new');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return this.quarantine(text);
    }
    const outcome = migrateSave(parsed);
    if (outcome.status === 'newer') {
      this.readOnly = true;
      return this.finish(defaultSave(), 'newer');
    }
    if (outcome.status === 'invalid') return this.quarantine(text);
    return this.finish(sanitizeSave(outcome.data), 'ok');
  }

  save(): boolean {
    if (this.readOnly || !this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  /** Registra a conclusão de uma fase: melhor pontuação, moedas e desbloqueio do próximo mundo. */
  recordLevelComplete(levelId: string, score: number, coinsCollected: number): void {
    if (!LEVEL_ID.test(levelId)) return;
    if (!this.data.completedLevels.includes(levelId)) this.data.completedLevels.push(levelId);
    this.data.bestScores[levelId] = Math.max(this.data.bestScores[levelId] ?? 0, Math.max(0, Math.floor(score)));
    this.data.totalCoins += Math.max(0, Math.floor(coinsCollected));
    const world = worldOf(levelId);
    const worldDone = [1, 2, 3, 4].every((n) => this.data.completedLevels.includes(`${world}-${n}`));
    if (worldDone) this.data.unlockedWorlds = Math.max(this.data.unlockedWorlds, Math.min(MAX_WORLDS, world + 1));
    this.save();
  }

  setMuted(muted: boolean): void {
    this.data.settings.muted = muted;
    this.save();
  }

  private finish(data: SaveData, status: LoadStatus): LoadResult {
    this.data = data;
    this.status = status;
    return { data, status };
  }

  /** Guarda uma cópia do texto corrompido e começa do padrão, sem perder a evidência. */
  private quarantine(text: string): LoadResult {
    try {
      this.storage?.setItem(`${SAVE_KEY}.corrupt`, text);
    } catch {
      /* sem espaço: segue sem backup */
    }
    return this.finish(defaultSave(), 'corrupt');
  }
}

/** Armazenamento do navegador, ou null quando indisponível (modo privado, bloqueio, Node). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
