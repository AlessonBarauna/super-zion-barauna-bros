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
| Pulo duplo | aperte pular de novo no ar |
| Abaixar | segure `↓` / `S` (P2: `O`; controle: direcional para baixo) |
| Entrar em cano/porta | `↓` / `S` (P2: `O`; controle: direcional para baixo) |
| Correr | `Shift` |
| Pausar | `Esc` (também `P`) |
| Tela cheia / Som | `F` / `M` |

Jogador 2 (Bara, cooperativo): `J` `L` mover · `K` correr · `I` pular · `U` poder. No menu, `1` inicia o modo individual, `2` o cooperativo e `Enter` repete o último modo usado.

## Estado atual (v0.1.0 — Fases 1 a 6 do roadmap)

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

Fase 6: **mapa de mundos** (8 mundos × 4 fases, bloqueios, estrelas ★ por fase: concluir, 80% das moedas, 40% do tempo sobrando),
**32 fases** (1-1 feita à mão; as outras são geradas por `src/levels/generator.ts` a partir de trechos validados e passam pelo mesmo
validador), **chefões** de arena (um por mundo, ciclo andar → preparar → investir → atordoar; pisão só machuca atordoado, fogo machuca
quase sempre; a meta só aparece quando ele cai), **novos inimigos** (Corvo Umbral voador que mergulha; Ouriço de Cristal que não pode
ser pisado), **música procedural** por mundo (Web Audio), **controle (gamepad)** e configuração **Tauri** para Windows (`src-tauri/`).
Salvamento passou à versão 2 (estrelas) com migração automática do v1.

Atalho de desenvolvimento: `?level=3-2` na URL faz os botões do menu abrirem direto aquela fase.

Controle: analógico/direcional move, A pula, X ou gatilhos correm, B/Y poder. P1 usa o controle 1 e P2 o controle 2.

Windows (Tauri): precisa de Rust e das dependências do Tauri numa máquina Windows; depois `npm i -D @tauri-apps/cli` e `npx tauri build`
(gera instalador NSIS/MSI). **Não foi compilado nesta etapa** (o ambiente de desenvolvimento é Linux sem as bibliotecas GTK).

**Limitações da Fase 6:** os cenários dos mundos 2–8 reutilizam a arte da Vila das Oliveiras com variação de cor; as fases 1-2 a 8-3
são geradas (jogáveis e validadas, mas sem o desenho manual fino da 1-1); a música é provisória e nunca foi ouvida.

**Ainda não existe:** demais poderes, arte final em sprites HD, desenho manual das fases 1-2 a 8-3, cenários próprios dos mundos 2–8, teste humano e o aplicativo Windows compilado. Botões do menu só existem quando a função existe.

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


## Novidades (canos, salas secretas e crescimento)
- O personagem começa **pequeno** (1 coração) e cresce com a **Fruta de Baraúna** (bloco perto do início de toda fase).
- **Pulo duplo** para os dois personagens.
- No HUD, o coração novo (ao crescer ou curar) dá um pulo com "+1" e o coração perdido treme. Teste: `tools/visual/scenarios_hud_hearts.py`.
- **Canos** decorativos e entráveis (↓ no topo) levam a **cavernas secretas** cheias de moedas; **portas de casas** levam a salas com presentes. Cada sala tem saída de volta à fase.
- Blocos e tijolos em alturas variadas (linhas 3 a 6).
- Testes de navegador: `tools/visual/scenarios_pipes.py` (use `?renderer=canvas&level=1-1`).

## Chefões com ataques próprios (mundos 2 a 8)
Além da investida, cada chefão alterna ataques especiais, sempre com um aviso antes (o chefão treme):
- **Chuva de pedras** (Kragor, Vyrak, Auron, Umbrax): uma marca vermelha aparece no chão e a pedra cai depois; saia de baixo.
- **Salto com onda de choque** (Sakhur, Mechazord, Umbrax): ao pousar, duas ondas correm pelo chão; pule por cima.
- **Orbes rasteiros** (Frostak, Vyrak, Mechazord, Auron, Umbrax): pule por cima; chefões enfurecidos e os dos mundos finais disparam mais de um.
- Gronk (mundo 1) continua só com a investida, para a primeira luta ser mais simples.
- Arte dos projéteis é provisória (formas simples coloridas por chefão).
- Testes: `tests/boss-specials.test.ts` e `tools/visual/scenarios_boss_specials.py`.

## Cada chefão tem corpo e jeito de vencer próprios
Uma dica aparece no início de cada luta. Resumo (a fraqueza fica em `systems/boss.ts`, tabela `weakness`):

| Chefão | Como vencer |
|---|---|
| Gronk (1) | Espere ele bater na parede e pise nele (fogo também machuca). |
| Kragor (2) | Imune a fogo. Fique perto (sem encostar) durante a chuva: uma pedra cai entre você e ele e o fere; depois pise. |
| Sakhur (3) | Desvie do salto e pise nele quando pousar cansado (dano 3). Bater na parede não o atordoa. |
| Frostak (4) | Fogo derrete (dano 2). Pisão só faz 1. |
| Vyrak (5) | Só dá para pisar nele enquanto ele se prepara para atacar (isso interrompe o ataque). |
| Mechazord (6) | Imune a fogo. Superaquece depois de atirar: pise (dano 3). |
| Auron (7) | Cansa depois da chuva de pedras: pise (dano 3) ou use fogo. |
| Umbrax (8) | Qualquer cansaço dele vale; fogo e as próprias pedras dele também ferem. |

Golpe inútil mostra um aviso sobre o chefão ("Imune ao fogo!", "Pisão não machuca agora!").
Corpos: `src/art/bossArt.ts` (arte original e provisória). Testes: `tests/boss-specials.test.ts` e `tools/visual/scenarios_boss_weakness.py`.
