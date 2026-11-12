# ADR 007 — Regras de gameplay: pool do mapa, derrota por total, mods que cumprem

**Status:** aceito
**Data:** 2026-11-11

## Contexto

A auditoria da F1 (após a portagem para TypeScript) achou quatro problemas de
regra, não de código:

1. **O pool de criaturas do mapa era lido e ignorado.** Todo mapa tem um `pool`
   em `src/data/maps.json`, mas as três ondas usavam sempre a mesma lista
   fixa (`baiacu, enguia, caranguejo, ova, polvo, piranha, bomba`). Efeito:
   tatu, sapo, gaivota, lata e fantasma **nunca** apareciam na campanha, e
   cada mapa jogava igual ao outro.
2. **A partida acabava cedo demais.** O Zé morria quando as *duas* estruturas
   de uma mesma lane caíam: 2 de 12 encerravam a partida com 10 de pé — e a
   documentação dizia outra coisa ("perder todas as estruturas de uma lane
   abre brecha").
3. **Três mods do desafio diário eram decorativos.** "SEM GELADEIRA" (ban),
   "PEÇAS DE VIDRO" (machHp) e "NOITE PERMANENTE" (dark) prometiam no texto e
   não faziam nada no jogo.
4. **A Baleia-Filhote não pisava em ninguém.** A exclusão `e.type!=='baleia'`
   na checagem de contato impedia o caminho de código que esmaga peças de
   existir. O ramo que tratava a baleia era código morto.

Ao lado desses, dois bugs de infraestrutura que mudavam o jogo inteiro: o
reinício lia um campo (`G.runOpts`) que ninguém escrevia, e `eff().machineHp`
valia 1, fazendo **toda peça nascer com o dobro da vida** do conteúdo.

## Decisão

- **Ondas usam o pool do mapa**: onda 0 pega os 2 primeiros bichos do pool,
  onda 1 os 6 primeiros, a última traz o pool inteiro **garantido** (cada
  bicho aparece pelo menos uma vez, não por acaso). As cenas fixas (polvo,
  cardume de piranha, Baleia-Filhote) continuam em todos os mapas; os extras
  do mapa entram a partir da onda 1. A Noite Infinita também usa o pool.
- **A partida só acaba quando todas as 12 estruturas caem.** Perder uma lane
  inteira abre **brecha**: a partida continua, o aviso sai uma vez por lane
  (`breachLanes`) e o mar ficou com um quarto a mais.
- **Todo mod do desafio diário faz o que promete**: `ban` tira a engenhoca do
  baralho (`isBanned`), `machHp` multiplica a vida da peça, `dark` faz o mapa
  começar no escuro. "SÓ BAIACU" troca o pool inteiro — nenhuma criatura
  escapa, nem as cenas nem os extras.
- **A Baleia-Filhote pisa e quebra**, mas não é alvo (não leva tiro, não
  explode). O Pescador continua fora: é gente.
- **Cada modo grava sua opção de partida** (`Game.runOpts`) e o reinício a
  reaplica. Índice de mapa é limitado ao intervalo real.
- **`machineHp` é bônus, não multiplicador**: vale 0, e cada nível da árvore
  ("Gambiarra Fina") soma 8%.

## Consequências

**Ficou mais interessante:** cada mapa tem identidade de verdade (o Farol
manda mariposa, água e sapo; a Fábrica manda lata, água e mariposa), e 20
bichos em vez de 7 estão jogáveis. A derrota tardia dá ao jogador uma partida
mais longa e uma chance real de recuperar.

**Ficou mais difícil:** o balanceamento mudou de uma vez (peças com metade da
vida, ondas mais variadas). O HP das peças em campo é agora o do
`balance.json`, como sempre deveria ter sido.

**Custo:** os mods do diário ficaram balanceados de verdade — "SEM GELADEIRA"
agora tira a peça mais forte do jogo do baralho, o que muda a estratégia da
partida.

**Verificação:** 17 testes de regressão em `tests/gameplay.test.ts` (o jogo
rodando dentro do jsdom, com contexto 2D falso) cobrem cada regra acima.

## Alternativas rejeitadas

- **Pool só na Noite Infinita** — a campanha continuaria igual em todos os
  mapas; 13 dos 20 bichos seguiriam jogáveis só num modo. A identidade do
  mapa é o ponto.
- **Pool do mapa como acréscimo à lista fixa** — cada mapa ganharia todos os
  bichos ao mesmo tempo: a curva de dificuldade subiria em todos eles e a
  identidade se perderia.
- **Manter "lane vazia = fim"** — a partida acabaria com 10 de 12 estruturas de
  pé. A documentação, o tom do jogo e a fórmula de estrelas (3 estrelas =
  nenhuma estrutura perdida) dizem o contrário.
- **HP mágico de novo (`hp:9999`) para a baleia** — rejeitado em ADR 004: a
  baleia agora é alvo por HP (400), não por número mágico; esmagar peça é
  efeito de visita, não invencibilidade. A imortalidade da baleia foi revogada
  em 2026-11-11 (ver ADR 004, atualização).
