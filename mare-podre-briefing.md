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
- 99 testes verdes (`npm run check`: typecheck + lint + test + build + smoke)

## O que está quebrado ou pendente
### Parte 1 — padronizar lanes (em progresso)
- Lanes 3–5 desenhavam o **mesmo** piso (`l = 3` em `src/render/lanes.ts`) e os
  blocos `l === 4`/`else` eram código morto (~400 linhas) — **removidos**
- `maps.json` ainda nomeia as lanes 4/5 diferente do que aparece (`map.lanes`
  não é usado em lugar nenhum) — **pendente**
- `tests/render.test.ts` passa por vacuidade: comparava assinatura **com Y**,
  não a arte — **pendente**

### Parte 2 — corpo das máquinas (concluída, pendente commit)
- "Sombra de ventre" das máquinas e dos bichos era desenhada **antes** do
  corpo e ficava escondida → agora é **oclusão de base** pintada **depois**
  do desenho, dimensionada pelo corpo (`CORPO_MAQUINA` em `sprites.ts`)
- `rim light` das máquinas era arco fixo `(0,-24)` r=24 → agora segue
  `w`/`h` reais de cada peça
- `src/render/structures.ts`: `sombra()` faltava em `cerca`, `lata_agua`,
  `trapiche` e `quilha` → sombra adicionada e arame da lata d'água prolongado
- `tests/machines.test.ts` (7 testes): corpo declarado, dimensões cabem na
  lane, acabamento acontece no campo e fica de fora no ícone

### Parte 3 — auditória "commitado ≠ feito" (pendente)
- HUD multi-linha (`ADR 010`) é ramo morto: 19 cartas nunca quebram linha
- HUD em canvas ignora `--fs`: a opção de fonte não escala o HUD nem a ficha
- Modo daltonismo (`body.cb`) é só CSS; o campo em canvas não muda
- Loja promete reforço "mais teimosa" — a estrutura não tem vida pra endurecer
- Cache `bgStaticCanvas` é 1× com canvas DPR 2 (borrado no retina)
- `brush.shade()` existe e não é usado
- Docs contradizem o código: ADR 008 e AGENTS.md ainda dizem que a Baleia é
  `neutral`/imune (ADR 004 já a fez matável); `Enemy.spooked` não está declarado

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

## Próximos passos planejados (não fazer agora, só contexto)
- As Partes 1/2/3 são **independentes** (podem ser feitas em qualquer ordem),
  mas a **ordem de prioridade atual é 1 → 2 → 3**.
- **Parte 1**: unificar pisos das lanes 3–5 por mapa, alinhar nomes e testes,
  ADR nova + correção da ADR 003/GAME_DESIGN.
- **Parte 2**: sistema de corpo das máquinas (base, sombra, volume, luz).
- **Parte 3**: consertos da auditória (HUD, fonte, daltonismo, loja, cache, docs).

## Status do git (atualizar toda sessão)
- Branch atual: `feature/lanes-e-corpos` (criada de `7649bf2`)
- Último commit verde: `7649bf2` — "adiciona sombra de ventre às máquinas"
- **Trabalho não commitado: sim** — `src/render/lanes.ts` reescrito (blocos
  mortos removidos, um piso por mapa, helper `drawLaneFloorNovaEm` exportado
  para o teste); `tests/` e `maps.json` **ainda não** atualizados; `check`
  provavelmente vermelho até fechar.
- `dist/index.html` atual: reflete `src/` até `7649bf2` (build de `2026-11-12`)
- PRs abertas: nenhuma

## Changelog
- v0.1 — base: 3 corredores, 7 criaturas, 8 máquinas, menu do Zé, dois modos
- v0.2 — polvo-garrafa, piranha-coral, baleia-filhote; ajuste de fontes; rebalanceio
- v0.3 — código completo; save migrado; documentação de regras
- v0.4.0 — 6 lanes em 1280×846, 7 colunas (42 slots), combate justo,
  imposto da Dona Lú, economia com sumidouros, HUD multi-linha, ADR 008/009/010
- em andamento — Parte 1 (lanes unificadas), Parte 2 (corpo das máquinas),
  Parte 3 (consertos da auditória)

## Regra do ritual de sessão (novo setup)
- **Não anexe `dist/index.html`** — é build, não se edita à mão.
- Anexe **o repo em zip** ou só os arquivos de `src/` que a tarefa toca.
- Entregue **diff**, não arquivo inteiro. Diff pequeno, revisável.
- Antes de aceitar: `npm run check` verde **e** build jogável.
- Se quebrou: descarta o diff, volta pra branch, refaz.
- Modelo fraco não serve pra este projeto: TypeScript modular com 99 testes
  exige modelo forte (escopo pequeno, uma coisa por rodada).
