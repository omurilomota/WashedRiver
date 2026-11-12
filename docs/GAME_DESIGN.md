# Design de jogo

> O que o MARÉ PODRE é, como se joga e por que cada regra existe.
> Mudança de regra é **decisão de design**: vai para ADR antes de virar código.

## Pitch

Tower defense de sucata numa costa que devolve tudo que a vila jogou nela.
O jogador é o Zé — ou alguém no lugar dele — defendendo a vila da maré podre
com engenhocas improvisadas, enquanto a Voz do Rádio comenta tudo pelo
rádio. Nenhum final é limpo. Todos os finais são veinhas.

## Fantasia central

> **Amar a vila, mesmo sabendo que ela não merece.**

O jogo não é sobre vencer. É sobre o que sobra: uma horta afundada, um
barco que era do irmão do Zé, uma escolha no final que ninguém vai achar boa.

## Pilares

1. **Legibilidade** — todo dano é visível. Se um bicho morreu, você viu o que
   matou. Sem números flutuantes ambíguos, sem hitbox invisible.
2. **Improviso** — as engenhocas são sucata reaproveitada. Nenhuma é "a
   torre de sci-fi". A Geladeira é uma Geladeira.
3. **Voz** — o tom é seco e cômico. O medo nunca é dito em voz alta; vem no
   subtexto (Zé falando do irmão que não voltou, Dona Lú querendo ir embora).
4. **Consequência** — toda onda deixa marca. A vila perde estrutura, e a
   estrutura que cai tem nome.

## O campo

- **6 lanes** (índices 0–5) × **7 colunas** = **42 slots** de plantio.
- Canvas lógico **1280×846** (`LANE_Y0=90`, `LANE_H=126`).
- A vila fica à esquerda (`VX=170`); os inimigos entram pela direita.
- Cada lane tem duas **estruturas** que a maré tenta derrubar.
- **O campo é um terreno só por mapa** (ADR 014): onde tem rio, tem rio nas
  seis lanes; onde tem penhasco, penhasco nas seis. O nome das seis lanes é o
  do terreno (`RIO DO PÍER`, `PENHASCO`, `TRILHO`, `CALÇADA`,
  `PISO DA FÁBRICA`, `ÁGUA RASA`). Variedade vem dos props e da variação de
  arranjo por lane (ADR 013), não de microcenários diferentes.

## Estruturas

Cada mapa tem 2 estruturas por lane. A estrutura **não é vida do jogador**:
é o que a maré quer.

- Perder **todas as estruturas de uma lane** abre uma **brecha**: a partida
  continua, o mar ficou com um quarto a mais. A brecha é contada uma vez
  por lane.
- A partida só **acaba quando todas as 12 caem**. Aí o Zé se vai com a
  última ("PERDEMOS O ZÉ.").

Contagem de estruturas é sempre `LANES * 2` derivada — nunca `/10` solto.

## Controles e leitura

| Controle | Ação |
|---|---|
| Clique numa carta e depois numa vaga | planta a engenhoca |
| `Shift` + clique | planta várias com a mesma carta |
| Botão direito | cancela a seleção |
| `ESC` / `P` | pausa e despausa |
| Passar o mouse na sucata | cata (clique e Ímã também valem) |
| Passar o mouse numa carta | ficha da peça: custo, vida, recarga, descrição e sinergia |
| `1`–`9` | escolhe engenhoca |
| `M` | mudo |

O jogo **salva sozinho** ao entrar no break, ao pausar e ao sair. A onda em
andamento não é salva: o save continua sendo por onda.

## Engenhocas (18)

