"""Cenários de tijolos quebráveis e plataformas móveis (navegador real)."""
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
def place(pg, i, col, row=9):
    ev(pg, f"(() => {{ const p={SC}.players[{i}]; p.placeOnGround(({col}+0.5)*{T}, {row}*{T}); p.arcadeBody.setVelocity(0,0); return null; }})()")
def mover(pg, i):
    return ev(pg, f"(() => {{ const m={SC}.built.movers[{i}]; return {{x: m.arcadeBody.x, y: m.arcadeBody.y, w: m.arcadeBody.width, vx: m.arcadeBody.velocity.x, vy: m.arcadeBody.velocity.y}}; }})()")
def pbody(pg, i=0):
    return ev(pg, f"(() => {{ const b={SC}.players[{i}].arcadeBody; return {{x: b.x + b.width/2, bottom: b.bottom, vy: b.velocity.y, ground: {SC}.players[{i}].onGround}}; }})()")
def jump_under(pg, col):
    place(pg, 0, col); pg.wait_for_timeout(400)
    pg.keyboard.down('Space'); pg.wait_for_timeout(420); pg.keyboard.up('Space'); pg.wait_for_timeout(400)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1200)
    ev(pg, "localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
    pg.keyboard.press('1'); pg.wait_for_timeout(1800)

    # ---------- TIJOLOS ----------
    fresh(pg)
    before = ev(pg, f"{SC}.built.solids.getChildren().length")
    jump_under(pg, 7)
    st = state(pg)
    after = ev(pg, f"{SC}.built.solids.getChildren().length")
    gone = ev(pg, f"{SC}.grid.kindAt(7, 6) === undefined")
    check('tijolo atingido por baixo quebra (some da grade e da física)', gone and after == before - 1, f"corpos {before}->{after}")
    check('quebrar tijolo dá 20 pontos', st['score'] == 20, f"pontos={st['score']}")
    pg.screenshot(path=f'{SHOTS}/wd_brick_break.png')

    fresh(pg)
    ev(pg, f"(() => {{ const s={SC}; s.progress.score = 0; return null; }})()")
    jump_under(pg, 8)  # bloco surpresa continua sendo surpresa
    st = state(pg)
    kind = ev(pg, f"{SC}.grid.kindAt(8, 6)")
    check('bloco surpresa não quebra: continua no lugar e solta a Fruta de Baraúna', kind == 'surprise' and st['items'] >= 1, f"tipo={kind} itens={st['items']}")

    fresh(pg)
    ev(pg, f"(() => {{ const s={SC}; s.grid.removeCell(7,6); return null; }})()")
    check('remover célula atualiza a IA (grade não vê mais o chão)', ev(pg, f"!{SC}.grid.isSolid(7, 6)"))

    # inimigo em cima do tijolo morre quando ele quebra
    fresh(pg, enemies=True)
    ev(pg, f"(() => {{ const s={SC}; const e=s.enemies[0]; e.tick=()=>true; e.arcadeBody.reset(9.5*{T}, 6*{T} - e.arcadeBody.height/2); e.arcadeBody.setVelocity(0,0); e.arcadeBody.setAllowGravity(false); return null; }})()")
    n0 = state(pg)['enemies']
    jump_under(pg, 9)
    n1 = state(pg)['enemies']
    check('inimigo em cima do tijolo é derrubado quando ele quebra', n1 == n0 - 1, f"inimigos {n0}->{n1}")

    # ---------- PLATAFORMAS MÓVEIS ----------
    fresh(pg)
    m0 = mover(pg, 0)
    check('há duas plataformas móveis na fase (elevador e ponte)', ev(pg, f"{SC}.built.movers.length") == 2)

    # elevador (índice 0): sobe com o jogador em cima
    ev(pg, f"(() => {{ {SC}.platformClock = 0; return null; }})()"); pg.wait_for_timeout(200)
    m = mover(pg, 0)
    ev(pg, f"(() => {{ const p={SC}.players[0]; p.placeOnGround({m['x']} + 90, {m['y']}); p.arcadeBody.setVelocity(0,0); return null; }})()")
    pg.wait_for_timeout(300)
    pb0 = pbody(pg)
    pg.wait_for_timeout(1700)
    pb1 = pbody(pg); mm = mover(pg, 0)
    check('o elevador carrega o jogador para cima, sem soltá-lo', pb0['bottom'] - pb1['bottom'] > 60 and pb1['ground'] and abs(pb1['bottom'] - mm['y']) < 8,
          f"subiu {round(pb0['bottom']-pb1['bottom'])}px; pé={round(pb1['bottom'])} topo={round(mm['y'])} noChão={pb1['ground']}")
    pg.screenshot(path=f'{SHOTS}/wd_elevator.png')

    # passagem única: sobe por baixo e pousa em cima
    fresh(pg)
    ev(pg, f"(() => {{ const s={SC}; const m=s.built.movers[0]; m.follow=()=>{{}}; m.arcadeBody.reset(m.arcadeBody.x, 6*{T}); m.arcadeBody.setVelocity(0,0); return null; }})()")
    place(pg, 0, 26); pg.wait_for_timeout(400)
    top = 9 * T; low = top
    pg.keyboard.down('Space')
    for _ in range(14):
        pg.wait_for_timeout(45); low = min(low, pbody(pg)['bottom'])
    pg.keyboard.up('Space'); pg.wait_for_timeout(900)
    pb = pbody(pg); mm = mover(pg, 0)
    check('plataforma de passagem única: o jogador sobe por baixo e pousa em cima', low < 6 * T - 5 and pb['ground'] and abs(pb['bottom'] - mm['y']) < 8,
          f"ponto mais alto do pé={round(low)} (topo da laje={round(mm['y'])}) pouso={round(pb['bottom'])} noChão={pb['ground']}")

    # ponte (índice 1): atravessar o abismo
    fresh(pg)
    ev(pg, f"(() => {{ const s={SC}; s.platformClock = 0; return null; }})()"); pg.wait_for_timeout(300)
    m = mover(pg, 1)
    ev(pg, f"(() => {{ const p={SC}.players[0]; p.placeOnGround({m['x']} + 60, {m['y']}); p.arcadeBody.setVelocity(0,0); return null; }})()")
    pg.wait_for_timeout(500)
    pg.screenshot(path=f'{SHOTS}/wd_bridge_start.png')
    xs0 = pbody(pg)['x']
    # espera a ponte chegar à borda do outro lado (sem pressa: o relógio da plataforma é do jogo)
    for _ in range(120):
        pg.wait_for_timeout(60)
        mm = mover(pg, 1)
        if mm['x'] + mm['w'] >= 89 * T - 4: break
    xs1 = pbody(pg)['x']; st = state(pg)
    pg.screenshot(path=f'{SHOTS}/wd_bridge_mid.png')
    check('a ponte transporta o jogador sobre o abismo (sem cair)', xs1 - xs0 > 200 and not st['dead'] and st['y'] < 540, f"x {round(xs0)}->{round(xs1)} morto={st['dead']}")
    pg.keyboard.down('d'); pg.wait_for_timeout(1500); pg.keyboard.up('d'); pg.wait_for_timeout(500)
    st = state(pg)
    check('do outro lado, o jogador desembarca no terreno e segue vivo', st['x'] > 89 * T + 20 and not st['dead'] and st['onGround'], f"x={st['x']} noChão={st['onGround']}")

    # sem a plataforma o abismo mata de verdade
    fresh(pg)
    ev(pg, f"(() => {{ {SC}.built.movers.splice(1, 1)[0].destroy(); return null; }})()")
    ev(pg, f"(() => {{ const p={SC}.players[0]; p.arcadeBody.reset(84.5*{T}, 8*{T}); return null; }})()")
    pg.wait_for_timeout(2200)
    st = state(pg)
    check('o abismo largo continua mortal para quem cai nele', st['lives'] == 4 or st['dead'], f"vidas={st['lives']} morto={st['dead']}")

    # ---------- COOPERATIVO + PLATAFORMA ----------
    ev(pg, f"(() => {{ {SC}.scene.stop('UIScene'); {SC}.scene.start('MenuScene'); return null; }})()"); pg.wait_for_timeout(1200)
    pg.keyboard.press('2'); pg.wait_for_timeout(2000)
    ev(pg, f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
    ev(pg, f"(() => {{ {SC}.platformClock = 3.4; return null; }})()"); pg.wait_for_timeout(300)
    m = mover(pg, 1)
    ev(pg, f"(() => {{ const p={SC}.players[0]; p.placeOnGround({m['x']} + 90, {m['y']}); p.arcadeBody.setVelocity(0,0); return null; }})()")
    pg.wait_for_timeout(500)
    ev(pg, f"{SC}.players[1].kill()"); pg.wait_for_timeout(2200)
    st = state(pg)
    z, ba = st['players']
    check('parceiro sobre a ponte: quem renasce volta ao terreno firme, não ao ar sobre o abismo', not ba['dead'] and ba['onGround'] and (ba['x'] < 80 * T or ba['x'] > 89 * T), f"Zion={z['x']} Bara={ba['x']} noChão={ba['onGround']}")

    check('sem erros de console', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

print(f"\n{sum(results)}/{len(results)} verificações passaram")
sys.exit(0 if all(results) else 1)
