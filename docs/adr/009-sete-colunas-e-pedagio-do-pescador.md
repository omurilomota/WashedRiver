# ADR 009 — Sete colunas de plantio e o pedágio do Pescador

**Status:** aceito
**Data:** 2026-11-11

## Contexto

Duas queixas do jogador, as duas de regra:

1. **O campo é curto para a quantidade de cartas.** O jogo entrega 19
   engenhocas, mas cada lane só tinha **5 colunas** — 30 slots no total. O
   jogador queria plantar mais por corredor sem inventar peça nova.
2. **O Pescador "enche o saco".** Ele tem trait `human` (não se mata, ADR
   004), atravessa as peças sem bloquear e, ao chegar na vila, chamava
   `breach()`: **derrubava uma estrutura**. Na prática, o único jeito de não
   perder parede para um bicho invulnerável era ter Rádio ou Cachorro na
   hora certa. Imortalidade não pode ser o custo de uma estrutura.

## Decisão

- **`COLS` passa de 5 para 7** em `src/core/constants.ts`: 42 slots. Com
  `COLW=152` o campo termina em `170 + 7 × 152 = 1234`, ainda dentro de
  `W=1280` — sobra uma faixa de 46 px de mar. Nenhum outro número de
  geometria mudou; render, colisão e UI continuam lendo `COLS`.
- **O Pescador não quebra mais nada.** Quando chega em `x < VX + 8`, ele
  cobra `ECONOMIA.pescadorTaxa` de sucata (limitado ao que o jogador tem),
  marca `taxed`, vira `saved` e volta para o mar. Rádio e Cachorro continuam
  a resposta que **rende** (80 de sucata), em vez de só evitar o prejuízo.
- O pedágio mora em `src/data/balance.json` (`economia.pescadorTaxa`), não no
  código: é número de conteúdo.

## Consequências

- Mais espaço de plantio por lane sem mexer em `COLW`, no tamanho da peça ou
  na arte das lanes.
- Tempo de travessia aumenta (o inimigo entra em `SPAWN_X` e o campo começa
  em `FIELD_R`), o que **alivia** a pressão. Se ficar fácil demais, o ajuste
  é de onda em `maps.json`, não de coluna.
- Nenhuma estrutura é perdida para algo que o jogador não pode matar. A
  tensão do Pescador passa a ser econômica (sucata) e de oportunidade
  (Rádio/Cachorro rendem).
- Save antigo continua válido: a máquina guarda `lane`/`col`, e `col` em
  `0..4` é um slot válido no grid novo. Testes de geometria e de gameplay
  cobrem `COLS = 7` e o pedágio.

## Alternativas rejeitadas

- **Oito colunas:** `170 + 8 × 152 = 1386 > 1280`; exigiria encolher `COLW`,
  o que encolhe a peça e a arte da lane junto.
- **Encolher `COLW` para caber mais colunas:** muda o desenho de toda peça e
  de toda lane; o pedido era espaço, não peça menor.
- **Tornar o Pescador matável:** quebra o trait `human` e a ficção (ADR 004);
  o jogador escolheu a opção de ele não destruir nada.
- **Pescador não fazer nada ao chegar:** sem custo nenhum, ele vira só
  decoração andando; o pedágio mantém a decisão de gastar Rádio/Cachorro.
