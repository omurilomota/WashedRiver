/**
 * state.ts — o estado da partida.
 *
 * Um objeto só (`G`) com tudo que existe enquanto a maré está subindo.
 * Ele é substituído (`G = makeState(...)`) no início de cada partida, e
 * lido/mutado o tempo todo durante o loop.
 *
 * `Game` é o estado da aplicação (qual tela, se está pausada, o modal
 * aberto). Os métodos do jogo são pendurados nele pelo módulo de
 * gameplay — é assim que o legado global-scope vira dependência
 * explícita sem reescrever 4 mil linhas de uma vez.
 */
import type { DailyMod, MapDef } from '../data/types';

// ---------- entidades ----------

export interface Machine {
  type: string;
  lane: number;
  col: number;
  x: number;
  hp: number;
  maxhp: number;
  t: number;
  timer: number;
  anim: number;
  act: number;
  flash: number;
  jam: number;
  /** Peça revelada pelo Zé. */
  variant: string | null;
  dead?: boolean;
  /** Fogo do pneu em chamas. */
  fire?: number;
  up?: number;
  /** Segundos restantes de "agarrado" (gaivota-rei). */
  grabbed?: number;
  [key: string]: any;
}

export interface Enemy {
  type: string;
  lane: number;
  x: number;
  y?: number;
  hp: number;
  maxhp: number;
  speed: number;
  dps: number;
  scrap: number;
  r: number;
  anim: number;
  act: number;
  kb: number;
  slow: number;
  flash: number;
  lit: number;
  revealed: number;
  hypno: number;
  reflectT: number;
  air: boolean;
  /** Não é bicho: não é alvo e não toma dano (ver ADR 004). */
  neutral: boolean;
  /** Era gente: não se mata (ver ADR 004). */
  human: boolean;
  burrow: number;
  digCd: number;
  grounded: number;
  diveT: number;
  dived: boolean;
  jump: number;
  jumpCd: number;
  school: number;
  switching: boolean;
  switchT: number;
  grabbed: any;
  attached: any;
  carry: number;
  saved: boolean;
  spoke: string;
  buff: boolean;
  enraged: boolean;
  eating: any;
  biteT: number;
  flee: boolean;
  /** Chefe: id do chefe, fase, timers. */
  boss?: boolean;
  b?: string;
  /** Fase do chefe (1..7). Zero em criatura comum. */
  phase: number;
  phaseT: number;
  actT: number;
  rise: number;
  darkCd: number;
  inflate: boolean;
  inflT: number;
  maeT: number;
  dead?: boolean;
  [key: string]: any;
}

/**
 * Projétil em voo.
 *
 * O legado só usava `x, y, lane, vx, dmg, kind, enemy` (e `rot`/`silent`
 * em alguns casos). A forma está escrita como o jogo usa.
 */
export interface Projectile {
  x: number;
  y: number;
  lane: number;
  vx: number;
  dmg: number;
  kind: string;
  enemy: boolean;
  rot?: number;
  /** Estilingue: acerta fantasma. */
  silent?: boolean;
  [key: string]: any;
}

/** Rajada de vento (ventilador). */
export interface Wind {
  x: number;
  y: number;
  life: number;
  vx: number;
  [key: string]: any;
}

export interface Pickup {
  x: number;
  y: number;
  v: number;
  auto: boolean;
  life: number;
  t: number;
  fly: boolean;
  vy: number;
  bob: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  g: number;
}

export interface Decal {
  x: number;
  y: number;
  r: number;
  color: string;
  a: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface Structure {
  id: string;
  nome: string;
  msg: string;
  alive: boolean;
}

/**
 * Uma entrada de onda: `[tempo, tipo, lane, escala]`.
 *
 * O legado usava arrays soltos (não objetos), então a forma é uma tupla.
 * `_warned` marca a baleia-filhote que já avisou.
 */
export type WaveEntry = [number, string, number, number] & { _warned?: boolean };

export interface Phase {
  type: 'prep' | 'wave' | 'break' | 'bossIntro' | 'boss' | 'idle';
  dur?: number;
  msg?: string;
  n?: number;
  [key: string]: unknown;
}

export interface Hazard {
  kind: string;
  lane: number;
  /** Tempo desde o início do perigo. */
  t: number;
  /** Tempo de aviso antes de acontecer. */
  warn: number;
  /** Duração do perigo. */
  dur: number;
  /** Dano aplicado quando acontece. */
  dmg: number;
  phase?: number;
  /** Já aconteceu (não repete). */
  hit?: boolean;
  [key: string]: any;
}

/** Restos de uma criatura que morreu. */
export interface Death {
  type: string;
  x: number;
  y: number;
  lane: number;
  t: number;
  dur: number;
  dir?: number;
  swimBack?: boolean;
  b?: string;
  [key: string]: unknown;
}

/** Posição do mouse no canvas (coordenadas lógicas). */
export interface Pointer {
  x: number;
  y: number;
}

/** Uma oferta da Banca do Zé (escolha entre 3 ou 4). */
export interface Offer {
  kind: 'up' | 'unlock' | 'repair' | 'heal' | 'sucataVelha';
  /** Peça afetada (upgrade, desbloqueio). */
  k?: string;
  [key: string]: unknown;
}

/** Um item à venda na Banca do Zé. */
export interface ShopItem {
  id: string;
  nome: string;
  desc: string;
  cost: number;
}

export interface Props {
  x: number;
  lane: number;
  kind: string;
  anim: number;
  [key: string]: unknown;
}

export interface GameState {
  mode: 'campaign' | 'endless' | 'boss' | 'sandbox' | 'daily' | 'title';
  map: MapDef;
  mapIndex: number;
  t: number;
  scrap: number;
  resMult: number;

