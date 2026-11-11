# ADR 002 — Fonte de verdade: dados em JSON, HTML como artefato gerado

**Status:** aceito
**Data:** 2026-11-10

## Contexto

O HTML single-file e os `*.js` modulares eram duas fontes concorrentes. O HTML
evoluiu 313 linhas à frente (5 lanes, 1280x720, DPR, `lancador_lata`, helpers de
FX) e os commits recentes mexeram só no HTML — sem script de build, qualquer
mudança feita no lugar errado simplesmente sumia.

## Decisão

- Todo conteúdo e balanceamento textual/numérico vive em
  `src/data/balance.json` e `src/data/maps.json`, com `src/data/types.ts`
  espelhando o schema.
- O código é TypeScript em módulos ES, sem estado global espalhado.
- `dist/index.html` é **gerado** por Vite + `vite-plugin-singlefile` e nunca
  editado à mão. A CI falha se `git diff --exit-code -- dist` acusar diferença.
- O JSON é portável de propósito: serve para `.tres` no Godot caso a engine mude.

## Consequências

**Ficou mais fácil:** ajuste de balanço sem tocar em lógica; testes de
invariantes sobre os dados; HTML único no repo; drift estruturalmente impossível.

**Ficou mais difícil:** o jogo não roda sem build a partir das fontes (mitigado
pelo `dist/` commitado); houve uma migração única de scripts globais para
módulos ES.

## Alternativas rejeitadas

- **Script de build caseiro (`tools/build.mjs`)** — concat simples, mas
  duplica o que o Vite já faz (HMR, sourcemap, CSS, assets) e cria manutenção
  própria. Escolhido Vite por consistência com o resto dos repos do autor.
- **Manter HTML e fontes em paralelo** — exatamente o problema que motivou a
  mudança.
