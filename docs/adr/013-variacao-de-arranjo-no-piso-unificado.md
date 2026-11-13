# ADR 013 — Variação de arranjo dentro do piso unificado

**Status:** aceito
**Data:** 2026-11-12

## Contexto

A ADR 011 unificou o piso das lanes de baixo (3–5) por mapa. A primeira
screenshot de verificação — ferramenta de screenshot já removida a pedido do usuário mostrou o efeito colateral: o
mesmo canteiro repetido três vezes, alinhado na mesma coluna, lê-se como
**tecido/textura**, não como cenário. A padronização tinha ficado
"uniforme demais" — o campo perdia leitura de lugar.

## Decisão

- O piso continua **único por mapa** (ADR 011): mesmos elementos, mesma
  identidade, mesma paleta.
- Cada lane de baixo recebe uma **variação de arranjo** `v` (0, 1, 2) que
  desloca os elementos repetidos e muda o tom da faixa:
  - bancadas/caixas/contêineres/lápides: deslocamento horizontal por `v`;
  - faixa: três tons da mesma família (`tom()` em `lanes.ts`);
  - bancadas do jardim variam altura, largura e raio, e a cerca varia
    posição e altura dos postes.
- `drawLaneFloorNovaEm(map, p, t, y, v)` ganhou o parâmetro explícito;
  `drawLaneFloorNova` deriva `v` de `l - 3`.
- O teste passa a exigir as duas coisas ao mesmo tempo: **mesma sequência de
  operações** (é o mesmo piso) e **assinatura diferente por `v`** (não é
  tecido).

## Consequências

**Ficou mais fácil:** variar o arranjo é mudar um offset, não redesenhar a
lane; mapa novo herda a regra de graça.

**Ficou mais difícil:** a foto em zoom mostra que ainda é o mesmo *formato*
repetido — a variação é de arranjo e tom, não de silhueta. Se o campo
continuar lendo como grade, o próximo passo é variação de **layout**
(ex.: menos bancadas e mais mato numa das lanes), que é decisão de arte
maior e merece PR própria.

## Alternativas rejeitadas

- **Voltar às três artes distintas por mapa** — era o que a ADR 011 removeu:
  código morto e nome de lane mentindo.
- **Sem variação nenhuma** — a foto mostrou que padronização total vira
  textura; o jogador perde a noção de que aquilo é um lugar.
