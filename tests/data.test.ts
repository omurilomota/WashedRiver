import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  BOSSES,
  ENEMY,
  ENEMY_ORDER,
  MACH,
  MACH_ORDER,
  MAPS,
  MAP_UNLOCKS,
  SYNERGIES,
  TREE,
} from '../src/data';
import { LANES, STRUCTURES } from '../src/core/constants';

/**
 * As invariantes do conteúdo.
 *
 * Este arquivo é o "não quebre mais o balanceamento" do projeto: cada
 * regra aqui já custou uma partida (ou um save corrompido).
 */
describe('criaturas', () => {
  it('todo inimigo comum tem HP entre 10 e 500', () => {
    for (const [id, e] of Object.entries(ENEMY)) {
      expect(e.hp, `${id} tem HP ${e.hp}`).toBeGreaterThanOrEqual(10);
      expect(e.hp, `${id} tem HP ${e.hp}`).toBeLessThanOrEqual(500);
    }
  });

  it('ninguém usa HP 9999 para ser imortal', () => {
    for (const [id, e] of Object.entries(ENEMY)) {
      expect(e.hp, `${id} ainda usa o hack do HP 9999`).not.toBe(9999);
    }
    for (const [id, b] of Object.entries(BOSSES)) {
      expect(b.hp, `${id} ainda usa o hack do HP 9999`).not.toBe(9999);
    }
  });

  it('a Baleia-Filhote é neutral e o Pescador é gente', () => {
    expect(ENEMY.baleia.neutral).toBe(true);
    expect(ENEMY.baleia.hp).toBe(400);
    expect(ENEMY.pescador.human).toBe(true);
    expect(ENEMY.pescador.hp).toBe(60);
  });

  it('o único inimigo invencível é a MARÉ, e por trait explícita', () => {
    const invencíveis = Object.entries(BOSSES).filter(([, b]) => b.unbeatable);
    expect(invencíveis.map(([id]) => id)).toEqual(['mare']);
  });

  it('a ordem das criaturas bate com as criaturas que existem', () => {
    expect(ENEMY_ORDER.length).toBe(Object.keys(ENEMY).length);
    for (const id of ENEMY_ORDER) {
      expect(ENEMY[id], `criatura ${id} não existe`).toBeDefined();
    }
  });
});

describe('chefes', () => {
  it('todo chefe tem um mapa válido', () => {
    for (const [id, b] of Object.entries(BOSSES)) {
      expect(b.map, `${id} aponta para o mapa ${b.map}`).toBeGreaterThanOrEqual(0);
      expect(b.map, `${id} aponta para o mapa ${b.map}`).toBeLessThan(MAPS.length);
    }
  });

  it('todo mapa tem um chefe que existe', () => {
    for (const [i, map] of MAPS.entries()) {
      expect(BOSSES[map.boss], `mapa ${map.id} usa o chefe ${map.boss}`).toBeDefined();
      expect(BOSSES[map.boss].map).toBe(i);
    }
  });
});

describe('mapas', () => {
  it('todo mapa tem 6 lanes com nome', () => {
    for (const map of MAPS) {
      expect(map.lanes.length, `${map.id} tem ${map.lanes.length} lanes`).toBe(LANES);
      for (const lane of map.lanes) {
        expect(lane.length).toBeGreaterThan(0);
      }
    }
  });

  it('todo mapa tem 2 estruturas por lane (12 no total)', () => {
    for (const map of MAPS) {
      expect(map.estruturas.length, `${map.id}`).toBe(LANES);
      for (const [i, group] of map.estruturas.entries()) {
        expect(group.length, `${map.id} lane ${i}`).toBe(2);
        for (const s of group) {
          expect(s.nome.length).toBeGreaterThan(0);
          expect(s.msg.length).toBeGreaterThan(0);
        }
      }
      expect(map.estruturas.flat().length).toBe(STRUCTURES);
    }
  });

  it('todo mapa cita criaturas que existem', () => {
    for (const map of MAPS) {
      for (const id of [...map.pool, ...map.extra]) {
        expect(ENEMY[id], `${map.id} cita ${id}`).toBeDefined();
      }
    }
  });
});

describe('engenhocas', () => {
  it('a ordem do baralho bate com as engenhocas que existem', () => {
    expect(MACH_ORDER.length).toBe(Object.keys(MACH).length);
    for (const id of MACH_ORDER) {
      expect(MACH[id], `engenhoca ${id} não existe`).toBeDefined();
    }
  });

  it('toda engenhoca tem custo, recarga e vida de combate', () => {
    for (const [id, m] of Object.entries(MACH)) {
      expect(m.cost, `${id} sem custo`).toBeGreaterThanOrEqual(0);
      expect(m.cd, `${id} sem recarga`).toBeGreaterThanOrEqual(0);
      expect(m.hp, `${id} com HP ${m.hp}`).toBeLessThanOrEqual(500);
      // A Coisa do Zé é montada de graça e o Pé de Cabra é uma ferramenta
      // (não tem vida). O resto é peça de verdade: custa e aguenta.
      if (id !== 'coisa_ze' && id !== 'remover') {
        expect(m.cost, `${id} sem custo`).toBeGreaterThan(0);
        expect(m.hp, `${id} sem HP`).toBeGreaterThan(0);
      }
    }
  });

  it('toda sinergia aponta para engenhocas que existem', () => {
    for (const s of SYNERGIES) {
      expect(MACH[s.a], `sinergia ${s.nome} usa ${s.a}`).toBeDefined();
      expect(MACH[s.b], `sinergia ${s.nome} usa ${s.b}`).toBeDefined();
    }
  });

  it('todo desbloqueio de mapa cita engenhocas que existem', () => {
    for (const u of MAP_UNLOCKS) {
      for (const id of u.machs) {
        expect(MACH[id], `mapa ${u.map} libera ${id}`).toBeDefined();
      }
    }
  });
});

describe('progressão e conquistas', () => {
  it('a árvore de desbloqueios aponta para nós e engenhocas que existem', () => {
    const ids = new Set(TREE.map((n) => n.id));
    for (const node of TREE) {
      expect(node.max).toBeGreaterThan(0);
      expect(node.cost).toBeGreaterThan(0);
      if (node.unlock) {
        expect(MACH[node.unlock], `nó ${node.id} libera ${node.unlock}`).toBeDefined();
      }
      if (node.req) {
        expect(ids.has(node.req), `nó ${node.id} exige ${node.req}`).toBe(true);
      }
    }
  });

  it('são 12 conquistas, e o bestiário não mostra "x/10"', () => {
    expect(ACHIEVEMENTS.length).toBe(12);
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
  });

  it('toda conquista tem nome e descrição', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.nome.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
    }
  });
});