| Engenhoca | Custo | CD | HP | Papel |
|---|---|---|---|---|
| Boia Catadora | 50 | 5 | 80 | cata sucata do chão (clique ou hover) |
| Torradeira | 100 | 6 | 120 | dano em linha reta |
| Canhão de Lata | 120 | 7 | 110 | projétil pesado, linha reta; **acerta voador** |
| Ventilador | 75 | 8 | 100 | empurra/derruba voador; **espanta a Baleia-Filhote** |
| Geladeira | 50 | 10 | 450 | parede; quebra virando sucata |
| Bujão P13 | 125 | 15 | 60 | explosão 3×3 |
| Holofote | 110 | 12 | 90 | revela, derruba voador, impede escavação |
| Ímã de Geladeira | 60 | 9 | 70 | coleta sucata sozinho |
| Rádio Velho | 95 | 11 | 85 | hipnotiza 2s / redireciona Pescador |
| Estilingue | 110 | 7 | 100 | dano alto, silencioso (acerta fantasma e voador) |
| Aspirador Hidráulico | 100 | 9 | 110 | **atrai** bichos pequenos |
| Batedeira Velha | 90 | 7 | 120 | dano em área curta |
| Espelho | 80 | 8 | 100 | devolve o que o Peixe-Lata manda |
| Pneu Queimado | 70 | 12 | 200 | barreira em fogo |
| Aranha-de-Encanamento | 140 | 14 | 70 | atira em **todas** as colunas |
| Geladeira-Bomba | 130 | 16 | 320 | quebra e explode |
| Cachorro-de-Guarda | 45 | 8 | 90 | late e empurra |
| Coisa do Zé | 0 | 0 | 140 | uma por partida, ele escolhe |
| Pé de Cabra | 0 | 0 | 0 | arranca peça, devolve 25% |

Cada peça tem **3 níveis de upgrade, todos visíveis no desenho** (fita
isolante, porta reforçada, isopor por dentro). Nenhuma melhoria é invisível.

### Sinergias

Dez sinergias implementadas de verdade (não texto decorativo):

| A + B | Nome | Efeito |
|---|---|---|
| Rádio + Rádio | Rádio-Duet | hipnose em área |
| Ventilador + Pneu | Fogo Soprado | fogo empurrado um corredor |
| Rádio + Ventilador | Hipnose Forçada | empurrão dobra |
| Aspirador + Bujão | Sucção Explosiva | puxa pequenos para a bomba |
| Torradeira + Holofote | Alcance Iluminado | atira nas 3 colunas acesas |
| Estilingue + Holofote | Mira de Farol | acerta antes, sem troco |
| Boia + Ímã | Coleta Automática | boia cospe mais rápido |
| Geladeira + Geladeira-Bomba | Câmara Fria | bomba ganha vida e explode maior |
| Batedeira + Bujão | Liquidificador Explosivo | bujão explode girando |
| Cachorro + Rádio | Latido Hipnótico | redireciona o Pescador |

## Criaturas (20)

Cada uma tem uma **contra-jogada** clara — a dica no bestiário diz o
contra, não o lore.

| Criatura | HP | Traço | Contra |
|---|---|---|---|
| Baiacu de Tampinha | 90 | — | dano direto |
| Enguia de Óleo | 60 | mergulha | Holofote |
| Ova Podre | 170 | choca ao morrer | matar longe da entrada |
| Larva do Pintinho | 18 | rápido | qualquer coisa |
| Caranguejo Sindicado | 110 | blindado em grupo | separar |
| Peixe-Bomba | 70 | estoura na sua peça | Bujão na frente |
| Gaivota-Ladra | 70 | **voa** | Ventilador / Holofote |
| Gaivota-Rei | 130 | **voa**, carrega peça | abate antes |
| Tatu de Areia | 120 | **escava** | Bujão no fundo / Holofote |
| Peixe-Lata | 110 | **devolve até 3 torradas** | corpo a corpo, explosão; a quarta entra |
| Peixe-Fantasma | 55 | **invisível** | Ataque/Holofote/Estilingue |
| Polvo-Garrafa | 140 | **sabotagem** (desliga peça) | matar rápido |
| Água-Viva-Fantasma | 60 | **voa + intangível** | **só luz ou explosão** (nem `airPierce` fura) |
| Mariposa de Espelho | 80 | **voa**, atraída pela luz | deixar na luz |
| Sapo de Óleo | 100 | pula 2 colunas | cobertura atrás |
| Piranha-Coral | 25 | cardume forte | área / Bujão |
| Caranguejo-Mártir | 120 | fúria dos amigos | matar por último |
| Baleia-Filhote | 400 | alvo (matável) — ainda pisa nas peças | Tiro, explosão e lâmina; Ventilador espanta; ou desvie |
| O Pescador | 60 | alvo (matável) — não quebra (cobra pedágio) | Tiro; Rádio redireciona; se chegar, cobra pedágio em sucata |
| Passageiro do Trilho | 90 | troca de trilho | corredor protegido |

