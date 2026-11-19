import { describe, expect, it } from 'vitest';
import { LEVELS, nextLevelId } from '../src/levels';
import { generateLevel } from '../src/levels/generator';
import { BOSSES, BOSS_BY_WORLD, BOSS_TIMING, createBoss, damageBoss, stepBoss, type BossState } from '../src/systems/boss';
import { createFlyer, FLYER, stepFlyer } from '../src/systems/flyerAI';

const run = (s: BossState, def: (typeof BOSSES)['gronk'], secs: number, ctx = { playerDx: 100, hitWall: false }, dt = 0.05) => {
  let st = s;
  for (let t = 0; t < secs; t += dt) st = stepBoss(st, def, dt, ctx).state;
  return st;
};

describe('corvo umbral (voador)', () => {
  it('patrulha dentro do alcance e ondula na vertical', () => {
    let s = createFlyer(1000, 300);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 600; i++) {
      s = stepFlyer(s, 0.05, null);
      minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
    }
    expect(minX).toBeGreaterThanOrEqual(1000 - FLYER.range - 0.01);
    expect(maxX).toBeLessThanOrEqual(1000 + FLYER.range + 0.01);
    expect(maxY - minY).toBeGreaterThan(FLYER.bobAmp);
    expect(s.mode).toBe('patrol');
  });

  it('mergulha no jogador abaixo, volta para casa e respeita o intervalo', () => {
    let s = createFlyer(1000, 300);
    const target = { dx: 60, dy: 200, alive: true, floorY: 540 };
    let dived = false;
    for (let i = 0; i < 200 && !dived; i++) {
      s = stepFlyer(s, 0.05, target);
      dived = s.mode === 'dive';
    }
    expect(dived).toBe(true);
    let returned = false;
    for (let i = 0; i < 200 && !returned; i++) {
      s = stepFlyer(s, 0.05, null);
      returned = s.mode === 'patrol';
    }
    expect(returned).toBe(true);
    expect(s.cooldown).toBeGreaterThan(2);
    expect(stepFlyer(s, 0.05, target).mode).toBe('patrol');
  });

  it('não mergulha em quem está acima ou morto, e nunca desce abaixo do chão', () => {
    const s0 = { ...createFlyer(1000, 300), cooldown: 0 };
    expect(stepFlyer(s0, 0.05, { dx: 0, dy: -100, alive: true, floorY: 540 }).mode).toBe('patrol');
    expect(stepFlyer(s0, 0.05, { dx: 0, dy: 100, alive: false, floorY: 540 }).mode).toBe('patrol');
    const d = stepFlyer(s0, 0.05, { dx: 0, dy: 300, alive: true, floorY: 360 });
    expect(d.targetY).toBeLessThanOrEqual(360);
  });
});

