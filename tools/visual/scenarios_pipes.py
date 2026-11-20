import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
results = []
def check(name, ok, info=''):
    results.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if info and not ok else ''), flush=True)
def state(pg): return pg.evaluate("window.__ZION__.state()")
def tp(pg, x, bottom):
    pg.evaluate(f"(() => {{ const sc = {SC}; sc.players.forEach(p => p.teleport({x}, {bottom})); sc.camTarget.setPosition({x}, 360); const c = sc.cameras.main; c.setScroll(Math.max(c.scrollX > {x} - 640 && c.scrollX < {x} ? {x} - 640 : {x} - 640, c.getBounds().x), 0); }})()")
    pg.wait_for_timeout(500)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '&level=1-1'); pg.wait_for_timeout(1500); pg.mouse.click(640, 410); pg.wait_for_timeout(1800)
    s = state(pg)
    check('começa pequeno (hp 1)', s['hp'] == 1, s['hp'])
    # cano entrável do 1-1: colunas 54-55, topo em y=420
    tp(pg, 3300, 420)
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(2000)
    s = state(pg)
    check('↓ no cano leva à caverna secreta', s['x'] > 140*60, s['x'])
    scroll = pg.evaluate("window.__ZION__.game.scene.getScene('GameScene').cameras.main.scrollX")
    check('câmera presa na sala', scroll >= 140*60 - 2, scroll)
    pg.screenshot(path='/home/claude/validation/shots/p7_cave.png')
    c0 = s['coins']
    for _ in range(3):
        pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(1100); pg.keyboard.up('ArrowRight')
        pg.keyboard.press('ArrowUp')
    s = state(pg)
    check('coleta moedas na caverna', s['coins'] > c0, f"{c0}->{s['coins']}")
    # saída: cano em c(20) = 160, topo y=420
    tp(pg, 161*60, 420)
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(2000)
    s = state(pg)
    check('cano de saída volta à fase principal', s['x'] < 130*60, s['x'])
    pg.screenshot(path='/home/claude/validation/shots/p7_back.png')
    # porta da casa (col 20)
    tp(pg, 20*60+30+8, 540)
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(2000)
    s = state(pg)
    check('↓ na porta leva à casa secreta', s['x'] > 168*60, s['x'])
    pg.screenshot(path='/home/claude/validation/shots/p7_house.png')
    # pega o presente: bloco em x0+11, y6 -> bate por baixo
    hx = pg.evaluate(f"{SC}.level.rooms[1].x")
    tp(pg, (hx+11)*60+30, 540)
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(600); pg.keyboard.up('ArrowUp'); pg.wait_for_timeout(600)
    s = state(pg)
    check('presente da casa aparece/cresce', s['items'] > 0 or s['hp'] >= 2, json.dumps({k: s[k] for k in ('items','hp')}))
    # recarrega a fase para os testes seguintes
    pg.goto(BASE + '&level=1-1'); pg.wait_for_timeout(1500); pg.mouse.click(640, 410); pg.wait_for_timeout(1800)
    pg.evaluate(f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
    # cano decorativo não entra
    tp(pg, 23*60, 420)
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(800)
    check('cano decorativo não teleporta', state(pg)['x'] < 130*60)
    # pulo duplo
    tp(pg, 700, 540); pg.wait_for_timeout(300)
    pg.keyboard.press('Space'); pg.wait_for_timeout(300)
    vy1 = state(pg)['vy']; pg.keyboard.press('Space'); pg.wait_for_timeout(250)
    vy2 = state(pg)['vy']
    check('pulo duplo dá novo impulso (subiu mais alto que o 1º pulo sozinho)', vy2 < vy1 + 150, f'{vy1}->{vy2}')
    # abaixar: segurar ↓ no chão reduz a altura e para o personagem; soltar levanta
    tp(pg, 700, 540); pg.wait_for_timeout(1500)
    h0 = state(pg)['players'][0]['height']
    pg.keyboard.down('ArrowDown'); pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(1500)
    sc = state(pg); h1 = sc['players'][0]['height']
    check('segurar ↓ abaixa (corpo mais baixo) e não anda', h1 < h0 - 8 and abs(sc['x'] - 700) < 20, f"{h0}->{h1} x={sc['x']}")
    pg.screenshot(path='/home/claude/validation/shots/p7_crouch.png')
    pg.keyboard.up('ArrowRight'); pg.keyboard.up('ArrowDown'); pg.wait_for_timeout(400)
    check('soltar ↓ levanta', state(pg)['players'][0]['height'] >= h0 - 1, state(pg)['players'][0]['height'])
    check('sem erros de página', not errors, errors[:2])
    b.close()
print(f"{sum(results)}/{len(results)}")
sys.exit(0 if all(results) else 1)
