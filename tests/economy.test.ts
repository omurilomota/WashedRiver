// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  availableMachines,
  eff,
  isMachUnlocked,
  machCost,
  machineAt,
  structuresAlive,
} from '../src/game/economy';
import { ECONOMIA, MACH, MACH_ORDER, MAPS } from '../src/data';
import { COLS, LANES, STRUCTURES } from '../src/core/constants';
import { setG } from '../src/core/state';
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

  it('sem desconto, o custo é o custo do conteúdo com o encarecimento geral (+10%)', () => {
    for (const id of MACH_ORDER) {
      if (MACH[id].cost <= 0) continue; // coisa_ze e remover são de graça
      const esperado = Math.max(1, Math.round(MACH[id].cost * ECONOMIA.fatorCustoMaquina));
      expect(machCost(id), `${id}`).toBe(esperado);
    }
  });

  it('a banca mostra só o deck quando a partida tem deck (BLOCO M.4)', () => {
    // sem deck: tudo que está liberado
    setG({ mods: {} } as unknown as GameState);
    const tudo = availableMachines();
    expect(tudo.length).toBeGreaterThan(3);

    // com deck: só o deck (e na ordem escolhida)
    setG({ mods: {}, deck: ['ima', 'boia', 'torradeira'] } as unknown as GameState);
    const noDeck = availableMachines();
    expect(noDeck).toEqual(['ima', 'boia', 'torradeira']);

    // deck com peça trancada é ignorada, não trava a banca
    setG({ mods: {}, deck: ['nao_existe', 'boia'] } as unknown as GameState);
    expect(availableMachines()).toEqual(['boia']);

    // deck vazio = sem escolha (sandbox): volta pro desbloqueio
    setG({ mods: {}, deck: [] } as unknown as GameState);
    expect(availableMachines()).toEqual(tudo);
  });

  it('o desconto da árvore derruba o preço (e nunca zera)', () => {
    const alvo = MACH_ORDER.find((id) => MACH[id].cost > 0);
    expect(alvo).toBeDefined();
    if (!alvo) return;

    const base = Math.max(1, Math.round(MACH[alvo].cost * ECONOMIA.fatorCustoMaquina));
    SaveDB.slot.tree.maos = 1; // 6% de desconto
    const custo = machCost(alvo);
    expect(custo).toBeLessThan(base);
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

  it('o campo tem 6 lanes × 7 colunas', () => {
    expect(LANES).toBe(6);
    expect(COLS).toBe(7);
    expect(STRUCTURES).toBe(LANES * 2);
  });
});

/** Contexto 2D falso: todo método é no-op e devolve algo encadeável. */
function fakeContext(): CanvasRenderingContext2D {
  const chain: unknown = new Proxy(
    {},
    {
      get: () => () => chain,
      set: () => true,
    },
  );
  return new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop];
        return () => chain;
      },
      set: (target: Record<string, unknown>, prop: string, value: unknown) => {
        target[prop] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

describe('economia: F4 — ADR 005 (sucata como sumidouro)', () => {
  let game: typeof import('../src/game/game');
  let state: typeof import('../src/core/state');

  beforeAll(async () => {
    document.body.innerHTML = `
      <canvas id="cv"></canvas>
      <div id="topbar"><div id="trackName"></div><div id="radioLamp"></div></div>
      <div id="screen"></div><div id="shop"></div>
    <div id="ctxmenu"></div><div id="toasts"></div><div id="flash"></div>
    `;
    const ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = (() =>
      ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    game = await import('../src/game/game');
    state = await import('../src/core/state');
  });

  beforeEach(() => {
    SaveDB.resetSlot(0);
    state.Game.startCampaign(0);
  });

  it('passiva é 3/s (não 8/s)', () => {
    expect(ECONOMIA.passiva).toBe(3);
  });

  it('melhoria de peça custa 120/220/380', () => {
    expect(ECONOMIA.upgradeCusto).toEqual([120, 220, 380]);
  });

  it('banca do Zé só tem sumidouros (sem fonte de sucata)', () => {
    expect(ECONOMIA.banca.reforco).toBe(150);
    expect(ECONOMIA.banca.reparoDuplo).toBe(300);
    expect(ECONOMIA.banca.tabua).toBe(220);
    expect(ECONOMIA.banca.recarga).toBe(120);
  });

  it('upgrade de peça custa sucata e recusa sem sucata suficiente', () => {
    const k = 'boia';
    state.G.scrap = 200;
    expect(game.placeMachine(k, 0, 0)).toBe(true);
    const aposColocar = state.G.scrap; // 200 - custo da peça
    expect(aposColocar).toBeLessThan(200);

    // primeiro nível custa ECONOMIA.upgradeCusto[0] = 120
    expect(game.upgradeMachine(k)).toBe(true);
    expect(state.G.scrap).toBe(aposColocar - ECONOMIA.upgradeCusto[0]);
    expect(state.G.up[k]).toBe(1);

    // segundo nível custa 220; sem sucata, recusa e não gasta
    const semSucata = state.G.scrap;
    expect(game.upgradeMachine(k)).toBe(false);
    expect(state.G.scrap).toBe(semSucata);
    expect(state.G.up[k]).toBe(1);
  });

  it('sucata velha: 500 sucata vira 1 sucata velha', () => {
    state.G.scrap = 600;
    state.Game.offers = [{ kind: 'sucataVelha' }];
    state.Game.chooseOffer(0);
    expect(state.G.scrap).toBe(100);
    expect(SaveDB.slot.oldScrap).toBe(1);
  });
});
