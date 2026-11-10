# ADR 001 — Stack: Canvas 2D com TypeScript + Vite

**Status:** aceito
**Data:** 2026-11-10

## Contexto

O MARÉ PODRE tinha ~3.660 linhas de JS, arte 100% procedural (canvas 2D), áudio
100% sintetizado (WebAudio), zero asset externo e um artefato single-file de
271 KB que abria com duplo clique. O repo mantinha duas cópias do HTML, e as
fontes `.js` divergiram 313 linhas do build vivo.

O usuário perguntou se valia a pena migrar para React ou para Godot.

## Decisão

Permanecer em **Canvas 2D** e profissionalizar a **engenharia**:

- Vite + TypeScript + Vitest + ESLint (dev-only, zero dependência de runtime);
- build single-file com `vite-plugin-singlefile` → `dist/index.html`;
- conteúdo e balanço em `src/data/*.json`;
- gitflow completo, commits Conventional Commits + gitmoji, CI no GitHub Actions;
- horizonte de produto: **web / itch.io** (1 arquivo, duplo clique, repo leve).

## Consequências

**Ficou mais fácil:** tipos pegam a classe de bug "lane 3 vs 5" antes do build;
testes de invariantes sobre as tabelas; CI simples; repo leve; distribuição em
1 arquivo; `dist/` verificado contra drift.

**Ficou mais difícil:** não há editor visual, tilemap, partículas prontas nem
export para Steam/mobile — isso sai do escopo; TS adoption é incremental
(dados → core → game → render/ui); houve uma migração única de 8 scripts com
escopo global para módulos ES.

## Alternativas rejeitadas

- **React** — tocaria só a camada de UI (~475 linhas). O ganho já é coberto pelo
  TypeScript; o custo é cadeia de build e risco de reescrever estado a 60 fps.
  Fica de fora até o jogo virar produto web (site, contas, stats).
- **Godot 4** — superior em arte, export e tooling, mas exige reescrever ~3.700
  linhas, portar o áudio procedural e perder o duplo clique e o CI leve. O autor
  já tem 145 mil linhas de GDScript em outros repos: a barreira é **custo**, não
  aprendizado. Reavaliação só com gatilho objetivo (Steam/mobile, >6.000 LOC
  equivalentes, ou arte migrando para assets).
- **PixiJS/Phaser** — exigiria decidir entre sprites e arte procedural, sem
  ganho real sobre o canvas atual para este volume de entidades.
