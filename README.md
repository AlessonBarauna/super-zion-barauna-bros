# Super Zion Baraúna Bros.

Jogo de plataforma 2D cartoon (side-scroller clássico) no Reino de Baraúna. Feito com
**Phaser 3 + TypeScript + Vite**, física **Arcade**, testes com **Vitest**. Alvos: navegador e Windows (Tauri, ainda não configurado).

## Como rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://127.0.0.1:5173)
npm test           # testes da lógica (Vitest)
npm run build      # checagem de tipos + build de produção (dist/)
npm run preview    # serve o build
```

## Controles (conforme o GDD)

| Ação | Jogador 1 (Zion) |
|---|---|
| Mover | `A` `D` ou `←` `→` |
| Pular (segure = pulo mais alto) | `Espaço` (também `↑` / `W`) |
| Correr | `Shift` |
| Pausar | `Esc` (também `P`) |
| Tela cheia / Som | `F` / `M` |

Jogador 2 (Bara, cooperativo): `J` `L` mover · `K` correr · `I` pular · `U` poder. No menu, `1` inicia o modo individual, `2` o cooperativo e `Enter` repete o último modo usado.

## Estado atual (v0.1.0 — Fases 1 a 5 do roadmap)

Jogável: menu → fase **1-1 Vila das Oliveiras** (130 blocos de largura) com Zion, câmera lateral com parallax,
pulo variável / coyote time / jump buffer, moedas (100 = +1 vida), blocos surpresa e tijolos, espinhos, abismos,
Cogumelo Sombrio (patrulha e perseguição), 3 corações com invulnerabilidade e knockback, 5 vidas, checkpoints, tempo,
pausa, game over e tela de fase concluída.

Fase 3: **Flor de Fogo** (bloco amarelo solta o item; `X` dispara bolas que quicam, máx. 2 ao mesmo tempo, derrotam inimigos;
sofrer dano perde o poder), item de coração e **salvamento** em `localStorage` (versionado, com migração, cópia do
arquivo corrompido, fases concluídas, recordes, moedas e preferência de som; o menu mostra o progresso).

Fase 4: **cooperativo local** com Zion e **Bara** (mais baixa, ágil e com salto mais alto; arte própria). Regras: vidas, moedas e
pontuação são da equipe; corações e poder são individuais; a câmera acompanha o meio entre os dois e ninguém sai da tela
nem fica para trás; a morte de um custa 1 vida e ele volta perto do parceiro (se os dois caírem, no checkpoint; tempo
esgotado gasta uma única vida); a fase só termina quando os dois chegam à bandeira.

Fase 5: **tijolos quebráveis** (atingidos por baixo: quebram, soltam estilhaços, +20 pontos e derrubam inimigos que estavam em cima;
blocos de pedra e surpresa não quebram) e **plataformas móveis** de passagem única (só o topo colide; carregam quem está em cima),
definidas nos dados da fase (`movingPlatforms`: eixo, alcance, período, fase). A fase 1-1 ganhou um elevador e uma ponte móvel sobre
um abismo de 9 blocos; o validador de fases só aceita um vão maior que o salto se uma ponte móvel o cobrir de borda a borda.

**Ainda não existe:** demais poderes, mais inimigos, chefões, mundos 2–8, música, gamepad, seleção de mundos,
aplicativo Windows (Tauri). Botões do menu só existem quando a função existe.

## Arte e áudio (provisório documentado)

A arte atual é **vetorial original desenhada em código** (Canvas2D → texturas na inicialização, `src/art/`).
Ela é a identidade visual v1, mas **não é o conjunto final de sprites HD**: os sprites definitivos serão ilustrados e
substituirão estas texturas sem mexer na lógica (as chaves de textura são o contrato). Os efeitos sonoros são
**sintetizados via Web Audio** (`src/systems/sfx.ts`) e são provisórios; ainda não há música.

## Arquitetura

```
src/
  game/       constants.ts (sem Phaser), LevelBuilder.ts (dados → objetos do Phaser)
  scenes/     Boot, Menu, Game, UI (HUD), Pause
  entities/   characters/Player.ts, enemies/CogumeloSombrio.ts (bosses/ reservado)
  systems/    movement, progress, vitality, walkerAI, input, sfx  → lógica pura é testada sem Phaser
  levels/     types, TileGrid, validateLevel, data/world1.ts (fases são DADOS), index.ts
  art/        pipeline de arte vetorial (Zion, inimigo, tiles, cenários)
  ui/         Button, ParallaxBackground
tests/        movement, progress (moedas/vidas/dano), walkerAI, levels (validação + física)
tools/visual/ validação em navegador real (Playwright)
```

Princípios: lógica pura separada do Phaser (testável em Node); fases orientadas a dados e validadas por teste
(inclusive "todo vão é transponível com a física real do Zion"); arte independente da lógica; sem `any`.

## Fluxo Git

`main` (estável) ← `develop` ← `feature/*`. Sem commits diretos na `main`; Pull Requests só são integrados com autorização.
