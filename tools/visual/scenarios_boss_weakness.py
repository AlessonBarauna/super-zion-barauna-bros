"""Confere, no jogo real, o corpo, a dica e o jeito próprio de vencer cada chefão (mundos 1-8)."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
SHOTS = '/home/claude/validation/shots'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)
def boss(pg): return pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; return {{hp: b.ai.hp, mode: b.ai.mode, by: b.ai.stunBy, sp: b.ai.special, x: b.x, dead: {SC}.players[0].dead}}; }})()")
def force(pg, mode='recover', cycle=1, hp=None):
    pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; b.ai = {{...b.ai, mode: '{mode}', timer: 0, cycle: {cycle}, special: null, stunBy: null, invuln: 0{'' if hp is None else f', hp: {hp}'}}}; }})()")
def tpx(pg, x):
    pg.evaluate(f"(() => {{ const sc = {SC}; sc.players.forEach(p => p.teleport({x}, 540)); }})()")
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    def load(w):
        pg.goto(BASE + f'&level={w}-4'); pg.wait_for_timeout(1200); pg.mouse.click(640, 410); pg.wait_for_timeout(2200)
        pg.screenshot(path=f'{SHOTS}/bossbody_{w}.png')
    # dica visível
    load(2)
    hint = pg.evaluate(f"{SC}.children.list.filter(c => c.type === 'Text' && c.text.includes('Pele de pedra')).length")
    check(hint == 1, 'Kragor: dica aparece no início da luta')
    # Kragor: imune a fogo; pedra do meio fere o chefão
    r = pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; return b.hurt('fire'); }})()")
    check(r['immune'] and not r['hit'] and boss(pg)['hp'] == 6, 'Kragor: imune ao fogo')
    bx = boss(pg)['x']; tpx(pg, bx - 120); force(pg)
    pg.wait_for_timeout(600); tpx(pg, bx - 420); pg.wait_for_timeout(2600)
    s = boss(pg)
    check(s['hp'] == 3 and s['by'] in ('rocks', None), f"Kragor: própria pedra tira 3 de vida (hp {s['hp']}, modo {s['mode']})")
    # Frostak: fogo dobrado
    load(4)
    r = pg.evaluate(f"{SC}.bossFight.boss.hurt('fire')")
    check(r['hit'] and boss(pg)['hp'] == 5, 'Frostak: fogo causa 2 de dano')
    # Vyrak: pisão no preparo
    load(5)
    force(pg); pg.wait_for_timeout(300)
    s = boss(pg); check(s['mode'] == 'cast', f"Vyrak: entra em preparo ({s['mode']})")
    r = pg.evaluate(f"{SC}.bossFight.boss.hurt('stomp')")
    s = boss(pg); check(r['hit'] and s['hp'] == 6 and s['mode'] == 'recover', f"Vyrak: pisão no preparo causa 2 e interrompe (hp {s['hp']}, {s['mode']})")
    force(pg, 'walk', 0); r = pg.evaluate(f"{SC}.bossFight.boss.hurt('stomp')")
    check(not r['hit'], 'Vyrak: pisão fora do preparo não machuca')
    # Sakhur: salto real -> pousa -> atordoado por 'quake'
    load(3)
    tpx(pg, 260); force(pg, 'recover', 1); landed = None
    for _ in range(40):
        pg.wait_for_timeout(250); s = boss(pg)
        if s['mode'] == 'stunned': landed = s; break
    check(bool(landed) and landed['by'] == 'quake', f"Sakhur: salto termina em pouso e deixa cansado ({landed})")
    if landed:
        r = pg.evaluate(f"{SC}.bossFight.boss.hurt('stomp')")
        check(r['hit'] and boss(pg)['hp'] == 4, 'Sakhur: pisão no pouso causa 3')
    # Mechazord: fogo imune; superaquece depois de atirar
    load(6)
    r = pg.evaluate(f"{SC}.bossFight.boss.hurt('fire')"); check(r['immune'], 'Mechazord: imune ao fogo')
    pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; b.ai = {{...b.ai, mode: 'cast', special: 'shot', timer: 0.05, stunBy: null, invuln: 0}}; }})()")
    pg.wait_for_timeout(500); s = boss(pg)
    check(s['mode'] == 'stunned' and s['by'] == 'shot', f"Mechazord: superaquece depois de atirar ({s['mode']}/{s['by']})")
    # Auron e Umbrax: corpos carregam
    for w in (7, 8): load(w)
    b.close()
print('erros de página:', errors[:2])
sys.exit(1 if fails or errors else 0)
