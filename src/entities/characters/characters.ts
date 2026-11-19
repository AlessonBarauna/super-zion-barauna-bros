import { BARA_BODY, ZION_BODY, type CharacterId } from '../../art/characterArt';
import { BARA_PARAMS, ZION_PARAMS, type MovementParams } from '../../systems/movement';

export type { CharacterId };

/** Corpo de colisão em unidades de arte (dentro do quadro do sprite). */
export interface BodyBox {
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  params: MovementParams;
  body: BodyBox;
}

/** Dados dos personagens jogáveis. A arte vive em art/characterArt; a física, em systems/movement. */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  zion: { id: 'zion', name: 'Zion', params: ZION_PARAMS, body: ZION_BODY },
  bara: { id: 'bara', name: 'Bara', params: BARA_PARAMS, body: BARA_BODY },
};
