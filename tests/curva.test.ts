// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { MAPS } from '../src/data';

/**
 * Curva de dificuldade (BLOCO M.2).
 *
 * Um "jogador razoável" joga os 6 mapas de verdade dentro do jsdom: planta
 * um deck fixo na ordem que dá, espera a sucata, e o teste conta quantas
 * peças e estruturas caíram em cada onda. É a tabela que a decisão pede —
 * e a garantia de que a onda 1 continua passável sem suar.
 *
 * Números em `src/data/balance.json` (`dificuldade`), nunca soltos aqui.
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
        (target as Record<string, unknown>)[String(prop)] = value;
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
  HTMLCanvasElement.prototype.getContext = (() =>
    fakeContext()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  game = await import('../src/game/game');
  state = await import('../src/core/state');
});

/**
 * Deck de referência: primeiro uma parede em cada uma das 6 lanes
 * (torradeira + geladeira), depois apoio. É o que um jogador razoável faz:
 * não deixa corredor vazio.
 */
const PLANO: [string, number, number][] = [];
for (let l = 0; l < 6; l++) {
  PLANO.push(['torradeira', l, 4], ['geladeira', l, 5]);
}
PLANO.push(
  ['holofote', 2, 3], ['bujao', 1, 6], ['bujao', 4, 6], ['ventilador', 3, 3],
  ['boia', 1, 3], ['radio', 4, 6], ['ima', 2, 2], ['torradeira', 2, 3],
  ['bujao', 3, 6], ['ventilador', 4, 3], ['espelho', 5, 3], ['estilingue', 1, 2],
);

/** resultado de uma partida medida em peças/estruturas por fase. */
type Medicao = {
  pecasPorFase: number[];
  estruturasPorFase: number[];
  pecasTotal: number;
  estruturasTotal: number;
  venceu: boolean;
  passos: number;
};

/** Roda uma partida inteira com o jogador de referência e mede as perdas. */
function medir(mapIdx: number): Medicao {
  state.Game.startCampaign(mapIdx);
  let proxima = 0;
  let fase = state.G.phaseIdx;
  let vivas = state.G.machines.length;
  let mortesPecas = 0;
  let mortesEstruturas = state.G.destroyed.length;
  let registradasPecas = 0;
  const pecasPorFase: number[] = [];
  const estruturasPorFase: number[] = [];
  let passos = 0;

  while (!state.G.over && passos < 30000) {
    // a loja entre ondas: compra o que salva a pele e escolhe uma oferta
    if (state.Game.screen === 'shop') {
      const mortas = state.G.structures.flat().filter((s) => !s.alive).length;
      if (mortas > 0 && state.G.scrap >= 150) state.Game.buyShopItem('reforco');
      if (state.G.scrap >= 220) state.Game.buyShopItem('tabua');
      state.Game.chooseOffer(0);
    }
    game.update(0.1);
    passos++;
    // morte é morte: conta a queda do contador, não o saldo da fase
    if (state.G.machines.length < vivas) mortesPecas += vivas - state.G.machines.length;
    vivas = state.G.machines.length;
    // o jogador de referência planta sempre que a sucata dá
    if (passos % 5 === 0 && proxima < PLANO.length) {
      const [k, l, c] = PLANO[proxima];
      if (game.placeMachine(k, l, c)) proxima++;
      else if ((state.G.cds[k] || 0) > 0) proxima++;
    }
    if (state.G.phaseIdx !== fase) {
      pecasPorFase.push(mortesPecas - registradasPecas);
      registradasPecas = mortesPecas;
      estruturasPorFase.push(Math.max(0, state.G.destroyed.length - mortesEstruturas));
      mortesEstruturas = state.G.destroyed.length;
      fase = state.G.phaseIdx;
    }
  }
  // diagnóstico: por que parou (só aparece quando a mediada não fecha)
  if (pecasPorFase.length < 4) {
    console.log(
      `[curva] ${MAPS[mapIdx].id}: parou com fase=${state.G.phaseIdx} ` +
        `passos=${passos} over=${state.G.over} tela=${state.Game.screen} ` +
        `inimigos=${state.G.enemies.map((e) => e.type + '(' + Math.round(e.x) + ')').join(',')} maquinas=${state.G.machines.length} ` +
        `estruturas=${12 - state.G.destroyed.length}/12`,
    );
  }

  return {
    pecasPorFase,
    estruturasPorFase,
    pecasTotal: mortesPecas,
    estruturasTotal: state.G.destroyed.length,
    venceu: !state.G.over,
    passos,
  };
}