**Regra de imortalidade:** só `unbeatable` (MARÉ) significa "não mate". HP é só
número de combate. Pescador e Baleia-Filhote agora são alvos normais (tiro
funciona). O Pescador ainda não quebra estrutura: se chegar na vila, cobra
`economia.pescadorTaxa` de sucata e volta pro mar. A Baleia ainda pisa nas
estruturas e o **Ventilador a espanta** (ela sai pelo lado direito). A MARÉ
(chefe final) é `unbeatable: true`, sem número mágico. Nenhum inimigo comum
passa de 500 HP
(teste automático). **Todo bicho tem contramedida** (mandato 13 do `AGENTS.md`).

## Chefes (6)

Chefes são **fases**, não sacos de vida:

| Chefe | Mapa | HP | 아이디어 |
|---|---|---|---|
| Seu Bento, o Comeu-Pescador | Barra Suja | 2400 | 3 fases: anda → sem chapéu → chama reforço |
| O Faroleiro | Farol do Fim | 2200 | apaga o campo; a fase 2 teleporta, mas sempre para dentro do campo (`x ≤ W`) |
| O Maquinista | Estação Afogada | 2600 | telegrafa passagens com apito |
| A Peixe-Mãe | Feira do Peixe | 3000 | infla e reflete tiro |
| O Gerente | Fábrica Podre | 3200 | 7 fases, 7 reuniões |
| A MARÉ | Cemitério de Barcos | — | invencível; sobreviva 2 minutos |

## Mapas (6)

| Mapa | Recurso | Clima | Chefe | Assinatura |
|---|---|---|---|---|
| Barra Suja | sucata | chuva | Seu Bento | o lar do Zé |
| Farol do Fim | óleo (×1.1) | neblina | O Faroleiro | a luz é defesa e é isca |
| Estação Afogada | vapor (×1.2) | tempestade | O Maquinista | o trilho que ninguém desliga |
| Feira do Peixe | peixe (×1.15) | calor | A Peixe-Mãe | defenda o que ainda dá pra comer |
| Fábrica Podre | energia (×1.25) | cinzas | O Gerente | a origem tem expediente até domingo |
| Cemitério de Barcos | tudo (×1.4) | vendaval | A MARÉ | o fim da costa e o começo do mar |

Cada mapa tem: paleta própria, clima, **um terreno** (nome das 6 lanes),
2 estruturas por lane, pool de criaturas, chefe, intro, fala do chefe e bio.

### Ondas e pool de criaturas

O **pool de criaturas** do mapa (`src/data/maps.json`) manda nas ondas:

| Onda | Bichos |
|---|---|
| 0 | os 2 primeiros do pool |
| 1 | os 6 primeiros do pool |
| 2 (última) | o pool inteiro — garantido, cada bicho aparece pelo menos uma vez |

