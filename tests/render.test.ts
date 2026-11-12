// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { MAPS } from '../src/data';
import { LANES } from '../src/core/constants';

/**
 * Cenário do campo.
 *
 * Estes testes não olham pixel: olham **comportamento de desenho**. O bug
 * que eles pegam é o que a auditoria achou nas lanes de baixo — as lanes
 * 3, 4 e 5 acabaram desenhando o mesmo piso (`l = 3` forçado), com os nomes
 * das lanes 4/5 em `maps.json` prometendo um cenário que não existia. A
 * regra hoje (ADR 011) é o inverso: **um piso por mapa nas lanes de baixo**.
 *
 * Nenhum typecheck, lint ou teste de dado vê isso: o código compila, o JSON
 * é válido, e o campo simplesmente é o mesmo em todo mapa.
 */

/** O objeto que o jogo usa como contexto 2D (criado na importação). */
const alvo: Record<string, unknown> = { canvas: { width: 1280, height: 846 } };
const especiais: Record<string, unknown> = {};

let ops: string[] = [];
const grad = { addColorStop: (c: string) => void ops.push(`gradiente(${c})`) };

function instalarEspeciais(): void {
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
      ops.push(`${prop}(${args.map((a) => String(a)).join()})`);
      return undefined;
    };
  },
  set: (target, prop, value) => {
    (target as Record<string, unknown>)[String(prop)] = value;
    return true;
  },
});

let desenho: typeof import('../src/render/sprites');
let lanes: typeof import('../src/render/lanes');

beforeAll(async () => {
  // o módulo do canvas cria o contexto na importação: o DOM precisa existir
  // antes, como em `gameplay.test.ts`.
  document.body.innerHTML = '<canvas id="cv"></canvas>';
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  instalarEspeciais();
  desenho = await import('../src/render/sprites');
  lanes = await import('../src/render/lanes');
});

/** Assinatura do desenho: que métodos, chamados quantas vezes, com o quê. */
function assina(fn: () => void): string {
  ops = [];
  fn();
  return ops.join('|');
}

/** Assinatura estável do piso de uma lane. */
function piso(mapId: string, lane: number): string {
  const map = MAPS.find((m) => m.id === mapId);
  expect(map, `mapa ${mapId} existe`).toBeDefined();
  return assina(() => desenho.drawLaneFloor(map!, map!.pal, lane, 3.25));
}

/**
 * Só os nomes das operações de desenho, sem os números.
 *
 * Compara a **arte**, não a posição: duas lanes com o mesmo cenário têm
 * assinatas diferentes por causa do Y, e um teste que comparasse a
 * assinatura inteira passaria por vacuidade (foi exatamente o buraco que
 * escondeu a duplicação das lanes 3–5).
 */