  machines: Machine[];
  enemies: Enemy[];
  projs: Projectile[];
  pickups: Pickup[];
  parts: Particle[];
  decals: Decal[];
  texts: FloatingText[];
  winds: Wind[];
  props: Props[];
  deaths: Death[];
  hazards: Hazard[];

  selected: string | null;
  cds: Record<string, number>;
  phaseIdx: number;
  phaseT: number;
  spawnIdx: number;
  tideT: number;
  shake: number;
  flash: number;
  msg: string;
  msgT: number;

  over: boolean;
  win: boolean;
  kills: number;
  collected: number;
  destroyed: string[];
  survived: number;

  structures: Structure[][];

  ze: { alive: boolean; say: string; sayT: number; nextSay: number; anim: number; repeat: number };
  zeSilent: number;
  zeHat: boolean;
  luAtWindow: boolean;
  toqAlive: boolean;
  toqSay: string;
  toqSayT: number;
  toqClicks: number;
  zeClicks: number;
  toqBoost: number;
  dogSay: number;
  luTalking: string;

  up: Record<string, number>;
  unlockedMach: Record<string, boolean>;
  dmgBonus: number;
  shields: number;
  repairBank: number;

  boss: Enemy | null;
  bossDeath: BossDeath | null;
  dark: boolean;
  darkT: number;

  fireT: number;
  geladeiraScene: boolean;
  pirate: boolean;
  radioClicks: number;
  placementCount: number;
  cabraCount: number;

  mods: Record<string, any>;
  daily: boolean;
  sandbox: boolean;
  dailyMods: DailyMod[];

  phases: Phase[];
  waves: WaveEntry[][];
  weekSeed: number;
  newSeen: string[];

  weather: string;
  lastSave: number;
  endingChoice: string | null;

  /** Multiplicadores de partida (noite infinita, mods do dia). */
  speedMult?: number;
  enemyHpMult?: number;
  hpBonus?: number;
  endlessDiff?: number;
  /** Aviso de baleia: `{ lane, t }` enquanto ela atravessa o campo. */
  baleiaWarn?: { lane: number; t: number } | null;
  [key: string]: any;
}

/** A morte do chefe: a cena que fica na tela antes do fim do mapa. */
export interface BossDeath {
  b: string;
  x: number;
  y: number;
  lane: number;
  t: number;
  dur: number;
}

// ---------- estado da aplicação ----------

export type Screen = 'title' | 'play' | 'pause' | 'end' | 'maps' | 'shop';

export interface GameApi {
  screen: Screen;
  paused: boolean;
  modal: string | null;
  runOpts: { kind?: string; map?: number; level?: number; [key: string]: unknown } | null;
  offers: Offer[];
  shopItems: ShopItem[];
  cardRects: { k: string; x: number; y: number; w: number; h: number }[];
  bossIntro: { b: string; t: number; dur: number; total: unknown } | null;
  /** Última posição do mouse no canvas. */
  mouse?: Pointer;
  /** Métodos pendurados pelo módulo de gameplay. */
  [key: string]: any;
}

/**
 * Estado da partida. Substituído no início de cada run — por isso é
 * `let`, e os módulos que importam veem a troca por live binding.
 */
export let G: GameState = emptyState();

/**
 * Troca o estado da partida.
 *
 * Um import ES é somente-leitura, então a atribuição passa por aqui.
 * Quem chama é sempre o módulo de gameplay, no início de uma run.
 */
export function setG(next: GameState): void {
  G = next;
}

function emptyState(): GameState {
  return {
    mode: 'title',
    map: {} as MapDef,
    mapIndex: 0,
    t: 0,
    scrap: 0,
    resMult: 1,
    machines: [],
    enemies: [],
    projs: [],
    pickups: [],
    parts: [],
    decals: [],
    texts: [],
    winds: [],
    props: [],
    deaths: [],
    hazards: [],
    selected: null,
    cds: {},
    phaseIdx: 0,
    phaseT: 0,
    spawnIdx: 0,
    tideT: 4,
    shake: 0,
    flash: 0,
    msg: '',
    msgT: 0,
    over: false,
    win: false,
    kills: 0,
    collected: 0,
    destroyed: [],
    survived: 0,
    structures: [],
    ze: { alive: true, say: '', sayT: 0, nextSay: 12, anim: 0, repeat: 0 },
    zeSilent: 0,
    zeHat: false,
    luAtWindow: true,
    toqAlive: true,
    toqSay: '',
    toqSayT: 0,
    toqClicks: 0,
    zeClicks: 0,
    toqBoost: 0,
    dogSay: 0,
    luTalking: '',
    up: {},
    unlockedMach: {},
    dmgBonus: 0,
    shields: 0,
    repairBank: 0,
    boss: null,
    bossDeath: null,
    dark: false,
    darkT: 0,
    fireT: 0,
    geladeiraScene: false,
    pirate: false,
    radioClicks: 0,
    placementCount: 0,
    cabraCount: 0,
    mods: {},
    daily: false,
    sandbox: false,
    dailyMods: [],
    phases: [],
    waves: [],
    weekSeed: 0,
    newSeen: [],
    weather: 'rain',
    lastSave: Date.now(),
    endingChoice: null,
  };
}

/** Estado da aplicação (tela, pausa, modal, cartas do HUD). */
export const Game: GameApi = {
  screen: 'title',
  paused: false,
  modal: null,
  runOpts: null,
  offers: [],
  shopItems: [],
  cardRects: [],
  bossIntro: null,
};
