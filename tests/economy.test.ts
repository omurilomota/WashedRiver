import { beforeEach, describe, expect, it } from 'vitest';
import {
  availableMachines,
  eff,
  isMachUnlocked,
  machCost,
  machineAt,
  structuresAlive,
} from '../src/game/economy';
import { MACH, MACH_ORDER, MAPS } from '../src/data';
import { COLS, LANES, STRUCTURES } from '../src/core/constants';
import { G, setG } from '../src/core/state';
import type { GameState, Machine, Structure } from '../src/core/state';
import { SaveDB } from '../src/save/storage';

/**
 * Economia: custos, desbloqueios e contagem de estruturas.
 *
 * A HUD e a simulação precisam contar e cobrar as mesmas coisas. Quando
 * elas discordam, o jogador perde a confiança no jogo — e o bug fica
 * difícil de achar porque "parece" que funciona.
 */

/** Estado falso com as estruturas que o teste quiser. */
function stateWithStructures(alivePerLane: boolean[]): void {
  const structures: Structure[][] = [];
  for (let l = 0; l < LANES; l++) {
    const lane: Structure[] = [];
    for (let i = 0; i < 2; i++) {
      lane.push({
        id: `estrutura-${l}-${i}`,
        nome: 'TESTE',
        msg: 'teste',
        alive: alivePerLane[l] ?? true,
      });
    }
    structures.push(lane);
  }
  setG({ structures } as unknown as GameState);
}

describe('economia: custo', () => {
  beforeEach(() => {
    SaveDB.resetSlot(0);
  });

  it('sem desconto, o custo é o custo do conteúdo', () => {
    for (const id of MACH_ORDER) {
      if (MACH[id].cost <= 0) continue; // coisa_ze e remover são de graça
      expect(machCost(id), `${id}`).toBe(MACH[id].cost);
    }
  });

  it('o desconto da árvore derruba o preço (e nunca zera)', () => {
    const alvo = MACH_ORDER.find((id) => MACH[id].cost > 0);
    expect(alvo).toBeDefined();
    if (!alvo) return;

    SaveDB.slot.tree.maos = 1; // 6% de desconto
    const custo = machCost(alvo);
    expect(custo).toBeLessThan(MACH[alvo].cost);
    expect(custo).toBeGreaterThanOrEqual(1);
  });

  it('toda engenhoca jogável custa no mínimo 1 de sucata', () => {
    SaveDB.slot.tree.maos = 3;
    for (const id of MACH_ORDER) {
      expect(machCost(id), `${id}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('economia: desbloqueio', () => {
  beforeEach(() => {
    SaveDB.resetSlot(0);
  });

  it('as engenhocas de base já estão liberadas', () => {
    for (const id of MACH_ORDER) {
      if (MACH[id].unlock) {
        expect(isMachUnlocked(id), `${id} deveria estar liberada`).toBe(true);
      }
    }
  });

  it('engenhoca de campanha continua bloqueada no primeiro mapa', () => {
    const bloqueada = MACH_ORDER.find((id) => !MACH[id].unlock && id !== 'coisa_ze');
    expect(bloqueada).toBeDefined();
    if (!bloqueada) return;
    expect(isMachUnlocked(bloqueada)).toBe(false);
  });

  it('avançar a campanha libera a engenhoca do mapa', () => {
    const bloqueada = MACH_ORDER.find((id) => !MACH[id].unlock && id !== 'coisa_ze');
    if (!bloqueada) return;
    SaveDB.slot.campaign = 5;
    expect(isMachUnlocked(bloqueada)).toBe(true);
  });

  it('a árvore libera engenhoca sem precisar de campanha', () => {
    SaveDB.slot.tree.oficina = 1; // libera o Estilingue
    expect(isMachUnlocked('estilingue')).toBe(true);
    // E o par do estilingue vem junto.
    expect(isMachUnlocked('batedeira')).toBe(true);
  });

  it('a Coisa do Zé só aparece depois do primeiro mapa', () => {
    expect(isMachUnlocked('coisa_ze')).toBe(false);
    SaveDB.slot.campaign = 1;
    expect(isMachUnlocked('coisa_ze')).toBe(true);
  });

  it('a lista disponível só tem engenhocas liberadas, na ordem do baralho', () => {
    SaveDB.slot.campaign = 5;
    SaveDB.slot.tree.oficina = 1;
    const lista = availableMachines();
    for (const id of lista) {
      expect(isMachUnlocked(id), `${id} na lista mas bloqueado`).toBe(true);
      expect(MACH[id], `${id} não existe`).toBeDefined();
    }
    // A ordem do baralho é preservada.
    const pos = lista.map((id) => MACH_ORDER.indexOf(id));
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('o efeito agregado da árvore soma os níveis comprados', () => {
    SaveDB.slot.tree.sucata_velha = 2; // +40 por nível
    expect(eff().startScrap).toBe(80);
  });
});

describe('economia: estruturas', () => {
  it('conta as estruturas de pé de todas as lanes', () => {
    stateWithStructures([true, true, true, true, true, true]);
    expect(structuresAlive()).toBe(STRUCTURES);
  });

  it('cada lane tem duas estruturas: uma caída tira uma da conta', () => {
    stateWithStructures([true, false, true, true, true, true]);
    expect(structuresAlive()).toBe(STRUCTURES - 2);
  });

  it('nenhuma estrutura de pé é zero — a derrota conta pelo total', () => {
    stateWithStructures([false, false, false, false, false, false]);
    expect(structuresAlive()).toBe(0);
    expect(STRUCTURES).toBe(LANES * 2);
  });

  it('todo mapa do conteúdo tem o total de estruturas do campo', () => {
    for (const map of MAPS) {
      expect(map.estruturas.flat().length, `${map.id}`).toBe(STRUCTURES);
    }
  });
});

describe('economia: slots', () => {
  it('a engenhoca no slot é a que está naquele lane/coluna', () => {
    const m = { lane: 2, col: 3, type: 'boia' } as unknown as Machine;
    setG({ machines: [m] } as unknown as GameState);
    expect(machineAt(2, 3)).toBe(m);
    expect(machineAt(2, 4)).toBeUndefined();
    expect(machineAt(0, 3)).toBeUndefined();
  });

  it('o campo tem 6 lanes × 5 colunas', () => {
    expect(LANES).toBe(6);
    expect(COLS).toBe(5);
    expect(STRUCTURES).toBe(LANES * 2);
  });
});
