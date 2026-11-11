# Arquitetura

> Referência técnica do MARÉ PODRE. O *porquê* das decisões está em
> [`DECISIONS.md`](DECISIONS.md) (ADRs).

## Visão geral

```
                         ┌──────────────┐
   navegador  ─────────▶ │  src/main.ts │  bootstrap
                         └──────┬───────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  ┌───────────┐         ┌───────────┐           ┌───────────┐
  │ src/core/ │◀────────│ src/game/ │──────────▶│ src/render│
  │ estado,   │         │ simulação │           │ desenho   │
  │ eventos,  │         │ ondas,    │           │ canvas    │
  │ geometria │         │ economia  │           │           │
  └─────┬─────┘         └─────┬─────┘           └───────────┘
        │                     │
        │    ┌────────────────┴───────────────┐
        │    ▼                ▼               ▼
        │ ┌────────┐   ┌──────────┐   ┌──────────┐
        │ │src/data│   │ src/audio│   │ src/save │
        │ │ *.json │   │ WebAudio │   │ localStorage
        │ └────────┘   └──────────┘   └──────────┘
        │
        ▼
  ┌───────────┐
  │  src/ui/  │  telas em DOM (observam o estado, emitem ações)
  └───────────┘
```

**Regra de dependência:** as setas só apontam para baixo/para dentro. `src/ui/`
observa o estado e **emite** ações; `src/game/` **não** importa `src/ui/`.
`src/render/` desenha, não decide. Se uma regra de jogo precisa de UI, ela
emite um evento.

## Camadas

| Diretório | Responsabilidade | Não pode |
|---|---|---|
| `src/core/` | geometria, estado global, RNG, eventos, canvas | conhecer conteúdo do jogo |
| `src/data/` | tabelas de conteúdo e balanço (`*.json` + `types.ts`) | ter lógica |
| `src/game/` | simulação: ondas, inimigos, peças, projéteis, economia, progressão | desenhar ou tocar DOM |
| `src/render/` | desenho em canvas: cenário, lanes, estruturas, criaturas, efeitos, HUD | alterar regra |
| `src/ui/` | telas em DOM: título, mapas, slots, opções, bestiário, árvore, loja, pausa, fim, epílogo | decidir gameplay |
| `src/audio/` | música, ambiência e efeitos sintetizados em WebAudio | tocar DOM |
| `src/save/` | persistência em localStorage + migração de versão | ler `src/data/` sem passar por `src/data/index.ts` |
| `src/styles/` | tokens de CSS e escala de fonte | conter valor de conteúdo |

## Fonte de verdade

| Tipo de dado | Onde mora | Por quê |
|---|---|---|
| Geometria (lanes, colunas, canvas) | `src/core/constants.ts` | muda junto com a implementação |
| Conteúdo e balanço (bichos, peças, mapas, falas) | `src/data/*.json` | ajustável sem tocar em lógica, testável |
| Regras de jogo | `src/game/*.ts` | só código faz regra |
| Desenho | `src/render/*.ts` | só código faz pixel |
| Telas | `src/ui/*.ts` | — |

O JSON é deliberadamente portável: serve para `.tres` no Godot caso a engine
mude (ver ADR 001).

### Geometria

```ts
export const W = 1280;
export const H = 846;
export const LANES = 6;        // índices 0–5
export const COLS = 5;
export const COLW = 152;
export const LANE_Y0 = 90;
export const LANE_H = 126;
// LANE_Y0 + LANES * LANE_H === H  → teste em tests/geometry.test.ts
```

Toda contagem de lane, coluna ou estrutura sai daqui. Literal `3`, `5`, `6` ou
`10` em `src/` é bug — foi assim que o jogo já perdeu partida.

## Estado

Um objeto único de partida (`G`) em `src/core/state.ts`:

```ts
interface GameState {
  machines: Machine[];   // engenhocas plantadas
  enemies: Enemy[];      // criaturas e chefes vivos
  projs: Projectile[];   // projéteis em voo
  pickups: Pickup[];     // sucata no chão
  parts: Particle[];     // partículas
  decals: Decal[];       // manchas permanentes
  texts: FloatingText[]; // números de dano / avisos
  hazards: Hazard[];     // fogo, fumaça, água
  structures: Structure[];// o que a maré tenta derrubar
  waves: Wave[];
  phases: Phase[];       // fases do chefe
}
```

