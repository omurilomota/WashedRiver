/**
 * rng.ts — aleatoriedade determinística.
 *
 * O desafio diário precisa ser o mesmo para todo mundo no mesmo dia, e
 * precisa funcionar offline. Por isso não usa Math.random: usa uma
 * semente derivada da data local.
 */

/** Chave do dia local (usa o relógio do sistema: o diário funciona offline). */
export function dayKey(d?: Date): string {
  const date = d || new Date();
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

/** Hash FNV-1a de string → inteiro de 32 bits. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG mulberry32: rápido, determinístico, bom o bastante para ondas. */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
