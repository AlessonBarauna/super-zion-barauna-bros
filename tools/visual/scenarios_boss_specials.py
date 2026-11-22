"""Força cada chefão (mundos 2-8) a usar seus ataques especiais e confere perigos, dano e erros."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/?renderer=canvas'
SHOTS = '/home/claude/validation/shots'
SC = "window.__ZION__.game.scene.getScene('GameScene')"
EXPECT = {2: ['rain'], 3: ['leap'], 4: ['shot'], 5: ['shot', 'rain'], 6: ['leap', 'shot'], 7: ['rain', 'shot'], 8: ['leap', 'rain', 'shot']}
ONLY = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else None
fails = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720}); pg.set_default_timeout(8000)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    for w, specials in EXPECT.items():
        if ONLY and w not in ONLY: continue
        pg.goto(BASE + f'&level={w}-4'); pg.wait_for_timeout(1200); pg.mouse.click(640, 410); pg.wait_for_timeout(1800)
        seen = set(); maxh = 0; hurt = False; shot_taken = False
        for rnd in range(len(specials) * 2 + 2):
            # prepara o próximo ataque: cycle ímpar + recover pronto => entra em 'cast' com o especial da vez
            pg.evaluate(f"(() => {{ const b = {SC}.bossFight.boss; b.ai = {{...b.ai, mode: 'recover', timer: 0, cycle: {1 + 2 * rnd}, special: null}}; const p = {SC}.players[0]; p.vitality && 0; }})()")
            for _ in range(26):
                pg.wait_for_timeout(250)
                st = pg.evaluate(f"(() => {{ const f = {SC}.bossFight; return {{mode: f.boss.ai.mode, sp: f.boss.ai.special, n: f.hazards.length, hp: {SC}.players[0].vitality.hp ?? null, dead: {SC}.players[0].dead}}; }})()")
                if st['sp']: seen.add(st['sp'])
                maxh = max(maxh, st['n'])
                if st['n'] > 0 and not shot_taken:
                    pg.screenshot(path=f'{SHOTS}/boss_{w}.png'); shot_taken = True
                if st['mode'] in ('walk',) and st['n'] == 0 and rnd > 0: break
            if pg.evaluate(f"{SC}.players[0].dead"): break
        missing = set(specials) - seen
        if missing: fails.append(f'mundo {w}: ataques não executados {sorted(missing)} (viu {sorted(seen)})')
        if maxh == 0: fails.append(f'mundo {w}: nenhum perigo apareceu')
        print(w, 'ataques vistos', sorted(seen), 'máx perigos', maxh)
    b.close()
print('erros de página:', errors[:2])
for f in fails: print('FAIL', f)
sys.exit(1 if fails or errors else 0)
