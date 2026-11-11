# ADR 006 — Repo profissional: gitflow completo + gitmoji + tooling mínima

**Status:** aceito
**Data:** 2026-11-10

## Contexto

O repo tinha 3 commits sem padrão, branch única `main`, sem LICENSE, sem CI,
sem `package.json`, duas cópias do mesmo HTML e divergência entre fontes e
build. O autor já usa esse padrão em outro projeto (`Wasteland-Canvas`), então
a decisão é alinhar os dois.

## Decisão

- **Fluxo:** `main` (produção, releases) ← `develop` ← `feature/*`, `bugfix/*`,
  `chore/*`; `release/<semver>`; `hotfix/*`. PR obrigatório, CI verde, `main` e
  `develop` protegidas.
- **Commits:** Conventional Commits **+ gitmoji**, enforced por `commitlint`
  (hook `commit-msg` + CI), gerados por `cz-git`. Escopos por módulo.
- **Tooling** (dev-only): Vite, TypeScript, Vitest, ESLint, Husky, commitlint,
  cz-git, vite-plugin-singlefile, release-please.
- **Artefato:** `dist/index.html` commitado, verificado na CI com
  `git diff --exit-code -- dist/`; `npm run package:itch` gera o zip do itch.io.
- **Docs:** `AGENTS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `docs/GAME_DESIGN.md`, `docs/adr/*`, `CHANGELOG.md` gerado.
- **Higiene:** MIT, `.editorconfig`, `.gitattributes`, `.gitignore` completo,
  GitHub Topics + Pages.

## Consequências

**Ficou mais fácil:** histórico legível, commit fora do padrão barrado
automaticamente, build sempre em dia, instalação documentada, release com
changelog e artefato.

**Ficou mais difícil:** gitflow exige disciplina de branch e PR (mais atrito
para projeto solo — aceito conscientemente); `dist/` versionado é um artefato
gerado dentro do repo.

**Correção na aplicação:** a política inicialmente exigia "1 aprovação" em
cada PR. O GitHub **proíbe auto-aprovação** (`Can not approve your own pull
request`), o que trancaria o repo num projeto de uma pessoa só. A exigência
foi reduzida a **0 aprovações**: a barreira real é a CI verde + PR aberto. A
regra continua valendo como norma de time (`CONTRIBUTING.md`), não como
lock automático.

## Alternativas rejeitadas

- **Gitflow simplificado (sem `develop`)** — menos atrito, mas perde o estágio
  de integração que o projeto precisa enquanto o `dist/` é commitado.
- **Só documentação, sem tooling** — commit errado continuaria passando.
- **Release-please desativado** — CHANGELOG e versão na mão divergem do código
  com o tempo.
