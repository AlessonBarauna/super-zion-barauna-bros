"""Coração do HUD: aparece com pulo e '+1' ao crescer; treme ao levar dano; sem animação ao iniciar."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas&level=1-1'
SHOTS = '/home/claude/validation/shots'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
UI = "window.__ZION__.game.scene.getScene('UIScene')"
fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(1200); pg.mouse.click(640, 410); pg.wait_for_timeout(2500)
    plus = lambda: pg.evaluate(f"{UI}.children.list.filter(c => c.type === 'Text' && c.text === '+1').length")
    full = lambda: pg.evaluate(f"{UI}.widgets[0].hearts.filter(h => h.texture.key === 'heart-full').length")
    check(plus() == 0 and full() == 1, f'início: 1 coração cheio, sem animação (cheios {full()})')
    pg.evaluate(f"{SC}.players[0].grow()"); pg.wait_for_timeout(180)
    scale = pg.evaluate(f"(() => {{ const h = {UI}.widgets[0].hearts[1]; return [h.scaleX, h.getData('baseScale')]; }})()")
    check(plus() == 1 and full() == 2, f'crescer: segundo coração enche e mostra +1 (cheios {full()}, +1: {plus()})')
    check(scale[0] > scale[1] * 1.3, f'crescer: coração dá um pulo (escala {scale[0]:.2f} > base {scale[1]:.2f})')
    pg.screenshot(path=f'{SHOTS}/hud_heart_grow.png', clip={'x':0,'y':0,'width':420,'height':140})
    pg.wait_for_timeout(1500)
    sc = pg.evaluate(f"(() => {{ const h = {UI}.widgets[0].hearts[1]; return [h.scaleX, h.getData('baseScale'), {UI}.children.list.filter(c => c.type === 'Text' && c.text === '+1').length]; }})()")
    check(abs(sc[0] - sc[1]) < 0.01 and sc[2] == 0, 'depois: escala volta ao normal e o +1 some')
    pg.evaluate(f"{SC}.players[0].takeHit({SC}.players[0].x + 50)"); pg.wait_for_timeout(100)
    xs = set()
    for _ in range(6):
        xs.add(round(pg.evaluate(f"{UI}.widgets[0].hearts[1].x"), 1)); pg.wait_for_timeout(35)
    check(len(xs) > 1 and full() == 1, f'dano: o coração perdido treme e esvazia (posições {sorted(xs)[:4]})')
    pg.wait_for_timeout(600)
    x0 = pg.evaluate(f"{UI}.widgets[0].hearts[1].x")
    check(abs(x0 - (94 + 36)) < 0.6 or abs(x0 - (180 + 38)) < 0.6, f'dano: coração volta ao lugar (x {x0})')
    b.close()
print('erros de página:', errors[:2])
sys.exit(1 if fails or errors else 0)
