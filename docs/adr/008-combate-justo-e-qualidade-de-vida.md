# ADR 008 — Combate justo, imposto dos moradores e qualidade de vida

**Status:** aceito
**Data:** 2026-11-11

## Contexto

O jogador reclamou de três coisas concretas, e todas eram regra, não balanceamento
fino:

1. **Bichos que \"não dão pra matar\":** a Baleia-Filhote é `neutral` (imune),
   o Peixe-Lata devolvia **todo** tiro, e voadores só caíam com Holofote ou
   Ventilador. Em prática, uma onda aérea sem essas duas peças era uma onda
   perdida — e a baleia, sem contramedida nenhuma, só podia ser assistida.
2. **O Faroleiro ficava fora do campo.** Na fase 2 ele teleporta para
   `SPAWN_X - 20` (=1300, com `W=1280`) e para de andar. O alcance máximo de
   uma peça termina em `x < reach + 10` (1290). Ele era, literalmente,
   inalcançável — daí a sensação de chefe impossível.
3. **Faltava informação e fricção:** a descrição das engenhocas só aparecia
   por acaso, catar sucata exigia clique (ou o Ímã), `ESC` não pausava, e a
   partida só era salva quando o jogador saía ou terminava.

## Decisão

### Combate justo

- **Voador tem cinco respostas:** Holofote, Ventilador, Canhão de Lata,
  Estilingue e Bujão. Canhão e Estilingue ganharam `air: true` no
  `balance.json`; o teste de alvo aceita `airPierce`.
- **Peixe-Lata devolve no máximo 3 torradas** (`reflect: 3`). A quarta entra.
  O reflexo continua acontecendo, mas cansa — a dica do bestiário diz isso.
- **Ventilador espanta a Baleia-Filhote.** Ela continua imune a dano (trait
  `neutral`), mas o empurrão a marca como `spooked` e ela sai pelo lado
  direito, devolvendo o caminho. Continua sendo visita, não troféu.
- **O Faroleiro teleporta para `W - 60`**, dentro do campo e do alcance das
  peças. Nenhum chefe pode sair de `x ≤ W`.

### Imposto dos moradores

- A Dona Lú cobra **imposto no fim de cada onda**: `base + porPeca × peças +
  porOnda × ondas`, pago no break. Valores em `balance.json`, função pura em
  `economy.ts`.
- Se a sucata não cobre, a dívida **rola** para o próximo round
  (`impostoDevido`) em vez de zerar o saldo. O imposto é um sumidouro, não uma
  sentença de morte.
- A banca mostra a conta do próximo round antes de o jogador plantar.

### Qualidade de vida

- **Hover coleta sucata** (raio de 28 px). Clique e Ímã continuam valendo;
  hover é atalho, não substituto.
- **`ESC` pausa/despausa sempre.** Cancelar peça selecionada passa a ser só
  botão direito (e clicar fora).
- **Autosave** grava o metadado (slot, `lastPlayed`) ao entrar no break, ao
  pausar e ao sair. A onda em andamento não é serializada — o save continua
  sendo por onda.
- **Ficha da peça no hover da carta:** nome, custo, vida, recarga, descrição
  e sinergia. Item sem descrição é item que ninguém entende.

## Consequências

**Ficou mais justo:** toda criatura tem uma resposta que o jogador consegue
comprar, e a baleia deixou de ser um pedágio sem saída. O Faroleiro agora
morre.

**Ficou mais difícil de propósito:** o imposto tira sucata do jogador toda
onda, então encher a rua de peça barata tem custo recorrente. A economia
passa a pedir escolha, não acumulação.

**Custo:** `Enemy` ganhou `reflectMax`/`reflects` e `spooked`; `GameState`
ganhou `impostoDevido`/`savedT`; `MachineDef` ganhou `air?` e `EnemyDef`
ganhou `reflect?`. Tudo com default, então save antigo continua abrindo.

**Verificação:** 10 testes novos em `tests/gameplay.test.ts` cobrem hover,
`ESC`, autosave, imposto, baleia espantada, lata limitada, `airPierce` e o
Faroleiro dentro do campo na fase 2.

## Alternativas rejeitadas

- **Tirar o Ventilador do jogo / deixar a baleia morrer** — ela é `neutral`
  por design (ADR 004). Contramedida é empurrar, não matar.
- **Reflexo infinito com dano reduzido** — o jogador continuaria perdendo a
  peça sem entender por quê. Três devoluções é um aviso; a quarta é a regra.
- **Voador só com Holofote** — uma peça obrigatória por onda aérea não é
  counter-play, é pedágio. Cinco respostas deixam o jogador escolher.
- **Faroleiro fora do campo \"para fugir\"** — chefe que não pode ser
  atingido não é dificuldade, é bug. Se precisar de fuga, ele anda para trás
  **dentro** da tela.
- **Imposto zerando a sucata** — puniria o jogador que acabou de comprar uma
  peça e mataria a economia de recuperação. A dívida rola.
- **Autosave da onda em andamento** — serializar inimigos, projéteis e
  timers é uma mudança de formato de save inteira, com migração, para um
  benefício que o jogador não pediu. Save por onda já é o contrato.
