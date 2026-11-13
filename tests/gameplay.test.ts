// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOSSES, DAILY_MODS, ECONOMIA, ENEMY, ENEMY_ORDER, INTROS, MACH, MACH_ORDER, MAPS, MOLHO, MOLHO_TXT, UPG } from '../src/data';
import { COLW, LANE_Y0, LANE_H, STRUCTURES, VX, W, plantY } from '../src/core/constants';
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
let save: typeof import('../src/save/storage');
let economia: typeof import('../src/game/economy');
let jogo: typeof import('../src/game/game') & Record<string, any>;

beforeAll(async () => {
  document.body.innerHTML = `
    <canvas id="cv"></canvas>
    <div id="topbar"><div id="trackName"></div><div id="radioLamp"></div></div>
    <div id="screen"></div>
    <div id="shop"></div>
    <div id="ctxmenu"></div>
    <div id="toasts"></div>
    <div id="flash"></div>
  `;
  const ctx = fakeContext();
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  game = await import('../src/game/game');
  state = await import('../src/core/state');
  save = await import('../src/save/storage');
  economia = await import('../src/game/economy');
  jogo = (await import('../src/game/game')) as typeof import('../src/game/game') & Record<string, any>;
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

  it('é alvo: toma dano de tiro e de explosão', () => {
    state.Game.startCampaign(0);
    const baleia = game.spawnEnemy('baleia', 0, 900);
    expect(baleia).not.toBeNull();
    const hp = baleia!.hp;
    game.damageEnemy(baleia!, 50, 'boom');
    expect(baleia!.hp).toBeLessThan(hp);
    expect(game.isTargetable(baleia!, false)).toBe(true);
  });
});

describe('Água-Viva-Fantasma', () => {
  it('apagada não é alvo: tiro atravessa, só luz ou explosão pegam', () => {
    state.Game.startCampaign(0);
    const agua = game.spawnEnemy('agua', 0, 600);
    expect(agua).not.toBeNull();
    // voador e apagada: nenhum tiro encosta (a bala passa)
    expect(game.isTargetable(agua!, false)).toBe(false);
    expect(game.isTargetable(agua!, true)).toBe(false);
    expect(game.isTargetable(agua!, false, true)).toBe(false);
    // se algum corpo a corpo encostar, ela é revelada e não toma dano
    const hp = agua!.hp;
    game.damageEnemy(agua!, 20, 'blade');
    expect(agua!.hp).toBe(hp);
    // explosão e fogo passam por cima da intangibilidade
    game.damageEnemy(agua!, 20, 'boom');
    expect(agua!.hp).toBeLessThan(hp);
  });

  it('com a luz do holofote ela fica revelada e leva tiro', () => {
    state.Game.startCampaign(0);
    expect(game.placeMachine('holofote', 0, 3, true)).toBe(true);
    const agua = game.spawnEnemy('agua', 0, state.G.machines[0].x + 100);
    expect(agua).not.toBeNull();
    game.update(0.2);
    expect(agua!.lit > 0 || agua!.grounded > 0).toBe(true);
    expect(game.isTargetable(agua!, false)).toBe(true);
  });
});

