<!-- PR do MARÉ PODRE. Preenche o que for relevante e deleta o resto. -->

## O que muda

<!-- Uma ou duas frases. O "porquê" vem antes do "como". -->

## Tipo

- [ ] Correção de bug
- [ ] Feature / conteúdo novo
- [ ] Refactor (sem mudar comportamento)
- [ ] Docs / tooling / repo

## Checklist

- [ ] `npm run check` verde (typecheck, lint, testes, build e `dist/` em dia)
- [ ] `dist/index.html` commitado junto, gerado pelo build
- [ ] Um assunto por PR
- [ ] Números de lane/coluna/estrutura vieram de constantes (`LANES`, `COLS`, `LANE_H`), não de literais
- [ ] Conteúdo e balanceamento novos estão em `src/data/*.json`, não no código
- [ ] Mudança de gameplay tem teste em `tests/`
- [ ] Se mexeu em save, há migração de versão e teste de save
- [ ] Se mexeu em texto do jogo, a voz continua seca e cômica (Zé, Dona Lú, Toquinho, Voz do Rádio)
- [ ] Sem assets externos novos sem aprovação

## Mudança de design?

<!-- Se a resposta for sim, cite a ADR correspondente ou abra issue antes. -->

- [ ] Não muda regras de jogo
- [ ] Muda regras de jogo → issue/ADR anexada: <!-- #... -->

## Como testar

<!-- Passos para o revisor reproduzir. -->
