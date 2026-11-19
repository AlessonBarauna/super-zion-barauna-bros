export type PowerId = 'flor-de-fogo';

export interface PowerDef {
  id: PowerId;
  name: string;
  /** Máximo de projéteis ativos ao mesmo tempo. */
  maxProjectiles: number;
  /** Intervalo mínimo entre disparos (s). */
  cooldown: number;
  /** Tempo de vida de cada projétil (s). */
  projectileLifetime: number;
}

export const POWERS: Record<PowerId, PowerDef> = {
  'flor-de-fogo': {
    id: 'flor-de-fogo',
    name: 'Flor de Fogo',
    maxProjectiles: 2,
    cooldown: 0.28,
    projectileLifetime: 1.8,
  },
};

export type CollectResult = 'equipped' | 'refreshed' | 'replaced';

/** Poder equipado por um jogador. Lógica pura: o Phaser só desenha e move os projéteis. */
export class PowerState {
  current: PowerId | null = null;
  private cooldownLeft = 0;

  get def(): PowerDef | null {
    return this.current ? POWERS[this.current] : null;
  }

  /** Coleta um poder. Pegar o mesmo poder de novo apenas reinicia o tempo de recarga. */
  collect(id: PowerId): CollectResult {
    const previous = this.current;
    this.current = id;
    this.cooldownLeft = 0;
    if (previous === null) return 'equipped';
    return previous === id ? 'refreshed' : 'replaced';
  }

  /** Perde o poder (ao sofrer dano ou morrer). */
  lose(): void {
    this.current = null;
    this.cooldownLeft = 0;
  }

  canFire(activeProjectiles: number): boolean {
    const def = this.def;
    if (!def) return false;
    return this.cooldownLeft <= 0 && activeProjectiles < def.maxProjectiles;
  }

  /** Registra um disparo e inicia o tempo de recarga. */
  registerShot(): void {
    const def = this.def;
    if (def) this.cooldownLeft = def.cooldown;
  }

  update(dt: number): void {
    this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
  }
}
