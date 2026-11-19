export const START_LIVES = 5;
export const COINS_PER_LIFE = 100;

export interface CoinResult {
  lifeGained: boolean;
}

/** Estado de progresso da partida: moedas, vidas e pontuação. */
export class GameProgress {
  lives: number;
  coins = 0;
  /** Total coletado na partida (o contador `coins` volta a zero a cada 100). */
  totalCoinsCollected = 0;
  score = 0;

  constructor(lives: number = START_LIVES) {
    this.lives = lives;
  }

  /** Coleta uma moeda (dourada 1, azul 5, estrela 10). A cada 100 moedas, +1 vida. */
  collectCoin(value = 1): CoinResult {
    this.coins += value;
    this.totalCoinsCollected += value;
    let lifeGained = false;
    while (this.coins >= COINS_PER_LIFE) {
      this.coins -= COINS_PER_LIFE;
      this.lives += 1;
      lifeGained = true;
    }
    return { lifeGained };
  }

  addScore(points: number): void {
    this.score += Math.max(0, Math.floor(points));
  }

  /** Perde uma vida. Retorna true quando acabaram as vidas (game over). */
  loseLife(): boolean {
    this.lives = Math.max(0, this.lives - 1);
    return this.lives === 0;
  }

  get isGameOver(): boolean {
    return this.lives === 0;
  }
}
