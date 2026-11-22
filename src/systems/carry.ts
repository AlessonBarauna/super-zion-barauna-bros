import type { PowerId } from './powers';
import { START_HP } from './vitality';

/** O que cada personagem leva de uma fase para a próxima: tamanho (vida) e poder. */
export interface CarryEntry {
  characterId: string;
  hp: number;
  power: PowerId | null;
}

export interface CarrySource {
  characterId: string;
  dead: boolean;
  hp: number;
  power: PowerId | null;
}

/** Guarda o estado de quem terminou a fase. Quem estava morto (cooperativo) volta ao estado inicial. */
export function captureCarry(players: CarrySource[]): CarryEntry[] {
  return players.map((p) => (p.dead || p.hp <= 0 ? { characterId: p.characterId, hp: START_HP, power: null } : { characterId: p.characterId, hp: p.hp, power: p.power }));
}

export function carryFor(carry: CarryEntry[] | undefined, characterId: string): CarryEntry | undefined {
  return carry?.find((c) => c.characterId === characterId);
}
