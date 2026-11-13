# ADR 011 — Lanes de baixo (3–5) com um piso único por mapa

**Status:** aceito
**Data:** 2026-11-12

## Contexto

A ADR 003 deu piso dedicado por mapa às lanes 4, 5 e 6. Na prática o código
nunca sustentou três artes vivas: `src/render/lanes.ts` forçava `l = 3` no
topo de cada função de mapa, então as lanes 3, 4 e 5 desenhavam o mesmo
canteiro — e os ramos `l === 4` / `else` (~400 linhas por mapa) eram código
morto que ninguém via.

O sintoma visível era pior que o desperdício: `maps.json` continuava nomeando
as lanes 4 e 5 (`HORTA DO ZÉ`, `BECO DO ZÉ`, `DEPÓSITO`, `CALDEIRAS`…)
prometendo cenário que não aparecia, e `map.lanes` não era lido em lugar
nenhum. O teste que deveria ter pego isso (`tests/render.test.ts`) comparava
a assinatura de desenho **incluindo o Y**: como cada lane tem Y diferente, a
assinatura nunca era igual, e o teste passava por vacuidade — verde com o
campo repetido.

## Decisão

- As lanes **3, 4 e 5 compartilham um piso único por mapa**. As lanes 0–2
  mantêm a arte própria (PÍER, RUA, CANAL…): são a "cidade", e o jogador lê a
  diferença; as de baixo são o "fundo do quintal", e repetir o piso ali não
  custa leitura nenhuma.
- `src/render/lanes.ts` passa a ter **uma função por mapa**, sem parâmetro de
  lane. `drawLaneFloorNova` só traduz lane em Y; `drawLaneFloorNovaEm(map, p,
  t, y)` desenha com Y explícito para o teste comparar arte sem posição.
- `maps.json`: os nomes das lanes 4 e 5 passam a repetir o nome da lane 3
  (o nome do piso). Continua 6 nomes por mapa; o teste de dado agora exige
  3 nomes distintos em cima e 1 nome único embaixo.
- O teste de render compara a **sequência de operações de desenho**
  (`tracos()`), ignorando os números: pega arte repetida sem depender de Y.

**Atualização (2026-11-12):** o recorte "só as lanes de baixo" foi substituído
pela [ADR 014](014-campo-unificado-terreno-por-mapa.md) — o campo passou a ter
**um terreno por mapa nas 6 lanes** (rio nas seis, penhasco nas seis…), porque
padronizar metade deixava o campo confuso de ler. O que segue nesta ADR
continha válido para o trecho que ela cobria (piso único, nome alinhado,
teste sem Y).

## Consequências

**Ficou mais fácil:** um lugar só para mexer no piso de baixo; mapa novo
exige uma função, não três; o teste tem dente de verdade; nomes e cenário
voltam a dizer a mesma coisa.

**Ficou mais difícil:** acrescentar variedade nas lanes de baixo agora é
decisão de design explícita (nova ADR), não um ramo `else` esquecido; e o
campo ficou visualmente mais homogêneo nas três lanes de baixo.

**Verificação:** `tests/render.test.ts` (arte das lanes de baixo igual dentro
do mapa, diferente entre mapas, e diferente da lane 2) e `tests/data.test.ts`
(nomes das lanes).

## Alternativas rejeitadas

- **Manter três artes e consertar só o teste** — exigiria sustentar 18 pisos
  (6 mapas × 3 lanes) e reescrever a arte morta, para um ganço de leitura que
  o jogador não percebe nas lanes de baixo.
- **Apagar os nomes das lanes 4/5** — pior: o dado passaria a mentir por
  omissão, e `map.lanes` continuaria sem uso.
- **Unificar as 6 lanes** — apagaria a identidade de PÍER/RUA/CANAL, que é o
  que dá cara à cidade. A padronização pedida é das lanes de baixo.
