# ADR 014 — Campo unificado: um terreno por mapa, nas 6 lanes

**Status:** aceito
**Data:** 2026-11-12

## Contexto

O campo tinha duas metades que não conversavam: as lanes 0–2 desenhavam um
cenário por mapa (`sprites.ts`: píer, rua, canal, caminho de pedra,
plataforma, trilho cego…) e as lanes 3–5 herdavam outro (`lanes.ts`). O
resultado é que o jogador via **dois jogos sobrepostos**: a parte de cima com
um tema e a parte de baixo com outro, sem nunca ler o mapa como um lugar. A
padronização anterior (ADR 011) acertou só a metade de baixo — a reclamação
foi literal: *"padronizou só uma parte preta do cenário"*.

A screenshot de verificação (`tools/shot.mjs`) deixou isso claro: em um mapa
de rio havia rio apenas numa faixa, e as lanes seguintes mostravam calçada,
canal e jardim.

## Decisão

- **Um terreno por mapa, nas 6 lanes.** Onde tem rio, tem rio nas seis; onde
  tem penhasco, penhasco nas seis; onde tem trilho, trilho nas seis.
- A arte do campo mora **só em `src/render/lanes.ts`**: `drawLaneFloor` (em
  `sprites.ts`) passou a delegar as 6 lanes, e os antigos blocos por mapa/lane
  de `sprites.ts` foram removidos.
- Os nomes de lane em `maps.json` passaram a ser **o nome do terreno**, igual
  nas seis (`RIO DO PÍER`, `PENHASCO`, `TRILHO`, `CALÇADA`,
  `PISO DA FÁBRICA`, `ÁGUA RASA`) — o dado deixou de sugerir seis lugares
  diferentes.
- A variedade continua existindo, mas **dentro** do terreno: props de sucata,
  set pieces (casco encalhado, contêineres, base do farol) e a variação de
  arranjo por lane da ADR 013.
- Bônos de honestidade: a placa da vila estava com `BARRA SUJA` cravado no
  código e mentia o nome do mapa nos outros cinco — agora usa `G.map.nome`.

## Consequências

**Ficou mais fácil:** o campo é um lugar legível; mapa novo = um terreno e
suas props, não seis microcenários; a função de piso é uma só, sem ramo por
lane no `sprites.ts`.

**Ficou mais difícil:** as lanes perderam a identidade individual (não existe
mais "a lane do canal"); se um mapa precisar de variação forte de tema por
faixa, isso passa a ser exceção declarada, não o padrão.

**Verificação:** `tests/render.test.ts` compara o **terreno-base** (as 40
primeiras operações) entre as 6 lanes — igual dentro do mapa, diferente entre
mapas — e exige arranjo diferente por lane (ADR 013). `tests/data.test.ts`
exige um nome único de lane por mapa.

## Alternativas rejeitadas

- **Manter as lanes 0–2 com arte própria** (recorte da ADR 011) — foi o que
  gerou a reclamação: padroniza metade, confunde o todo.
- **Um terreno igual em todos os mapas** — apagaria a identidade dos mapas,
  que é o que os diferencia (rio, penhasco, trilho, calçada, fábrica, água).
- **Variar o terreno por lane dentro do mapa** — seria o oposto do pedido:
  seis lugares diferentes de novo.
