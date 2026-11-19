"""Cenários do cooperativo local (Zion + Bara) em navegador real."""
import sys, json
from playwright.sync_api import sync_playwright

url = sys.argv[1]
SHOTS = '/home/claude/validation/shots'
T = 60
SC = "window.__ZION__.game.scene.getScene('GameScene')"
results = []

def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

def ev(pg, js): return pg.evaluate(js)
def state(pg): return ev(pg, "window.__ZION__.state()")
def fresh(pg, enemies=False):
    ev(pg, f"(() => {{ {SC}.scene.restart(); return null; }})()"); pg.wait_for_timeout(1500)
    if not enemies: ev(pg, f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
def place(pg, i, col):
    ev(pg, f"(() => {{ const p={SC}.players[{i}]; p.placeOnGround(({col}+0.5)*{T}, 9*{T}); p.arcadeBody.setVelocity(0,0); return null; }})()")
def texts(pg, scene):
    return ev(pg, f"window.__ZION__.game.scene.getScene('{scene}').children.list.filter(o=>o.type==='Text').map(o=>o.text)")

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_context(viewport={'width':1280,'height':720}).new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1200)
    ev(pg, "localStorage.clear()")
    pg.reload(); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{SHOTS}/coop_menu.png')

    # --- Menu -> 2 JOGADORES
    pg.mouse.click(640, 496); pg.wait_for_timeout(1800)
    st = state(pg)
    ids = [p['id'] for p in st['players']]
    check('menu: botão 2 JOGADORES inicia o cooperativo com Zion e Bara', st['mode'] == 'coop' and ids == ['zion', 'bara'], f"modo={st['mode']} jogadores={ids}")
    check('Bara é mais baixa que o Zion (corpo de colisão menor)', st['players'][1]['height'] < st['players'][0]['height'], f"Zion={st['players'][0]['height']} Bara={st['players'][1]['height']}")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{SHOTS}/coop_start.png')

    # --- Controles independentes
    fresh(pg)
    x0 = [p['x'] for p in state(pg)['players']]
    pg.keyboard.down('l'); pg.wait_for_timeout(700); pg.keyboard.up('l'); pg.wait_for_timeout(300)
    x1 = [p['x'] for p in state(pg)['players']]
    check('tecla L move só a Bara', x1[1] - x0[1] > 80 and abs(x1[0] - x0[0]) < 5, f"Zion {x0[0]}->{x1[0]}  Bara {x0[1]}->{x1[1]}")
    pg.keyboard.down('d'); pg.wait_for_timeout(700); pg.keyboard.up('d'); pg.wait_for_timeout(300)
    x2 = [p['x'] for p in state(pg)['players']]
    check('tecla D move só o Zion', x2[0] - x1[0] > 80 and abs(x2[1] - x1[1]) < 5, f"Zion {x1[0]}->{x2[0]}  Bara {x1[1]}->{x2[1]}")

    # --- Altura do pulo
    def rise(key, idx):
        fresh(pg)
        place(pg, idx, 20 + idx * 6); place(pg, 1 - idx, 4 + (1 - idx) * 3)
        pg.wait_for_timeout(500)
        y0 = state(pg)['players'][idx]['y']; top = y0
        pg.keyboard.down(key)
        for _ in range(16):
            pg.wait_for_timeout(45); top = min(top, state(pg)['players'][idx]['y'])
        pg.keyboard.up(key); pg.wait_for_timeout(500)
        return y0 - top
    zr = rise('Space', 0); br = rise('i', 1)
    check('Bara salta mais alto que o Zion', br > zr * 1.1 and zr > 120, f"Zion={zr}px Bara={br}px")

    # --- Moedas da equipe, corações e poder individuais
    fresh(pg)
    ev(pg, f"(() => {{ const s={SC}; const c=s.built.coins.getChildren().find(c=>c.active); s.players[1].arcadeBody.reset(c.x, c.y); return null; }})()")
    pg.wait_for_timeout(400)
    st = state(pg)
    check('moeda coletada pela Bara vai para a equipe (moedas e pontos)', st['coins'] == 1 and st['score'] == 50, f"moedas={st['coins']} pontos={st['score']}")

    fresh(pg)
    ev(pg, f"{SC}.players[1].takeHit(0)"); pg.wait_for_timeout(200)
    st = state(pg)
    check('dano na Bara tira coração só dela', st['players'][1]['hp'] == 2 and st['players'][0]['hp'] == 3, f"Zion={st['players'][0]['hp']} Bara={st['players'][1]['hp']}")

    fresh(pg)
    ev(pg, f"{SC}.players[1].powers.collect('flor-de-fogo')"); pg.wait_for_timeout(300)
    pg.keyboard.press('x'); pg.wait_for_timeout(150)
    sx = state(pg)
    pg.keyboard.press('u'); pg.wait_for_timeout(150)
    su = state(pg)
    check('poder é individual: X (Zion, sem poder) não dispara; U (Bara) dispara',
          sx['players'][0]['shots'] == 0 and sx['players'][1]['shots'] == 0 and su['players'][1]['shots'] == 1 and su['players'][0]['shots'] == 0 and su['players'][0]['power'] is None,
          f"após X={[p['shots'] for p in sx['players']]} após U={[p['shots'] for p in su['players']]}")
    pg.wait_for_timeout(2200)

    # --- Câmera e limites de tela
    fresh(pg)
    pg.keyboard.down('Shift'); pg.keyboard.down('d'); pg.wait_for_timeout(5000); pg.keyboard.up('d'); pg.keyboard.up('Shift'); pg.wait_for_timeout(300)
    st = state(pg); z, ba = st['players']
    sc = st['scrollX']
    check('ninguém é deixado para trás: Zion é contido na borda direita da tela', z['x'] - sc <= 1280 and ba['x'] >= sc and z['x'] - ba['x'] > 400 and sc > 0,
          f"scroll={sc} Zion={z['x']} Bara={ba['x']}")
    pg.screenshot(path=f'{SHOTS}/coop_camera.png')
    fresh(pg)
    pg.keyboard.down('j'); pg.wait_for_timeout(2500); pg.keyboard.up('j'); pg.wait_for_timeout(200)
    st = state(pg)
    check('a Bara não sai pela esquerda da tela', st['players'][1]['x'] >= st['scrollX'], f"x={st['players'][1]['x']} scroll={st['scrollX']}")

    # --- Mortes: perto do parceiro
    fresh(pg)
    place(pg, 0, 20); place(pg, 1, 22); pg.wait_for_timeout(500)
    ev(pg, f"{SC}.players[1].kill()"); pg.wait_for_timeout(300)
    st = state(pg)
    check('morte da Bara custa 1 vida da equipe e o Zion segue em jogo', st['lives'] == 4 and st['players'][1]['dead'] and not st['players'][0]['dead'], f"vidas={st['lives']}")
    pg.wait_for_timeout(1700)
    st = state(pg)
    check('a Bara renasce perto do Zion, com os 3 corações', not st['players'][1]['dead'] and st['players'][1]['hp'] == 3 and abs(st['players'][1]['x'] - st['players'][0]['x']) < 120,
          f"Zion={st['players'][0]['x']} Bara={st['players'][1]['x']}")

    # --- Os dois morrem: checkpoint
    fresh(pg)
    place(pg, 0, 20); place(pg, 1, 22); pg.wait_for_timeout(400)
    ev(pg, f"(() => {{ {SC}.players.forEach(p => p.kill()); return null; }})()"); pg.wait_for_timeout(300)
    lives = state(pg)['lives']
    pg.wait_for_timeout(2500)
    st = state(pg)
    check('os dois mortos: gasta 2 vidas e ambos renascem no ponto de partida', lives == 3 and all(not p['dead'] for p in st['players']) and all(p['x'] < 500 for p in st['players']),
          f"vidas={lives} posições={[p['x'] for p in st['players']]}")

    # --- Tempo esgotado: uma vida só
    fresh(pg)
    ev(pg, f"{SC}.timeLeft = 0.05"); pg.wait_for_timeout(600)
    st = state(pg)
    check('tempo esgotado: os dois perdem, mas a equipe gasta uma única vida', st['lives'] == 4 and all(p['dead'] for p in st['players']), f"vidas={st['lives']}")
    pg.wait_for_timeout(2500)
    check('após o tempo esgotado os dois renascem', all(not p['dead'] for p in state(pg)['players']))

    # --- Fim de jogo
    fresh(pg)
    ev(pg, f"{SC}.progress.lives = 1"); ev(pg, f"{SC}.players[0].kill()"); pg.wait_for_timeout(2200)
    t = texts(pg, 'GameScene')
    check('sem vidas: fim de jogo da equipe aparece', any('FIM DE JOGO' in x for x in t) and any('equipe' in x for x in t), '; '.join(x for x in t if 'FIM' in x or 'equipe' in x))
    pg.screenshot(path=f'{SHOTS}/coop_gameover.png')

    # --- Bandeira: só termina quando os dois chegam
    fresh(pg)
    ev(pg, "localStorage.removeItem('szbb.save')")
    ev(pg, f"(() => {{ const s={SC}; const g=s.built.goalZone; s.players[0].arcadeBody.reset(g.x, g.y); return null; }})()"); pg.wait_for_timeout(500)
    st = state(pg)
    check('Zion na bandeira sozinho não conclui a fase', st['goalReached'] == 1 and not st['finished'] and st['players'][0]['victory'], f"chegaram={st['goalReached']} fim={st['finished']}")
    pg.wait_for_timeout(1200)
    check('a fase continua jogável para a Bara enquanto o Zion espera', not state(pg)['finished'] and not state(pg)['players'][1]['dead'])
    ev(pg, f"(() => {{ const s={SC}; const g=s.built.goalZone; s.players[1].arcadeBody.reset(g.x, g.y); return null; }})()"); pg.wait_for_timeout(600)
    st = state(pg)
    check('quando a Bara também chega, a fase é concluída', st['finished'] and st['goalReached'] == 2, f"fim={st['finished']} chegaram={st['goalReached']}")
    pg.wait_for_timeout(2300)
    saved = json.loads(ev(pg, "localStorage.getItem('szbb.save')") or 'null')
    t = texts(pg, 'GameScene')
    check('conclusão cooperativa é gravada e o resultado aparece', saved is not None and saved['completedLevels'] == ['1-1'] and saved['mode'] == 'coop' and any('FASE CONCLUÍDA' in x for x in t), json.dumps(saved))
    pg.screenshot(path=f'{SHOTS}/coop_win.png')

    # --- Modo persiste: recarregar e Enter
    pg.reload(); pg.wait_for_timeout(2000)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1800)
    st = state(pg)
    check('após recarregar, Enter inicia o último modo (cooperativo)', st is not None and st['mode'] == 'coop' and len(st['players']) == 2, f"modo={st and st['mode']}")
    ev(pg, f"(() => {{ {SC}.scene.stop('UIScene'); {SC}.scene.start('MenuScene'); return null; }})()"); pg.wait_for_timeout(1200)
    pg.keyboard.press('1'); pg.wait_for_timeout(1800)
    st = state(pg)
    check('tecla 1 no menu inicia o modo individual (só o Zion)', st['mode'] == 'solo' and len(st['players']) == 1, f"modo={st['mode']} jogadores={len(st['players'])}")

    check('sem erros de console', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

print(f"\n{sum(results)}/{len(results)} verificações passaram")
sys.exit(0 if all(results) else 1)