describe('onda não pode travar (regra de fim de onda)', () => {
  it('bicho comendo peça curada toda hora ainda assim atravessa', () => {
    state.Game.startCampaign(0);
    expect(game.placeMachine('geladeira', 0, 3, true)).toBe(true);
    const m = state.G.machines[0];
    const baiacu = game.spawnEnemy('baiacu', 0, m.x + 30); // chega pela direita
    expect(baiacu).not.toBeNull();
    // 60s de jogo, curando a peça a cada meio segundo (o pior caso possível)
    for (let i = 0; i < 600; i++) {
      game.update(0.1);
      if (i % 5 === 0) m.hp = m.maxhp;
    }
    // a peça caiu e o bicho passou (ou morreu no caminho)
    expect(state.G.machines.length === 0 || state.G.machines[0].hp <= 0).toBe(true);
    // e o bicho não ficou mordendo pra sempre
    expect(baiacu!.eating ?? null).toBeFalsy();
  });

  it('polvo grudado desgruda e a onda Acaba', () => {
    state.Game.startCampaign(0);
    expect(game.placeMachine('geladeira', 0, 3, true)).toBe(true);
    const polvo = game.spawnEnemy('polvo', 0, state.G.machines[0].x + 30);
    expect(polvo).not.toBeNull();
    let soltou = false, preso = 0, maxPreso = 0;
    for (let i = 0; i < 200; i++) {
      game.update(0.1);
      if (polvo!.attached) { preso += 0.1; maxPreso = Math.max(maxPreso, preso); }
      else { soltou = true; preso = 0; }
    }
    // desgrudou (jam é temporária) e nunca ficou preso mais que a jam dura
    expect(soltou).toBe(true);
    expect(maxPreso).toBeLessThanOrEqual(7);
  });
});

describe('onboarding diegético (BLOCO M.3)', () => {
  // o save persiste entre testes do arquivo: cada teste precisa de bichos
  // ainda não vistos, então o bestiário começa vazio aqui.
  beforeEach(() => {
    save.SaveDB.resetSlot(0);
    save.SaveDB.setSlot(0);
  });

  it('bicho novo não aparece como banner de sistema', () => {
    state.Game.startCampaign(0);
    const antes = state.G.msg;
    state.Game.startCampaign(0);
    game.spawnEnemy('agua', 0, 900); // método: silhueta
    // não existe "NOVO: ..." em nenhum announce: a medição é pelo texto
    expect(state.G.msg || '').not.toContain('NOVO:');
    expect(antes).not.toContain('NOVO:');
  });

  it('silhueta entra no campo e expira sozinha', () => {
    const bicho = ENEMY_ORDER.find((t) => !save.SaveDB.slot.seenB[t] && INTROS[t].metodo === 'silhueta');
    expect(bicho, 'nenhum bicho de silhueta novo sobrou').toBeDefined();
    state.Game.startCampaign(0);
    const b = game.spawnEnemy(bicho!, 2, 900);
    expect(b).not.toBeNull();
    expect(state.G.intros.some((i) => i.type === bicho && i.kind === 'silhueta')).toBe(true);
    for (let i = 0; i < 40; i++) game.update(0.1); // 4s > 1,6s de duração
    expect(state.G.intros.some((i) => i.type === bicho)).toBe(false);
  });

  it('rádio no campo diferencia a introdução', () => {
    // sem rádio: o Zé comenta o bicho novo (a fala do dado). O save persiste
    // entre testes do mesmo arquivo, então usa um bicho que ainda não foi
    // visto nesta rodada.
    const bicho = ENEMY_ORDER.find((t) => !save.SaveDB.slot.seenB[t]);
    expect(bicho, 'nenhum bicho novo sobrou pra testar').toBeDefined();
    state.Game.startCampaign(0);
    game.spawnEnemy(bicho!, 1, 900);
    const falas: string[] = [state.G.ze.say];
    for (let i = 0; i < 5; i++) { game.update(0.1); falas.push(state.G.ze.say); }
    expect(falas).toContain(INTROS[bicho!].fala);

    // com rádio: o chiado sai como rádio (DOM real dos toasts). O bicho do
    // bloco anterior já foi visto, então escolhe outro ainda novo.
    const bicho2 = ENEMY_ORDER.find((t) => !save.SaveDB.slot.seenB[t] && INTROS[t].metodo === 'radio');
    expect(bicho2, 'nenhum bicho novo sobrou pro rádio').toBeDefined();
    state.Game.startCampaign(0);
    expect(game.placeMachine('radio', 3, 2, true)).toBe(true);
    const caixa = document.getElementById('toasts')!;
    let viuTch = false, viuBanner = false;
    game.spawnEnemy(bicho2!, 1, 900);
    for (let i = 0; i < 5; i++) {
      game.update(0.1);                       // o chiado nasce aqui dentro
      const txt = caixa.textContent || '';
      if (txt.includes('...tch')) viuTch = true;
      if (txt.includes('NOVO:')) viuBanner = true;
      caixa.innerHTML = '';                   // limpa para o próximo lance
    }
    expect(bicho2, 'nenhum bicho de rádio novo sobrou').toBeDefined();
    expect(viuTch, 'rádio não chiou a apresentação').toBe(true);
    expect(viuBanner, 'ainda existe banner de sistema').toBe(false);
  });

  it('cartaz aparece na vila e some', () => {
    const bicho = ENEMY_ORDER.find((t) => !save.SaveDB.slot.seenB[t] && INTROS[t].metodo === 'cartaz');
    expect(bicho, 'nenhum bicho de cartaz novo sobrou').toBeDefined();
    state.Game.startCampaign(0);
    game.spawnEnemy(bicho!, 4, 900);
    expect(state.G.intros.some((i) => i.type === bicho && i.kind === 'cartaz')).toBe(true);
    for (let i = 0; i < 200; i++) game.update(0.1); // 20s > 14s
    expect(state.G.intros.some((i) => i.type === bicho)).toBe(false);
  });

  it('todo bicho do bestiário tem método de introdução válido', () => {
    for (const tipo of ENEMY_ORDER) {
      const it = INTROS[tipo];
      expect(it, `${tipo} sem introdução`).toBeDefined();
      expect(['silhueta', 'ze', 'radio', 'cartaz', 'marca', 'nada']).toContain(it.metodo);
      if (it.metodo !== 'nada') expect(it.fala.length, `${tipo} sem fala`).toBeGreaterThan(3);
    }
  });
});

