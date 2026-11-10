# AGENTS.md —_guide para IAs e gente_

> ⚠️ LEIA TUDO ANTES DE ESCREVER QUALQUER CÓDIGO.
> Este projeto já foi quebrado por contagem hardcoded. As regras abaixo existem
> porque cada uma delas já custou uma partida.

## ⚠️ MANDAMENTOS

1. **SEMPRE rode `npm run typecheck && npm run lint && npm test && npm run build`** depois de QUALQUER mudança em `src/`.
2. **NUNCA edite `dist/` à mão.** Ele é gerado. Se o `git diff --exit-code -- dist` reclamar, rode o build.
3. **NUNCA hardcodeie contagem de lane, coluna ou estrutura.** Use `LANES`, `COLS`, `LANE_H`, `COLW` de `src/core/constants.ts`.
4. **Dados de conteúdo e balanceamento só em `src/data/*.json`.** Código não embute número de conteúdo.
5. **Um arquivo por vez.** Não reescreva arquivo inteiro "por garantia" — diff pequeno, review possível.
6. **Commit por mudança.** Não acumule 5 coisas num commit.
7. **NÃO quebre a compatibilidade de saves antigos.** Toda mudança de formato em `src/save/` precisa de migração e de teste.
8. **NÃO mude a direção do texto do jogo** (narrativa, piadas, rádio) sem aprovação do usuário.
9. **NÃO remova funcionalidade.** Só adicione, corrija ou reorganize.
10. **Bug de gameplay vira teste** sempre que couber: dado inválido, contagem errada, economia quebrada.

## 📊 O PADRÃO MORTAL DESTE PROJETO

### "Lane × Contagem"

O jogo tem **6 lanes** (índices 0–5) e **5 colunas**. Já existiram versões com 3 e com 5 lanes.
O mesmo bug apareceu de três formas:

| Disfarce | Código Errado | Código Correto |
|---|---|---|
| Loop de desenho | `for (let l = 0; l < 3; l++)` | `for (let l = 0; l < LANES; l++)` |
| Sorteio de lane | `Math.floor(rnd(0, 3))` | `randLane()` |
| Contagem de estrutura | `loss = 10 - structuresAlive()` | `loss = LANES * 2 - structuresAlive()` |

**Como acontece:** alguém escreve o número que *parecia* certo no momento, e a constante vive longe.

**Como prevenir:**
1. Antes de escrever qualquer contagem, perguntar: "isso é lane, coluna ou estrutura?"
2. Se for lane: `randLane()` ou `LANES`.
3. Se for estrutura: `map.estruturas.length` / `LANES * 2` — nunca o número solto.
4. Depois: `grep -rn "\b3\b\|\b5\b\|\b10\b" src/` e justified cada ocorrência.

### "HP Mágico"

`hp:9999` já foi usado para dizer "esse bicho não morre". Agora **trait** significa isso
(`human`, `neutral`, `unbeatable`). HP é só número de combate.

**Regra:** inimigo comum tem HP entre 10 e 500. Se precisa de mais, é chefe — e chefe
declara `unbeatable` explicitamente.

### "Falta de Fonte de Verdade"

O jogo já foi editado em dois lugares ao mesmo tempo (HTML e `.js`) e os dois divergiram.
Agora existe **um** lugar para cada coisa:

| Tipo de dado | Onde mora |
|---|---|
| Geometria (lanes, colunas, canvas) | `src/core/constants.ts` |
| Conteúdo e balanço (bichos, peças, mapas, falas) | `src/data/*.json` |
| Regras de jogo | `src/game/*.ts` |
| Desenho | `src/render/*.ts` |
| Telas | `src/ui/*.ts` |

Se um número de conteúdo aparece no código, ele está no lugar errado.

## 🗂️ Mapa do repo

```
src/core/     constants, state, events, canvas, rng
src/data/     balance.json, maps.json, types.ts, index.ts
src/game/     game.ts (simulação), waves, economy, progression
src/render/   sprites, creatures, effects
src/ui/       ui.ts (telas em DOM)
src/audio/    audio.ts (música e efeitos sintetizados)
src/save/     storage.ts (localStorage + migração)
src/styles/   main.css (tokens + escala de fonte)
tests/        vitest: dados, geometria, save, economia
tools/        build, smoke test, pacote do itch.io
```

## 🔀 Fluxo de trabalho

- Branch: `feature/*`, `bugfix/*`, `chore/*` a partir de `develop`.
- Commit: Conventional Commits **+ gitmoji** (`✨ feat(lanes): ...`). Use `npm run commit`.
- PR para `develop`. `main` só recebe release.

## 🎨 Estilo do jogo

- Tudo é desenhado por código. **Não** criar assets externos sem aprovação.
- Paleta: alcatrão, ferrugem, osso, verde-de-esgoto, amarelo de farol (`src/styles/main.css`).
- Texto do jogo em **pt-BR**, tom seco e cômico. Códigos e identificadores em inglês.
- Fonte: sem fontes externas. Impact/Arial Black e monospace do sistema.
