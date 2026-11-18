# ADR 010 — Barra de cartas do HUD quebra em duas linhas

**Status:** substituído por [ADR 012](012-barra-de-cartas-linha-unica.md)
**Data:** 2026-11-11

> **Atualização (2026-11-12):** a quebra descrita aqui era **inalcançável**
> com o baralho atual (no máximo 19 cartas em 1120 px de área livre), então o
> ramo nunca executava. A barra voltou a ser linha única — ver ADR 012. Este
> registro fica como histórico e como gatilho: se o baralho passar de ~22
> cartas, a quebra volta a ser necessária.

## Contexto

A barra de cartas do HUD (`cardLayout` em `src/ui/ui.ts`) crescia horizontalmente
conforme o jogador desbloqueava peças. Com muitas cartas, a largura calculada
ficava maior que a área livre e as cartas colidiam com o menu de base (painel de
recursos e topbar no canto superior direito), escondendo textos e tornando
cartas não clicáveis.

## Decisão

`cardLayout()` passa a quebrar as cartas em **duas linhas** quando não cabem em
uma única linha, em vez de encolher abaixo de um mínimo legível (30 px) ou
transbordar sobre o menu de base:

- largura mínima de carta = 30 px;
- se todas couberem em uma linha dentro de `W - 136 - 24`, uma linha só com
  largura calculada (até 48 px);
- caso contrário, divide as cartas em 2 linhas, calculando a largura por linha
  (até 48 px) e empilhando com `rowH = 58 + 4`.

`cardAt()` foi atualizado para aceitar cliques nas duas linhas (limite vertical
ajustado de 70 para `6 + 58*2 + 8`).

## Consequências

**Ficou mais fácil:** nenhuma carta some nem colide com o menu de base, mesmo com
todos os desbloqueios.

**Ficou mais difícil:** com mais de ~30 cartas (duas linhas de ~15) voltaria a
transbordar verticalmente; se isso acontecer, considerar scroll horizontal ou
paginação. A área de clique do HUD (`y>...`) cresce; manter sincronizado com
`cardAt`.

## Alternativas rejeitadas

- **Encolher sem piso** — cartas abaixo de 30 px ficam ilegíveis e o ícone da
  peça não cabe.
- **Scroll horizontal na barra** — exige estado de scroll no HUD e é menos
  óbvio para o jogador; descartado até ser necessário.
