# IDEIAS.MD — MarePodre: auditoria, correções e expansão

> Documento de trabalho da sessão. Registra o que foi encontrado, o que será
> feito e como será verificado. O rumo narrativo existente **não muda**: a
> expansão acrescenta história e modos, não reescreve a campanha.

## Linha de base (antes de qualquer mudança)

- `npm ci` concluído (382 pacotes; vulnerabilidades transitivas de dev).
- `npm run typecheck` → 0
- `npm run lint` → 0
- `npm test` → 150 testes, 0 falhas
- `npm run build` → OK
- `node tools/smoke.mjs` → OK
- `git diff --stat HEAD -- dist` vazio (build não foi commitado).

## Diagnóstico rápido

O BLOCO M.6 está **parcialmente implementado**: existem `evento`, `micros`,
`variacao`, `abrirEvento`, `updateMicros`, `sortearVariacao`, `MOLHO` e
`MOLHO_TXT`, mas o briefing ainda o trata como pendente. A auditoria encontrou
bugs de regra reproduzíveis, além de promessas de UI/save que o código não
cumpre.

## Correções priorizadas

### P0 — partida travada ou modo errado

1. **Noite Infinita/Sandbox param depois da onda 2.**
   - `nextPhase()` usa `currentPhase()`, que devolve `{type:'idle'}` quando o
     índice passa do fim. O bloco que deveria emendar `break + nova onda`
     nunca vê um `phase` vazio.
   - Resultado: a partida fica em `idle` para sempre (ou repete a última onda,
     dependendo do caminho).
   - Correção: ao avançar além de `G.phases` em `endless`/`sandbox`, criar
     `makeEndlessWave(n)`, empurrar `break` + `wave n` e continuar.
   - Teste: iniciar Noite Infinita, encerrar a onda 1 e verificar que existe
     uma nova onda e que a partida continua.

2. **Escolha de dificuldade da Noite Infinita é ignorada.**
   - `endlessMenu()` emite `data-act="deckendless" data-arg="0|1|2"`, mas o
     handler descarta o arg e `deckgo` inicia sempre `level: 0`.
   - Correção: guardar a dificuldade no estado da tela de deck e passá-la para
     `Game.startFromOpts({level})`.
   - Teste: `Game.startEndless({level:2})` deve guardar a dificuldade no save.

3. **Modo Chefe e “Noite Infinita neste mapa” perdem o mapa escolhido.**
   - `deckendless`/`deckboss` chamam `deckScreen(clamp(SaveDB.slot.campaign))`,
     ignorando o mapa do card/menu de contexto.
   - Correção: `deckScreen` recebe o mapa clicado; `deckgo` usa esse mapa.
   - Teste de regra: `Game.startBoss(3)` mantém `mapIndex=3` e o save de melhor
     tempo é gravado no mapa 3.

4. **Peça “desbloqueada” na banca não aparece.**
   - `chooseOffer('unlock')` grava `G.unlockedMach`, mas `isMachUnlocked()` não
     lê esse campo. Mesmo corrigindo isso, `availableMachines()` filtra pelo
     deck fixo e a peça continuaria fora da banca.
   - Correção: `isMachUnlocked()` consulta `G.unlockedMach`; a banca inclui
     desbloqueios da partida como exceção ao deck.
   - Teste: desbloquear `estilingue` em partida com deck e conferir
     `isMachUnlocked` + `availableMachines`.

### P1 — dados e combate

5. **Melhor tempo da campanha é sempre 99.**
   - `completeMap()` chama `SaveDB.setStars(G.mapIndex, 99, stars)`.
   - Correção: gravar `Math.round(G.t)`.
   - Teste: vencer um chefe e conferir que `slot.bossBest[mapa]` existe; para
     campanha, conferir que `slot.best[mapa]` não é 99 fixo.

6. **Modo Chefe nunca grava melhor tempo.**
   - Existe `SaveDB.record('boss', {map,time})`, mas `completeMap()` não o chama
     para `G.mode==='boss'`.
   - Correção: chamar no fim vitorioso do chefe, antes de `finishRun`.
   - Teste: derrotar o chefe do mapa 0 e conferir `slot.bossBest[0]`.

7. **Noite Infinita grava recorde sempre na dificuldade 0.**
   - `SaveDB.record('endless')` lê `slot.flags.endlessDiff`, mas ninguém grava
     essa flag.
   - Correção: `Game.startEndless` grava a dificuldade no slot.
   - Teste: iniciar no nível 2 e conferir a flag.