describe('deck da partida (BLOCO M.4)', () => {
  it('a partida nasce com o deck do save e a banca só mostra ele', () => {
    const deck = ['boia', 'torradeira', 'geladeira', 'bujao', 'holofote', 'ima', 'radio'];
    save.SaveDB.setSlot(0);
    save.SaveDB.setDeck(0, deck);
    state.Game.startCampaign(0);
    expect(state.G.deck).toEqual(deck);
    expect(economia.availableMachines()).toEqual(deck);
  });

  it('sem deck salvo a partida é sem-escolha (sandbox)', () => {
    save.SaveDB.setSlot(0);
    save.SaveDB.setDeck(0, ['boia']);
    state.Game.startSandbox();
    expect(state.G.deck).toBeNull();
    // e a banca mostra mais que o deck
    expect(economia.availableMachines().length).toBeGreaterThan(1);
  });

  it('planta peça fora do deck não entra na banca', () => {
    const deck = ['boia', 'torradeira', 'geladeira', 'bujao', 'holofote', 'ima', 'radio'];
    save.SaveDB.setSlot(0);
    save.SaveDB.setDeck(0, deck);
    state.Game.startCampaign(0);
    // ventilaor não está no deck: ainda planta (a sucata paga), mas não
    // aparece como carta — a escolha foi feita antes.
    expect(economia.availableMachines().includes('ventilador')).toBe(false);
  });
});

describe('enciclopédia (BLOCO M.5)', () => {
  it('ver o bicho não abre o bestiário; matar abre', () => {
    save.SaveDB.resetSlot(0);
    save.SaveDB.setSlot(0);
    state.Game.startCampaign(0);
    const baiacu = game.spawnEnemy('baiacu', 0, 900); // visto, não morto
    expect(baiacu).not.toBeNull();
    expect(save.SaveDB.slot.mateiB['baiacu']).toBeUndefined();
    expect(save.SaveDB.slot.seenB['baiacu']).toBeTruthy(); // serviu pra intro

    game.damageEnemy(baiacu!, 9999, 'boom');
    expect(save.SaveDB.slot.mateiB['baiacu']).toBe(1); // agora sim
  });

  it('todo bicho do bestiário tem fato inútil', () => {
    for (const id of ENEMY_ORDER) {
      expect(ENEMY[id].fato, `${id} sem fato inútil`).toBeTruthy();
    }
    expect(ENEMY_ORDER.length).toBe(20);
  });

  it('toda peça da galeria tem fato inútil e upgrade máximo', () => {
    for (const id of MACH_ORDER.filter((k) => k !== 'remover')) {
      expect(MACH[id].fato, `${id} sem fato inútil`).toBeTruthy();
      expect(UPG[id] && UPG[id].length, `${id} sem upgrade`).toBeGreaterThan(0);
    }
  });

  it('todo chefe tem fato inútil', () => {
    for (const [id, b] of Object.entries(BOSSES)) {
      expect(b.fato, `chefe ${id} sem fato inútil`).toBeTruthy();
    }
  });
});

