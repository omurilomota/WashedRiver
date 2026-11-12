/**
 * storage.ts — persistência e metajogo.
 *
 * localStorage, 3 slots, nada de DOM. Tolera `file://`, navegação
 * anônima e save corrompido: no pior caso, começa limpo sem drama.
 *
 * FORMATO: a chave e o campo `v` são o contrato. Toda mudança de
 * formato precisa de uma entrada em `MIGRATIONS` e de teste — mandato 7
 * do AGENTS.md.
 */
import { ACHIEVEMENTS, MAPS, TREE } from '../data';
import type { TreeNode } from '../data/types';
import { dayKey } from '../core/rng';
import { clamp } from '../core/constants';

/** Chave no localStorage. Trocar a chave aqui exige migração explícita. */
export const KEY = 'marepodre_save_v3';

/** Versão atual do formato de save. */
export const SAVE_VERSION = 3;

export interface Slot {
  name: string;
  started: number;
  lastPlayed: number;
  /** Maior índice de mapa liberado. */
  campaign: number;
  stars: Record<string, number>;
  best: Record<string, number>;
  /** Moeda meta. Nunca reseta. */
  oldScrap: number;
  tree: Record<string, number>;
  seenB: Record<string, number>;
  seenM: Record<string, number>;
  ach: Record<string, number>;
  endings: Record<string, string>;
  flags: Record<string, unknown>;
  daily: { date: string; score: number };
  endlessBest: Record<string, number>;
  bossBest: Record<string, number>;
  runs: number;
  kills: number;
  minutes: number;
  [key: string]: unknown;
}

export interface Options {
  master: number;
  music: number;
  sfx: number;
  shake: number;
  cb: number;
  font: number;
  mute: number;
}

export interface SaveData {
  v: number;
  active: number;
  options: Options;
  slots: Slot[];
}

/** Efeitos agregados dos nós comprados na árvore. */
export interface TreeEffects {
  startScrap: number;
  extraOffer: boolean;
  repair: number;
  shield: number;
  machineHp: number;
  discount: number;
  luck: number;
  unlocks: Record<string, boolean>;
  metaBonus: number;
  startBoias: number;
  bossSecond: boolean;
  [key: string]: unknown;
}

const SLOT_COUNT = 3;

function defaultOptions(): Options {
  return { master: 0.9, music: 0.62, sfx: 0.85, shake: 1, cb: 0, font: 1.15, mute: 0 };
}

/** Um slot novo. Todo campo tem fallback em `ensure()`. */
function blankSlot(n: number): Slot {
  return {
    name: `SLOT ${n + 1}`,
    started: Date.now(),
    lastPlayed: 0,
    campaign: 0,
    stars: {},
    best: {},
    oldScrap: 0,
    tree: {},
    seenB: {},
    seenM: {},
    ach: {},
    endings: {},
    flags: {},
    daily: { date: '', score: 0 },
    endlessBest: { 0: 0, 1: 0, 2: 0 },
    bossBest: {},
    runs: 0,
    kills: 0,
    minutes: 0,
  };
}

