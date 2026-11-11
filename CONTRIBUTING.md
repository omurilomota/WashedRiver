# Como contribuir no MARÉ PODRE

Obrigado por querer mexer na maré. Aqui está o processo inteiro, sem mistério.

## 1. Rodar o jogo

```bash
npm install
npm run dev          # abre em http://localhost:5173
npm run build        # gera dist/index.html (um arquivo só)
```

`dist/index.html` abre com duplo clique, offline. É esse arquivo que vai para o itch.io.

## 2. Fluxo de branches (gitflow)

```
main ────●────────────────────────●─────────  produção (tags vX.Y.Z)
        \                /         \
develop   ●────●───●───●─────────────●────────  integração
            \    \   /
             feature/*  bugfix/*  chore/*
```

| Branch | Nasce de | Vai para | Quando usar |
|---|---|---|---|
| `develop` | `main` | — | branch de integração, sempre deployável |
| `feature/<slug>` | `develop` | `develop` | feature nova (ex.: `feature/art-lanes`) |
| `bugfix/<slug>` | `develop` | `develop` | correção |
| `chore/<slug>` | `develop` | `develop` | tooling, docs, repo |
| `release/<semver>` | `develop` | `main` | recorte de release |
| `hotfix/<slug>` | `main` | `main` + `develop` | correção crítica em produção |

Nomes de branch em minúsculas, com hífen: `feature/arte-das-lanes-4-6`.

## 3. Commits: Conventional Commits + gitmoji

```
✨ feat(lanes): 6 lanes com geometria 1280x846

O campo tinha 5 lanes sem arte própria e contagens
divergentes no código. Agora tudo deriva de LANES.

Refs: #42
```

**Tipo** (obrigatório, inglês) · **escopo** (módulo) · **descrição** (imperativo, minúscula, sem ponto final).

| Tipo | Gitmoji | Uso |
|---|---|---|
| `feat` | ✨ | mecânica, arte, tela, conteúdo |
| `fix` | 🐛 | correção de bug |
| `refactor` | ♻️ | reorganização sem mudança de comportamento |
| `perf` | ⚡️ | performance |
| `style` | 🎨 | tipografia e aparência |
| `docs` | 📝 | documentação |
| `test` | 🧪 | testes |
| `build` | 📦 | build, dependências, empacotamento |
| `ci` | 🤖 | GitHub Actions |
| `chore` | 🧹 | manutenção |
| `revert` | ⏪️ | reversão |

Escopos permitidos: `lanes`, `sprites`, `creatures`, `content`, `game`, `ui`, `audio`, `save`, `balance`, `enemies`, `src`, `build`, `deps`, `repo`, `release`, `github`, `docs`, `ci`, `readme`, `contributing`.

**Escopos extras são bloqueados.** Se o seu não existe, é sinal de que falta um módulo
— ou de que o escopo certo já existe.

O commit é feito com prompt guiado:

```bash
npm run commit
```

E passa por `commitlint` no hook `commit-msg` e na CI. Commit fora do padrão **não passa**.

## 4. Antes de abrir o PR

```bash
npm run check
```

Isso roda typecheck, lint, testes, build e verifica se `dist/` está em dia.

Checklist do PR:

- [ ] `npm run check` verde
- [ ] `dist/index.html` commitado junto (build rodado)
- [ ] mudei **um** assunto por PR
- [ ] balanceamento novo tem teste em `tests/`
- [ ] números de lane/estrutura vieram de constantes, não literais
- [ ] se mexi em texto do jogo, conferi a voz (Zé, Dona Lú, Toquinho, Voz do Rádio)
- [ ] se mexi em save, há migração e teste de save

## 5. Revisão

- PR precisa de **CI verde** para entrar em `develop`.
- `main` só muda por `release/*` (ou `hotfix/*`).
- Discussão no PR, não no DM. Comentário de revisão pede mudança concreta.

**Sobre aprovação:** a branch não exige aprovação de terceiro. O GitHub
**proíbe auto-aprovar o próprio PR** (`Can not approve your own pull
request`), então exigir 1 aprovação trancaria o repo num projeto solo.
Quem tiver Time, revise normalmente — mas o merge não depende disso.

## 6. Release

```bash
git checkout develop && git pull
git checkout -b release/0.4.0
# ajusta a versão, CHANGELOG e o ícone
npm run build && npm run package:itch
git commit -m "🔖 chore(release): 0.4.0"
git push origin release/0.4.0
```

Depois: PR `release/0.4.0` → `main`, merge, tag `v0.4.0`. A CI gera o
`CHANGELOG.md`, anexa o zip do itch.io na release e publica o GitHub Pages.

## 7. Bugs e features

- Bug: issue com passos pra reproduzir, mapa e lane.
- Feature: issue descrevendo a **intenção** de jogo, não a implementação.
- "Quero mais espaço vertical", "quero letra maior" e "quero sucata que tenha destino"
  são decisões de design: **perguntar antes de implementar**.
