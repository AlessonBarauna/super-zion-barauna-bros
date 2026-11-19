import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1]
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
        args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':1280,'height':720})
    pg.goto(url); pg.wait_for_timeout(1500); pg.keyboard.press('Enter'); pg.wait_for_timeout(6000)
    print(url, 'fps', pg.evaluate("Math.round(window.__ZION__.game.loop.actualFps)"), 'renderer', pg.evaluate("window.__ZION__.game.renderer.type"))
    b.close()