function blankData(): SaveData {
  return {
    v: SAVE_VERSION,
    active: 0,
    options: defaultOptions(),
    slots: [blankSlot(0), blankSlot(1), blankSlot(2)],
  };
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Migrações de formato. A chave é a versão de destino.
 *
 * Exemplo de migração futura:
 *   4: (d) => { d.slots.forEach(s => { s.flags = s.flags || {} }); return d; }
 */
const MIGRATIONS: Record<number, (d: SaveData) => SaveData> = {};

function migrate(data: SaveData): SaveData {
  let d = data;
  while (d.v < SAVE_VERSION) {
    const step = MIGRATIONS[d.v + 1];
    if (!step) break;
    d = step(d);
  }
  d.v = SAVE_VERSION;
  return d;
}

/** Preenche campos que faltam (save antigo / dados parciais). */
function ensure(s: Partial<Slot> | undefined, i: number): Slot {
  const b = blankSlot(i);
  const out = Object.assign(b, s || {}) as Slot;
  out.stars = out.stars || {};
  out.best = out.best || {};
  out.tree = out.tree || {};
  out.seenB = out.seenB || {};
  out.seenM = out.seenM || {};
  out.ach = out.ach || {};
  out.endings = out.endings || {};
  out.flags = out.flags || {};
  out.daily = out.daily || { date: '', score: 0 };
  out.endlessBest = Object.assign({ 0: 0, 1: 0, 2: 0 }, out.endlessBest || {});
  out.bossBest = out.bossBest || {};
  out.name = out.name || `SLOT ${i + 1}`;
  return out;
}

let data: SaveData = blankData();

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.slots) && parsed.slots.length === SLOT_COUNT) {
      data = migrate(parsed as SaveData);
      data.options = Object.assign(defaultOptions(), parsed.options || {});
      for (let i = 0; i < SLOT_COUNT; i++) data.slots[i] = ensure(data.slots[i], i);
    }
  }
} catch {
  // save quebrado: começa limpo, sem drama
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // modo privado: joga sem salvar
  }
}

/** Custo crescente do nó: cada nível encarece um pouco. */
function costOf(node: TreeNode, lvl: number): number {
  return Math.round(node.cost * Math.pow(1.55, lvl || 0));
}

