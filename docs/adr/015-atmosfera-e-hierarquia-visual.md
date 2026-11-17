# ADR 015 — Atmosfera, planos e hierarquia visual

**Status:** aceito
**Data:** 2026-11-17

## Contexto

O campo já era legível: lanes, peças, bichos e avisos têm silhueta própria. Mas
a cena ainda lia como uma **colagem** — cada sprite era bom sozinho, e o
conjunto não tinha luz, distância ou foco. O clima existia em funções
espalhadas (`drawWeather`, `drawMicros`, fundos por mapa), o HUD competia com o
campo e a leitura de custo/cooldown dependia de olhar cada carta.

A auditoria também encontrou uma sombra duplicada nos bichos: `shadowEllipse`
e uma elipse manual pintavam o mesmo contato, escurecendo o chão duas vezes.

## Decisão

- Criar `src/render/atmosphere.ts` como **camada única** de atmosfera, chamada
  depois do clima e antes dos avisos de jogo.
- Fixar uma **luz global** topo-esquerda (`LIGHT`) e uma tabela de
  intensidades (`ATMOSFERA`). O desenho usa essas referências em vez de
  valores soltos por sprite.
- Trabalhar com **três planos**: fundo cacheado, campo jogável e primeiro plano
  (estacas escuras nas bordas). O primeiro plano emoldura; não cobre o corredor.
- Usar a **paleta e o clima do mapa** para a atmosfera: névoa em
  Farol/tempestade/vendaval, poeira na Feira, cinza na Fábrica, feixes no
  Farol e marcas próprias em Barra/Estação/Cemitério.
- **Foco**: vinheta lateral/radial curta, base escurecida e um sheen
  direcional. Nada de filtro global que apague hitbox ou HUD.
- Melhorar a hierarquia do HUD em canvas: faixa de topo, borda do painel,
  halo de seleção, custo verde/vermelho, atalho com contraste e tooltip com
  custo/vida/recarga/sinergia.
- No CSS, separar planos com moldura do palco, grão leve e vinheta; topbar
  com profundidade e cartões de mapa com camada de arte.
- Remover a sombra duplicada dos bichos.

## Consequências

**Ficou mais fácil:** o campo lê como um lugar; cada mapa tem assinatura
visual; o HUD tem hierarquia; a atmosfera é uma função pura e testável.

**Ficou mais difícil:** há um passe de desenho a mais; qualquer efeito novo
precisa respeitar os limites de `ATMOSFERA` para não virar cortina.

**Verificação:** `tests/visual.test.ts` assina as operações de
`drawAtmosphere` nos 6 mapas, exige desenho em todos, assinatura diferente por
mapa e intensidades abaixo do limite de legibilidade. `tests/machines.test.ts`
continua exigindo volume/rim light proporcionais ao corpo. `tests/render.test.ts`
continua exigindo terreno e silhuetas.

## Alternativas rejeitadas

- **Filtro global de CSS no canvas** — escurece HUD, menus e hitboxes; não
  distingue planos e não é testável por comportamento.
- **Um filtro hardcoded por mapa em `scene.ts`** — duplicaria o clima que já
  existe e criaria valores soltos.
- **Mais partículas em todos os mapas** — polui a leitura e não resolve a
  ausência de profundidade.
- **Pintar a sombra de contato antes do corpo** — foi o bug original: a sombra
  desaparece atrás do sprite. O volume de barriga continua **depois** do corpo.
