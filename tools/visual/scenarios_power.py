"""Cenários da Flor de Fogo, itens e salvamento (navegador real)."""
import sys, json, time
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
    ev(pg, f"(() => {{ {SC}.scene.restart(); return null; }})()"); pg.wait_for_timeout(1400)
    if not enemies: ev(pg, f"{SC}.enemies.splice(0).forEach(e => e.destroy())")
def tp(pg, col, row):
    ev(pg, f"(() => {{ const s={SC}; s.player.respawn(({col}+0.5)*{T}, ({row}+1)*{T}); return null; }})()")
def grab_item(pg):
    ev(pg, f"(() => {{ const s={SC}; const i=s.items.getChildren().find(i=>i.active); s.player.arcadeBody.reset(i.x, i.y); return null; }})()")

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width':1280,'height':720})
    pg = ctx.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1200)
    ev(pg, "localStorage.clear()")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)

    # --- Sem poder, X não dispara
    fresh(pg)
    pg.keyboard.press('x'); pg.wait_for_timeout(300)
    check('sem poder: tecla X não dispara', state(pg)['shots'] == 0 and state(pg)['power'] is None)

    # --- Bloco com Flor de Fogo
    tp(pg, 10, 8); pg.wait_for_timeout(400)
    pg.keyboard.down('Space'); pg.wait_for_timeout(450); pg.keyboard.up('Space'); pg.wait_for_timeout(300)
    st = state(pg)
    check('bloco de Flor de Fogo solta um item (e não uma moeda)', st['items'] == 1 and st['coins'] == 0, f"itens={st['items']} moedas={st['coins']}")
    pg.wait_for_timeout(650)
    pg.screenshot(path=f'{SHOTS}/pw_item.png')
    grab_item(pg); pg.wait_for_timeout(500)
    st = state(pg)
    check('coletar o item equipa a Flor de Fogo (+200 pontos)', st['power'] == 'flor-de-fogo' and st['score'] >= 200 and st['items'] == 0, f"poder={st['power']} pontos={st['score']} hp={st['hp']} x={st['x']} y={st['y']}")

    # --- Disparo, limite e cooldown
    tp(pg, 3, 8); ev(pg, f"{SC}.player.powers.collect('flor-de-fogo')"); pg.wait_for_timeout(500)
    pg.keyboard.press('x'); pg.wait_for_timeout(120)
    pg.screenshot(path=f'{SHOTS}/pw_fire.png')
    st = state(pg)
    check('X dispara uma bola de fogo', st['shots'] == 1, f"shots={st['shots']}")
    pg.wait_for_timeout(2500)
    check('a bola de fogo some sozinha (tempo de vida / tela)', state(pg)['shots'] == 0)
    tp(pg, 3, 8); ev(pg, f"{SC}.player.powers.collect('flor-de-fogo')"); pg.wait_for_timeout(400)
    peak = 0
    for _ in range(10):
        pg.keyboard.press('x', delay=60); pg.wait_for_timeout(60); peak = max(peak, state(pg)['shots'])
    check('apertos repetidos de X: no máximo 2 bolas ao mesmo tempo', peak == 2, f"pico={peak}")
    pg.wait_for_timeout(2500)

    # --- Bola de fogo derrota inimigo
    fresh(pg, enemies=True)
    ev(pg, f"(() => {{ const s={SC}; const e=s.enemies.find(e=>Math.abs(e.x-28.5*{T})<150); window.__e=e; e.tick=()=>true; e.arcadeBody.setVelocityX(0); s.player.respawn(e.x-6*{T}, 9*{T}); s.player.powers.collect('flor-de-fogo'); return null; }})()")
    pg.wait_for_timeout(500)
    en0 = state(pg)['enemies']; sc0 = state(pg)['score']
    pg.keyboard.press('x'); pg.wait_for_timeout(1500)
    st = state(pg)
    check('bola de fogo derrota o Cogumelo Sombrio (+100)', st['enemies'] == en0 - 1 and st['score'] == sc0 + 100, f"inimigos {en0}->{st['enemies']} pontos {sc0}->{st['score']}")

    # --- Dano remove o poder
    fresh(pg, enemies=True)
    ev(pg, f"(() => {{ const s={SC}; const e=s.enemies.find(e=>e.x>25*{T} && e.x<30*{T}); s.player.respawn(e.x-20, e.arcadeBody.bottom); s.player.powers.collect('flor-de-fogo'); s.player.vitality.reset(); return null; }})()")
    pg.wait_for_timeout(500)
    st = state(pg)
    check('sofrer dano tira 1 coração e perde o poder', st['hp'] == 2 and st['power'] is None, f"hp={st['hp']} poder={st['power']}")

    # --- Bloco de coração
    fresh(pg)
    ev(pg, f"{SC}.player.vitality.hp = 1")
    tp(pg, 70, 8); ev(pg, f"{SC}.player.vitality.hp = 1"); pg.wait_for_timeout(400)
    pg.keyboard.down('Space'); pg.wait_for_timeout(450); pg.keyboard.up('Space'); pg.wait_for_timeout(1300)
    grab_item(pg); pg.wait_for_timeout(500)
    st = state(pg)
    check('bloco de coração: item cura 1 coração', st['hp'] == 2, f"hp={st['hp']}")

    # --- Salvamento: concluir a fase grava no localStorage
    fresh(pg)
    ev(pg, "localStorage.removeItem('szbb.save')")
    ev(pg, f"(() => {{ const s={SC}; s.progress.score = 1000; s.progress.collectCoin(7); s.onGoal(); return null; }})()")
    pg.wait_for_timeout(2600)
    pg.screenshot(path=f'{SHOTS}/pw_win.png')
    saved = json.loads(ev(pg, "localStorage.getItem('szbb.save')") or 'null')
    check('fase concluída é gravada (versão, fase, pontuação, moedas)',
          saved is not None and saved['version'] == 1 and saved['completedLevels'] == ['1-1'] and saved['bestScores']['1-1'] >= 1000 and saved['totalCoins'] == 7,
          json.dumps(saved))

    # --- Som persistido (M no jogo)
    pg.keyboard.press('m'); pg.wait_for_timeout(300)
    saved = json.loads(ev(pg, "localStorage.getItem('szbb.save')"))
    check('tecla M grava a preferência de som', saved['settings']['muted'] is True)

    # --- Recarrega: menu mostra progresso
    pg.reload(); pg.wait_for_timeout(2200)
    pg.screenshot(path=f'{SHOTS}/pw_menu_save.png')
    on_menu = ev(pg, "window.__ZION__.game.scene.isActive('MenuScene')")
    texts = ev(pg, "window.__ZION__.game.scene.getScene('MenuScene').children.list.filter(o=>o.type==='Text').map(o=>o.text)")
    check('após recarregar, o menu mostra o progresso salvo', on_menu and any('Fases concluídas: 1/32' in t for t in texts), '; '.join(t for t in texts if 'concl' in t or 'Som' in t))
    check('após recarregar, o som continua desligado', any('desligado' in t for t in texts))

    # --- Salvamento corrompido
    ev(pg, "localStorage.setItem('szbb.save', '{quebrado')")
    pg.reload(); pg.wait_for_timeout(2200)
    pg.screenshot(path=f'{SHOTS}/pw_menu_corrupt.png')
    texts = ev(pg, "window.__ZION__.game.scene.getScene('MenuScene').children.list.filter(o=>o.type==='Text').map(o=>o.text)")
    backup = ev(pg, "localStorage.getItem('szbb.save.corrupt')")
    check('salvamento corrompido: avisa, preserva cópia e o jogo abre', any('corrompido' in t for t in texts) and backup == '{quebrado', f'backup={backup}')

    check('sem erros de console', len(errors) == 0, '; '.join(errors[:3]))
    b.close()

print(f"\n{sum(results)}/{len(results)} verificações passaram")
sys.exit(0 if all(results) else 1)
