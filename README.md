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
| Botão direito / `Esc` | cancela a seleção |
| `1`–`9` | escolhe engenhoca pelo teclado |
| `P` | pausa |
| `M` | mudo |

**A regra da casa:** todo dano é visível, toda morte tem piada, toda onda deixa
marca permanente na vila.

**Dicas que salvam partida:**
- **Voa** só cai com Holofote ou Ventilador.
- **Cava** (Tatu de Areia) pede Bujão atrás.
- **Invisível** (Fantasma) e **Água-Viva** pedem luz — ou explosão.
- **Peixe-Lata** devolve a torrada: use corpo a corpo ou Estilingue.
- **Baleia-Filhote** e **O Pescador** não são para matar. Desvie, hipnotize, redirecione.

## 🗺️ Mapas

1. **Barra Suja** — o lar do Zé e de mais ninguém
2. **Farol do Fim** — onde a luz é defesa e é isca
3. **Estação Afogada** — o trilho que ninguém desliga
4. **Feira do Peixe** — defenda o que ainda dá pra comer
5. **Fábrica Podre** — a origem tem expediente até domingo
6. **Cemitério de Barcos** — o fim da costa e o começo do mar

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
