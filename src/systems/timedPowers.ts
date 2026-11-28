/** Poderes temporários: Asas (voar) e Estrela (invencível). Lógica pura; o Phaser só desenha. */
export type TimedPowerId = 'asas' | 'estrela';

export const TIMED_POWERS: Record<TimedPowerId, { name: string; duration: number }> = {
  asas: { name: 'Asas', duration: 14 },
  estrela: { name: 'Estrela', duration: 9 },
};

export class TimedPowerState {
  id: TimedPowerId | null = null;
  left = 0;

  /** Pegar de novo (ou trocar) reinicia o tempo cheio do poder novo. */
  collect(id: TimedPowerId): void {
    this.id = id;
    this.left = TIMED_POWERS[id].duration;
  }

  update(dt: number): void {
    if (!this.id) return;
    this.left = Math.max(0, this.left - dt);
    if (this.left === 0) this.id = null;
  }

  has(id: TimedPowerId): boolean {
    return this.id === id;
  }

  /** Quanto resta do tempo total (1 = cheio, 0 = acabou). */
  get fraction(): number {
    return this.id ? this.left / TIMED_POWERS[this.id].duration : 0;
  }

  clear(): void {
    this.id = null;
    this.left = 0;
  }
}
