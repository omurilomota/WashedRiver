# 🌊 MARÉ PODRE

> Tower defense de sucata numa costa que devolve tudo que a vila jogou nela.

**Jogue no navegador:** [itch.io](https://omurilomota.itch.io/mare-podre) ·
**Pages:** [github.com/omurilomota/WashedRiver](https://github.com/omurilomota/WashedRiver)

MARÉ PODRE é um tower defense onde a moeda é sucata, os inimigos são o que a maré
devolveu e cada morte tem uma piada. Seis mapas, seis chefes, vinte criaturas,
dezoito engenhocas e três finais — nenhum deles é limpo.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/index.html — UM arquivo, abre com duplo clique
```

---

## 🎮 Como jogar

| Controle | Ação |
|---|---|
| Clique numa carta e depois numa vaga | planta a engenhoca |
| `Shift` + clique | planta várias com a mesma carta |
| Botão direito | cancela a seleção |
| `Esc` / `P` | pausa e despausa |
| Passar o mouse na sucata | cata (clique também vale) |
| Passar o mouse numa carta | mostra a ficha da peça |
| `1`–`9` | escolhe engenhoca pelo teclado |
| `M` | mudo |

O jogo salva sozinho ao entrar no break, ao pausar e ao sair. A Dona Lú cobra
imposto no fim de cada onda — quanto mais peça na rua, maior a conta.

**A regra da casa:** todo dano é visível, toda morte tem piada, toda onda deixa
marca permanente na vila.

**Dicas que salvam partida:**
- **Voa** cai com Holofote, Ventilador, Canhão de Lata, Estilingue ou Bujão.
- **Cava** (Tatu de Areia) pede Bujão atrás.
- **Invisível** (Fantasma) e **Água-Viva** pedem luz — ou explosão.
- **Peixe-Lata** devolve três torradas; a quarta entra. Corpo a corpo resolve.
- **Baleia-Filhote** se espanta com Ventilador. **O Pescador** se redireciona com Rádio.

## 🗺️ Mapas

1. **Barra Suja** — o lar do Zé e de mais ninguém
2. **Farol do Fim** — onde a luz é defesa e é isca
3. **Estação Afogada** — o trilho que ninguém desliga
4. **Feira do Peixe** — defenda o que ainda dá pra comer
5. **Fábrica Podre** — a origem tem expediente até domingo
6. **Cemitério de Barcos** — o fim da costa e o começo do mar

## ☁️ Deploy na Vercel

O jogo é estático: o build gera `dist/index.html` e a Vercel só precisa servir
`dist/`. O [`vercel.json`](vercel.json) já traz o build e o rewrite de SPA.

```bash
npm i -g vercel   # ou npx vercel
vercel login      # login na SUA conta
vercel            # preview
vercel --prod     # produção
```

O deploy **não é automático** e exige a conta Vercel do dono do projeto —
nenhum agente deve publicar sem autorização. Se preferir, importe o repositório
em [vercel.com/new](https://vercel.com/new): framework **Vite**, build
`npm run build`, output `dist`.

## 🏗️ Arquitetura

Canvas 2D puro, sem dependência de runtime. TypeScript + Vite só no build.

```
src/core/     constants (geometria), state, events, canvas, rng
src/data/     balance.json + maps.json (todo o conteúdo e balanço)
src/game/     simulação: ondas, bichos, peças, economia, progressão
src/render/   desenho em canvas: cenário, lanes, estruturas, criaturas, efeitos
src/ui/       telas em DOM: título, mapas, bestiário, árvore, loja, fim
src/audio/    música e efeitos sintetizados em WebAudio
src/save/     localStorage com migração de versão
tests/        vitest: dados, geometria, save, economia
```

O `dist/index.html` é **gerado** — nunca editado à mão. A CI falha se ele divergir.

Mais detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e
[`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).

## 🧭 Decisões do projeto

Toda decisão de stack, gameplay e repo fica registrada em
[`docs/DECISIONS.md`](docs/DECISIONS.md) (ADRs) — e espelhada na memória do
projeto, para sobreviver entre sessões e entre agentes.

Resumo: **Canvas 2D + TypeScript + Vite** (React e Godot foram avaliados e
rejeitados por enquanto — o raciocínio está no ADR 001).

## 🤝 Contribuir

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md): fluxo gitflow, commits
Conventional Commits + gitmoji, checklist de PR e processo de release.
Para IAs e gente que mexe no código: [`AGENTS.md`](AGENTS.md).

## 📄 Licença

MIT — ver [LICENSE](LICENSE).
