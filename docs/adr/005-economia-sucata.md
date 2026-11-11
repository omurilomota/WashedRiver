# ADR 005 — Economia de sucata: entrada controlada, sumidouros reais

**Status:** aceito
**Data:** 2026-11-10

## Contexto

A sucata de partida ficava alta e sem destino: passiva de 8/s (~480/min), maré
de 25 a cada 3,5–6 s, drops de inimigos — e a oferta fixa "+150 sucata" do Zé,
que é **fonte**, não sumidouro. Saídas: três itens de loja (80/90/120) e peças
com cooldown.

## Decisão

- Passiva cai para **3/s**.
- A oferta "+150 sucata" sai do rodízio; entra **"Sucata velha" (500 sucata →
  1 sucata velha)**.
- Banca do Zé ganha sumidouros escaláveis: **reforçar estrutura** (150),
  **reparo de duas paredes** (300), **tábua de reserva x3** (220),
  **recarga rápida** (120).
- Upgrades de peça passam a custar **120 / 220 / 380** (antes vinham de graça).
- Custos de peça +10%.
- Meta de fim de partida: `45 + stars*40 + lanesIntactas*15 + kills*0.4`.

**Alvo de aceite:** saldo final entre **100 e 700** por partida, com ≥60% do
ganho gasto.

## Consequências

**Ficou mais fácil:** a sucata da partida tem destino e liga partida → meta
(sucata velha → árvore). Os números vivem em `src/data/balance.json` e são
ajustáveis sem tocar em lógica.

**Ficou mais difícil:** upgrades deixaram de ser oferta gratuita — muda a
estratégia entre ondas. Exige ajuste fino e teste de economia em
`tests/economy.test.ts`.

## Alternativas rejeitadas

- **Só aumentar custos das peças** — não cria sumidouro quando o jogador não
  quer plantar mais.
- **Deixar a oferta "+150 sucata"** — é fonte pura; piora exatamente o problema
  relatado.
