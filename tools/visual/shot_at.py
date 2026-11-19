import sys
from playwright.sync_api import sync_playwright
T=60
SC="window.__ZION__.game.scene.getScene('GameScene')"
jobs=[(int(a.split(':')[0]), a.split(':')[1]) for a in sys.argv[2:]]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    pg.goto(sys.argv[1]); pg.wait_for_timeout(1200); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    for col,name in jobs:
        pg.evaluate(f"(()=>{{const s={SC}; s.player.respawn(({col}+0.5)*{T}, 9*{T}); const c=s.cameras.main; c.setScroll(Math.max(0,({col}+0.5)*{T}-640),0); return null}})()")
        pg.wait_for_timeout(1500)
        pg.screenshot(path=f'/home/claude/validation/shots/at_{name}.png')
    b.close()
