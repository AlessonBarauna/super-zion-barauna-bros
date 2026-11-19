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
  // Ponte móvel horizontal ainda à frente (ou sob o jogador): o robô espera por ela, como uma pessoa faria.
  const br = s.built.movers.find(m => m.spec.axis === 'x' && m.spec.y === s.level.groundRow && p.x < (m.spec.x + m.spec.range + m.spec.w) * T + T);
  const bridge = br ? { mx: br.arcadeBody.x, mw: br.arcadeBody.width, specL: br.spec.x * T, specR: (br.spec.x + br.spec.range + br.spec.w) * T } : null;
  return { st: s.debugState(), gap, wall, en, sp, onGround: p.onGround, x: p.x, bottom: b.bottom, bridge };
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
    start_col = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    if start_col is not None:
        pg.evaluate(f"(() => {{ const s=window.__ZION__.game.scene.getScene('GameScene'); if ('{sys.argv[5] if len(sys.argv) > 5 else ''}'==='noenemies') s.enemies.splice(0).forEach(e=>e.destroy()); s.player.placeOnGround({start_col}*60, 540); s.player.arcadeBody.setVelocity(0,0); s.cameras.main.setScroll({start_col}*60-400, 0); return null; }})()")
        pg.wait_for_timeout(600)
    kb.down('ArrowRight'); kb.down('Shift')
    jump_until = 0
    t0 = time.time(); last_shot = t0; shots = 0
    maxx = 0; deaths = 0; death_at = []; trace = []; traced = False; prev_dead = False; finished = False
    while time.time() - t0 < secs:
        s = pg.evaluate(SENSE)
        if not s: time.sleep(0.05); continue
        st = s['st']; now = time.time()
        maxx = max(maxx, st['x'])
        trace.append((round(now - t0, 2), round(st['x']), round(st['y']), round(st['vx']), round(st['vy']), s['onGround'], round(br_left) if (br_left := (s['bridge'] or {}).get('mx')) else None, st['hp']))
        trace[:] = trace[-40:]
        if st['dead'] and not prev_dead:
            deaths += 1; death_at.append(round(st['x'] / 60, 1))
            if len(sys.argv) > 6 and 82 <= st['x'] / 60 <= 89.5 and not traced:
                traced = True
                print('TRACE (t, x, y, vx, vy, noChao, xPonte, hp):'); [print(' ', r) for r in trace]
        prev_dead = st['dead']
        if st['finished']:
            finished = True
            kb.up('ArrowRight'); kb.up('Shift')
            pg.wait_for_timeout(2500)
            pg.screenshot(path=f'/home/claude/validation/shots/{tag}_win.png')
            break
        br = s['bridge']
        if br and s['x'] > br['specL'] - 260:
            px = s['x']; left = br['mx']; right = br['mx'] + br['mw']
            on_plat = left - 10 <= px <= right + 10 and s['onGround'] and abs(s['bottom'] - 540) < 8 and px > br['specL'] - 12
            far_end = right >= br['specR'] - 8
            near_end = left <= br['specL'] + 10
            kb.up('Shift')
            if s['onGround'] and not on_plat and px < br['specL'] - 4 and any(70 < d < 190 for d in s['en']) and now > jump_until:
                kb.down('Space'); jump_until = now + 0.55           # pula o inimigo enquanto espera a ponte
            if now > jump_until - 0.13 and now <= jump_until + 0.05:
                kb.up('Space')
            if on_plat:
                (kb.down if far_end else kb.up)('ArrowRight')          # deixa a ponte levar; desce no fim
            elif px < br['specL'] - 70:
                kb.down('ArrowRight')                                  # aproxima-se, deixando margem para a latência do robô
            elif px < br['specR'] - 40:
                (kb.down if left <= br['specL'] + 30 else kb.up)('ArrowRight')   # espera; avança quando a ponte está chegando
            else:
                kb.down('ArrowRight')                                  # já no terreno do outro lado
            if px > br['specR'] + 30:
                kb.down('Shift'); kb.down('ArrowRight')
            if False: print('ponte', round(px), 'plat', round(left), round(right), 'plat?', on_plat, 'far', far_end, 'near', near_end, 'chao', s['onGround'], 'y', st['y'], 'morto', st['dead'], flush=True)
            time.sleep(0.03); continue
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
    print(json.dumps({'final': final['st'] if final else None, 'maxX': maxx, 'deaths': deaths, 'deathColumns': death_at, 'finished': finished, 'elapsed': round(time.time()-t0,1)}))
    print('erros de console:', logs[:5] or 'nenhum')
    pg.screenshot(path=f'/home/claude/validation/shots/{tag}_end.png')
    b.close()
