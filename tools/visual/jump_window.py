"""Mede a janela de decolagem para atravessar um trecho (ex.: campo de espinhos) com pulos 'humanos'.
Uso: jump_window.py URL_BASE FASE COL_INICIO COL_FIM [zion|bara] ; COL_FIM é a última coluna perigosa."""
import sys
from playwright.sync_api import sync_playwright
base, lid, c0, c1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
who = sys.argv[5] if len(sys.argv) > 5 else 'zion'
double = len(sys.argv) > 6 and sys.argv[6] == 'dj'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
keys = {'zion': ('ArrowRight', 'Shift', 'Space'), 'bara': ('l', 'k', 'i')}[who]
left, right = c0 * 60, (c1 + 1) * 60
res = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    for takeoff in (150, 120, 90, 60, 30, 0, -30):
        pg.goto(f'{base}&level={lid}'); pg.wait_for_timeout(1000)
        pg.mouse.click(640, 410 if who == 'zion' else 496); pg.wait_for_timeout(1800)
        idx = 0 if who == 'zion' else 1
        x0 = left - takeoff - 240
        pg.evaluate(f"(() => {{ const sc = {SC}; sc.enemies.splice(0).forEach(e => e.destroy()); sc.players.forEach(p => p.teleport({x0}, 540)); sc.camTarget.setPosition({x0}, 360); sc.cameras.main.setScroll({x0} - 640, 0); }})()")
        pg.wait_for_timeout(500)
        pg.keyboard.down(keys[0]); pg.keyboard.down(keys[1])
        jumped = False; dead = False; crossed = False; minx = x0
        for _ in range(200):
            x = pg.evaluate(f"{SC}.players[{idx}].x")
            if not jumped and x >= left - takeoff:
                pg.keyboard.down(keys[2]); pg.wait_for_timeout(300 if double else 450); pg.keyboard.up(keys[2]); jumped = True
                if double:
                    pg.keyboard.down(keys[2]); pg.wait_for_timeout(300); pg.keyboard.up(keys[2])
            st = pg.evaluate(f"(() => {{ const p = {SC}.players[{idx}]; return [p.x, p.dead, p.arcadeBody.blocked.down]; }})()")
            if st[0] < minx - 40 or st[1]: dead = True; break   # morreu (ou renasceu mais atrás)
            minx = max(minx, st[0])
            if jumped and st[0] > right + 30 and st[2]: crossed = True; break
            pg.wait_for_timeout(40)
        pg.keyboard.up(keys[0]); pg.keyboard.up(keys[1])
        res.append((takeoff, 'passou' if crossed else 'MORREU' if dead else 'travou'))
    b.close()
print(who, lid, 'duplo' if double else 'simples', res)
