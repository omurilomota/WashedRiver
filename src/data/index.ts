/**
 * index.ts — a porta de entrada dos dados.
 *
 * Todo o jogo lê conteúdo por aqui. Nenhum módulo importa o JSON direto,
 * então a forma do dado é validada num lugar só e os testes podem
 * checar as invariantes com os mesmos objetos que o jogo usa.
 */
import balanceJson from './balance.json';
import mapsJson from './maps.json';
import type {
  Achievement,
  DificuldadeDef,
  IntroDef,
  BossDef,
  Cartazes,
  DailyMod,
  EconomiaDef,
  Ending,
  EnemyDef,
  MapDef,
  MapUnlock,
  MachineDef,
  Palette,
  RadioLine,
  StructureDef,
  SynergyDef,
  TreeBranch,
  TreeNode,
} from './types';

export const MACH = balanceJson.mach as Record<string, MachineDef>;
export const SHOP_BASE = balanceJson.shopBase as string[];
export const MACH_ORDER = balanceJson.machOrder as string[];
export const UPG = balanceJson.upgrades as Record<string, string[]>;
export const ECONOMIA = balanceJson.economia as EconomiaDef;
export const DIFICULDADE = balanceJson.dificuldade as DificuldadeDef;
export const INTROS = balanceJson.intros as Record<string, IntroDef>;

export const ENEMY = balanceJson.enemy as Record<string, EnemyDef>;
export const ENEMY_ORDER = balanceJson.enemyOrder as string[];
export const BOSSES = balanceJson.bosses as Record<string, BossDef>;
export const SYNERGIES = balanceJson.synergies as SynergyDef[];

export const TREE_BRANCHES = balanceJson.treeBranches as TreeBranch[];
export const TREE = balanceJson.tree as TreeNode[];
export const MAP_UNLOCKS = balanceJson.mapUnlocks as MapUnlock[];
export const ACHIEVEMENTS = balanceJson.achievements as Achievement[];

export const MAPS = mapsJson.maps as MapDef[];
export const RADIO = mapsJson.radio as RadioLine[];
export const ZE_FALAS = mapsJson.zeFalas as string[];
export const ZE_RARO = mapsJson.zeRaro as string;
export const LU_LINES = mapsJson.luLines as string[];
export const LU_CLICKS = mapsJson.luClicks as string[];
export const DOG_LINES = mapsJson.dogLines as string[];
export const TOQ_LINES = mapsJson.toqLines as string[];
export const VIZINHOS_NOMES = mapsJson.vizinhosNomes as string[];
export const VIZINHOS_FALAS = mapsJson.vizinhosFalas as string[][];
export const VIZINHOS_SEGREDO = mapsJson.vizinhosSegredo as string;
export const VOZ_LINES = mapsJson.vozLines as string[];
export const CARTAZES = mapsJson.cartazes as Cartazes;
export const ENDINGS = mapsJson.endings as Ending[];
export const DAILY_MODS = mapsJson.dailyMods as DailyMod[];

export type {
  Achievement,
  BossDef,
  Cartazes,
  DailyMod,
  Ending,
  EnemyDef,
  MapDef,
  MapUnlock,
  MachineDef,
  Palette,
  RadioLine,
  StructureDef,
  SynergyDef,
  TreeBranch,
  TreeNode,
};

/** Nome de uma conquista pelo id (ou o próprio id, se não existir). */
export function achName(id: string): string {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  return a ? a.nome : id;
}
