export type HitResult = 'ignored' | 'hurt' | 'dead';

export const INVULNERABILITY_AFTER_HIT = 1.6;

/** Pontos de vida (corações) e janela de invulnerabilidade de um personagem. */
export class Vitality {
  hp: number;
  invulnerableFor = 0;

  constructor(readonly maxHp: number = 3) {
    this.hp = maxHp;
  }

  get invulnerable(): boolean {
    return this.invulnerableFor > 0;
  }

  /** Aplica um golpe. Ignora se ainda estiver invulnerável ou já sem vida. */
  hit(damage = 1): HitResult {
    if (this.invulnerable || this.hp <= 0) return 'ignored';
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp === 0) return 'dead';
    this.invulnerableFor = INVULNERABILITY_AFTER_HIT;
    return 'hurt';
  }

  /** Morte instantânea (abismo, tempo esgotado). Ignora invulnerabilidade. */
  kill(): void {
    this.hp = 0;
  }

  heal(amount = 1): void {
    if (this.hp > 0) this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  grantInvulnerability(seconds: number): void {
    this.invulnerableFor = Math.max(this.invulnerableFor, seconds);
  }

  update(dt: number): void {
    this.invulnerableFor = Math.max(0, this.invulnerableFor - dt);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.invulnerableFor = 0;
  }
}