As **cenas fixas** entram em todos os mapas: o polvo, o cardume de piranha e
a Baleia-Filhote (que é visita, não moradora — aparece em todo mapa, "não
deveria estar aqui"). Os **extras do mapa** entram a partir da onda 1.

A Noite Infinita usa o pool do mapa também.

No **desafio diário**, o mod "SÓ BAIACU" troca o pool inteiro: nenhuma
criatura escapa, nem as cenas nem os extras.

## Árvore de desbloqueios (15 nós, 3 ramos)

**MARÉ** — defesa, sucata, teimosia: Sucata Velha, Gambiarra Fina, Banca do
Zé, Pilha de Boia, Oficina de Fundo, Arame Reforçado.
**COSTA** — o caminho: Atalho do Farol, Trilho de Volta, Caderno de Histórias,
Batedor de Costa.
**SOBREVIVÊNCIA** — você: Reboque do Zé, Tábua de Reserva, Mãos de Graxa, O
Cachorro do Zé, Cheiro de Maré.

Custo em **sucata velha** — a moeda de meta, conquistada entre partidas.

## Economia de sucata

Duas moedas com papeis distintos:

| Moeda | Origem | Destino |
|---|---|---|
| **Sucata** (de partida) | passiva 3/s, maré, drops, sucata velha | plantar, melhorias, Banca do Zé |
| **Sucata velha** (meta) | 500 sucata por unidade | árvore de desbloqueios |

Sumidouros da **Banca do Zé**: reforçar estrutura (150), reparo de duas
paredes (300), tábua de reserva ×3 (220), recarga rápida (120). Upgrades de
peça custam **120 / 220 / 380**.

**Alvo de aceite:** saldo final entre **100 e 700** por partida, com ≥60% do
ganho gasto. (Ver ADR 005.)

### Imposto dos moradores

A Dona Lú cobra **imposto no fim de cada onda**:
`base + porPeca × peças + porOnda × ondas vencidas` (valores em
`balance.json`). Se a sucata não cobre, a diferença vira `impostoDevido` e
rola para o próximo round — o saldo não é zerado. A banca mostra a conta do
próximo round antes de plantar, então encher a rua de peça barata tem custo
recorrente. Ver ADR 008.

## Modos

- **Campanha** — 6 mapas, 3 slots de save, progressão de desbloqueio.
- **Desafio diário** — 8 modificadores sorteados por data local (determinístico,
  funciona offline): Sem Geladeira, Só Baiacu, Sucata Demais, Tudo Rápido,
  Peças de Vidro, Maré Cheia, Chefe Antes da Hora, Noite Permanente.
  Todos os 8 **fazem o que o texto promete**: ban tiram engenhoca do baralho,
  Peças de Vidro multiplica a vida da peça, Noite Permanente começa o mapa no
  escuro, Só Baiacu troca o pool inteiro.
- **Chefe** — um mapa, um chefe, sem campanha.
- **Noite Infinita** — sobreviva às ondas; conquista na onda 10.
- **Sandbox** — 50 engenhocas na areia, sem julgamento.

## Conquistas (12)

Doze conquistas — e a UI antigo mostrava "selos x/10", o que estava errado.
Exemplos: *O Pescador foi redirecionado sem ser morto*, *A baleia-filhote não
chegou do outro lado*, *Sobreviveu ao Faroleiro sem acender holofote*.

## Finais (3)

Nenhum final é "o bom":

| Final | Escolha | O que acontece |
|---|---|---|
| **Acender o Farol** | acender a luz pro mar | a vila recua da costa; o mar "desce como quem se retira de uma conversa" |
| **Fechar a Baía** | fechar com navios e escombros | a maré para; também para tudo; a vila vira tampa |
| **Responder ao Rádio** | responder à Voz | o mar fica quieto e cobre a rua; a Voz era uma mulher que o mar carregou |

## Voz

Quatro vozes, com regras de escrita:

- **Zé** — prático, cínico, preso no passado. Tem uma fala rara sobre o irmão.
- **Dona Lú** — quer ir embora; não por coragem, por pé.
- **Toquinho** — criança; pergunta o que os adultos evitam.
- **A Voz do Rádio** — sachês, melodiosa, sabe o seu nome. Nunca mente, só carrega.

**Regra:** não mudar a direção do texto do jogo sem aprovação do usuário
(mandato 8 do `AGENTS.md`).