export const SaveDB = {
  get data(): SaveData {
    return data;
  },
  get options(): Options {
    return data.options;
  },
  get slot(): Slot {
    return data.slots[data.active];
  },
  get slotIndex(): number {
    return data.active;
  },
  save: persist,

  ensureAll(): void {
    for (let i = 0; i < SLOT_COUNT; i++) data.slots[i] = ensure(data.slots[i], i);
    persist();
  },
  setSlot(i: number): void {
    if (i >= 0 && i < SLOT_COUNT) {
      data.active = i;
      persist();
    }
  },
  resetSlot(i: number): void {
    data.slots[i] = blankSlot(i);
    if (data.active === i) data.active = i;
    persist();
  },
  slotInfo(i: number): Slot {
    return data.slots[i] || blankSlot(i);
  },

  // ---- sucata velha e progresso ----
  addScrap(n: number): number {
    const s = SaveDB.slot;
    s.oldScrap = Math.max(0, (s.oldScrap || 0) + Math.round(n));
    persist();
    return s.oldScrap;
  },
  unlockMap(i: number): void {
    const s = SaveDB.slot;
    if (i > s.campaign) {
      s.campaign = i;
      s.flags[`viu_mapa${i}`] = true;
      persist();
    }
  },
  setStars(map: number, best: number, stars: number): void {
    const s = SaveDB.slot;
    s.stars[map] = Math.max(s.stars[map] || 0, stars || 0);
    s.best[map] = Math.max(s.best[map] || 0, best || 0);
    persist();
  },
  /**
   * Apaga o progresso de um mapa específico.
   *
   * Zera estrelas e melhor tempo daquele mapa e rebobina a campanha para ele
   * (se o jogador já passou), então o mapa some da lista de "liberados" e é
   * preciso jogar de novo. Sucata velha, árvore, conquistas e bestiário
   * ficam — são meta, não progresso de mapa.
   */
  resetMapa(i: number): void {
    const s = SaveDB.slot;
    const mapa = clamp(Math.round(i), 0, MAPS.length - 1);
    delete s.stars[mapa];
    delete s.best[mapa];
    if (s.campaign > mapa) s.campaign = mapa;
    persist();
  },
  setEnding(id: string, text: string): void {
    const s = SaveDB.slot;
    if (!s.endings[id]) {
      s.endings[id] = text;
      persist();
    }
  },
  /** Chamado no fim de qualquer partida. */
  finishRun(summary: { kills?: number; time?: number }): void {
    const s = SaveDB.slot;
    s.runs = (s.runs || 0) + 1;
    s.kills = (s.kills || 0) + (summary.kills || 0);
    s.minutes = (s.minutes || 0) + Math.round((summary.time || 0) / 60);
    s.lastPlayed = Date.now();
    persist();
  },

  // ---- árvore ----
  nodeLvl(id: string): number {
    return SaveDB.slot.tree[id] || 0;
  },
  buyNode(id: string): boolean {
    const node = TREE.find((n) => n.id === id);
    if (!node) return false;
    // Pré-requisito: o nó que abre este já precisa estar comprado.
    // (O campo existe no tipo desde o começo; a compra nunca olhava
    // para ele — a árvore podia ser comprada na ordem errada.)
    if (node.req && !SaveDB.nodeLvl(node.req)) return false;
    const cur = SaveDB.nodeLvl(id);
    if (cur >= node.max) return false;
    const cost = costOf(node, cur);
    if (SaveDB.slot.oldScrap < cost) return false;
    SaveDB.slot.oldScrap -= cost;
    SaveDB.slot.tree[id] = cur + 1;
    persist();
    return true;
  },
  costOf,

  // ---- bestiário / galeria / conquistas ----
  seenEnemy(id: string): void {
    if (id && !SaveDB.slot.seenB[id]) {
      SaveDB.slot.seenB[id] = 1;
      persist();
    }
  },
  seenMach(id: string): void {
    if (id && !SaveDB.slot.seenM[id]) {
      SaveDB.slot.seenM[id] = 1;
      persist();
    }
  },
  achievement(id: string): boolean {
    if (!id) return false;
    // Só conta conquista que existe na lista: id solto viraria uma
    // entrada invisível e quebraria a contagem da tela de saves.
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return false;
    if (SaveDB.slot.ach[id]) return false;
    SaveDB.slot.ach[id] = Date.now();
    persist();
    return true;
  },
  hasAch(id: string): boolean {
    return !!SaveDB.slot.ach[id];
  },
  record(mode: string, score: { map?: number; time?: number }): void {
    const s = SaveDB.slot;
    if (mode === 'endless') {
      const d = (s.flags.endlessDiff as number) || 0;
      s.endlessBest[d] = Math.max(s.endlessBest[d] || 0, score.time || 0);
    } else if (mode === 'boss' && score.map !== undefined) {
      s.bossBest[score.map] = Math.min(s.bossBest[score.map] || 9999, score.time || 0);
    }
    persist();
  },
  recordDaily(score: number): void {
    const s = SaveDB.slot;
    const today = dayKey();
    if (s.daily.date !== today) s.daily = { date: today, score: 0 };
    s.daily.score = Math.max(s.daily.score, score);
    persist();
  },

  // ---- opções ----
  opt(k: string, v: unknown): void {
    (data.options as unknown as Record<string, unknown>)[k] = v;
    persist();
  },

  /**
   * Efeitos agregados da árvore, consultados no início da partida.
   */
  eff(): TreeEffects {
    const e: TreeEffects = {
      startScrap: 0,
      extraOffer: false,
      repair: 0,
      shield: 0,
      // Bônus, não multiplicador: a peça nasce com o HP do dado e cada
      // nível da árvore soma um pouco. (Com 1 aqui, toda peça nascia
      // com o dobro da vida — e a árvore somava em cima.)
      machineHp: 0,
      discount: 0,
      luck: 0,
      unlocks: {},
      metaBonus: 0,
      startBoias: 0,
      bossSecond: false,
    };
    for (const n of TREE) {
      const lvl = SaveDB.nodeLvl(n.id);
      if (!lvl) continue;
      if (n.unlock) e.unlocks[n.unlock] = true;
      if (!n.per) continue;
      for (const k in n.per) {
        const key = k as keyof TreeEffects;
        const value = n.per[k as keyof typeof n.per];
        if (typeof value === 'number') {
          (e[key] as number) = ((e[key] as number) || 0) + value * lvl;
        } else if (typeof value === 'boolean') {
          (e[key] as unknown) = true;
        }
      }
    }
    return e;
  },
};

export { clone };