8. **Projétil do Espelho é inerte.**
   - `updateProjectiles()` trata `p.kind==='mirror'` no ramo inimigo e nunca
     procura alvo.
   - Correção: espelho é projétil aliado; entra na colisão normal e causa dano.
   - Teste: refletir um projétil e conferir dano no bicho.

9. **Neblina não encurta a torrada.**
   - `const reach=G.map.id==='fog'?W:W;` — os dois ramos são iguais, e o id do
     mapa é `farol`; o clima é `fog`.
   - Correção: usar `G.map.weather==='fog'` e um alcance menor.
   - Teste: em Farol, bicho no extremo do campo não é alvo; perto é.

10. **Peixe-Bomba remove um bicho extra.**
    - `killEnemy(e,true)` já remove `e`; em seguida
      `G.enemies.splice(G.enemies.indexOf(e),1)` com índice `-1` remove o
      último inimigo da lista.
    - Correção: remover o splice duplicado.
    - Teste: bomba no contato não apaga outro bicho distante.

### P2 — promessas de texto/UI

11. **Evento da Gaivota-Ladra não leva peça nenhuma.**
    - O texto diz que ela levou uma peça; o código só cobra 60 e às vezes devolve
      sucata.
    - Correção: o evento retira uma peça de verdade, guarda a peça e a devolve
      se o Zé conseguir recuperá-la; se não houver peça, o evento não é
      sorteado.
12. **Três eventos nunca aparecem.**
    - `abrirEvento()` filtra `bicho_raro`, `cachorro_real` e `radio_estacao`.
    - Correção: implementar os efeitos e liberar os três.
13. **Texto do “cachorro de verdade” fala em balde.**
    - Trocar por “cachorro” e fazer o efeito depender de um Cachorro no campo.
14. **Digitação e confirmações.**
    - `O ZÉ MONTou` → `MONTou`/`MONTou` padronizado.
    - `newslot` apaga o slot sem `confirm`, ao contrário do menu de contexto.
    - “A NOITE CANSou” → “A NOITE CANSOU”.
15. **Contagens hardcoded na UI.**
    - `/18 peças`, `6` e `5` em telas devem sair de `MACH_ORDER`/`MAPS`.
16. **`neutral`/`human` legados.**
    - Os campos ainda existem no estado/tipos, mas as traits foram removidas do
      dado. Verificar usos e remover o ramo inalcançável, sem quebrar o
      Pescador (que é alvo matável e cobra pedágio).

## Expansão de conteúdo

### 1. Completar o M.6 (eventos do molho)

- Liberar e implementar os três eventos filtrados:
  - `bicho_raro`: visita rara, dá sucata e mata para o bestiário;
  - `cachorro_real`: se houver Cachorro-de-Guarda, os pequenos recuam;
    senão, é só o susto e a fala do Zé;
  - `radio_estacao`: liga a estação pirata até o fim da partida.
- `gaivota_ladra`: peça levada de verdade, com recuperação por 60 de sucata.
- Manter todos os textos em `maps.json`; efeitos continuam em `game.ts` porque
  são regras, não conteúdo.
- Teste: todo evento existente tem texto nos dois botões (já existe); adicionar
  teste de que a gaivota só aparece quando há peça e que o efeito mexe na peça.

### 2. História: “Crônicas da Costa” no Caderno do Zé

- Adicionar `cronicas` em `maps.json`: seis entradas curtas, uma por mapa,
  contadas pelo Zé em primeira pessoa, sem mudar os três finais.
- Aba nova `HISTÓRIA` no Caderno (`codex`), com entrada bloqueada como `???`
  até o mapa correspondente ser liberado.
- Exportar `CRONICAS` em `src/data/index.ts` e criar o tipo `ChronicleDef`.
- Texto novo fica no JSON; `ui.ts` só desenha.
- Teste de dados: uma crônica por mapa, mapa válido e texto não vazio.

### 3. Modos

- Noite Infinita: dificuldade **e** mapa escolhidos de verdade; recorde por
  dificuldade no save; menu mostra a melhor marca legível (não `JSON.stringify`).
- Modo Chefe: mapa escolhido de verdade; melhor tempo por mapa no save e na
  tela.
- Campanha: melhor tempo real por mapa.
- Context menu “Noite Infinita neste mapa” passa o mapa clicado.
- Sem criar modo novo artificial nesta rodada: primeiro os modos existentes
  precisam cumprir o que prometem.

### 4. Melhoria visual profunda (estratégia, não filtro)

O objetivo é o campo parecer **um lugar**, não uma colagem de sprites sobre
um piso. A implementação fica em `src/render/atmosphere.ts` e segue quatro
regras verificáveis:

1. **Luz global** — topo-esquerda (`LIGHT`), a mesma usada pelo volume das
   peças. O brilho de horizonte e o sheen direcional unificam a cena.
