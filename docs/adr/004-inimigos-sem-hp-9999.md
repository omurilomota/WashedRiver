# ADR 004 — Inimigos sem HP 9999

**Status:** aceito
**Data:** 2026-11-10

## Contexto

O Pescador (`hp:9999`, trait `human`) e a Baleia-Filhote (`hp:9999`, trait
`neutral`) usavam vida gigante como atalho para "não dá pra matar". A Baleia
ainda podia morrer por explosão, porque `explode()` ignora `isTargetable`.

## Decisão

Remover o hack: **Pescador `hp:60`**, **Baleia-Filhote `hp:400`**, mantendo a
semântica exclusivamente nas traits (`human`, `neutral`). A Baleia passa a ser
imune a **qualquer** dano, inclusive explosão. A MARÉ (chefe final) continua
invencível por design, mas com `unbeatable: true` explícito e sem número mágico.
Nenhum inimigo comum tem HP acima de 500.

## Consequências

**Ficou mais fácil:** a trait é a única fonte de verdade sobre "não mate"; teste
de dados garante faixa de HP; o bestiário deixa de anunciar vida infinita como
curiosidade.

**Ficou mais difícil:** dicas do bestiário precisam explicar a regra pela trait
em vez de pelo número.

## Alternativas rejeitadas

- **Remover o Pescador do jogo** — o usuário avaliou e optou por manter o
  personagem com a regra intacta; ele é a peça narrativa do final.
- **Remover os dois imortais** — perde o evento "não mate" das ondas 2 e 3.
