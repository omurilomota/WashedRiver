/**
 * constants.ts — a geometria do campo.
 *
 * FONTE DE VERDADE de lanes, colunas e posições. Nenhum número de lane,
 * coluna ou estrutura vive em outro arquivo (mandato 3 do AGENTS.md).
 *
 * O histórico deste projeto tem três bugs do mesmo tipo: `for (l < 3)`,
 * `Math.floor(rng() * 5)` e `loss = 10 - structuresAlive()`. Todos existiram
 * porque o número estava longe da constante. Aqui ele não está.
 */

/** Largura lógica do canvas. */
export const W = 1280;

/** Altura lógica do canvas. */
export const H = 846;

/** Número de lanes (índices 0–5). */
export const LANES = 6;

/**
 * Número de colunas de plantio por lane.
 *
 * Sete colunas (42 slots) cabem em `W` com o `COLW` atual: 170 + 7 × 152 =
 * 1234, sobrando 46 px de mar à direita. Com cinco colunas o campo acabava
 * antes do inimigo entrar e sobrava espaço de plantio para menos cartas do
 * que o jogo dá.
 */
export const COLS = 7;

/** Largura de uma coluna, em pixels. */
export const COLW = 152;

/** Y do topo da primeira lane. */
export const LANE_Y0 = 90;

/** Altura de uma lane, em pixels. */
export const LANE_H = 126;

/** Largura da vila, à esquerda do campo. */
export const VX = 170;

/** X da borda direita do campo (VX + COLS * COLW). */
export const FIELD_R = VX + COLS * COLW;

/** X onde os inimigos entram. */
export const SPAWN_X = W + 40;

/** Altura total do campo (LANES * LANE_H). */
export const FIELD_H = LANES * LANE_H;

/** Y da borda inferior do campo. Deve ser igual a H. */
export const FIELD_BOTTOM = LANE_Y0 + FIELD_H;

/** Deslocamento do slot de plantio dentro da lane. */
export const PLANT_DY = 100;

/** Total de slots de plantio (lanes × colunas). */
export const SLOTS = LANES * COLS;

/** Total de estruturas defensáveis (duas por lane). */
export const STRUCTURES = LANES * 2;

/** Y do topo de uma lane. */
export function laneY(lane: number): number {
  return LANE_Y0 + lane * LANE_H;
}

/** Y do slot de plantio de uma lane. */
export function plantY(lane: number): number {
  return laneY(lane) + PLANT_DY;
}

/**
 * Posição dos vizinhos das lanes de baixo (3, 4 e 5).
 *
 * Eles são clicáveis e falam (mandato: morador é gente, responde ao clique).
 * Fica aqui porque `game.ts` (clique) e `render/sprites.ts` (desenho) precisam
 * do mesmo número — mesmo padrão de `plantY`/`colX`.
 */
export function vizinhoX(lane: number): number {
  return 34 + (lane - 3) * 46;
}

/** Y do vizinho da lane (pé do sprite). */
export function vizinhoY(lane: number): number {
  return plantY(lane) - 18;
}

/** X do centro de uma coluna. */
export function colX(col: number): number {
  return VX + col * COLW + COLW / 2;
}

/** Sorteia uma lane válida. Nunca devolve número solto. */
export function randLane(): number {
  return Math.floor(Math.random() * LANES);
}

/** Sorteia uma coluna válida. */
export function randCol(): number {
  return Math.floor(Math.random() * COLS);
}

// ---------- helpers numéricos ----------
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number): boolean => Math.random() < p;

/** Embaralha sem tocar no array original. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Formata número grande de forma compacta: 1200 → "1,2k". */
export function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(n));
}
