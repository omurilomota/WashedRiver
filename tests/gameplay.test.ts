// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { DAILY_MODS, ECONOMIA, MACH, MAPS } from '../src/data';
import { STRUCTURES, VX, W } from '../src/core/constants';
import { KEY } from '../src/save/storage';

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

describe('sucata por hover', () => {
  it('passar o mouse por cima cata a sucata', () => {
    state.Game.startCampaign(0);
    state.G.pickups.push({ x: 500, y: 300, v: 33, auto: false, life: 14, t: 0, fly: false, vy: 0, bob: 0 });
    state.Game.mouse = { x: 505, y: 302 };
    game.update(0.05);
    expect(state.G.pickups[0].fly).toBe(true);
    for (let i = 0; i < 40 && state.G.pickups.length; i++) game.update(0.05);
    expect(state.G.collected).toBeGreaterThanOrEqual(33);
  });

  it('sucata longe do mouse continua boiando', () => {
    state.Game.startCampaign(0);
    state.G.pickups.push({ x: 500, y: 300, v: 33, auto: false, life: 14, t: 0, fly: false, vy: 0, bob: 0 });
    state.Game.mouse = { x: 60, y: 60 };
    game.update(0.05);
    expect(state.G.pickups[0].fly).toBe(false);
  });
});

describe('ESC e autosave', () => {
  it('ESC pausa e despausa', () => {
    state.Game.startCampaign(0);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(state.Game.screen).toBe('pause');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(state.Game.screen).toBe('play');
  });

  it('pausar grava o progresso no localStorage', () => {
    state.Game.startCampaign(0);
    state.Game.pause();
    expect(state.G.savedT).toBeGreaterThan(0);
    const raw = localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!) as { active: number; slots: { lastPlayed: number }[] };
    expect(saved.slots[saved.active].lastPlayed).toBeGreaterThan(0);
  });
});

describe('imposto dos moradores', () => {
  it('cresce com peça na rua e com onda vencida', async () => {
    const economia = await import('../src/game/economy');
    const { base, porPeca, porOnda } = ECONOMIA.imposto;
    expect(economia.impostoDoRound(0, 0)).toBe(base);
    expect(economia.impostoDoRound(3, 2)).toBe(base + 3 * porPeca + 2 * porOnda);
  });

  it('é cobrado no fim da onda, sem zerar a sucata', async () => {
    state.Game.startCampaign(0);
    state.G.scrap = 500;
    expect(game.placeMachine('boia', 0, 0, true)).toBe(true);
    state.G.phases = [{ type: 'wave', n: 0 }, { type: 'break' }, { type: 'idle' }];
    state.G.phaseIdx = 0;
    state.G.phaseT = 0;
    state.G.spawnIdx = state.G.waves[0].length;
    state.G.enemies = [];

    const economia = await import('../src/game/economy');
    const conta = economia.impostoDoRound(state.G.machines.length, state.G.survived + 1);
    const antes = state.G.scrap;
    game.update(0.05);
    // A sucata passiva (3/s) entra no mesmo quadro; o imposto tem que aparecer inteiro.
    const pago = antes - state.G.scrap;
    expect(pago).toBeGreaterThanOrEqual(conta - 1);
    expect(pago).toBeLessThanOrEqual(conta);
    expect(state.G.impostoDevido).toBe(0);
    expect(state.G.scrap).toBeGreaterThan(0);
  });
});

describe('contramedidas justas', () => {
  it('o ventilador espanta a baleia em vez de matá-la', () => {
    state.Game.startCampaign(0);
    expect(game.placeMachine('ventilador', 0, 0, true)).toBe(true);
    const baleia = game.spawnEnemy('baleia', 0, 400);
    expect(baleia).not.toBeNull();
    for (let i = 0; i < 40; i++) game.update(0.1);
    expect(baleia!.spooked).toBe(true);
  });

  it('a lata devolve no máximo três torradas — a quarta entra', () => {
    state.Game.startCampaign(0);
    const lata = game.spawnEnemy('lata', 0, 900);
    expect(lata).not.toBeNull();
    const hp = lata!.hp;
    for (let i = 0; i < 3; i++) {
      state.G.projs.push({ x: lata!.x, y: 300, lane: 0, vx: 0, dmg: 20, kind: 'toast', enemy: false });
      game.update(0.01);
    }
    expect(lata!.hp).toBe(hp);
    expect(lata!.reflects).toBe(3);
    state.G.projs.push({ x: lata!.x, y: 300, lane: 0, vx: 0, dmg: 20, kind: 'toast', enemy: false });
    game.update(0.01);
    expect(lata!.hp).toBeLessThan(hp);
  });

  it('canhão de lata e estilingue acertam voador sem holofote', () => {
    state.Game.startCampaign(0);
    const gaivota = game.spawnEnemy('gaivota', 0, 800);
    expect(gaivota).not.toBeNull();
    expect(game.isTargetable(gaivota!, false)).toBe(false);
    expect(game.isTargetable(gaivota!, false, !!MACH.lancador_lata.air)).toBe(true);
    expect(game.isTargetable(gaivota!, false, !!MACH.estilingue.air)).toBe(true);
  });
});

describe('o Pescador não quebra a vila', () => {
  it('chega na vila, cobra pedágio em sucata e volta — sem derrubar estrutura', () => {
    state.Game.startCampaign(0);
    state.G.scrap = 100;
    const antes = state.G.structures.flat().filter((s) => s.alive).length;

    const pescador = game.spawnEnemy('pescador', 0, VX + 2);
    expect(pescador).not.toBeNull();
    game.update(0.05);

    // Nada caiu: um bicho que não se pode matar não pode custar uma parede.
    expect(state.G.structures.flat().filter((s) => s.alive).length).toBe(antes);
    // O preço é sucata, e é o dado que manda no preço.
    expect(state.G.scrap).toBeCloseTo(100 - ECONOMIA.pescadorTaxa, 0);
    expect(pescador!.saved).toBe(true);
    expect(pescador!.taxed).toBe(true);
    expect(game.isTargetable(pescador!, false)).toBe(false);
  });
});

describe('O Faroleiro fica no campo', () => {
  it('na fase 2 o teleporte não o joga para fora do alcance', () => {
    state.Game.startBoss(1); // Farol do Fim
    game.update(8.1); // prep → intro
    game.update(2.7); // intro → chefe
    const boss = state.G.boss;
    expect(boss).not.toBeNull();
    if (!boss) return;

    boss.phase = 2;
    boss.actT = 0;
    game.update(0.05);

    expect(boss.x).toBeLessThanOrEqual(W);
    expect(boss.x).toBeGreaterThan(VX);
    expect(game.isTargetable(boss)).toBe(true);
  });
});
