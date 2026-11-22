export type HitResult = 'ignored' | 'hurt' | 'dead';

export const INVULNERABILITY_AFTER_HIT = 1.6;

/** Vida ao começar ou renascer: o personagem é pequeno (1 coração) até pegar uma Fruta de Baraúna. */
export const START_HP = 1;
/** A partir deste número de corações o personagem é grande. */
export const BIG_HP = 2;

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

  /** Cresce: sobe para o tamanho grande (no mínimo BIG_HP corações). */
  grow(): void {
    if (this.hp > 0) this.hp = Math.min(this.maxHp, Math.max(this.hp, BIG_HP));
  }

  get isBig(): boolean {
    return this.hp >= BIG_HP;
  }

  reset(hp: number = this.maxHp): void {
    this.hp = Math.min(this.maxHp, hp);
    this.invulnerableFor = 0;
  }
}
