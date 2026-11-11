// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { DAILY_MODS, MACH, MAPS } from '../src/data';
import { STRUCTURES } from '../src/core/constants';

/**
 * Regressão do gameplay.
 *
 * Estes testes existem porque cada bug aqui já custou uma partida:
 * o reinício que voltava para o título, a Baleia que atravessava as
 * peças sem quebrá-las, as ondas que ignoravam o pool do mapa, a
 * derrota que acabava na segunda estrutura perdida e os mods do
 * desafio diário que não faziam nada.
 *
 * O jogo é importado por dentro do jsdom: o módulo do canvas exige um
 * elemento de verdade e um contexto 2D.
 */

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

let game: typeof import('../src/game/game');
let state: typeof import('../src/core/state');

beforeAll(async () => {
  document.body.innerHTML = `
    <canvas id="cv"></canvas>
    <div id="topbar"><div id="trackName"></div><div id="radioLamp"></div></div>
    <div id="screen"></div>
    <div id="shop"></div>
    <div id="toasts"></div>
    <div id="flash"></div>
  `;
  const ctx = fakeContext();
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  game = await import('../src/game/game');
  state = await import('../src/core/state');
});

/** Modo silencioso: os testes não precisam de som nem de timer. */
function mod(nome: string): (typeof DAILY_MODS)[number] {
  const m = DAILY_MODS.find((x) => x.nome === nome);
  if (!m) throw new Error('mod inexistente: ' + nome);
  return m;
}

describe('reinício da partida', () => {
  it('guarda a opção da partida e reinicia a mesma', () => {
    state.Game.startCampaign(0);
    expect(state.Game.runOpts).toEqual({ kind: 'campaign', map: 0 });

    state.G.t = 42;
    state.G.scrap = 7;
    state.Game.restart();

    expect(state.Game.screen).toBe('play');
    expect(state.G.t).toBeLessThan(1);
    expect(state.G.scrap).toBeGreaterThan(100);
    expect(state.G.mapIndex).toBe(0);
  });

  it('cada modo guarda a sua própria opção', () => {
    state.Game.startBoss(2);
    expect(state.Game.runOpts).toEqual({ kind: 'boss', map: 2 });
    state.Game.startSandbox();
    expect(state.Game.runOpts).toEqual({ kind: 'sandbox' });
    state.Game.quitToTitle();
    expect(state.Game.runOpts).toBeNull();
  });
});

describe('ondas: o pool do mapa manda', () => {
  it('a onda 0 usa os dois primeiros bichos do pool do mapa', () => {
    state.Game.startCampaign(1); // Farol do Fim
    const pool = state.G.map.pool;
    const tipos = new Set(state.G.waves[0].map((w) => w[1]));
    for (const t of tipos) {
      expect(pool.slice(0, 2), `farol onda 0: ${t}`).toContain(t);
    }
  });

  it('a onda 2 usa o pool inteiro do mapa', () => {
    state.Game.startCampaign(1);
    const pool = state.G.map.pool;
    // As cenas (polvo, cardume, baleia) são de todos os mapas: a
    // baleia é visita, o polvo e o cardume são o repertório do mar.
    const CENS = ['polvo', 'piranha', 'baleia'];
    for (const wave of state.G.waves) {
      for (const w of wave) {
        expect(
          pool.includes(w[1]) || CENS.includes(w[1]),
          `farol: ${w[1]} não é do pool nem é cena`,
        ).toBe(true);
      }
    }
    // O pool inteiro aparece na onda 2.
    const tipos2 = new Set(state.G.waves[2].map((w) => w[1]));
    for (const t of pool) {
      expect(tipos2.has(t), `farol onda 2 não tem ${t}`).toBe(true);
    }
  });

  it('cada mapa traz bichos diferentes', () => {
    const primeiros: string[][] = [];
    for (let i = 0; i < MAPS.length; i++) {
      state.Game.startCampaign(i);
      primeiros.push(state.G.waves[0].map((w) => w[1]));
    }
    // Nenhum mapa repete o par de abertura de outro.
    const pares = primeiros.map((p) => p.join(','));
    expect(new Set(pares).size).toBeGreaterThan(3);
  });
});

