// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { MAPS } from '../src/data';

/**
 * A camada de atmosfera é testada por comportamento de desenho, não por
 * screenshot: todos os mapas precisam pintar haze/primeiro plano/foco, e a
 * assinatura precisa variar com a paleta/clima. Também travamos os limites
 * de intensidade para a camada nunca virar cortina sobre o campo.
 */
const alvo: Record<string, unknown> = { canvas: { width: 1280, height: 846 } };
const especiais: Record<string, unknown> = {};
let ops: string[] = [];
const grad = { addColorStop: (c: string) => void ops.push(`gradiente(${c})`) };

function instalar(): void {
  especiais.createLinearGradient = (...a: number[]) => {
    ops.push(`linear(${a.join()})`);
    return grad;
  };
  especiais.createRadialGradient = (...a: number[]) => {
    ops.push(`radial(${a.join()})`);
    return grad;
  };
  especiais.measureText = (t: string) => ({ width: t.length * 6 });
}

const ctx = new Proxy(alvo, {
  get: (target, prop: string) => {
    if (prop in target) return target[prop];
    if (prop in especiais) return especiais[prop];
    return (...args: unknown[]) => {
      ops.push(`${prop}(${args.map(String).join()})`);
    };
  },
  set: (target, prop, value) => {
    (target as Record<string, unknown>)[String(prop)] = value;
    return true;
  },
});

let atmosfera: typeof import('../src/render/atmosphere');

beforeAll(async () => {
  document.body.innerHTML = '<canvas id="cv"></canvas>';
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  instalar();
  atmosfera = await import('../src/render/atmosphere');
});

function assina(map: (typeof MAPS)[number]): string {
  ops = [];
  atmosfera.drawAtmosphere(map, 3.25);
  return ops.join('|');
}

describe('atmosfera visual', () => {
  it('todo mapa desenha uma camada de atmosfera', () => {
    for (const map of MAPS) {
      expect(assina(map).length, `${map.id} sem atmosfera`).toBeGreaterThan(40);
    }
  });

  it('a atmosfera muda de mapa para mapa (paleta/clima, não filtro único)', () => {
    const assinaturas = MAPS.map(assina);
    expect(new Set(assinaturas).size).toBe(MAPS.length);
  });

  it('a luz e a intensidade continuam legíveis', () => {
    expect(atmosfera.LIGHT.x).toBeLessThan(0);
    expect(atmosfera.LIGHT.y).toBeLessThan(0);
    expect(atmosfera.ATMOSFERA.primeiroPlano).toBeLessThan(0.7);
    expect(atmosfera.ATMOSFERA.foco).toBeLessThan(0.5);
  });
});
