# Decisões do projeto (ADRs)

Cada decisão que muda o rumo do MARÉ PODRE vira um registro aqui. O formato é
ADR clássico: contexto, decisão, consequências — **e o que foi rejeitado e por quê**,
para ninguém re-propor a mesma coisa no próximo mês.

Os mesmos registros ficam espelhados na memória do projeto (ai-memory), em
`decisions/`, para sobreviver entre sessões e entre agentes.

| ADR | Status | Assunto |
|---|---|---|
| [001](adr/001-stack-canvas-typescript-vite.md) | aceito | Stack: Canvas 2D + TypeScript + Vite (React e Godot rejeitados) |
| [002](adr/002-fonte-de-verdade-dados-json.md) | aceito | Dados em JSON, HTML como artefato gerado |
| [003](adr/003-lanes-6-canvas-1280x846.md) | aceito | 6 lanes em canvas 1280x846 |
| [004](adr/004-inimigos-sem-hp-9999.md) | aceito | Fim do hack `hp:9999`; traits definem "não mate" |
| [005](adr/005-economia-sucata.md) | aceito | Entrada controlada, sumidouros reais, alvo 100–700 |
| [006](adr/006-repo-gitflow-gitmoji.md) | aceito | Gitflow completo + gitmoji + tooling mínima + CI |
| [007](adr/007-regras-de-gameplay.md) | aceito | Pool do mapa nas ondas, derrota só com as 12, mods que cumprem |
| [008](adr/008-combate-justo-e-qualidade-de-vida.md) | aceito | Contramedida para voador e baleia, lata devolve 3, Faroleiro no campo, imposto, hover/ESC/autosave |
| [009](adr/009-sete-colunas-e-pedagio-do-pescador.md) | aceito | 7 colunas por lane (42 slots) e Pescador cobra pedágio em vez de derrubar estrutura |
| [010](adr/010-hud-cards-quebra-de-linha.md) | aceito | Barra de cartas do HUD quebra em duas linhas (regra depois inalcançável) |
| [011](adr/011-lanes-de-baixo-piso-unico.md) | aceito | Lanes de baixo (3–5) com um piso único por mapa |
| [012](adr/012-barra-de-cartas-linha-unica.md) | aceito | Barra de cartas do HUD em linha única (substitui a quebra da 010) |
| [013](adr/013-variacao-de-arranjo-no-piso-unificado.md) | aceito | Variação de arranjo (offset e tom) dentro do piso único |
| [014](adr/014-campo-unificado-terreno-por-mapa.md) | aceito | Campo unificado: um terreno por mapa, nas 6 lanes (substitui o recorte da 011) |

## Como registrar uma decisão nova

1. Copie o modelo de `adr/001-*.md` para `adr/NNN-slug.md`.
2. Preencha **Contexto**, **Decisão**, **Consequências** e a seção
   **Alternativas rejeitadas** (obrigatória: sem ela, a IA re-propõe).
3. Marque `Status: aceito | proposto | substituído por [ADR-NNN]`.
4. Adicione a linha na tabela acima.
5. Espelhe no ai-memory (`decisions/<slug>.md`, `pinned: true`).

Regra: **decisão substituída não é editada.** Escreve-se uma ADR nova e a antiga
apenas muda o status para `substituído por [ADR-NNN]`.
