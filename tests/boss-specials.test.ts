import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_BY_WORLD, createBoss, damageBoss, stepBoss, type BossAction, type BossState } from '../src/systems/boss';
import { HAZARD, hazardHits, isHarmful, spawnQuake, spawnRain, spawnShot, stepHazard, type Arena } from '../src/systems/bossHazards';

const arena: Arena = { left: 60, right: 1380, groundY: 540 };

/** Simula o chefão apanhando a investida na parede e pousando do salto, e coleta as ações. */
function simulate(kind: (typeof BOSS_BY_WORLD)[number], secs: number): { actions: BossAction[]; modes: Set<string>; state: BossState } {
  const def = BOSSES[kind];
  let s = createBoss(def);
  const actions: BossAction[] = [];
  const modes = new Set<string>();
  let airTime = 0;
  for (let t = 0; t < secs; t += 0.05) {
    airTime = s.mode === 'leap' ? airTime + 0.05 : 0;
    const r = stepBoss(s, def, 0.05, { playerDx: 200, hitWall: s.mode === 'charge', onGround: airTime > 0.85 });
    s = r.state;
    modes.add(s.mode);
    if (r.action) actions.push(r.action);
  }
  return { actions, modes, state: s };
}

describe('ataques especiais dos chefões', () => {
  it('Gronk (mundo 1) só investe; os demais têm pelo menos um ataque especial', () => {
    expect(BOSSES.gronk.specials).toEqual([]);
    for (const kind of BOSS_BY_WORLD.slice(1)) expect(BOSSES[kind].specials.length, kind).toBeGreaterThan(0);
    expect(simulate('gronk', 60).actions).toEqual([]);
  });

  it('cada chefão executa todos os seus ataques ao longo da luta', () => {
    for (const kind of BOSS_BY_WORLD.slice(1)) {
      const { actions } = simulate(kind, 120);
      const kinds = new Set(actions.map((a) => a.kind));
      for (const sp of BOSSES[kind].specials) expect(kinds.has(sp), `${kind}:${sp}`).toBe(true);
    }
  });

  it('todo salto termina em onda de choque e volta ao ciclo normal', () => {
    const { actions, modes } = simulate('sakhur', 120);
    expect(modes.has('cast')).toBe(true);
    expect(modes.has('leap')).toBe(true);
    const leaps = actions.filter((a) => a.kind === 'leap').length;
    const quakes = actions.filter((a) => a.kind === 'quake').length;
    expect(leaps).toBeGreaterThan(0);
    expect(quakes).toBeGreaterThanOrEqual(leaps - 1);
  });

  it('o preparo do ataque dá tempo de reagir e o ataque não trava a luta', () => {
    const def = BOSSES.kragor;
    let s = createBoss(def);
    let castTime = 0;
    for (let i = 0; i < 4000; i++) {
      s = stepBoss(s, def, 0.05, { playerDx: 100, hitWall: s.mode === 'charge', onGround: true }).state;
      if (s.mode === 'cast') castTime += 0.05;
    }
    expect(castTime).toBeGreaterThan(0.6);
    expect(s.mode).not.toBe('dead');
  });
});

