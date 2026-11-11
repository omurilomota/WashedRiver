import { describe, expect, it } from 'vitest';
import {
  COLS,
  COLW,
  FIELD_BOTTOM,
  FIELD_H,
  FIELD_R,
  H,
  LANES,
  LANE_H,
  LANE_Y0,
  PLANT_DY,
  SLOTS,
  STRUCTURES,
  VX,
  W,
  colX,
  laneY,
  plantY,
  randLane,
} from '../src/core/constants';

describe('geometria do campo', () => {
  it('o campo fecha exatamente na altura do canvas', () => {
    // Se isso quebrar, sobra (ou falta) uma faixa de pixels no rodapé.
    expect(LANE_Y0 + LANES * LANE_H).toBe(H);
    expect(FIELD_BOTTOM).toBe(H);
  });

  it('tem 6 lanes e 7 colunas', () => {
    expect(LANES).toBe(6);
    expect(COLS).toBe(7);
  });

  it('tem 42 slots de plantio', () => {
    expect(SLOTS).toBe(42);
    expect(SLOTS).toBe(LANES * COLS);
  });

  it('tem 12 estruturas defensáveis (duas por lane)', () => {
    expect(STRUCTURES).toBe(12);
    expect(STRUCTURES).toBe(LANES * 2);
  });

  it('o campo cabe dentro da largura do canvas', () => {
    expect(FIELD_R).toBeLessThan(W);
    expect(VX).toBeGreaterThan(0);
    expect(COLW).toBeGreaterThan(0);
  });

  it('a última lane termina dentro do canvas', () => {
    expect(laneY(LANES - 1) + LANE_H).toBe(H);
  });

  it('o slot de plantio fica dentro da própria lane', () => {
    for (let l = 0; l < LANES; l++) {
      const y = plantY(l);
      expect(y).toBeGreaterThan(laneY(l));
      expect(y).toBeLessThan(laneY(l) + LANE_H);
    }
    expect(PLANT_DY).toBeLessThan(LANE_H);
  });

  it('o centro de cada coluna fica dentro do campo', () => {
    for (let c = 0; c < COLS; c++) {
      expect(colX(c)).toBeGreaterThan(VX);
      expect(colX(c)).toBeLessThan(FIELD_R);
    }
  });

  it('o campo tem a altura esperada em pixels', () => {
    expect(FIELD_H).toBe(LANES * LANE_H);
  });
});

describe('sorteio de lane', () => {
  it('nunca devolve lane fora da faixa', () => {
    for (let i = 0; i < 1000; i++) {
      const l = randLane();
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThan(LANES);
      expect(Number.isInteger(l)).toBe(true);
    }
  });
});