function tracos(fn: () => void): string {
  ops = [];
  fn();
  return ops.map((o) => o.replace(/\(.*$/, '')).join('|');
}

/** Arte do piso das lanes de baixo, com Y fixo (0) para isolar o desenho. */
function arteBaixa(mapId: string, v = 0): string {
  const map = MAPS.find((m) => m.id === mapId);
  expect(map, `mapa ${mapId} existe`).toBeDefined();
  return assina(() => lanes.drawLaneFloorNovaEm(map!, map!.pal, 3.25, 0, v));
}

describe('o campo tem 6 lanes e cada uma desenha', () => {
  it('os 6 mapas desenham as 6 lanes sem estourar', () => {
    for (const map of MAPS) {
      for (let l = 0; l < LANES; l++) {
        expect(() => desenho.drawLaneFloor(map, map.pal, l, 1.5), `${map.id} lane ${l}`).not.toThrow();
      }
    }
  });

  it('cada lane gasta tinta: nenhuma nasce vazia', () => {
    for (const map of MAPS) {
      for (let l = 0; l < LANES; l++) {
        expect(piso(map.id, l).length, `${map.id} lane ${l} está vazia`).toBeGreaterThan(80);
      }
    }
  });
});

describe('as lanes de baixo (3, 4 e 5) têm um piso único por mapa', () => {
  // ADR 011: as lanes de baixo compartilham um piso por mapa. O teste
  // antigo comparava assinaturas com Y e passava mesmo com arte igual.
  const BAIXAS = [3, 4, 5];

  it('dentro de um mapa, as três lanes de baixo desenham a mesma arte', () => {
    for (const map of MAPS) {
      const seq = BAIXAS.map((l) => tracos(() => desenho.drawLaneFloor(map, map.pal, l, 3.25)));
      expect(new Set(seq).size, `${map.id}: lanes de baixo desenham arte diferente`).toBe(1);
    }
  });

  it('...mas o arranjo muda de lane em lane: piso único não vira tecido (ADR 013)', () => {
    // Mesma sequência de operações (identidade), cores e posições diferentes.
    for (const map of MAPS) {
      const artes = [0, 1, 2].map((v) => arteBaixa(map.id, v));
      expect(new Set(artes).size, `${map.id}: variação de arranjo não mudou nada`).toBe(3);
      const tracosDas = [0, 1, 2].map((v) =>
        tracos(() => lanes.drawLaneFloorNovaEm(map, map.pal, 3.25, 0, v)),
      );
      expect(new Set(tracosDas).size, `${map.id}: variação trocou a estrutura do piso`).toBe(1);
    }
  });

  it('a arte de baixo muda de mapa para mapa', () => {
    const artes = MAPS.map((m) => arteBaixa(m.id));
    expect(new Set(artes).size, 'arte de baixo igual em todos os mapas').toBe(MAPS.length);
  });

  it('a arte de baixo não é piso herdado da lane 2', () => {
    for (const map of MAPS) {
      const baixa = tracos(() => lanes.drawLaneFloorNovaEm(map, map.pal, 3.25, 0, 0));
      const deCima = tracos(() => desenho.drawLaneFloor(map, map.pal, 2, 3.25));
      expect(baixa, `${map.id}: lane de baixo copia a lane 2`).not.toBe(deCima);
    }
  });
});

describe('as estruturas das lanes de baixo têm silhueta própria', () => {
  /** Ids de estrutura usados nas lanes de baixo. */
  function idsLanesDeBaixo(): { id: string; map: (typeof MAPS)[number] }[] {
    const vistos = new Set<string>();
    const fora: { id: string; map: (typeof MAPS)[number] }[] = [];
    for (const map of MAPS) {
      for (const lane of [3, 4, 5]) {
        for (const s of map.estruturas[lane]) {
          if (!vistos.has(s.id)) {
            vistos.add(s.id);
            fora.push({ id: s.id, map });
          }
        }
      }
    }
    return fora;
  }

  /** A casa genérica: referência do "caiu no fallback". Mesma lane, mesmo mapa. */
  function assinaCasaGenérica(): string {
    return assina(() =>
      desenho.drawStructure({ id: 'casa', nome: 'Casa', msg: '', alive: true }, 3, 0, MAPS[0], 2.5),
    );
  }

  it('todas desenham (e nenhuma cai na casa genérica)', () => {
    const genérica = assinaCasaGenérica();
    for (const { id, map } of idsLanesDeBaixo()) {
      const própria = assina(() =>
        desenho.drawStructure({ id, nome: 'x', msg: '', alive: true }, 3, 0, map, 2.5),
      );
      expect(própria.length, `${id} não desenhou nada`).toBeGreaterThan(60);
      expect(própria, `${id} caiu no desenho genérico`).not.toBe(genérica);
    }
  });

  it('o teste tem dente: um id sem desenho próprio dá no genérico', () => {
    // Sem esta conferência, o teste acima passaria por vacuidade.
    const semDesenho = assina(() =>
      desenho.drawStructure({ id: 'estrutura_que_nao_existe', nome: 'x', msg: '', alive: true }, 3, 0, MAPS[0], 2.5),
    );
    expect(semDesenho).toBe(assinaCasaGenérica());
  });

  it('o estrago de cada uma também desenha', () => {
    for (const { id, map } of idsLanesDeBaixo()) {
      expect(() =>
        desenho.drawStructure({ id, nome: 'x', msg: '', alive: false }, 4, 1, map, 1.5),
        `estrago de ${id}`).not.toThrow();
    }
  });
});
