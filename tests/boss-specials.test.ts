import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_BY_WORLD, createBoss, stepBoss, type BossAction, type BossState } from '../src/systems/boss';
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