describe('chefões', () => {
  const def = BOSSES.gronk;

  it('cumpre o ciclo andar → preparar → investir → atordoar → recuperar → andar', () => {
    let s = createBoss(def);
    const seen = new Set<string>([s.mode]);
    for (let i = 0; i < 400; i++) {
      const hitWall = s.mode === 'charge';
      s = stepBoss(s, def, 0.05, { playerDx: 200, hitWall }).state;
      seen.add(s.mode);
    }
    for (const m of ['walk', 'windup', 'charge', 'stunned', 'recover']) expect(seen.has(m), m).toBe(true);
  });

  it('persegue na direção do jogador e investe mais rápido que anda', () => {
    const s = createBoss(def);
    expect(stepBoss(s, def, 0.05, { playerDx: 50, hitWall: false }).vx).toBeGreaterThan(0);
    expect(stepBoss(s, def, 0.05, { playerDx: -50, hitWall: false }).vx).toBeLessThan(0);
    const charging: BossState = { ...s, mode: 'charge', timer: 2, dir: 1 };
    expect(stepBoss(charging, def, 0.05, { playerDx: 50, hitWall: false }).vx).toBeGreaterThan(BOSS_TIMING.walkSpeed * 2);
  });

  it('pisão só machuca atordoado; fogo machuca fora da recuperação e da imunidade', () => {
    const walking = createBoss(def);
    expect(damageBoss(walking, 'stomp').hit).toBe(false);
    expect(damageBoss(walking, 'fire').hit).toBe(true);
    const stunned: BossState = { ...walking, mode: 'stunned', timer: 2 };
    const r = damageBoss(stunned, 'stomp');
    expect(r.hit).toBe(true);
    expect(r.state.hp).toBe(def.hp - 2);
    expect(r.state.invuln).toBeGreaterThan(0);
    expect(damageBoss(r.state, 'fire').hit).toBe(false);
    expect(damageBoss({ ...walking, mode: 'recover' }, 'fire').hit).toBe(false);
  });

  it('é derrotado ao zerar a vida e depois fica inerte', () => {
    let s: BossState = { ...createBoss(def), hp: 1 };
    const r = damageBoss(s, 'fire');
    expect(r.defeated).toBe(true);
    expect(r.state.mode).toBe('dead');
    s = r.state;
    expect(stepBoss(s, def, 0.05, { playerDx: 10, hitWall: false }).vx).toBe(0);
    expect(damageBoss(s, 'fire').hit).toBe(false);
  });

  it('entra em fúria com metade da vida (ciclo mais curto)', () => {
    const calm = run({ ...createBoss(def), mode: 'recover', timer: 0.01 }, def, 0.2);
    const rage = run({ ...createBoss(def), hp: 2, mode: 'recover', timer: 0.01 }, def, 0.2);
    expect(rage.timer).toBeLessThan(calm.timer);
  });

  it('o jogo termina: seis pisões ou seis golpes de fogo derrotam o Gronk', () => {
    let s = createBoss(def);
    for (let i = 0; i < 3; i++) s = damageBoss({ ...s, mode: 'stunned', invuln: 0 }, 'stomp').state;
    expect(s.mode).toBe('dead');
  });

  it('há um chefão por mundo, cada vez mais resistente', () => {
    expect(BOSS_BY_WORLD).toHaveLength(8);
    const hps = BOSS_BY_WORLD.map((k) => BOSSES[k].hp);
    for (let i = 1; i < hps.length; i++) expect(hps[i]!).toBeGreaterThanOrEqual(hps[i - 1]!);
  });
});

describe('32 fases', () => {
  it('existem exatamente 32 fases e a quarta de cada mundo é arena de chefão', () => {
    expect(Object.keys(LEVELS)).toHaveLength(32);
    for (let w = 1; w <= 8; w++) {
      expect(LEVELS[`${w}-4`]?.boss?.kind).toBe(BOSS_BY_WORLD[w - 1]);
      for (let s = 1; s <= 3; s++) expect(LEVELS[`${w}-${s}`]?.boss).toBeUndefined();
    }
  });

  it('a geração é determinística', () => {
    expect(JSON.stringify(generateLevel(3, 2))).toBe(JSON.stringify(generateLevel(3, 2)));
    expect(JSON.stringify(generateLevel(3, 2))).not.toBe(JSON.stringify(generateLevel(3, 3)));
  });

  it('fases dos mundos seguintes usam os inimigos novos; o mundo 1 só o cogumelo', () => {
    const kinds = (w: number) => new Set(Object.values(LEVELS).filter((l) => l.world === w).flatMap((l) => l.enemies.map((e) => e.kind)));
    expect(kinds(1).has('corvo-umbral')).toBe(false);
    const later = new Set([2, 3, 4, 5, 6, 7, 8].flatMap((w) => [...kinds(w)]));
    expect(later.has('corvo-umbral')).toBe(true);
    expect(later.has('ourico-cristal')).toBe(true);
  });

  it('a ordem das fases percorre 1-1 até 8-4', () => {
    let id: string | null = '1-1';
    let count = 0;
    while (id) { count++; id = nextLevelId(id); }
    expect(count).toBe(32);
    expect(nextLevelId('1-4')).toBe('2-1');
    expect(nextLevelId('8-4')).toBeNull();
  });
});