2. **Três planos** — fundo cacheado, campo jogável e primeiro plano (estacas
   escuras nas bordas). O primeiro plano emoldura; não cobre corredor nem
   hitbox.
3. **Clima com a paleta do mapa** — névoa em Farol/tempestade/vendaval,
   poeira em Feira, cinza na Fábrica e feixes no Farol. Nada de filtro
   global que apague os atores.
4. **Foco e profundidade** — vinheta radial curta, base escurecida e laterais
   conduzem o olho ao centro. O HUD ganha hierarquia: recurso, cartas,
   cooldown e custo legíveis de relance.

Também entram:

- remoção da sombra duplicada dos bichos (a sombra de contato vira uma só);
- HUD com fundo, borda, custo verde/vermelho, atalho com contraste e seleção
  com halo; tooltip com custo/vida/recarga e sinergia;
- CSS com moldura de palco, textura de grão, topbar com profundidade, cartões
  de mapa com camada de arte e foco visível;
- testes de render novos: `drawAtmosphere` precisa desenhar em todos os
  mapas, com assinatura diferente entre mapas e sem tocar no campo jogável.

## Arquivos afetados

- `src/game/game.ts` — fases, projéteis, eventos, saves, alcance, bomba.
- `src/game/economy.ts` — desbloqueio em partida e banca.
- `src/ui/ui.ts` — deck (mapa/dificuldade), recordes, codex/história, textos.
- `src/core/state.ts` — tipo do evento com peça guardada.
- `src/data/types.ts` — `ChronicleDef`.
- `src/data/index.ts` — exportar crônicas.
- `src/data/maps.json` — crônicas e textos de eventos.
- `tests/gameplay.test.ts`, `tests/economy.test.ts` — regressões.
- `tests/data.test.ts` — invariantes das crônicas.
- `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`/ADRs e
  `mare-podre-briefing.md` — atualizar estado do M.6 e das decisões.

## Ordem de execução

1. Escrever este arquivo.
2. Corrigir P0 com testes (infinito, deck, desbloqueio).
3. Corrigir P1 com testes (save, espelho, neblina, bomba).
4. Completar M.6 e adicionar crônicas.
5. Atualizar docs e briefing.
6. Rodar `npm run typecheck && npm run lint && npm test && npm run build` e
   `node tools/smoke.mjs`; verificar `dist` gerado.

## Critérios de aceite

- Nenhum teste existente quebrado; novas regressões cobrindo cada bug de regra.
- Noite Infinita continua criando ondas depois da segunda.
- Dificuldade/mapa escolhidos no menu são os usados na partida.
- Peça desbloqueada na banca aparece e pode ser plantada na mesma partida.
- Melhor tempo de campanha/chefe e recorde infinito por dificuldade são reais.
- Eventos do molho não são mais filtrados por acidente e os textos cumprem o
  efeito.
- Crônicas acessíveis no Caderno, com bloqueio por progresso.
- `dist/` continua sendo artefato de build, nunca editado à mão.
- Sem commit/push/deploy sem pedido explícito.

## Status de execução (2026-11-17)

- [x] P0: fim do loop idle na Noite Infinita/Sandbox; dificuldade e mapa do
  deck honrados; desbloqueio da banca entra em `isMachUnlocked` e na banca.
- [x] P1: tempo real da campanha; `bossBest` por mapa; recorde infinito por
  dificuldade; Espelho causa dano; neblina encurta a torrada; bomba não apaga
  bicho extra; tábua reposiciona o invasor; escuro do nevoeiro apaga sozinho.
- [x] M.6: eventos filtrados liberados (`bicho_raro`, `cachorro_real`,
  `radio_estacao`); Gaivota-Ladra leva e pode devolver peça.
- [x] História: 6 crônicas no Caderno do Zé, bloqueadas por campanha.
- [x] Visual: atmosfera por mapa, três planos, foco, HUD/cartas, CSS e sombra
  única dos bichos (ADR 015).
- [x] Verificação final: `typecheck=0`, `lint=0`, **164 testes**, `build=0`
  (287,14 kB) e `smoke=0`.
- [ ] Revisão visual em navegador/screenshot: não executada (não houve pedido
  explícito de screenshot); a camada foi coberta por testes de render.
- [ ] Campos legados `neutral`/`human` no estado/tipos: mantidos por
  compatibilidade, embora o dado atual use `unbeatable` e o Pescador tenha
  tratamento próprio. Não removidos nesta rodada para não ampliar o diff.
- [ ] Commit/push/deploy: nenhum, por não ter sido pedido.
