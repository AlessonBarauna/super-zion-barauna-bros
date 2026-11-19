import { describe, expect, it } from 'vitest';
import { PowerState, POWERS } from '../src/systems/powers';
import { GameProgress } from '../src/systems/progress';
import { LEVEL_1_1 } from '../src/levels/data/world1';
import { validateLevel } from '../src/levels/validateLevel';

describe('PowerState — Flor de Fogo', () => {
  it('começa sem poder e não dispara', () => {
    const p = new PowerState();
    expect(p.current).toBeNull();
    expect(p.canFire(0)).toBe(false);
  });

  it('coletar equipa o poder e permite disparar', () => {
    const p = new PowerState();
    expect(p.collect('flor-de-fogo')).toBe('equipped');
    expect(p.canFire(0)).toBe(true);
  });

  it('respeita o tempo de recarga entre disparos', () => {
    const p = new PowerState();
    p.collect('flor-de-fogo');
    p.registerShot();
    expect(p.canFire(0)).toBe(false);
    p.update(POWERS['flor-de-fogo'].cooldown + 0.01);
    expect(p.canFire(0)).toBe(true);
  });

  it('limita os projéteis ativos', () => {
    const p = new PowerState();
    p.collect('flor-de-fogo');
    const max = POWERS['flor-de-fogo'].maxProjectiles;
    expect(p.canFire(max - 1)).toBe(true);
    expect(p.canFire(max)).toBe(false);
  });

  it('pegar o mesmo poder de novo apenas renova', () => {
    const p = new PowerState();
    p.collect('flor-de-fogo');
    p.registerShot();
    expect(p.collect('flor-de-fogo')).toBe('refreshed');
    expect(p.canFire(0)).toBe(true);
  });

  it('perder o poder (dano/morte) impede novos disparos', () => {
    const p = new PowerState();
    p.collect('flor-de-fogo');
    p.lose();
    expect(p.current).toBeNull();
    expect(p.canFire(0)).toBe(false);
  });
});

describe('contagem de moedas da partida', () => {
  it('totalCoinsCollected acumula mesmo quando o contador zera a cada 100', () => {
    const g = new GameProgress();
    g.collectCoin(99);
    g.collectCoin(10);
    expect(g.coins).toBe(9);
    expect(g.totalCoinsCollected).toBe(109);
  });
});

describe('recompensas de bloco na fase 1-1', () => {
  it('há Flor de Fogo e coração, e só em blocos surpresa', () => {
    const rewards = LEVEL_1_1.blocks.filter((b) => b.reward).map((b) => b.reward);
    expect(rewards).toContain('flor-de-fogo');
    expect(rewards).toContain('heart');
    expect(LEVEL_1_1.blocks.filter((b) => b.reward).every((b) => b.kind === 'surprise')).toBe(true);
  });

  it('a validação rejeita recompensa em bloco que não é surpresa', () => {
    const bad = { ...LEVEL_1_1, blocks: [...LEVEL_1_1.blocks, { kind: 'brick' as const, x: 20, y: 6, reward: 'coin' as const }] };
    expect(validateLevel(bad, { maxGapTiles: 4 }).join('\n')).toMatch(/só blocos surpresa/);
  });
});
