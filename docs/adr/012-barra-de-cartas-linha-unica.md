# ADR 012 — Barra de cartas do HUD em linha única

**Status:** aceito
**Data:** 2026-11-12

## Contexto

A [ADR 010](010-hud-cards-quebra-de-linha.md) determinou que a barra de cartas
do HUD quebrasse em **duas linhas** quando não coubesse em uma, com largura
mínima de 30 px e área livre `W - 136 - 24`.

A auditoria de "commitado ≠ feito" mostrou que a regra **nunca executava**:
`availableMachines()` devolve no máximo 19 itens (18 engenhocas + pé de cabra)
e a área livre é 1120 px, então `cols = floor(1120 / 32) = 35` — sempre maior
que o baralho. O ramo de quebra era código morto, e a ADR descrevia como
regra vigente algo que o jogador nunca via.

## Decisão

- `cardLayout()` volta a ser **linha única**, com largura calculada
  (`min(48, avail / n - gap)`), sem ramo de quebra.
- `cardAt()` alinha o limite vertical ao tamanho real da carta
  (`6 + 58 + 8`).
- A documentação (ADR 010) fica de pé como histórico; esta ADR registra a
  mudança. Se um dia o baralho passar de ~22 cartas, a quebra em duas linhas
  volta a ser necessária — e aí vale nova ADR, não um `if` esquecido.

## Consequências

**Ficou mais fácil:** uma função só, sem ramo morto; o HUD tem um
comportamento único e testável à vista.

**Ficou mais difícil:** com mais de ~22 engenhocas a barra encolhe até 30 px
de largura mínima antes de transbordar — o gatilho para reabrir o assunto é
`MACH_ORDER.length > 22`.

## Alternativas rejeitadas

- **Manter o ramo morto "por precaução"** — precaução que ninguém testa é
  dívida: foi assim que a ADR 010 passou a descrever uma regra inexistente.
- **Forçar a quebra com cartas maiores** (ex.: mínimo 56 px) — muda o HUD
  inteiro e faz a barra brigar com a topbar à direita; ganho de leitura
  pequeno perto do risco.
