# MARÉ PODRE — Briefing

> **Leia isto antes de qualquer coisa.** Agente novo: siga o *ritual de sessão*
> no fim deste arquivo. Humano: o que manda é o *Changelog* e `docs/adr/`.
> Este briefing é o mapa; `AGENTS.md` e os ADRs são a lei.
> Atualizado a cada lote de trabalho (Parte 1/2/3), no mesmo commit que muda o estado.

## Estado atual
- Versão: v0.4.0 (release-please; `package.json` pode estar um passo atrás)
- Arquivo de ouro (o que o jogador recebe): **`dist/index.html`** — artefato
  single-file gerado por `npm run build`. **Nunca editar à mão.**
- Fonte de verdade do código: **`src/`** (TypeScript modular + Vite)
- Modo de entrega: ARQUIVO ÚNICO HTML, Canvas 2D, zero dependência de runtime
- Abre com duplo clique: sim (`base: './'`, funciona em `file://`)

## Quick start (para agente novo)
- Instalar: `npm ci` (usa o lockfile)
- Dev: `npm run dev` (Vite, hot reload)
- **Antes de aceitar qualquer entrega:** `npm run check`
  (typecheck + lint + test + build + smoke). Se não estiver verde, a entrega
  **não** é aceita.
- Build single-file: `npm run build` → `dist/index.html`
- Jogar o build: abrir `dist/index.html` no navegador
- Commits: Conventional Commits + gitmoji (`npm run commit` / `cz`)
- Branch: `feature/*`, `bugfix/*`, `chore/*` → PR para `develop`

## Estrutura de pastas (mapa rápido)
- `src/core/` — constantes, geometria, canvas, rng, estado. **Fonte de verdade de números.**
- `src/data/` — `balance.json` (máquinas, inimigos, chefes, árvore, economia),
  `maps.json` (mapas, lanes, estruturas, falas), `types.ts`, `index.ts`.
- `src/game/` — regra de jogo: loop, ondas, colisão, economia, progressão.
- `src/render/` — desenho: `sprites.ts` (campo/HUD/máquinas), `lanes.ts`,
  `structures.ts`, `creatures.ts` (inimigos/chefes/mortes), `brush.ts`, `scene.ts`.
- `src/audio/` — WebAudio: trilha por mapa, rádio, efeitos.
- `src/save/` — persistência versionada em localStorage + migração.
- `src/ui/` — DOM overlays: título, pausa, menu do Zé, ficha, fim.
- `src/styles/` — tokens de CSS e escala de fonte.
- `tests/` — data, geometry, save, economy, gameplay, render.
- `docs/` — ADRs, `GAME_DESIGN.md`, `ARCHITECTURE.md`, `DECISIONS.md`.
- `tools/` — build do itch, smoke test, ícone procedural.
- `dist/` — build gerado. **Nunca editar à mão.**

## O que está funcionando (não tocar)
- **6 mapas**: Barra Suja, Farol do Fim, Estação Afogada, Feira do Peixe,
  Fábrica Podre, Cemitério de Barcos (paleta, clima e chefe próprios)
- **6 lanes × 7 colunas = 42 slots** de plantio (canvas lógico 1280×846)
- **18 engenhocas** + Pé de Cabra (`remover`): boia, torradeira, canhão de lata,
  ventilador, geladeira, bujão, holofote, ímã, rádio, estilingue, aspirador,
  batedeira, espelho, pneu, aranha, geladeira-bomba, cachorro, coisa do Zé
- **20 criaturas** e **6 chefes** (a MARÉ é `unbeatable` por trait)
- **Modos**: Campanha, Noite Infinita, Modo Chefe, Desafio Diário (8 mods), Sandbox
- Menu do Zé entre ondas (ofertas + Banca), imposto da Dona Lú por onda
- Economia com sumidouros: sucata de partida vs **sucata velha** de meta
- Áudio WebAudio: trilha por mapa, rádio, efeitos; morte única por criatura,
  cena de morte de cada chefe
- Save v3 em localStorage com migração, autosave e export/import
- 109 testes verdes (vizinhos falantes + reset por mapa) (`npm run check`: typecheck + lint + test + build + smoke)

## O que está quebrado ou pendente
### Parte 1 — padronizar lanes (concluída: ADR 011 + ADR 013)
- Lanes 3–5 desenhavam o **mesmo** piso (`l = 3` em `src/render/lanes.ts`) e os
  blocos `l === 4`/`else` eram código morto (~400 linhas) — **removidos**
- `maps.json` ainda nomeia as lanes 4/5 diferente do que aparece (`map.lanes`
  não é usado em lugar nenhum) — **pendente**
- Teste agora compara a sequência de traços (arte sem Y) e exige arranjo
  diferente por lane (ADR 013) — a padronização não virou textura

