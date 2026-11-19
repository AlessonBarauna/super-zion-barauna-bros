import type { CharacterId } from '../art/characterArt';
import type { GameMode } from './save';

export type { GameMode };

/**
 * Regras do modo cooperativo local em lógica pura (sem Phaser).
 * Decisões (GDD seção 12): vidas, moedas e pontuação são da equipe; corações e poder são
 * individuais; a câmera acompanha os dois e ninguém pode ficar para trás nem fugir da tela;
 * a fase só termina quando todos os jogadores chegam à bandeira.
 */

export function charactersFor(mode: GameMode): CharacterId[] {
  return mode === 'coop' ? ['zion', 'bara'] : ['zion'];
}

export interface Focusable {
  x: number;
  dead: boolean;
  /** Já chegou à bandeira (fica parado, não deve puxar a câmera). */
  reachedGoal: boolean;
}

/**
 * Ponto que a câmera acompanha: o meio entre os jogadores que ainda estão em jogo.
 * Se todos já chegaram à bandeira, usa os que chegaram; se todos morreram, retorna null
 * (a câmera fica onde está até o renascimento).
 */
export function cameraFocusX(players: Focusable[]): number | null {
  const playing = players.filter((p) => !p.dead && !p.reachedGoal);
  const pool = playing.length > 0 ? playing : players.filter((p) => !p.dead);
  if (pool.length === 0) return null;
  return pool.reduce((sum, p) => sum + p.x, 0) / pool.length;
}

export interface ViewClamp {
  scrollX: number;
  viewWidth: number;
  marginLeft: number;
  marginRight: number;
}

/**
 * Mantém o corpo do jogador dentro da tela. `bodyLeft`/`bodyWidth` descrevem o corpo físico.
 * Retorna a nova posição do lado esquerdo do corpo e se houve contenção (para zerar a velocidade).
 */
export function clampToView(bodyLeft: number, bodyWidth: number, v: ViewClamp, limitRight: boolean): { x: number; clamped: -1 | 0 | 1 } {
  const min = v.scrollX + v.marginLeft;
  if (bodyLeft < min) return { x: min, clamped: -1 };
  const max = v.scrollX + v.viewWidth - v.marginRight - bodyWidth;
  if (limitRight && bodyLeft > max) return { x: max, clamped: 1 };
  return { x: bodyLeft, clamped: 0 };
}

/** Controla quais personagens já chegaram à bandeira. */
export class GoalTracker {
  private readonly reached = new Set<CharacterId>();

  /** Registra a chegada. Retorna true se foi a primeira vez deste personagem. */
  reach(id: CharacterId): boolean {
    if (this.reached.has(id)) return false;
    this.reached.add(id);
    return true;
  }

  has(id: CharacterId): boolean {
    return this.reached.has(id);
  }

  get count(): number {
    return this.reached.size;
  }

  /** A fase termina quando todos os personagens da partida chegaram. */
  isComplete(required: CharacterId[]): boolean {
    return required.length > 0 && required.every((id) => this.reached.has(id));
  }

  reset(): void {
    this.reached.clear();
  }
}

export type DeathOutcome = 'game-over' | 'respawn-near-partner' | 'respawn-at-checkpoint';

/**
 * Decide o que acontece depois que um jogador perde uma vida da equipe:
 * sem vidas, fim de jogo; com parceiro vivo, renasce perto dele; senão, no checkpoint.
 */
export function resolveDeath(livesLeft: number, partnerAlive: boolean): DeathOutcome {
  if (livesLeft <= 0) return 'game-over';
  return partnerAlive ? 'respawn-near-partner' : 'respawn-at-checkpoint';
}

export interface Targetable {
  x: number;
  y: number;
  dead: boolean;
}

/** Índice do jogador vivo mais próximo (distância horizontal) ou -1 se todos morreram. */
export function nearestAlive(fromX: number, players: Targetable[]): number {
  let best = -1;
  let bestDist = Infinity;
  players.forEach((p, i) => {
    if (p.dead) return;
    const d = Math.abs(p.x - fromX);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
