import { describe, expect, it } from 'vitest';
import { stepWalker, WALKER, type WalkerContext, type WalkerState } from '../src/systems/walkerAI';

const free: WalkerContext = { canAdvance: () => true, playerDx: 9999, playerDy: 0, playerAlive: true };
const patrol: WalkerState = { dir: 1, mode: 'patrol' };

describe('Cogumelo Sombrio — IA', () => {
  it('patrulha na velocidade normal', () => {
    const r = stepWalker(patrol, free);
    expect(r.state.mode).toBe('patrol');
    expect(r.speed).toBe(WALKER.patrolSpeed);
  });

  it('vira ao encontrar parede ou abismo', () => {
    const r = stepWalker(patrol, { ...free, canAdvance: (d) => d === -1 });
    expect(r.state.dir).toBe(-1);
    expect(r.speed).toBe(WALKER.patrolSpeed);
  });

  it('fica parado se estiver encurralado', () => {
    const r = stepWalker(patrol, { ...free, canAdvance: () => false });
    expect(r.speed).toBe(0);
  });

  it('persegue o jogador visto no mesmo nível, mais rápido', () => {
    const r = stepWalker(patrol, { ...free, playerDx: -100, playerDy: 10 });
    expect(r.state.mode).toBe('chase');
    expect(r.state.dir).toBe(-1);
    expect(r.speed).toBe(WALKER.chaseSpeed);
    expect(WALKER.chaseSpeed).toBeGreaterThan(WALKER.patrolSpeed);
  });

  it('não percebe o jogador em outro nível', () => {
    const r = stepWalker(patrol, { ...free, playerDx: 50, playerDy: WALKER.sightY * 3 });
    expect(r.state.mode).toBe('patrol');
  });

  it('na perseguição, para na beira do abismo em vez de cair', () => {
    const chasing: WalkerState = { dir: 1, mode: 'chase' };
    const r = stepWalker(chasing, { ...free, playerDx: 100, canAdvance: () => false });
    expect(r.state.mode).toBe('chase');
    expect(r.speed).toBe(0);
  });

  it('desiste da perseguição quando o jogador se afasta ou morre', () => {
    const chasing: WalkerState = { dir: 1, mode: 'chase' };
    expect(stepWalker(chasing, { ...free, playerDx: WALKER.forgetX + 10 }).state.mode).toBe('patrol');
    expect(stepWalker(chasing, { ...free, playerDx: 50, playerAlive: false }).state.mode).toBe('patrol');
  });
});
