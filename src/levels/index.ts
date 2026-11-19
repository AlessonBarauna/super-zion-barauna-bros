import { LEVEL_1_1 } from './data/world1';
import { generateLevel } from './generator';
import type { LevelData } from './types';

/** Registro das 32 fases. 1-1 é desenhada à mão; as demais são geradas e validadas. */
export const LEVELS: Record<string, LevelData> = {};

for (let world = 1; world <= 8; world++) {
  for (let stage = 1; stage <= 4; stage++) {
    const level = world === 1 && stage === 1 ? LEVEL_1_1 : generateLevel(world, stage);
    LEVELS[level.id] = level;
  }
}

export const FIRST_LEVEL_ID = LEVEL_1_1.id;

/** Fase seguinte na ordem do jogo (null depois da última). */
export function nextLevelId(id: string): string | null {
  const m = /^([1-8])-([1-4])$/.exec(id);
  if (!m) return null;
  const world = Number(m[1]);
  const stage = Number(m[2]);
  if (stage < 4) return `${world}-${stage + 1}`;
  return world < 8 ? `${world + 1}-1` : null;
}
