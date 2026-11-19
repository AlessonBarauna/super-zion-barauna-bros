import sys, json, time
from playwright.sync_api import sync_playwright

url = sys.argv[1]
T = 60
results = []
def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

SC = "window.__ZION__.game.scene.getScene('GameScene')"
def ev(pg, js): return pg.evaluate(js)
def state(pg): return ev(pg, "window.__ZION__.state()")
def fresh(pg, enemies=False):
    ev(pg, f"(() => {{ {SC}.scene.restart(); return null; }})()"); pg.wait_for_timeout(1400)
    if not enemies:
        ev(pg, f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
def tp(pg, col, row_bottom_tile):
    # coloca o jogador em pé sobre o chão: base do corpo na parte de baixo da linha row_bottom_tile
    ev(pg, f"(() => {{ const s={SC}; s.player.respawn(({col}+0.5)*{T}, ({row_bottom_tile}+1)*{T}); s.player.vitality.reset(); }})()")

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1200)

    # --- Menu: clicar no botão 1 JOGADOR com o mouse
    pg.mouse.click(640, 410); pg.wait_for_timeout(1800)
    s0 = state(pg)
    check('menu: botão 1 JOGADOR inicia a partida', s0 is not None and s0['lives'] == 5 and s0['coins'] == 0, json.dumps(s0))
    check('início: 5 vidas, 3 corações, no chão', s0['hp'] == 3 and s0['onGround'], '')

    # --- Altura do pulo
    pg.wait_for_timeout(300)
    y0 = state(pg)['y']; ymin = y0
    pg.keyboard.down('Space')
    for _ in range(40):
        ymin = min(ymin, state(pg)['y']); time.sleep(0.02)
    pg.keyboard.up('Space'); pg.wait_for_timeout(700)
    full = (y0 - ymin) / T
    # pulo curto (toque)
    y1 = state(pg)['y']; ymin2 = y1
    pg.keyboard.down('Space'); time.sleep(0.04); pg.keyboard.up('Space')
    for _ in range(40):
        ymin2 = min(ymin2, state(pg)['y']); time.sleep(0.02)
    short = (y1 - ymin2) / T
    check('pulo variável: segurar sobe mais que tocar', full > short + 0.8, f'cheio={full:.2f} blocos, curto={short:.2f} blocos')
    check('pulo cheio entre 2.8 e 4 blocos', 2.8 <= full <= 4.0, f'{full:.2f}')
    pg.wait_for_timeout(600)

    # --- Movimento: caminhar vs correr
    fresh(pg)
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(500)
    vw = state(pg)['vx']
    pg.keyboard.down('Shift'); pg.wait_for_timeout(500)
    vr = state(pg)['vx']
    pg.keyboard.up('Shift'); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(500)
    vs = state(pg)['vx']
    check('caminhar ~293 px/s e correr ~480 px/s', 280 < vw < 300 and 470 < vr < 490, f'andar={vw} correr={vr}')
    check('para sem deslizar ao soltar (<=1 s)', abs(vs) < 5, f'vx={vs}')
    pg.screenshot(path='/home/claude/validation/shots/sc_move.png')

    # --- Bloco surpresa: pular debaixo do bloco (col 8, linha 6)
    fresh(pg)
    tp(pg, 8, 8); pg.wait_for_timeout(500)
    before = state(pg)
    pg.keyboard.down('Space'); pg.wait_for_timeout(450); pg.keyboard.up('Space'); pg.wait_for_timeout(500)
    after = state(pg)
    kind = ev(pg, f"{SC}.built.solids.getChildren().find(t => Math.abs(t.x-(8.5*{T}))<2 && Math.abs(t.y-(6.5*{T}))<14)?.getData('kind')")
    check('bloco surpresa: vira usado e dá +1 moeda', kind == 'used' and after['coins'] == before['coins'] + 1, f'kind={kind} moedas {before["coins"]}->{after["coins"]}')

    # --- Pisar em inimigo (col 28, sem plataformas por cima)
    fresh(pg, enemies=True)
    en0 = state(pg)['enemies']; sc0 = state(pg)['score']
    ev(pg, f"(() => {{ const s={SC}; const e=s.enemies.find(e=>Math.abs(e.x-28.5*{T})<150); e.tick = () => true; e.arcadeBody.setVelocityX(0); s.player.respawn(e.x, e.arcadeBody.top-260); s.player.vitality.reset(); }})()")
    pg.wait_for_timeout(1700)
    st = state(pg)
    check('pisar no Cogumelo Sombrio: inimigo some e +100 pontos', st['enemies'] == en0 - 1 and st['score'] >= sc0 + 100 and st['hp'] == 3, f'inimigos {en0}->{st["enemies"]} pontos {sc0}->{st["score"]} hp={st["hp"]} x={st["x"]}')

    # --- Dano lateral por inimigo: encosta sem pisar
    fresh(pg, enemies=True)
    ev(pg, f"(() => {{ const s={SC}; const e=s.enemies.find(e=>e.x>25*{T} && e.x<30*{T}); s.player.respawn(e.x-20, e.arcadeBody.bottom); s.player.vitality.reset(); }})()")
    pg.wait_for_timeout(400)
    st = state(pg)
    check('encostar no inimigo tira 1 coração (hp 3->2)', st['hp'] == 2, f'hp={st["hp"]}')
    pg.screenshot(path='/home/claude/validation/shots/sc_hurt.png')
    pg.wait_for_timeout(300)
    hp_inv = state(pg)['hp']
    check('invulnerável logo após o dano (não perde mais corações)', hp_inv == 2, f'hp={hp_inv}')

    # --- Espinhos
    fresh(pg)
    tp(pg, 49, 8); pg.wait_for_timeout(100)
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(500); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(200)
    st = state(pg)
    check('espinhos causam dano (3->2 corações)', st['hp'] == 2, f'hp={st["hp"]}')

    # --- Checkpoint e morte no abismo
    fresh(pg)
    tp(pg, 57, 8); pg.wait_for_timeout(600)
    cp = state(pg)['checkpoint']
    check('checkpoint é ativado ao tocar', cp == int(57.5 * T), f'checkpoint={cp}')
    lives_before = state(pg)['lives']
    ev(pg, f"(() => {{ const s={SC}; s.player.arcadeBody.reset(61.5*{T}, 300); }})()")
    pg.wait_for_timeout(900)
    pg.screenshot(path='/home/claude/validation/shots/sc_falling.png')
    pg.wait_for_timeout(3200)
    st = state(pg)
    check('morrer no abismo: perde 1 vida e renasce no checkpoint com 3 corações',
          st['lives'] == lives_before - 1 and not st['dead'] and abs(st['x'] - cp) < 80 and st['hp'] == 3,
          f'vidas {lives_before}->{st["lives"]} x={st["x"]} cp={cp} hp={st["hp"]}')

    # --- 100 moedas = 1 vida
    ev(pg, f"(() => {{ const s={SC}; s.progress.coins = 99; s.progress.collectCoin(1); }})()")
    st = state(pg)
    check('100 moedas concedem 1 vida e zeram o contador', st['coins'] == 0 and st['lives'] == lives_before, f'moedas={st["coins"]} vidas={st["lives"]}')

    # --- Pausa
    pg.keyboard.press('p'); pg.wait_for_timeout(500)
    paused = ev(pg, "window.__ZION__.game.scene.isActive('PauseScene')")
    pg.screenshot(path='/home/claude/validation/shots/sc_pause.png')
    pg.keyboard.press('p'); pg.wait_for_timeout(500)
    resumed = ev(pg, "window.__ZION__.game.scene.isActive('GameScene') && !window.__ZION__.game.scene.isActive('PauseScene')")
    check('pausa com P e retomada com P', paused and resumed, f'pausado={paused} retomado={resumed}')

    # --- Tempo esgotado
    lives_t = state(pg)['lives']
    ev(pg, f"{SC}.timeLeft = 0.2")
    pg.wait_for_timeout(4200)
    st = state(pg)
    check('tempo esgotado tira uma vida e reinicia o relógio', st['lives'] == lives_t - 1 and st['timeLeft'] >= 100, f'vidas {lives_t}->{st["lives"]} tempo={st["timeLeft"]}')

    # --- Game over e reinício
    ev(pg, f"(() => {{ const s={SC}; s.progress.lives = 1; s.player.kill(); }})()")
    pg.wait_for_timeout(2600)
    pg.screenshot(path='/home/claude/validation/shots/sc_gameover.png')
    go = ev(pg, f"{SC}.progress.isGameOver")
    pg.mouse.click(640, 470); pg.wait_for_timeout(1800)
    st = state(pg)
    check('game over aparece e TENTAR DE NOVO reinicia com 5 vidas', go and st is not None and st['lives'] == 5 and st['x'] < 500, f'gameover={go} estado={json.dumps(st)}')

    # --- Menu principal a partir da pausa
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.mouse.click(640, 440); pg.wait_for_timeout(1000)
    on_menu = ev(pg, "window.__ZION__.game.scene.isActive('MenuScene')")
    check('MENU PRINCIPAL na pausa volta ao menu', on_menu, '')

    check('sem erros de console', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} verificações passaram')
sys.exit(1 if fails else 0)