describe('perigos dos chefões', () => {
  it('orbes rasteiros cruzam a arena na direção do disparo e somem na borda', () => {
    const def = BOSSES.frostak;
    const [orb] = spawnShot(def, 1000, -1, arena, false);
    expect(orb?.vx).toBeLessThan(0);
    let h: ReturnType<typeof stepHazard> = orb ?? null;
    let steps = 0;
    while (h && steps++ < 1000) h = stepHazard(h, 0.05, arena);
    expect(h).toBeNull();
    expect(steps).toBeLessThan(200);
  });

  it('mais orbes quando enfurecido ou nos mundos finais', () => {
    expect(spawnShot(BOSSES.frostak, 800, 1, arena, false)).toHaveLength(1);
    expect(spawnShot(BOSSES.frostak, 800, 1, arena, true)).toHaveLength(2);
    expect(spawnShot(BOSSES.umbrax, 800, 1, arena, true)).toHaveLength(3);
  });

  it('onda de choque sai para os dois lados rente ao chão', () => {
    const waves = spawnQuake(BOSSES.sakhur, 700, arena);
    expect(waves.map((w) => Math.sign(w.vx)).sort()).toEqual([-1, 1]);
    for (const w of waves) expect(w.y + w.h / 2).toBeCloseTo(arena.groundY);
  });

  it('a pedra avisa antes de cair, só machuca depois e some ao tocar o chão', () => {
    const [rock] = spawnRain(BOSSES.kragor, 700, arena, false);
    let h = rock!;
    expect(isHarmful(h)).toBe(false);
    const box = { x: h.x - 20, y: arena.groundY - 80, w: 40, h: 80 };
    let warnedFor = 0;
    let harmedPlayer = false;
    for (let i = 0; i < 400; i++) {
      if (!isHarmful(h)) warnedFor += 0.05;
      const n = stepHazard(h, 0.05, arena);
      if (!n) break;
      h = n;
      if (hazardHits(h, box)) harmedPlayer = true;
    }
    expect(warnedFor).toBeGreaterThanOrEqual(HAZARD.rockWarn - 0.05);
    expect(harmedPlayer).toBe(true);
    expect(stepHazard({ ...h, y: arena.groundY }, 0.05, arena)).toBeNull();
  });

  it('chuva fica sempre dentro da arena, mesmo com o jogador colado na parede', () => {
    for (const x of [60, 100, 700, 1380]) {
      for (const r of spawnRain(BOSSES.umbrax, x, arena, true)) {
        expect(r.x).toBeGreaterThanOrEqual(arena.left);
        expect(r.x).toBeLessThanOrEqual(arena.right);
      }
    }
    expect(spawnRain(BOSSES.umbrax, 700, arena, true).length).toBeGreaterThan(spawnRain(BOSSES.kragor, 700, arena, false).length);
  });

  it('pular por cima de um orbe rasteiro evita o dano', () => {
    const [orb] = spawnShot(BOSSES.frostak, 800, 1, arena, false);
    const standing = { x: orb!.x - 20, y: arena.groundY - 90, w: 40, h: 90 };
    const jumping = { x: orb!.x - 20, y: arena.groundY - 90 - 90, w: 40, h: 90 };
    expect(hazardHits(orb!, standing)).toBe(true);
    expect(hazardHits(orb!, jumping)).toBe(false);
  });
});