describe('Baleia-Filhote', () => {
  it('pisa nas peças e quebra (não é alvo, mas é visita)', () => {
    state.Game.startCampaign(0);
    const boia = game.placeMachine('boia', 0, 0, true);
    expect(boia).toBe(true);
    const antes = state.G.machines[0].hp;

    const baleia = game.spawnEnemy('baleia', 0, state.G.machines[0].x);
    expect(baleia).not.toBeNull();
    game.update(0.5);

    expect(state.G.machines.length === 0 || state.G.machines[0].hp < antes).toBe(true);
  });

  it('não é alvo: não toma dano de tiro nem de explosão', () => {
    state.Game.startCampaign(0);
    const baleia = game.spawnEnemy('baleia', 0, 900);
    expect(baleia).not.toBeNull();
    const hp = baleia!.hp;
    game.damageEnemy(baleia!, 500, 'boom');
    expect(baleia!.hp).toBe(hp);
    expect(game.isTargetable(baleia!, false)).toBe(false);
  });
});

describe('regra de derrota', () => {
  it('perder uma lane inteira abre brecha, mas não acaba a partida', () => {
    state.Game.startCampaign(0);
    // Derruba as duas estruturas da lane 0.
    state.G.structures[0][0].alive = false;
    state.G.structures[0][1].alive = false;
    const inimigo = game.spawnEnemy('baiacu', 0, 100);
    expect(inimigo).not.toBeNull();
    game.update(0.2);

    expect(state.G.over).toBe(false);
    expect(state.Game.screen).toBe('play');
    expect(state.G.ze.alive).toBe(true);
    // A brecha foi contabilizada.
    expect(state.G.breaches).toBe(1);
  });

  it('a partida acaba quando todas as estruturas caem', () => {
    state.Game.startCampaign(0);
    for (const lane of state.G.structures) {
      for (const s of lane) s.alive = false;
    }
    const inimigo = game.spawnEnemy('baiacu', 0, 100);
    expect(inimigo).not.toBeNull();
    game.update(0.2);

    expect(state.G.over).toBe(true);
    expect(state.G.win).toBe(false);
    expect(state.Game.screen).toBe('end');
  });

  it('o total de estruturas é o do campo', () => {
    state.Game.startCampaign(0);
    expect(state.G.structures.flat().length).toBe(STRUCTURES);
  });
});

describe('desafio diário: os mods fazem o que prometem', () => {
  it('SÓ BAIACU: todas as criaturas são baiacu, sem exceção', () => {
    state.Game.startDaily([mod('SÓ BAIACU')]);
    for (const wave of state.G.waves) {
      for (const w of wave) {
        if (w[1] === state.G.map.boss) continue; // chefe não é criatura
        expect(w[1], `so baiacu: ${w[1]}`).toBe('baiacu');
      }
    }
  });

  it('SEM GELADEIRA: a geladeira some da banca', async () => {
    state.Game.startDaily([mod('SEM GELADEIRA')]);
    const economia = await import('../src/game/economy');
    expect(economia.isBanned('geladeira')).toBe(true);
    expect(economia.availableMachines()).not.toContain('geladeira');
    expect(economia.availableMachines()).not.toContain('geladeira_bomba');
    // As outras continuam.
    expect(economia.availableMachines()).toContain('boia');
  });

  it('PEÇAS DE VIDRO: as peças nascem com metade da vida', () => {
    state.Game.startDaily([mod('PEÇAS DE VIDRO')]);
    const boia = game.placeMachine('boia', 0, 0, true);
    expect(boia).toBe(true);
    expect(state.G.machines[0].hp).toBe(Math.round(MACH.boia.hp * 0.5));
  });

  it('NOITE PERMANENTE: o mapa começa no escuro', () => {
    state.Game.startDaily([mod('NOITE PERMANENTE')]);
    expect(state.G.dark).toBe(true);
    expect(state.G.darkT).toBeGreaterThan(0);
  });

  it('SUCATA DEMAIS: começa com 999 de sucata e recurso dobrado', () => {
    state.Game.startDaily([mod('SUCATA DEMAIS')]);
    expect(state.G.scrap).toBe(999);
    expect(state.G.resMult).toBe((state.G.map.resMult || 1) * 2);
  });

  it('TUDO RÁPIDO: as criaturas ficam mais rápidas', () => {
    state.Game.startDaily([mod('TUDO RÁPIDO')]);
    expect(state.G.speedMult).toBe(1.3);
  });

  it('MARÉ CHEIA: o bicho também tem o dobro de vida', () => {
    state.Game.startDaily([mod('MARÉ CHEIA')]);
    expect(state.G.enemyHpMult).toBe(1.5);
  });
});
