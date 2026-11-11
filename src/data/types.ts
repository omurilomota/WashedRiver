/**
 * types.ts — o schema das tabelas de conteúdo.
 *
 * Espelha `balance.json` e `maps.json`. Se o JSON mudar de forma, este
 * arquivo muda junto — e o TypeScript reclama.
 */

// ---------- engenhocas ----------

export interface MachineDef {
  nome: string;
  cost: number;
  cd: number;
  hp: number;
  unlock: boolean;
  desc: string;
  sin: string;
  /** Peça única da partida, montada pelo Zé. */
  special?: boolean;
}

/**
 * Economia de partida (ADR 005).
 *
 * Os números do dinheiro moram aqui e em mais lugar nenhum: renda
 * passiva, encarecimento das peças, preço da melhoria, a conversão de
 * sucata em sucata velha, os preços da banca e a recompensa de meta.
 */
export interface EconomiaDef {
  /** Sucata por segundo, sozinha. */
  passiva: number;
  /** Multiplicador geral no custo das engenhocas. */
  fatorCustoMaquina: number;
  /** Custo do nível 1, 2 e 3 de melhoria de peça. */
  upgradeCusto: number[];
  /** Sucata paga por 1 de sucata velha. */
  sucataVelhaCusto: number;
  /** Preços da Banca do Zé (todos sumidouros). */
  banca: {
    reforco: number;
    reparoDuplo: number;
    tabua: number;
    recarga: number;
  };
  /** Recompensa de sucata velha no fim da partida. */
  meta: {
    base: number;
    estrela: number;
    laneIntacta: number;
    kill: number;
  };
}

// ---------- criaturas ----------

export type Trait = 'air' | 'neutral' | 'human' | 'unbeatable';

export interface EnemyDef {
  nome: string;
  hp: number;
  speed: number;
  dps: number;
  scrap: number;
  r: number;
  desc: string;
  hint: string;
  /** Voa: só Ventilador, Holofote e explosão pegam. */
  air?: boolean;
  /** Não é para matar. Imune a qualquer dano. */
  neutral?: boolean;
  /** Era gente. Não morre. */
  human?: boolean;
}

export interface BossDef {
  nome: string;
  hp: number;
  speed: number;
  dps: number;
  r: number;
  map: number;
  desc: string;
  hint: string;
  /** Não se mata. A MARÉ é o mar com vontade. */
  unbeatable?: boolean;
}

// ---------- sinergias ----------

export interface SynergyDef {
  a: string;
  b: string;
  nome: string;
  desc: string;
}

// ---------- árvore de desbloqueios ----------

export interface TreeBranch {
  id: string;
  nome: string;
  desc: string;
}

export interface TreePerk {
  startScrap?: number;
  machineHp?: number;
  extraOffer?: boolean;
  startBoias?: number;
  metaBonus?: number;
  repair?: number;
  shield?: number;
  discount?: number;
  luck?: number;
}

export interface TreeNode {
  id: string;
  br: string;
  nome: string;
  desc: string;
  cost: number;
  max: number;
  per?: TreePerk;
  /** Engenhoca liberada por este nó. */
  unlock?: string;
  /** Nó que precisa estar comprado antes. */
  req?: string;
}

export interface MapUnlock {
  map: number;
  machs: string[];
}

export interface Achievement {
  id: string;
  nome: string;
  desc: string;
}

// ---------- mapas ----------

export interface Palette {
  sky1: string;
  sky2: string;
  sun: string;
  water: string;
  ground: string;
  strip: string;
  accent: string;
  haze: string;
}

export interface StructureDef {
  id: string;
  nome: string;
  msg: string;
}

export interface MapDef {
  id: string;
  nome: string;
  sub: string;
  res: string;
  resShort: string;
  resMult: number;
  weather: 'rain' | 'fog' | 'storm' | 'heat' | 'ash' | 'gale';
  track: string;
  /** Nome de cada lane. Com 6 lanes, o array se repete. */
  lanes: string[];
  pal: Palette;
  /** Duas estruturas por lane. */
  estruturas: StructureDef[][];
  pool: string[];
  extra: string[];
  boss: string;
  intro: string;
  bossLine: string;
  bio: string;
}

export interface RadioLine {
  map: number;
  wave: number;
  txt: string;
}

export interface Ending {
  id: string;
  titulo: string;
  escolha: string;
  txt: string;
  ze: string;
  lu: string;
  toq: string;
  voz: string;
}

export interface DailyMod {
  id: string;
  nome: string;
  desc: string;
  ban?: string[];
  pool?: string[];
  scrap?: number;
  res?: number;
  speed?: number;
  machHp?: number;
  enemyHp?: number;
  bossEarly?: boolean;
  dark?: boolean;
}

export interface Cartazes {
  [mapId: string]: string[];
}
