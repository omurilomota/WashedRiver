import { describe, expect, it } from 'vitest';
import { CRONICAS, MAPS } from '../src/data';

describe('Crônicas da Costa', () => {
  it('tem uma página por mapa', () => {
    expect(CRONICAS.length).toBe(MAPS.length);
    expect(new Set(CRONICAS.map((c) => c.map)).size).toBe(MAPS.length);
  });

  it('cada página aponta um mapa válido, tem título e texto', () => {
    for (const c of CRONICAS) {
      expect(c.map, `${c.titulo}: mapa inválido`).toBeGreaterThanOrEqual(0);
      expect(c.map).toBeLessThan(MAPS.length);
      expect(c.titulo.trim().length, 'título vazio').toBeGreaterThan(0);
      expect(c.txt.trim().length, `${c.titulo}: texto vazio`).toBeGreaterThan(40);
    }
  });
});
