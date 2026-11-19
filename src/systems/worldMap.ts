import type { SaveData } from './save';

/** Regras do mapa de mundos (sem Phaser): desbloqueio e estrelas. */

export const STARS_COIN_RATIO = 0.8;
export const STARS_TIME_RATIO = 0.4;

export interface StarInput {
  coinsCollected: number;
  totalCoins: number;
  timeLeft: number;
  timeLimit: number;
}

/** ★ concluir  ★ pegar 80% das moedas  ★ terminar com 40% do tempo sobrando. */
export function computeStars(i: StarInput): number {
  let stars = 1;
  if (i.totalCoins > 0 && i.coinsCollected / i.totalCoins >= STARS_COIN_RATIO) stars += 1;
  if (i.timeLimit > 0 && i.timeLeft / i.timeLimit >= STARS_TIME_RATIO) stars += 1;
  return stars;
}

const parse = (id: string): { world: number; stage: number } | null => {
  const m = /^([1-8])-([1-4])$/.exec(id);
  return m ? { world: Number(m[1]), stage: Number(m[2]) } : null;
};

export function isWorldUnlocked(save: SaveData, world: number): boolean {
  return world >= 1 && world <= save.unlockedWorlds;
}

/** A fase 1 do mundo abre com o mundo; as seguintes abrem ao concluir a anterior. */
export function isLevelUnlocked(save: SaveData, id: string): boolean {
  const p = parse(id);
  if (!p || !isWorldUnlocked(save, p.world)) return false;
  return p.stage === 1 || save.completedLevels.includes(`${p.world}-${p.stage - 1}`);
}

export const totalStars = (save: SaveData): number => Object.values(save.stars).reduce((a, b) => a + b, 0);
export const MAX_STARS = 32 * 3;

/** Primeira fase desbloqueada ainda não concluída (onde o jogador deve continuar); senão, a última. */
export function suggestedLevel(save: SaveData): string {
  for (let w = 1; w <= 8; w++) {
    for (let s = 1; s <= 4; s++) {
      const id = `${w}-${s}`;
      if (isLevelUnlocked(save, id) && !save.completedLevels.includes(id)) return id;
    }
  }
  return '8-4';
}
