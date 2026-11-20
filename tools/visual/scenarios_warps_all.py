"""Percorre TODOS os canos e portas de TODAS as fases: entra, confere a sala, sai e confere a volta."""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SC = "window.__ZION__.game.scene.getScene('GameScene')"
fails = []; total = 0
def tp(pg, x, bottom):
    pg.evaluate(f"(() => {{ const sc = {SC}; sc.enemies.splice(0).forEach(e => e.destroy()); sc.players.forEach(p => p.teleport({x}, {bottom})); sc.camTarget.setPosition({x}, 360); sc.cameras.main.setScroll({x} - 640, 0); }})()")
    pg.wait_for_timeout(500)
def info(pg): return pg.evaluate(f"(() => {{ const sc = {SC}; const p = sc.players[0]; return {{x: p.x, dead: p.dead, scroll: sc.cameras.main.scrollX, main: (sc.level.mainWidthTiles ?? sc.level.widthTiles) * 60}}; }})()")
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    for w in range(1, 9):
        for st in range(1, 5):
            lid = f'{w}-{st}'
            if only and lid not in only: continue
            pg.goto(BASE + f'&level={lid}'); pg.wait_for_timeout(1200); pg.mouse.click(640, 410); pg.wait_for_timeout(1500)
            warps = pg.evaluate(f"{SC}.built.warps.map(w => ({{kind: w.kind, x: w.x, feetY: w.feetY, toX: w.toX, toBottom: w.toBottom}}))")
            main = info(pg)['main']
            for i, wp in enumerate(warps):
                total += 1
                tp(pg, wp['x'], wp['feetY'])
                pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(2200)
                a = info(pg)
                inside = wp['toX'] >= main
                ok = abs(a['x'] - wp['toX']) < 120 and not a['dead']
                if inside: ok = ok and a['scroll'] >= main - 2
                else: ok = ok and a['scroll'] < main
                if not ok: fails.append(f"{lid} warp#{i} {wp['kind']}: x={round(a['x'])} esperado≈{round(wp['toX'])} scroll={round(a['scroll'])}")
    b.close()
print(f'{total - len(fails)}/{total} warps ok; erros de página: {errors[:2]}')
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors else 0)
