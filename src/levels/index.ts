import { LEVEL_1_1 } from './data/world1';
import type { LevelData } from './types';

/** Registro de fases. Novas fases entram aqui como dados. */
export const LEVELS: Record<string, LevelData> = {
  [LEVEL_1_1.id]: LEVEL_1_1,
};

export const FIRST_LEVEL_ID = LEVEL_1_1.id;
