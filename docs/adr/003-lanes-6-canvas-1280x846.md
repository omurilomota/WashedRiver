# ADR 003 — 6 lanes em canvas 1280x846

**Status:** aceito
**Data:** 2026-11-10

## Contexto

O build vivo já tinha 5 lanes (1280x720, lane de 126px), com as lanes 4 e 5
semi-implementadas: sem arte de piso própria, `%3` na troca de lane do
Passageiro, contagem de estruturas divergente (`/10` contra `/6`) e estrelas
calculadas sobre número solto. O usuário pediu mais espaço vertical para plantar
e mais decoração nas lanes novas.

## Decisão

Campo com **6 lanes** (índices 0–5) e canvas **1280x846**, derivado das
constantes `LANES=6`, `LANE_Y0=90`, `LANE_H=126`
(`LANE_Y0 + LANES * LANE_H = 846`), mantendo `COLS=5` e `COLW=152` — 30 slots de
plantio. Toda contagem de lane/coluna/estrutura deriva de constante; literais
`3`, `5`, `6` e `10` no código são erro.

As lanes 4, 5 e 6 recebem piso dedicado por mapa, props grandes e variantes de
estrutura.

## Consequências

**Ficou mais fácil:** adicionar lane nova é mudar uma constante e desenhar o
piso; regras de derrota/estrelas passam a contar lanes, não estruturas soltas.

**Ficou mais difícil:** rebalanceamento — mais espaço significa menos pressão,
compensado com mais spawn por lane; CSS precisa de `aspect-ratio: 1280/846`;
arte nova para três rows em seis mapas.

## Alternativas rejeitadas

- **7 lanes** — 35 slots, mas o canvas fica 1.32:1 e encolhe demais em monitor
  16:9.
- **5 lanes mais altas** — não atende ao pedido de mais espaço para plantar.
- **Manter 16:9 e compactar o HUD** — rouba altura do campo, não cria espaço.
