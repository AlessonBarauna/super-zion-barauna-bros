/** O que um bloco de poder entrega para quem bateu nele: sempre o próximo poder que ainda falta. */
export type PowerDrop = 'grow' | 'flor-de-fogo' | 'coin';

export interface PowerHolder {
  isBig: boolean;
  hasFire: boolean;
}

/**
 * Pequeno → fruta (cresce). Grande sem poder → flor de fogo. Já grande e com poder → moeda,
 * porque não precisa de outro até perder o que tem; ao tomar dano, o próximo bloco volta a dar o que falta.
 */
export function nextPowerDrop(who: PowerHolder): PowerDrop {
  if (!who.isBig) return 'grow';
  if (!who.hasFire) return 'flor-de-fogo';
  return 'coin';
}