### Parte 2 — corpo das máquinas (pendente)
- "Sombra de ventre" das máquinas e dos bichos é desenhada **antes** do corpo:
  fica escondida atrás do desenho
- `rim light` das máquinas é arco fixo `(0,-24)` r=24, não segue a peça
- `src/render/structures.ts`: `sombra()` falta em `cerca`, `lata_agua`,
  `trapiche` e `quilha`

### Parte 3 — auditória "commitado ≠ feito" (concluída, com sobras)
- HUD multi-linha (`ADR 010`) era ramo morto: 19 cartas nunca quebram linha
  → linha única restaurada, ADR 010 substituída pela nova **ADR 012**
- HUD em canvas ignorava `--fs` → `fmono()` aplica a escala das opções no
  HUD, na ficha de carta, na intro de chefe e nos avisos
- Modo daltonismo era só CSS → **parcial**: agora o posicionamento (vaga
  livre/cara) e as cartas indisponíveis têm pista de forma (tracejado,
  luminância), sem depender de matiz. A arte dos bichos/peças continua sem
  variante daltônica
- Loja prometia reforço "mais teimosa" → texto agora descreve o que o código
  faz (reboque; sucata de volta se nada caiu)
- Cache `bgStaticCanvas` e da calçada eram 1× com canvas DPR 2 → passaram a
  nascer em DPR 2 (fim do fundo borrado no retina)
- `brush.shade()` existia e não era usado → removido
- Docs contradiziam o código (ADR 008 e AGENTS.md diziam Baleia `neutral`/
  imune; ADR 004 já a fez matável) → alinhados; `Enemy.spooked` declarado
- Vizinhos das lanes de baixo (3–5) eram decoração muda: agora têm nome, falas
  próprias (`vizinhosNomes`/`vizinhosFalas` em maps.json), clique, balão de fala
  e uma fala conjunta depois de 3 cliques em cada (`vizinhosSegredo`)
- **Reset por mapa:** botão `APAGAR ESTE MAPA` na tela de mapas →
  `SaveDB.resetMapa(i)` zera estrelas/tempo do mapa e rebobina a campanha até
  ele; sucata velha, árvore, conquistas e bestiário ficam. Teste em save.test.ts
- **Ainda pendente:** reduced-motion só zera o `shake` (as animações do canvas
  continuam); texto da Água-Viva ("bala atravessa") ainda não casou 100% com
  o código — decidir se a bala passa ou é consumida

## Decisões de design fechadas (não reabrir)
- Tom: cartunesco, sujo, humor errado, violência cômica. NADA de fofo,
  NADA de lição de moral
- Nunca reconstruir do zero. Sempre editar `src/` (diff pequeno, revisável)
- Fonte de verdade: geometria em `src/core/constants.ts`; conteúdo em
  `src/data/*.json`; regra em `src/game/`; desenho em `src/render/`
- `dist/` é gerado — nunca editar à mão; build single-file com Vite
- Contagem de lane/coluna/estrutura sai de constante; nunca número solto
- Combate justo: todo bicho tem contramedida; Peixe-Lata devolve no máximo 3;
  voador tem 5 respostas; chefe teleporta para dentro do campo (`x ≤ W`)
- Bug de gameplay vira teste em `tests/gameplay.test.ts`
- Texto de gameplay é contrato: mod que promete, implementa ou apaga a promessa
- Save: toda mudança de formato tem migração e teste
- Gitflow + Conventional Commits + gitmoji; um arquivo por vez; commit por mudança

## BLOCO M — reforma de alma (em andamento, na ordem)
- **M.1 (feito):** arrancar a conscientização. Textos melancólicos/ecoconscientes
  reescritos no registro do deboche: cenas de morte (`creatures.ts`), avisos
  (`game.ts`), telas de fim (`ui.ts`), `zeRaro`/`vozLines`/finais (`maps.json`) e
  descrições com pena (`balance.json`). Build verificado: zero textos antigos.
- **M.2 (feito):** curva de dificuldade. Números em `balance.json`
  (`dificuldade`): onda 1 = 7 bichos/1 tipo/6,5s/2 corredores; onda 2 =
  13/4 tipos/5,4s/4 corredores + respiro de 30s; onda 3 = 22/pool
  inteiro/4s/6 corredores; degrau por mapa; Noite Infinita com degrau a cada
  3 ondas e chefe a cada 5. `tests/curva.test.ts` joga os 6 mapas e imprime a
  tabela medida. **Bugs de regra achados no caminho (e corrigidos):**
  `chooseOffer` com sucata insuficiente dava `return` antes de sair da loja
  (partida travada); bicho comendo peça curada a cada break nunca matava a
  peça (onda nunca acabava — agora a fome cresce enquanto ele come); polvo
  grudado na peça não soltava nunca (jam virou temporária de 5s).
