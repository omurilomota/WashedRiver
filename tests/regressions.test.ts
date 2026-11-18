// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SPAWN_X, VX } from '../src/core/constants';
import { SaveDB } from '../src/save/storage';

/**
 * Regressões da auditoria desta sessão.
 *
 * Cada teste aqui representa um bug que o jogador conseguiria reproduzir:
 * a Noite Infinita que parava, o espelho que não refletia, a neblina que não
 * encurtava nada, a bomba que apagava um bicho extra, o desbloqueio da banca
 * que não entrava na banca e o recorde de chefe que nunca era salvo.
 */
function fakeContext(): CanvasRenderingContext2D {
  const chain: unknown = new Proxy({}, { get: () => () => chain, set: () => true });
  return new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string | symbol) => {
        const key = String(prop);
        if (key in target) return target[key];
        return () => chain;
      },
      set: (target: Record<string, unknown>, prop: string | symbol, value: unknown) => {
        target[String(prop)] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

let game: typeof import('../src/game/game');
let state: typeof import('../src/core/state');
let economia: typeof import('../src/game/economy');

beforeAll(async () => {
  document.body.innerHTML = `
    <div id="stage"><canvas id="cv"></canvas>
    <div id="topbar"><div id="trackName"></div><div id="radioLamp"></div></div>
    <div id="screen"></div><div id="shop"></div><div id="ctxmenu"></div>
    <div id="toasts"></div><div id="flash"></div></div>
  `;
  HTMLCanvasElement.prototype.getContext = (() =>
    fakeContext()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  game = await import('../src/game/game');
  state = await import('../src/core/state');
  economia = await import('../src/game/economy');
});

beforeEach(() => {
  SaveDB.resetSlot(0);
});

describe('Noite Infinita continua depois da segunda onda', () => {
  it('emenda break + nova onda quando o índice passa do fim', () => {
    state.Game.startEndless({ level: 0, map: 0 });
    // Estado exato do fim da onda 1: a lista de fases acabou, mas a partida
    // não pode ficar em idle.
    state.G.phases = [{ type: 'wave', n: 0 }, { type: 'break' }, { type: 'wave', n: 1 }];
    state.G.waves = state.G.waves.slice(0, 2);
    state.G.phaseIdx = 2;
    state.G.phaseT = 0;
    state.G.spawnIdx = state.G.waves[1].length;
    state.G.enemies = [];
    state.Game.screen = 'play';

    game.update(0.05);

    expect(state.G.phases.length).toBe(5);
    expect(state.G.phases[3].type).toBe('break');
    expect(state.G.phases[4]).toEqual({ type: 'wave', n: 2 });
    expect(state.G.waves.length).toBe(3);
  });

  it('guarda a dificuldade escolhida para o recorde', () => {
    state.Game.startEndless({ level: 2, map: 1 });
    expect(SaveDB.slot.flags.endlessDiff).toBe(2);
  });
});

describe('combate: projéteis e alcance', () => {
  it('o Espelho devolve um projétil que causa dano de verdade', () => {
    state.Game.startCampaign(0);
    state.G.phases = [{ type: 'idle' }];
    state.Game.screen = 'play';
    state.G.machines = [];
    state.G.enemies = [];
    state.G.projs = [];
    expect(game.placeMachine('espelho', 0, 3, true)).toBe(true);
    const espelho = state.G.machines[0];
    // O espelho precisa estar carregado no quadro do impacto; sem isso o
    // projétil inimigo chega antes e quebra a peça, como no jogo real.
    espelho.timer = 1;
    const alvo = game.spawnEnemy('baiacu', 0, espelho.x + 190);
    expect(alvo).not.toBeNull();
    if (!alvo) return;
    alvo.speed = 0;
    const hp = alvo.hp;
    state.G.projs.push({
      x: espelho.x + 10,
      y: 300,
      lane: 0,
      vx: -300,
      dmg: 20,
      kind: 'toast',
      enemy: true,
    });

    for (let i = 0; i < 24; i++) game.update(0.05);

    expect(alvo.hp).toBeLessThan(hp);
  });

  it('na neblina a torradeira não alcança o extremo do campo', () => {
    state.Game.startCampaign(1); // Farol do Fim: clima fog
    state.G.phases = [{ type: 'idle' }];
    state.Game.screen = 'play';
    state.G.machines = [];
    state.G.enemies = [];
    state.G.projs = [];
    expect(game.placeMachine('torradeira', 0, 0, true)).toBe(true);

    const longe = game.spawnEnemy('baiacu', 0, 1150);
    expect(longe).not.toBeNull();
    if (!longe) return;
    longe.speed = 0;
    for (let i = 0; i < 22; i++) game.update(0.1);
    expect(state.G.projs.filter((p) => p.kind === 'toast' && !p.enemy)).toHaveLength(0);

    const perto = game.spawnEnemy('baiacu', 0, 700);
    expect(perto).not.toBeNull();
    if (!perto) return;
    perto.speed = 0;
    for (let i = 0; i < 22; i++) game.update(0.1);
    expect(state.G.projs.filter((p) => p.kind === 'toast' && !p.enemy).length).toBeGreaterThan(0);
  });

  it('a tábua de reserva reposiciona o invasor em vez de gastar tudo no mesmo quadro', () => {
    state.Game.startCampaign(0);
    state.G.phases = [{ type: 'idle' }];
    state.Game.screen = 'play';
    state.G.enemies = [];
    state.G.shields = 1;
    const bicho = game.spawnEnemy('baiacu', 0, VX + 2);
    expect(bicho).not.toBeNull();
    if (!bicho) return;
    bicho.speed = 0;

    game.update(0.05);

    expect(state.G.shields).toBe(0);
    expect(state.G.enemies).toContain(bicho);
    expect(bicho.x).toBe(SPAWN_X);
  });

  it('o escuro do nevoeiro apaga sozinho, mesmo sem chefe', () => {
    state.Game.startCampaign(0);
    state.G.phases = [{ type: 'idle' }];
    state.Game.screen = 'play';
    state.G.dark = true;
    state.G.darkT = 0.05;

    game.update(0.1);

    expect(state.G.dark).toBe(false);
  });

  it('a explosão do Peixe-Bomba não apaga outro bicho por splice(-1)', () => {
    state.Game.startCampaign(0);
    state.G.phases = [{ type: 'idle' }];
    state.Game.screen = 'play';
    state.G.machines = [];
    state.G.enemies = [];
    expect(game.placeMachine('geladeira', 0, 4, true)).toBe(true);
    const geladeira = state.G.machines[0];
    const bomba = game.spawnEnemy('bomba', 0, geladeira.x + 15);
    const outro = game.spawnEnemy('baiacu', 1, 1100);
    expect(bomba).not.toBeNull();
    expect(outro).not.toBeNull();
    if (!bomba || !outro) return;
    bomba.speed = 0;
    outro.speed = 0;

    game.update(0.05);

    expect(state.G.enemies.includes(bomba)).toBe(false);
    expect(state.G.enemies.includes(outro)).toBe(true);
  });
});

describe('banca: desbloqueio de partida', () => {
  it('a peça liberada pelo Zé entra em isMachUnlocked e na banca', () => {
    state.G.deck = ['boia'];
    state.G.unlockedMach = { estilingue: true };

    expect(economia.isMachUnlocked('estilingue')).toBe(true);
    expect(economia.availableMachines()).toContain('estilingue');
  });
});

describe('save: recorde do Modo Chefe', () => {
  it('vitória grava bossBest no mapa jogado', () => {
    state.Game.startBoss(0);
    game.update(8.1); // prep -> intro
    game.update(2.7); // intro -> chefe
    const boss = state.G.boss;
    expect(boss).not.toBeNull();
    if (!boss) return;

    boss.hp = 1;
    game.damageEnemy(boss, 100, 'teste');
    for (let i = 0; i < 80 && state.Game.screen !== 'end'; i++) game.update(0.2);

    expect(SaveDB.slot.bossBest[0]).toBeGreaterThan(0);
  });
});
