# Validação visual e de jogabilidade (navegador real)

Scripts Playwright (Python) que abrem o jogo no Chrome, jogam de verdade com teclado/mouse e
verificam o resultado. Exigem `pip install playwright` e Google Chrome em `/usr/bin/google-chrome`
(ajuste o caminho nos scripts se necessário).

```bash
npm run build && npx vite preview --host 127.0.0.1 --port 4173 &
python3 -I tools/visual/scenarios.py "http://127.0.0.1:4173/?renderer=canvas"   # 19 verificações
python3 -I tools/visual/bot.py "http://127.0.0.1:4173/?renderer=canvas" 120 bot # robô joga a fase inteira
python3 -I tools/visual/shot_at.py "http://127.0.0.1:4173/?renderer=canvas" 33:pit 121:meta
```

- `?renderer=canvas` força o renderizador Canvas: em ambientes sem GPU o WebGL por software roda a ~10 FPS.
- As capturas ficam em `/home/claude/validation/shots` (altere nos scripts).
- O jogo expõe `window.__ZION__` (instância do Phaser e `state()`) apenas para esta validação.
