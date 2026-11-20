"""Confere que os eventos novos disparam os efeitos sonoros certos (espionando Sfx.play) e que nada lança erro."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    def load(lid):
        pg.goto(BASE + f'&level={lid}'); pg.wait_for_timeout(1100); pg.mouse.click(640, 410); pg.wait_for_timeout(1900)
        pg.evaluate(f"(() => {{ const sc = {SC}; window.__sfx = []; const o = sc.sfx.play.bind(sc.sfx); sc.sfx.play = (n) => {{ window.__sfx.push(n); o(n); }}; }})()")
    def names(): return pg.evaluate("window.__sfx")
    def clear(): pg.evaluate("window.__sfx = []")
    def force(mode, special=None, timer=0.05):
        pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; b.ai = {{...b.ai, mode: '{mode}', special: {repr(special) if special else 'null'}, timer: {timer}, stunBy: null, invuln: 0, cycle: 1}}; }})()")
    load('1-1')
    pg.evaluate(f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
    pg.keyboard.down('Space'); pg.wait_for_timeout(250); pg.keyboard.up('Space'); pg.wait_for_timeout(60)
    pg.keyboard.down('Space'); pg.wait_for_timeout(150); pg.keyboard.up('Space'); pg.wait_for_timeout(300)
    n = names(); check('jump' in n and 'airjump' in n, f'pulo e pulo duplo: {n}')
    clear(); pg.evaluate(f"{SC}.players[0].grow()"); pg.wait_for_timeout(200)
    check('grow' in names() and 'powerup' not in names(), f'crescer: {names()}')
    clear()
    pg.evaluate(f"(() => {{ const sc = {SC}; const w = sc.built.warps[0]; sc.players[0].teleport(w.x, w.feetY); sc.camTarget.setPosition(w.x, 360); sc.cameras.main.setScroll(w.x - 640, 0); }})()")
    pg.wait_for_timeout(500); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(900)
    check('warp' in names(), f'entrar no cano: {names()}')
    load('6-4'); clear()
    force('cast', 'shot'); pg.wait_for_timeout(700)
    n = names(); check('warn' in n and 'orb' in n, f'Mechazord prepara e atira: {n}')
    clear(); pg.evaluate(f"{SC}.bossFight.boss.hurt('fire')"); pg.wait_for_timeout(100)
    check('immune' not in names(), 'hurt direto não toca som (só o BossFight toca)')
    clear(); pg.evaluate(f"{SC}.bossFight.fireHit(new Phaser.Geom.Rectangle({SC}.bossFight.boss.x - 10, {SC}.bossFight.boss.y - 10, 20, 20))")
    pg.wait_for_timeout(100); check('immune' in names(), f'fogo no imune: {names()}')
    load('2-4'); clear()
    force('cast', 'rain'); pg.wait_for_timeout(300)
    check('warn' in names(), f'Kragor prepara a chuva: {names()}')
    pg.wait_for_timeout(3500); check('rock' in names(), f'pedra cai no chão: {names()}')
    load('3-4'); clear()
    pg.evaluate(f"(() => {{ const bb = {SC}.bossFight.boss; bb.ai = {{...bb.ai, mode: 'leap', timer: 1.3, special: 'leap', stunBy: null, invuln: 0}}; }})()")
    pg.wait_for_timeout(1800); check('quake' in names(), f'Sakhur pousa: {names()}')
    load('4-4'); clear()
    pg.evaluate(f"(() => {{ const bb = {SC}.bossFight.boss; bb.ai = {{...bb.ai, hp: 1, mode: 'walk', invuln: 0}}; bb.hurt('fire'); }})()")
    pg.wait_for_timeout(300); check('bossdown' in names(), f'chefão derrotado: {names()}')
    b.close()
print('erros de página:', errors[:2])
sys.exit(1 if fails or errors else 0)
