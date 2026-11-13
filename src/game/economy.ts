/**
 * economy.ts — custo e desbloqueio das engenhocas.
 *
 * Fica num módulo próprio porque a HUD (em `ui.ts`) e a simulação (em
 * `game.ts`) precisam do mesmo número: se a HUD mostra um custo e a
 * partida cobra outro, o jogador perde a confiança no jogo.
 */
import { ECONOMIA, MACH, MACH_ORDER, MAP_UNLOCKS } from '../data';
import { G } from '../core/state';
import type { Machine } from '../core/state';
import { SaveDB } from '../save/storage';
import type { TreeEffects } from '../save/storage';

/** Efeitos agregados da árvore de desbloqueios. */
export function eff(): TreeEffects {
  return SaveDB.eff();
}

/**
 * O desafio diário pode banir engenhocas ("SEM GELADEIRA").
 *
 * O ban vem do mod do dia (`G.mods.ban`) e vale para a partida inteira:
 * a engenhoca some da banca, não pode ser plantada e não aparece como
 * oferta de desbloqueio.
 */
export function isBanned(k: string): boolean {
  const ban = G.mods && G.mods.ban;
  return Array.isArray(ban) && ban.includes(k);
}

/** A engenhoca está disponível para este slot? */
export function isMachUnlocked(k: string): boolean {
  if (!MACH[k]) return false;
  if (isBanned(k)) return false;
  if (MACH[k].unlock) return true;
  const e = eff();
  if (e.unlocks && e.unlocks[k]) return true;
  if (e.unlocks && e.unlocks.estilingue && (k === 'estilingue' || k === 'batedeira')) return true;
  if (e.unlocks && e.unlocks.espelho && (k === 'espelho' || k === 'pneu')) return true;
  if (e.unlocks && e.unlocks.cachorro && k === 'cachorro') return true;
  if (k === 'coisa_ze') return SaveDB.slot.campaign >= 1;
  for (const u of MAP_UNLOCKS) {
    if (SaveDB.slot.campaign >= u.map && u.machs.includes(k)) return true;
  }
  return false;
}

/** Custo da engenhoca, já com o desconto da árvore e o encarecimento geral. */
export function machCost(k: string): number {
  const e = eff();
  return Math.max(
    1,
    Math.round(MACH[k].cost * ECONOMIA.fatorCustoMaquina * (1 - (e.discount || 0))),
  );
}

/**
 * Engenhocas disponíveis, na ordem do baralho.
 *
 * BLOCO M.4: se a partida tem um deck escolhido (campanha, infinita, chefe),
 * a banca mostra **só** o deck — o jogador se comprometeu antes de começar.
 * Sem deck (sandbox, primeira partida sem escolha), vale o desbloqueio.
 */
export function availableMachines(): string[] {
  const liberadas = MACH_ORDER.filter(isMachUnlocked);
  const deck = G && G.deck && G.deck.length ? G.deck : null;
  if (!deck) return liberadas;
  // o deck manda, mas só o que está liberado de verdade
  const noDeck = deck.filter((k) => liberadas.includes(k));
  return noDeck.length ? noDeck : liberadas;
}

/**
 * Quantas estruturas ainda estão de pé.
 *
 * O total vem de `STRUCTURES` (`LANES * 2`), nunca de um número solto:
 * a UI e a regra de derrota precisam contar a mesma coisa.
 */
export function structuresAlive(): number {
  return G.structures.flat().filter((s) => s.alive).length;
}

/**
 * Imposto dos moradores, cobrado no fim de cada onda.
 *
 * A conta é do dado (`ECONOMIA.imposto`), não de número solto: base do
 * round + tanto por peça plantada + tanto por onda já aguentada. Quanto
 * mais arma na rua, mais a Dona Lú cobra — é o sumidouro que falta numa
 * partida com sucata sobrando.
 */
export function impostoDoRound(pecas: number, onda: number): number {
  const i = ECONOMIA.imposto;
  return Math.max(0, Math.round(i.base + i.porPeca * Math.max(0, pecas) + i.porOnda * Math.max(0, onda)));
}

/** A engenhoca que está naquele slot? */
export function machineAt(lane: number, col: number): Machine | undefined {
  return G.machines.find((m) => m.lane === lane && m.col === col);
}