- **M.3 (feito):** onboarding diegético. Banner "NOVO: ..." removido; cada um
  dos 20 bichos tem método em `balance.json` (`intros`): silhueta, ze, radio
  (chiado se houver rádio no campo), cartaz na vila, marca no primeiro
  cadáver ou nada. `drawIntros` em `scene.ts` desenha silhueta e cartaz;
  5 testes em `gameplay.test.ts` cobrem.
- **M.4 (feito):** deck de 7 antes da partida. Tela `O QUE LEVAR` em `ui.ts`
  (`deckScreen`/`drawDeck`): contador, cartas grandes, `???` pra trancada, Zé
  comenta, deck salvo por mapa no save (`SaveDB.setDeck/getDeck`, campo
  `decks`). `availableMachines()` respeita `G.deck`; sandbox ignora. Campanha,
  Noite Infinita e Modo Chefão passam pela escolha. Testes: save (deck por
  mapa, teto 8, reset não apaga), economia (banca = deck) e gameplay (deck
  carregado do save).
- **M.5 (feito):** enciclopédia `CADERNO DO ZÉ` com abas BICHOS (20),
  ENGENHOCAS (18), CHEFES (6), RÁDIO e SELOS. Bestiário abre por morte
  (`mateiB`), galeria por construção (`seenM`), chefes por vitória (`venciB`).
  Cada entrada tem **fato inútil** (dado novo em balance.json) e contador vivo.
  Acesso pelo menu principal e pela pausa; descoberta persiste no save.
- **M.6:** molho (eventos aleatórios entre ondas, micro-surpresas na onda, ondas temáticas).

## Próximos passos planejados (não fazer agora, só contexto)
- As Partes 1/2/3 são **independentes** (podem ser feitas em qualquer ordem),
  mas a **ordem de prioridade atual é 1 → 2 → 3**.
- **Parte 1**: unificar pisos das lanes 3–5 por mapa, alinhar nomes e testes,
  ADR nova + correção da ADR 003/GAME_DESIGN.
- **Parte 2**: sistema de corpo das máquinas (base, sombra, volume, luz).
- **Parte 3**: consertos da auditória (HUD, fonte, daltonismo, loja, cache, docs).

## Status do git (atualizar toda sessão)
- Branch atual: `feature/lanes-e-corpos` (criada de `7649bf2`)
- Parte 1: **concluída** — commit `a2cef32` (código, dados, testes, ADR 011)
- Parte 2: **concluída** — commits `7a6a278` (sprites/creatures/structures +
  `tests/machines.test.ts`) e `f6e17d4` (dist)
- Parte 3: **concluída com sobras** — `1e42b3c` (fonte + daltonismo no HUD),
  `bd389aa` (ADR 012, cartas em linha única), `f787155` (texto do reforço),
  `105d7c7` (daltonismo no posicionamento), `99bd04a` (cache DPR 2, `spooked`
  tipado, `shade` morto, docs), mais o dist no commit final
- Último commit verde: `99bd04a` (verde: typecheck + lint + 106 testes)
- `dist/index.html` atual: reflete `src/` até o último commit de build deste
  ciclo (ver `git log -1 --format=%h` após o `📦 build(build)`)
- PRs abertas: nenhuma — `develop` está defasada (parada em `9340a0a`,
  antes do release 0.4.0); o destino do PR precisa ser decidido
  (`main → develop` para sincronizar, depois PR desta branch)
- Trabalho não commitado: não (exceto `dist/` até o commit de build)

## Changelog
- v0.1 — base: 3 corredores, 7 criaturas, 8 máquinas, menu do Zé, dois modos
- v0.2 — polvo-garrafa, piranha-coral, baleia-filhote; ajuste de fontes; rebalanceio
- v0.3 — código completo; save migrado; documentação de regras
- v0.4.0 — 6 lanes em 1280×846, 7 colunas (42 slots), combate justo,
  imposto da Dona Lú, economia com sumidouros, HUD multi-linha, ADR 008/009/010
- branch `feature/lanes-e-corpos` — Parte 1 (ADR 011: lanes 3–5 com piso único),
  Parte 2 (corpo das máquinas dimensionado), Parte 3 (fonte do HUD, cartas em
  linha única, reforço honesto, cache DPR 2, daltonismo no campo e nas cartas,
  docs alinhados) — ADR 012

## Regra do ritual de sessão (novo setup)
- **Não anexe `dist/index.html`** — é build, não se edita à mão.
- Anexe **o repo em zip** ou só os arquivos de `src/` que a tarefa toca.
- Entregue **diff**, não arquivo inteiro. Diff pequeno, revisável.
- Antes de aceitar: `npm run check` verde **e** build jogável.
- Se quebrou: descarta o diff, volta pra branch, refaz.
- Modelo fraco não serve pra este projeto: TypeScript modular com 99 testes
  exige modelo forte (escopo pequeno, uma coisa por rodada).