describe('fraquezas: cada chefão se vence de um jeito', () => {
  type Style = 'stomp' | 'fire';

  /**
   * Jogador "perfeito" simplificado: pisa quando o pisão funciona (atordoado pela fonte certa ou em preparo)
   * e, se permitido, atira fogo a cada 1,5 s. Se o chefão for fraco à própria chuva, assume que o jogador
   * faz uma pedra cair nele a cada ataque de chuva. Devolve o tempo gasto (s) ou null se não venceu.
   */
  function fight(kind: (typeof BOSS_BY_WORLD)[number], style: Style, limit = 400): number | null {
    const def = BOSSES[kind];
    let s = createBoss(def);
    let fireClock = 0;
    for (let t = 0; t < limit; t += 0.05) {
      const prevSpecial = s.special;
      const r = stepBoss(s, def, 0.05, { playerDx: 200, hitWall: s.mode === 'charge', onGround: s.mode === 'leap' && t % 1 > 0.9 });
      s = r.state;
      if (r.action?.kind === 'rain' && prevSpecial === 'rain' && def.weakness.rocks > 0) s = damageBoss(s, 'rock', def.weakness).state;
      if (style === 'stomp' || def.weakness.fire === 0) {
        const d = damageBoss(s, 'stomp', def.weakness);
        if (d.hit) s = d.state;
      }
      if (style === 'fire') {
        fireClock += 0.05;
        if (fireClock >= 1.5) {
          const d = damageBoss(s, 'fire', def.weakness);
          if (d.hit) {
            s = d.state;
            fireClock = 0;
          }
        }
      }
      if (s.mode === 'dead') return t;
    }
    return null;
  }

  it('todo chefão pode ser vencido só com pisões (sem poder), em tempo razoável', () => {
    for (const kind of BOSS_BY_WORLD) {
      const t = fight(kind, 'stomp');
      expect(t, kind).not.toBeNull();
      expect(t!, kind).toBeLessThan(200);
    }
  });

  it('os chefões com fraqueza a fogo caem bem mais rápido com fogo', () => {
    for (const kind of ['frostak'] as const) {
      expect(fight(kind, 'fire')!).toBeLessThan(fight(kind, 'stomp')!);
    }
  });

  it('imunidades: Kragor e Mechazord ignoram fogo; Frostak sofre dobrado; pisão errado não machuca', () => {
    const base = createBoss(BOSSES.kragor);
    expect(damageBoss(base, 'fire', BOSSES.kragor.weakness)).toMatchObject({ hit: false, immune: true });
    expect(damageBoss(createBoss(BOSSES.mechazord), 'fire', BOSSES.mechazord.weakness)).toMatchObject({ hit: false, immune: true });
    const f = damageBoss(createBoss(BOSSES.frostak), 'fire', BOSSES.frostak.weakness);
    expect(f.state.hp).toBe(BOSSES.frostak.hp - 2);
    // Sakhur atordoado por parede (fonte errada) não leva pisão; atordoado pelo pouso, leva.
    const sk = BOSSES.sakhur.weakness;
    const walled: BossState = { ...createBoss(BOSSES.sakhur), mode: 'stunned', stunBy: 'wall' };
    expect(damageBoss(walled, 'stomp', sk).hit).toBe(false);
    expect(damageBoss({ ...walled, stunBy: 'quake' }, 'stomp', sk).state.hp).toBe(BOSSES.sakhur.hp - 3);
  });

  it('Vyrak só leva pisão enquanto se prepara, e o pisão interrompe o ataque', () => {
    const v = BOSSES.vyrak;
    const casting: BossState = { ...createBoss(v), mode: 'cast', special: 'shot', timer: 0.5 };
    const hit = damageBoss(casting, 'stomp', v.weakness);
    expect(hit.hit).toBe(true);
    expect(hit.state.mode).toBe('recover');
    expect(hit.state.special).toBeNull();
    expect(damageBoss({ ...casting, mode: 'stunned', stunBy: 'wall' }, 'stomp', v.weakness).hit).toBe(false);
    expect(damageBoss(createBoss(v), 'stomp', v.weakness).hit).toBe(false);
  });

  it('Kragor é ferido pela própria pedra e fica atordoado (pisão passa a valer)', () => {
    const k = BOSSES.kragor;
    const r = damageBoss(createBoss(k), 'rock', k.weakness);
    expect(r.hit).toBe(true);
    expect(r.state.mode).toBe('stunned');
    expect(r.state.stunBy).toBe('rocks');
    expect(damageBoss({ ...r.state, invuln: 0 }, 'stomp', k.weakness).hit).toBe(true);
    expect(damageBoss(createBoss(BOSSES.frostak), 'rock', BOSSES.frostak.weakness).hit).toBe(false);
  });

  it('Mechazord superaquece depois de atirar e Auron cansa depois da chuva', () => {
    for (const [kind, sp] of [['mechazord', 'shot'], ['auron', 'rain']] as const) {
      const def = BOSSES[kind];
      let s: BossState = { ...createBoss(def), mode: 'cast', special: sp, timer: 0.01 };
      s = stepBoss(s, def, 0.05, { playerDx: 100, hitWall: false }).state;
      expect(s.mode, kind).toBe('stunned');
      expect(s.stunBy, kind).toBe(sp);
    }
  });

  it('cada chefão tem uma dica e uma maneira própria de vencer (tabelas diferentes)', () => {
    const sigs = new Set(BOSS_BY_WORLD.map((k) => JSON.stringify(BOSSES[k].weakness)));
    expect(sigs.size).toBe(BOSS_BY_WORLD.length);
    for (const k of BOSS_BY_WORLD) expect(BOSSES[k].hint.length, k).toBeGreaterThan(10);
  });
});

describe('chuva do Kragor', () => {
  it('uma pedra cai entre o jogador e o chefão, acertando-o se o jogador estiver perto (sem encostar)', () => {
    const bossX = 1000;
    for (const dist of [100, 120, 140]) {
      const rocks = spawnRain(BOSSES.kragor, bossX - dist, arena, false, bossX);
      const mid = rocks.find((r) => Math.abs(r.x - (bossX - dist / 2)) < 1);
      expect(mid, `dist ${dist}`).toBeDefined();
      // caixa do corpo do chefão (84 px de design × 4/3 de largura)
      const body = { x: bossX - 56, y: arena.groundY - 112, w: 112, h: 112 };
      const falling = { ...mid!, warn: 0, y: arena.groundY - 60 };
      expect(hazardHits(falling, body), `dist ${dist}`).toBe(true);
    }
  });

  it('com o jogador longe, a pedra do meio não acerta o chefão', () => {
    const bossX = 1000;
    const rocks = spawnRain(BOSSES.kragor, bossX - 400, arena, false, bossX);
    const body = { x: bossX - 56, y: arena.groundY - 112, w: 112, h: 112 };
    for (const r of rocks) expect(hazardHits({ ...r, warn: 0, y: arena.groundY - 60 }, body)).toBe(false);
  });

  it('chefões sem essa fraqueza continuam com a chuva comum', () => {
    const a = spawnRain(BOSSES.vyrak, 700, arena, false, 1000);
    const b = spawnRain(BOSSES.vyrak, 700, arena, false);
    expect(a.map((r) => r.x)).toEqual(b.map((r) => r.x));
  });
});
