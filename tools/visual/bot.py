import sys, json, time
from playwright.sync_api import sync_playwright

url = sys.argv[1]
secs = float(sys.argv[2]) if len(sys.argv) > 2 else 60
tag = sys.argv[3] if len(sys.argv) > 3 else 'bot'

SENSE = """(() => {
  const s = window.__ZION__.game.scene.getScene('GameScene');
  if (!s || !s.player) return null;
  const T = 60, p = s.player, g = s.grid, b = p.arcadeBody;
  const col = Math.floor(p.x / T), row = Math.floor((b.bottom - 2) / T);
  let gap = null;
  for (let d = 1; d <= 6; d++) { if (!g.isSolid(col + d, row + 1)) { gap = d; break; } }
  let wall = null;
  for (let d = 1; d <= 2; d++) { if (g.isSolid(col + d, row)) { wall = d; break; } }
  const en = s.enemies.filter(e => !e.dead && e.active).map(e => ({dx: e.x - p.x, dy: e.y - p.y})).filter(e => e.dx > -40 && e.dx < 330 && Math.abs(e.dy) < 90).map(e => e.dx);
  const sp = s.level.spikes.map(k => (k.x + 0.5) * T - p.x).filter(d => d > -30 && d < 260);
  return { st: s.debugState(), gap, wall, en, sp, onGround: p.onGround, x: p.x };
})()"""

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'/home/claude/validation/shots/{tag}_start.png')
    kb = pg.keyboard
    kb.down('ArrowRight'); kb.down('Shift')
    jump_until = 0
    t0 = time.time(); last_shot = t0; shots = 0
    maxx = 0; deaths = 0; prev_dead = False; finished = False
    while time.time() - t0 < secs:
        s = pg.evaluate(SENSE)
        if not s: time.sleep(0.05); continue
        st = s['st']; now = time.time()
        maxx = max(maxx, st['x'])
        if st['dead'] and not prev_dead: deaths += 1
        prev_dead = st['dead']
        if st['finished']:
            finished = True
            kb.up('ArrowRight'); kb.up('Shift')
            pg.wait_for_timeout(2500)
            pg.screenshot(path=f'/home/claude/validation/shots/{tag}_win.png')
            break
        danger = (s['gap'] is not None and s['gap'] <= 2) or (s['wall'] is not None) or any(70 < d < 190 for d in s['en']) or any(40 < d < 170 for d in s['sp'])
        if s['onGround'] and danger and now > jump_until:
            kb.down('Space'); jump_until = now + 0.55
            hold_release = now + 0.42
        if now > jump_until - 0.13 and now <= jump_until + 0.05:
            kb.up('Space')
        if now - last_shot > 7 and shots < 8:
            pg.screenshot(path=f'/home/claude/validation/shots/{tag}_{shots}.png'); shots += 1; last_shot = now
        time.sleep(0.03)
    kb.up('Space')
    final = pg.evaluate(SENSE)
    print(json.dumps({'final': final['st'] if final else None, 'maxX': maxx, 'deaths': deaths, 'finished': finished, 'elapsed': round(time.time()-t0,1)}))
    print('erros de console:', logs[:5] or 'nenhum')
    pg.screenshot(path=f'/home/claude/validation/shots/{tag}_end.png')
    b.close()
