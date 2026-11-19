import sys, json, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
T = 60
results = []
def check(name, ok, info=''):
    results.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if info and not ok else ''), flush=True)
def ev(pg, js): return pg.evaluate(js)
def state(pg): return ev(pg, "window.__ZION__.state()")
def active(pg, key): return ev(pg, f"window.__ZION__.game.scene.isActive('{key}')")
def goto(pg, level=None):
    sep = '&' if '?' in BASE else '?'
    pg.goto(BASE + (f'{sep}level={level}' if level else '')); pg.wait_for_timeout(1500)
    if level: pg.mouse.click(640, 410); pg.wait_for_timeout(1800)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.set_default_timeout(8000)

    # 1) Menu -> mapa de mundos
    pg.goto(BASE); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    pg.mouse.click(640, 410); pg.wait_for_timeout(1200)
    check('menu: 1 JOGADOR abre o mapa de mundos', active(pg, 'WorldSelectScene') and not active(pg, 'GameScene'))
    pg.screenshot(path='/home/claude/validation/shots/p6_map_new.png')
    # fases bloqueadas não iniciam: tecla Direita não pode sair de 1-1 (só ele aberto)
    sel0 = ev(pg, "window.__ZION__.game.scene.getScene('WorldSelectScene').selected")
    pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
    sel1 = ev(pg, "window.__ZION__.game.scene.getScene('WorldSelectScene').selected")
    check('mapa: só 1-1 aberto no save novo (seleção não anda)', sel0 == '1-1' and sel1 == '1-1', f'{sel0}->{sel1}')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1800)
    s = state(pg)
    check('mapa: Enter inicia a fase 1-1', s is not None and s['levelId'] == '1-1', json.dumps(s)[:80])
    # concluir 1-1 e 1-2 no save e reabrir o mapa
    ev(pg, "(() => { const m = window.__ZION__.game.scene.getScene('GameScene'); return null; })()")
    pg.evaluate("""(() => { const d = JSON.parse(localStorage.getItem('szbb.save')||'{}'); d.version=2; d.completedLevels=['1-1','1-2']; d.stars={'1-1':3,'1-2':1}; d.unlockedWorlds=1; d.bestScores={}; d.totalCoins=0; d.mode='solo'; d.settings={muted:false}; localStorage.setItem('szbb.save', JSON.stringify(d)); })()""")
    pg.reload(); pg.wait_for_timeout(1500); pg.mouse.click(640, 410); pg.wait_for_timeout(1200)
    sel = ev(pg, "window.__ZION__.game.scene.getScene('WorldSelectScene').selected")
    check('mapa: seleção inicial sugere a próxima fase (1-3)', sel == '1-3', sel)
    pg.screenshot(path='/home/claude/validation/shots/p6_map_progress.png')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
    sel = ev(pg, "window.__ZION__.game.scene.getScene('WorldSelectScene').selected")
    check('mapa: 1-4 (chefão) ainda bloqueado antes de concluir 1-3', sel == '1-3', sel)
    pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(150)
    sel = ev(pg, "window.__ZION__.game.scene.getScene('WorldSelectScene').selected")
    check('mapa: setas movem entre fases abertas', sel == '1-2', sel)

    # 2) Mundo 2: inimigos novos
    goto(pg, '2-2'); s = state(pg)
    kinds = ev(pg, f"{SC}.enemies.map(e => e.kind)")
    check('fase 2-2 carrega com inimigos novos', s and s['levelId'] == '2-2' and (len(kinds) > 0), json.dumps(kinds)[:100])
    check('fase 2-2: tem corvo e/ou ouriço', 'corvo-umbral' in kinds or 'ourico-cristal' in kinds or ev(pg, f"{SC}.enemies.some(e => e.stompable === false)"), json.dumps(kinds)[:100])
    pg.screenshot(path='/home/claude/validation/shots/p6_world2.png')

    # 3) Ouriço não pode ser pisado
    ok = ev(pg, f"{SC}.enemies.some(e => e.stompable === false)")
    if ok:
        r = ev(pg, f"""(() => {{ const s={SC}; const e = s.enemies.find(e => e.stompable === false); e.tick = () => true; e.arcadeBody.setVelocityX(0);
          s.player.respawn(e.x, e.arcadeBody.top - 200); s.player.vitality.reset(); return [e.x, e.y]; }})()""")
        pg.wait_for_timeout(1500); s2 = state(pg)
        check('ouriço: pisar machuca e não derrota', s2['hp'] < 3 and ev(pg, f"{SC}.enemies.some(e => e.stompable === false && !e.dead)"), json.dumps(s2)[:120])

    # 4) Corvo mergulha
    goto(pg, '2-1')
    cor = ev(pg, f"{SC}.enemies.some(e => e.kind === 'corvo-umbral')")
    if not cor:
        for lv in ['2-2','2-3','3-1','3-2']:
            goto(pg, lv); cor = ev(pg, f"{SC}.enemies.some(e => e.kind === 'corvo-umbral')")
            if cor: break
    if cor:
        ev(pg, f"""(() => {{ const s={SC}; const e = s.enemies.find(e => e.kind === 'corvo-umbral'); s.player.respawn(e.x, 8*{T}+{T}); s.player.vitality.reset(); s.cameras.main.scrollX = e.x - 600; }})()""")
        modes = set()
        for _ in range(40):
            pg.wait_for_timeout(150); modes.add(ev(pg, f"{SC}.enemies.find(e => e.kind === 'corvo-umbral')?.mode"))
        check('corvo: patrulha e mergulha em direção ao jogador', 'dive' in modes, json.dumps(list(modes)))
    else:
        check('corvo: encontrado numa fase gerada', False, 'nenhum corvo')

    # 5) Chefão
    goto(pg, '1-4'); s = state(pg)
    check('arena 1-4: chefão presente e meta fechada', s and s['boss'] and s['boss']['hp'] == 6 and s['goalOpen'] is False, json.dumps(s)[:140])
    modes = []
    t0 = time.time()
    while time.time() - t0 < 14:
        pg.wait_for_timeout(120)
        m = state(pg)['boss']['mode']
        if not modes or modes[-1] != m: modes.append(m)
        if 'stunned' in modes: break
    check('chefão: anda, prepara, investe e bate na parede (atordoa)', 'windup' in modes and 'charge' in modes and 'stunned' in modes, json.dumps(modes))
    pg.screenshot(path='/home/claude/validation/shots/p6_boss_stunned.png')
    hp0 = state(pg)['boss']['hp']
    # pisão no atordoado
    ev(pg, f"(() => {{ const s={SC}; const b=s.bossFight.boss; s.player.respawn(b.x, b.arcadeBody.top - 120); s.player.vitality.reset(); }})()")
    pg.wait_for_timeout(700)
    hp1 = state(pg)['boss']['hp']
    check('chefão atordoado: pisão causa 2 de dano', hp1 == hp0 - 2, f'{hp0}->{hp1}')
    # derrotar com fogo
    for _ in range(12):
        ev(pg, f"(() => {{ const b={SC}.bossFight.boss; if (!b.defeated) {{ b.ai.invuln = 0; if (b.ai.mode==='recover') b.ai.mode='walk'; b.hurt('fire'); }} }})()")
        pg.wait_for_timeout(60)
    pg.wait_for_timeout(2600)
    s = state(pg)
    check('chefão derrotado: meta aparece', s['boss'] is None or s['boss']['mode'] == 'dead', json.dumps(s['boss']))
    check('meta aberta após a vitória', s['goalOpen'] is True, json.dumps(s)[:120])
    ev(pg, f"(() => {{ const s={SC}; s.player.respawn(s.built.goalZone.x - 12, 9*{T}); s.player.vitality.reset(); }})()")
    pg.wait_for_timeout(2800)
    sv = pg.evaluate("JSON.parse(localStorage.getItem('szbb.save'))")
    check('vencer o chefão conclui 1-4 e grava estrelas', '1-4' in sv['completedLevels'] and sv['stars'].get('1-4', 0) >= 1, json.dumps(sv)[:160])
    pg.screenshot(path='/home/claude/validation/shots/p6_boss_win.png')
    ok_unlock = sv['unlockedWorlds'] >= 1
    check('save gravado em versão 2', sv['version'] == 2, str(sv.get('version')))

    check('sem erros de console', len(errors) == 0, json.dumps(errors[:3])[:300])
    b.close()
print(f"{sum(results)}/{len(results)} verificações passaram")
