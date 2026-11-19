import { describe, expect, it } from 'vitest';
import { COINS_PER_LIFE, GameProgress, START_LIVES } from '../src/systems/progress';
import { INVULNERABILITY_AFTER_HIT, Vitality } from '../src/systems/vitality';

describe('GameProgress', () => {
  it('começa com 5 vidas, 0 moedas e 0 pontos', () => {
    const p = new GameProgress();
    expect(p.lives).toBe(START_LIVES);
    expect(START_LIVES).toBe(5);
    expect(p.coins).toBe(0);
    expect(p.score).toBe(0);
  });

  it('moeda dourada vale 1, azul 5 e estrela 10', () => {
    const p = new GameProgress();
    p.collectCoin(1);
    p.collectCoin(5);
    p.collectCoin(10);
    expect(p.coins).toBe(16);
  });

  it('a cada 100 moedas ganha uma vida e zera o contador', () => {
    const p = new GameProgress();
    for (let i = 0; i < COINS_PER_LIFE - 1; i++) expect(p.collectCoin().lifeGained).toBe(false);
    expect(p.lives).toBe(5);
    expect(p.collectCoin().lifeGained).toBe(true);
    expect(p.lives).toBe(6);
    expect(p.coins).toBe(0);
  });

  it('o excedente passa para o próximo ciclo (ex.: 99 + estrela de 10)', () => {
    const p = new GameProgress();
    p.collectCoin(99);
    p.collectCoin(10);
    expect(p.lives).toBe(6);
    expect(p.coins).toBe(9);
  });

  it('perder vidas até o game over', () => {
    const p = new GameProgress(2);
    expect(p.loseLife()).toBe(false);
    expect(p.loseLife()).toBe(true);
    expect(p.isGameOver).toBe(true);
    expect(p.loseLife()).toBe(true);
    expect(p.lives).toBe(0);
  });

  it('pontuação ignora valores negativos', () => {
    const p = new GameProgress();
    p.addScore(100);
    p.addScore(-50);
    expect(p.score).toBe(100);
  });
});

describe('Vitality (dano)', () => {
  it('tira um coração e concede invulnerabilidade', () => {
    const v = new Vitality(3);
    expect(v.hit()).toBe('hurt');
    expect(v.hp).toBe(2);
    expect(v.invulnerable).toBe(true);
  });

  it('ignora golpes durante a invulnerabilidade', () => {
    const v = new Vitality(3);
    v.hit();
    expect(v.hit()).toBe('ignored');
    expect(v.hp).toBe(2);
    v.update(INVULNERABILITY_AFTER_HIT + 0.01);
    expect(v.invulnerable).toBe(false);
    expect(v.hit()).toBe('hurt');
  });

  it('morre quando os corações acabam', () => {
    const v = new Vitality(1);
    expect(v.hit()).toBe('dead');
    expect(v.hp).toBe(0);
  });

  it('kill ignora invulnerabilidade (abismos)', () => {
    const v = new Vitality(3);
    v.grantInvulnerability(5);
    v.kill();
    expect(v.hp).toBe(0);
  });

  it('reset restaura vida máxima', () => {
    const v = new Vitality(3);
    v.hit();
    v.reset();
    expect(v.hp).toBe(3);
    expect(v.invulnerable).toBe(false);
  });
});
