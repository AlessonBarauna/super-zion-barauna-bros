import { describe, expect, it } from 'vitest';
import { BARA_PARAMS, ZION_PARAMS, maxJumpDistanceTiles, maxJumpHeightTiles } from '../src/systems/movement';
import { CHARACTERS } from '../src/entities/characters/characters';
import { LEVELS } from '../src/levels';
import { validateLevel } from '../src/levels/validateLevel';
import { GoalTracker, cameraFocusX, charactersFor, clampToView, nearestAlive, resolveDeath } from '../src/systems/coop';

const p = (x: number, dead = false, reachedGoal = false) => ({ x, dead, reachedGoal });

describe('personagens', () => {
  it('modo solo tem só o Zion; cooperativo tem Zion e Bara', () => {
    expect(charactersFor('solo')).toEqual(['zion']);
    expect(charactersFor('coop')).toEqual(['zion', 'bara']);
  });

  it('Bara salta mais alto que o Zion e é mais ágil, sem ser uma cópia', () => {
    expect(maxJumpHeightTiles(BARA_PARAMS)).toBeGreaterThan(maxJumpHeightTiles(ZION_PARAMS) + 0.4);
    expect(BARA_PARAMS.groundAccel).toBeGreaterThan(ZION_PARAMS.groundAccel);
    expect(BARA_PARAMS.runSpeed).not.toBe(ZION_PARAMS.runSpeed);
  });

  it('todo vão que o Zion cruza, a Bara também cruza (as fases servem para os dois)', () => {
    expect(maxJumpDistanceTiles(BARA_PARAMS)).toBeGreaterThanOrEqual(maxJumpDistanceTiles(ZION_PARAMS));
  });

  it('Bara é mais baixa e o corpo toca a base do quadro como o do Zion', () => {
    const z = CHARACTERS.zion.body;
    const b = CHARACTERS.bara.body;
    expect(b.h).toBeLessThan(z.h);
    expect(b.offsetY + b.h).toBe(z.offsetY + z.h);
    // centralizado no quadro de 64 de largura (tolerância de 1 unidade)
    expect(Math.abs(b.offsetX + b.w / 2 - 32)).toBeLessThanOrEqual(1);
  });

  it('as fases continuam válidas para os dois personagens', () => {
    for (const level of Object.values(LEVELS)) {
      for (const params of [ZION_PARAMS, BARA_PARAMS]) {
        const gap = Math.floor(maxJumpDistanceTiles(params)) - 1;
        expect(validateLevel(level, { maxGapTiles: gap }), level.id).toEqual([]);
      }
    }
  });
});

describe('câmera compartilhada', () => {
  it('foca o meio entre os dois jogadores vivos', () => {
    expect(cameraFocusX([p(100), p(500)])).toBe(300);
  });

  it('ignora quem morreu', () => {
    expect(cameraFocusX([p(100, true), p(500)])).toBe(500);
  });

  it('ignora quem já chegou à bandeira enquanto o outro ainda joga', () => {
    expect(cameraFocusX([p(4000, false, true), p(900)])).toBe(900);
  });

  it('se todos chegaram, usa os que chegaram; se todos morreram, não há foco', () => {
    expect(cameraFocusX([p(4000, false, true), p(4100, false, true)])).toBe(4050);
    expect(cameraFocusX([p(10, true), p(20, true)])).toBeNull();
  });
});

describe('limites de tela (ninguém fica para trás nem foge)', () => {
  const view = { scrollX: 1000, viewWidth: 1280, marginLeft: 6, marginRight: 6 };

  it('não deixa sair pela esquerda', () => {
    expect(clampToView(900, 30, view, true)).toEqual({ x: 1006, clamped: -1 });
  });

  it('não deixa passar da borda direita no cooperativo', () => {
    const r = clampToView(2400, 30, view, true);
    expect(r.clamped).toBe(1);
    expect(r.x).toBe(1000 + 1280 - 6 - 30);
  });

  it('no modo solo a borda direita não contém', () => {
    expect(clampToView(2400, 30, view, false)).toEqual({ x: 2400, clamped: 0 });
  });

  it('dentro da tela nada muda', () => {
    expect(clampToView(1500, 30, view, true)).toEqual({ x: 1500, clamped: 0 });
  });
});

describe('chegada à bandeira', () => {
  it('no cooperativo só completa quando os dois chegam', () => {
    const g = new GoalTracker();
    const required = charactersFor('coop');
    expect(g.reach('zion')).toBe(true);
    expect(g.isComplete(required)).toBe(false);
    expect(g.reach('zion')).toBe(false);
    expect(g.reach('bara')).toBe(true);
    expect(g.isComplete(required)).toBe(true);
  });

  it('no solo completa com o Zion', () => {
    const g = new GoalTracker();
    g.reach('zion');
    expect(g.isComplete(charactersFor('solo'))).toBe(true);
  });

  it('sem ninguém exigido nunca completa', () => {
    expect(new GoalTracker().isComplete([])).toBe(false);
  });
});

describe('mortes na equipe', () => {
  it('sem vidas é fim de jogo mesmo com o parceiro vivo', () => {
    expect(resolveDeath(0, true)).toBe('game-over');
  });

  it('com o parceiro vivo, renasce perto dele', () => {
    expect(resolveDeath(3, true)).toBe('respawn-near-partner');
  });

  it('com os dois mortos, renasce no checkpoint', () => {
    expect(resolveDeath(3, false)).toBe('respawn-at-checkpoint');
  });
});

describe('alvo dos inimigos', () => {
  it('persegue o jogador vivo mais próximo', () => {
    const players = [
      { x: 100, y: 0, dead: false },
      { x: 900, y: 0, dead: false },
    ];
    expect(nearestAlive(800, players)).toBe(1);
    expect(nearestAlive(200, players)).toBe(0);
  });

  it('ignora mortos e devolve -1 quando todos morreram', () => {
    expect(nearestAlive(800, [{ x: 800, y: 0, dead: true }, { x: 100, y: 0, dead: false }])).toBe(1);
    expect(nearestAlive(0, [{ x: 0, y: 0, dead: true }])).toBe(-1);
  });
});