O loop é `requestAnimationFrame` com `update(dt)` e `draw()` sobre o `ctx` 2D.
A escala de resolução usa `devicePixelRatio` fixo em 2, para o canvas ficar
nítido em monitor de alta densidade sem custar performance em tela comum.

### Eventos

`src/core/events.ts` é um emissor mínimo (`on` / `emit`). A UI e o áudio
escutam; o jogo emite. Isso mantém `src/game/` independente do DOM.

## Dados

`src/data/balance.json` — engenhocas, criaturas, chefes, sinergias, árvore,
conquistas, economia, modificadores diários.
`src/data/maps.json` — os seis mapas, com paleta, clima, estruturas e falas.
`src/data/types.ts` — o schema, espelhado em TypeScript.
`src/data/index.ts` — exports tipados e validação de invariantes no boot.

Invariantes verificadas por `tests/data.test.ts`:

- HP de inimigo comum entre 10 e 500;
- chefe final declara `unbeatable: true`;
- toda criatura referenciada por um pool de mapa existe;
- todo chefe tem mapa correspondente;
- nenhuma synergy aponta para peça inexistente.

## Áudio

`src/audio/audio.ts` expõe `Snd` (música/ambiente) e `SFX` (efeitos). Tudo é
sintetizado em WebAudio — nenhum arquivo de áudio no repo. O contexto de
áudio só é criado após gesto do usuário (regra dos navegadores).

## Save

`src/save/storage.ts` — `localStorage`, chave `marepodre_save_v3` → `v4`.
Toda mudança de formato passa por migração e vem com teste (mandato 7 do
`AGENTS.md`).

Formato resumido:

```ts
interface SaveFile {
  version: number;
  slots: SaveSlot[];      // 3 slots de campanha
  unlocked: string[];     // engenhocas desbloqueadas
  tree: Record<string, number>; // nós da árvore e níveis comprados
  scrap: number;          // sucata velha (meta)
  achievements: string[];
  settings: { fs: number; muted: boolean; };
}
```

## Build

```
src/ ──vite build──▶ dist/index.html (arquivo único, ~270 KB)
                     └── vite-plugin-singlefile: JS + CSS inline
                     └── base: './'  → funciona em subpasta e file://
```

`dist/index.html` é **gerado**. A CI roda o build e falha se
`git diff --exit-code -- dist` acusar diferença.

## Testes

| Arquivo | Cobre |
|---|---|
| `tests/data.test.ts` | invariantes das tabelas (HP, referências, boss map) |
| `tests/geometry.test.ts` | `LANE_Y0 + LANES * LANE_H === H`, slots, colunas |
| `tests/save.test.ts` | migração de versão, round-trip, dado corrompido |
| `tests/economy.test.ts` | custos, sumidouros, saldo final na faixa-alvo |

Vitest, ambiente `node`, sem DOM — por isso o código de gameplay é testável
sem navegador. O que precisa de DOM (screens DOM) fica fora do caminho
crítico.

## Ferramentas

| Comando | O que faz |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | build single-file |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run check` | typecheck + lint + test + build + `dist/` em dia |
| `npm run package:itch` | zip do `dist/` em `release/` |
| `npm run commit` | `cz-git` (Conventional + gitmoji) |
| `node tools/make-icon.mjs` | gera `public/icon.png` proceduralmente |
| `node tools/smoke.mjs` | confere o artefato single-file |

## Gotchas conhecidos

1. **`file://` e módulos ES** — o build inlines tudo; abrir `src/` direto não
   funciona. Só `dist/index.html`.
2. **`localStorage` em `file://`** — funciona no Chrome/Firefox, mas some em
   navegação privada. O jogo trata save ausente como "primeira visita".
3. **Áudio bloqueado** — WebAudio só inicia após clique. O menu principal é
   o ponto de entrada.
4. **`?` na URL** — o bundle usa `base: './'`; abrir via `file://` quebra
   qualquer import dinâmico. Por isso `inlineDynamicImports: true`.
5. **DPR fixo em 2** — em telas 4K o canvas é grande, mas o conteúdo é
   desenhado em 1280×846 lógicos e escalado. É o custo de manter o layout
   idêntico em qualquer máquina.