/** Nome curto da fase para a tabela. */
const FASES = ['onda 1', 'onda 2', 'onda 3', 'respira', 'chefe'];

describe('curva de dificuldade: onda 1 é tutorial, onda 3 é teste', () => {
  it('a onda 1 de cada mapa passa sem perder peça', () => {
    for (let i = 0; i < MAPS.length; i++) {
      const m = medir(i);
      const perdidasOnda1 = m.pecasPorFase[0] ?? 0;
      expect(
        perdidasOnda1,
        `${MAPS[i].id}: onda 1 perdeu ${perdidasOnda1} peça(s) — deveria ser 0`,
      ).toBe(0);
    }
  });

  it('a partida toda não vira massacre (e o chefe é o pico)', () => {
    for (let i = 0; i < MAPS.length; i++) {
      const m = medir(i);
      const noChefe = m.pecasPorFase[4] ?? 0;
      // o bot de referência não é jogador bom: 12 é o teto de "perdeu feio",
      // e o chefe pode levar mais que as ondas — é o pico.
      expect(m.pecasTotal, `${MAPS[i].id}: perdeu ${m.pecasTotal} peças na partida`).toBeLessThanOrEqual(12);
      expect(
        noChefe,
        `${MAPS[i].id}: chefe derrubou ${noChefe} peças — pico demais`,
      ).toBeLessThanOrEqual(8);
      // o chefe é pico: não pode ser a fase mais branda da partida
      const fases = m.pecasPorFase.slice(0, 4);
      expect(noChefe).toBeGreaterThanOrEqual(Math.min(...fases, 99));
    }
  });

  it('tabela: peças e estruturas perdidas por fase, por mapa', () => {
    const linhas: string[] = [];
    for (let i = 0; i < MAPS.length; i++) {
      const m = medir(i);
      const pecas = m.pecasPorFase.map((n, k) => `${FASES[k] ?? 'fase ' + k}:${n}`).join(' ');
      const est = m.estruturasPorFase.map((n, k) => `${FASES[k] ?? 'fase ' + k}:${n}`).join(' ');
      linhas.push(`${MAPS[i].id.padEnd(10)} peças[${pecas}] estruturas[${est}] | venceu:${m.venceu ? 'sim' : 'não'}`);
    }
    console.log('\n=== curva medida (jogador de referência) ===\n' + linhas.join('\n'));
    expect(linhas.length).toBe(MAPS.length);
  });
});

describe('Noite Infinita', () => {
  it('começa com a mesma onda 1 da campanha', () => {
    state.Game.startCampaign(0);
    const campanha = state.G.waves[0];
    state.Game.startEndless({ level: 0, map: 0 });
    const infinita = state.G.waves[0];
    const dur = (w: readonly (readonly [number, string, number, number])[]) =>
      w.length ? w[w.length - 1][0] : 0;
    expect(infinita.length, 'mesma quantidade de bichos').toBe(campanha.length);
    // espaçamento equivalente (a randicidade do +/-1,5s entra na tolerância)
    const espaco = (w: readonly (readonly [number, string, number, number])[]) =>
      dur(w) / Math.max(1, w.length - 1);
    expect(espaco(infinita)).toBeGreaterThan(espaco(campanha) - 1.5);
    expect(espaco(infinita)).toBeLessThan(espaco(campanha) + 1.5);
  });

  it('o chefe aparece a cada 5 ondas, não a cada 3', () => {
    const pool = MAPS[0].pool;
    const comChefe: number[] = [];
    for (let n = 0; n < 10; n++) {
      const w = game.makeEndlessWave(n, pool);
      if (w.some((e) => e[1] === 'bento')) comChefe.push(n + 1);
    }
    // ondas 5 e 10 — nunca a 3
    expect(comChefe).toEqual([5, 10]);
  });

  it('a dificuldade sobe um degrau a cada 3 ondas (não a cada onda)', () => {
    const pool = MAPS[0].pool;
    const bichos = (n: number) => game.makeEndlessWave(n, pool).length;
    // a onda 1 é tutorial: pequena
    expect(bichos(0)).toBeLessThan(12);
    // cada degrau (3 ondas) acrescenta bicho de verdade
    expect(bichos(3)).toBeGreaterThan(bichos(0) + 2);
    expect(bichos(6)).toBeGreaterThan(bichos(3) + 2);
    expect(bichos(9)).toBeGreaterThan(bichos(6) + 2);
    // e a subida não é linear: ondas 1 e 2 ficam no mesmo patamar
    expect(bichos(2) - bichos(0)).toBeLessThan(bichos(3) - bichos(0));
  });
});