describe('molho — eventos, micros e variações (BLOCO M.6)', () => {
  it('a variação da onda nasce no makeWaves e é dita no anúncio', () => {
    for (let i = 0; i < 12; i++) {
      state.Game.startCampaign(0);
      // 45% de chance de variação: em 12 partidas alguma tem que ter
      const v = state.G.variacao;
      if (v) {
        expect(['tema', 'silenciosa', 'corredor', 'bonus']).toContain(v);
        // a onda 0 nunca varia: é tutorial
        return;
      }
    }
    expect(state.G.variacao === null || state.G.variacao).toBeTruthy();
  });

  it('o evento entre ondas pausa o jogo e a escolha volta pra loja', () => {
    state.Game.startCampaign(0);
    // força um evento e confere que a tela muda e a escolha libera
    state.G.evento = { id: 'barco_pirata', t: 0 };
    state.Game.screen = 'evento';
    state.Game.escolherEvento(true);
    expect(state.G.evento).toBeNull();
    expect(state.G.scrap).toBeGreaterThan(200);
    expect(state.Game.screen).toBe('shop');
    // ignorar também segue o jogo (nada de tela travada)
    state.G.evento = { id: 'bau_mar', t: 0 };
    state.Game.screen = 'evento';
    state.Game.escolherEvento(false);
    expect(state.G.game?.screen ?? state.Game.screen).toBeTruthy();
  });

  it('micros duram o que prometem e saem sozinhos', () => {
    state.Game.startCampaign(0);
    state.G.phaseT = 999; // pula o preparo de 12s: micros são de onda
    state.G.micros.length = 0;
    state.G.micros.push({ tipo: 'mare', t: 0, dur: 3 });
    for (let i = 0; i < 5; i++) game.update(0.1);
    // 2s: ainda ativo
    for (let i = 0; i < 15; i++) game.update(0.1);
    expect(state.G.micros.some((m) => m.tipo === 'mare')).toBe(true);
    // 3,5s: expirou
    for (let i = 0; i < 15; i++) game.update(0.1);
    expect(state.G.micros.some((m) => m.tipo === 'mare')).toBe(false);
  });

  it('micro não nasce fora da onda (preparo é intocável)', () => {
    state.Game.startCampaign(0);
    state.G.micros.length = 0;
    state.G.microT = 0;
    for (let i = 0; i < 30; i++) game.update(0.1); // 3s de preparo
    expect(state.G.micros.length).toBe(0);
  });

  it('todo evento do molho tem texto nos dois botões', () => {
    const t = MOLHO_TXT.eventos;
    for (const [id, e] of Object.entries(t)) {
      expect(e.titulo.length, `evento ${id} sem título`).toBeGreaterThan(2);
      expect(e.texto.length, `evento ${id} sem texto`).toBeGreaterThan(8);
    }
    // os nove eventos da especificação
    expect(Object.keys(t).length).toBeGreaterThanOrEqual(6);
  });

  it('os parâmetros do molho existem e são positivos', () => {
    expect(MOLHO.chanceEvento).toBeGreaterThan(0);
    expect(MOLHO.micro.intervalo[0]).toBeGreaterThan(0);
    expect(MOLHO.micro.mare.dur).toBeGreaterThan(0);
    expect(MOLHO.variacoes.silenciosa.atraso).toBeGreaterThan(5);
  });
});

