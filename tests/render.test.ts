// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { MAPS } from '../src/data';
import { LANES } from '../src/core/constants';

/**
 * Cenário do campo.
 *
 * Estes testes não olham pixel: olham **comportamento de desenho**. O bug
 * que eles pegam é o que a auditoria achou nas lanes novas — as lanes de
 * índice 3 e 4 mostravam o mesmo jardim e o mesmo trapiche em todos os
 * seis mapas, e a lane 5 herdava o piso da lane 2. Nenhum typecheck, lint
 * ou teste de dado vê isso: o código compila, o JSON é válido, e o campo
 * simplesmente é o mesmo em todo mapa.
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

beforeAll(async () => {
  // o módulo do canvas cria o contexto na importação: o DOM precisa existir
  // antes, como em `gameplay.test.ts`.
  document.body.innerHTML = '<canvas id="cv"></canvas>';
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  instalarEspeciais();
  desenho = await import('../src/render/sprites');
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

describe('as lanes 4, 5 e 6 têm arte própria', () => {
  // Os índices 3, 4 e 5 eram jardim/trapiche repetidos e piso herdado.
  const NOVAS = [3, 4, 5];

  it('dentro de um mapa, as três lanes novas são diferentes entre si', () => {
    for (const map of MAPS) {
      const assinaturas = NOVAS.map((l) => piso(map.id, l));
      expect(new Set(assinaturas).size, `${map.id}: lanes novas repetem a mesma arte`).toBe(NOVAS.length);
    }
  });

  it('a mesma lane nova muda de mapa para mapa', () => {
    for (const l of NOVAS) {
      const assinaturas = MAPS.map((m) => piso(m.id, l));
      expect(new Set(assinaturas).size, `lane ${l} é igual em todos os mapas`).toBe(MAPS.length);
    }
  });

  it('a lane nova não desenha o mesmo que a lane 2 (não é piso herdado)', () => {
    for (const map of MAPS) {
      for (const l of NOVAS) {
        expect(piso(map.id, l), `${map.id} lane ${l} copia a lane 2`).not.toBe(piso(map.id, 2));
      }
    }
  });
});

describe('as estruturas das lanes 4, 5 e 6 têm silhueta própria', () => {
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