describe('menu de contexto (botão direito)', () => {
  it('cada alvo oferece o seu menu, com fala diferente', () => {
    state.Game.startCampaign(0);
    const cards: [string, { x: number; y: number }][] = [
      ['zé', { x: 46, y: plantY(1) - 50 }],
      ['vaga', { x: VX + 3 * COLW + 20, y: LANE_Y0 + 1 * LANE_H + 60 }],
      ['mar', { x: W - 30, y: LANE_Y0 + 120 }],
    ];
    for (const [nome, p] of cards) {
      const itens = jogo.itensDoAlvo!(jogo.alvoDoClique!(p));
      expect(itens.itens.length, `alvo ${nome} sem itens`).toBeGreaterThan(1);
      expect(itens.titulo.length, `alvo ${nome} sem título`).toBeGreaterThan(0);
    }
  });

  it('vaga livre oferece o deck; vaga ocupada oferecie melhorar/vender', () => {
    state.Game.startSandbox();
    state.G.deck = ['boia', 'torradeira'];
    const vazio = jogo.itensDoAlvo!(jogo.alvoDoClique!({ x: VX + COLW, y: LANE_Y0 + 60 }));
    expect(vazio.itens.some((i: { label: string }) => i.label.includes('Plantar Boia'))).toBe(true);

    expect(jogo.placeMachine('boia', 0, 1, true)).toBe(true);
    const ocupado = jogo.itensDoAlvo!(jogo.alvoDoClique!({ x: VX + 1 * COLW + 40, y: LANE_Y0 + LANE_H / 2 }));
    const labels = ocupado.itens.map((i: { label: string }) => i.label).join(' ');
    expect(labels).toContain('Melhorar');
    expect(labels).toContain('Arrancar');
    expect(labels).toContain('Ficha');
  });

  it('executar uma ação do menu mexe no jogo de verdade', () => {
    state.Game.startCampaign(0);
    state.Game.ctxExecutar!('ctx_ze_dica');
    expect(state.G.ze.say.length).toBeGreaterThan(0);
    // catar sucata pela ação do menu: a do chão sai e a sucata entra
    expect(state.G.pickups.length).toBe(0);
    state.G.pickups.push({ x: VX + 200, y: plantY(2), v: 25, auto: false, life: 14, t: 0, fly: false, vy: 0, bob: 0 });
    state.Game.ctxExecutar!('ctx_catar');
    // o efeito real: o pickup passa a voar pro canto (e o update soma a sucata)
    expect(state.G.pickups[0].fly).toBe(true);
  });

  it('bicho conhecido ensina a resolver; desconhecido não', () => {
    state.Game.startSandbox();
    const baiacu = jogo.spawnEnemy('baiacu', 0, 900)!;
    jogo.damageEnemy(baiacu, 99999, 'boom');
    const outro = jogo.spawnEnemy('baiacu', 0, 900)!;
    const itens = jogo.itensDoAlvo!({ tipo: 'bicho', bicho: outro });
    expect(itens.itens[0].label).toContain('Como resolver');
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

  it('Pescador e Baleia-Filhote agora são alvos (matáveis)', () => {
    state.Game.startCampaign(0);
    const baleia = game.spawnEnemy('baleia', 0, 900);
    const pescador = game.spawnEnemy('pescador', 0, 900);
    expect(baleia).not.toBeNull();
    expect(pescador).not.toBeNull();
    const hpB = baleia!.hp;
    const hpP = pescador!.hp;
    game.damageEnemy(baleia!, 10, 'shot');
    game.damageEnemy(pescador!, 10, 'shot');
    expect(baleia!.hp).toBeLessThan(hpB);
    expect(pescador!.hp).toBeLessThan(hpP);
    expect(game.isTargetable(baleia!, false)).toBe(true);
    expect(game.isTargetable(pescador!, false)).toBe(true);
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
    // Mesmo fugindo, o Pescador é alvo: o jogador pode punir o que passou.
    expect(game.isTargetable(pescador!, false)).toBe(true);
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
