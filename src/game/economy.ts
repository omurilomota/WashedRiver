/**
 * economy.ts — custo e desbloqueio das engenhocas.
 *
 * Fica num módulo próprio porque a HUD (em `ui.ts`) e a simulação (em
 * `game.ts`) precisam do mesmo número: se a HUD mostra um custo e a
 * partida cobra outro, o jogador perde a confiança no jogo.
 */
import { MACH, MACH_ORDER, MAP_UNLOCKS } from '../data';
import { G } from '../core/state';
import type { Machine } from '../core/state';
import { SaveDB } from '../save/storage';
import type { TreeEffects } from '../save/storage';

/** Efeitos agregados da árvore de desbloqueios. */
export function eff(): TreeEffects {
  return SaveDB.eff();
}

/** A engenhoca está disponível para este slot? */
export function isMachUnlocked(k: string): boolean {
  if (!MACH[k]) return false;
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

/** Custo da engenhoca, já com o desconto da árvore. */
export function machCost(k: string): number {
  const e = eff();
  return Math.max(1, Math.round(MACH[k].cost * (1 - (e.discount || 0))));
}

/** Engenhocas disponíveis, na ordem do baralho. */
export function availableMachines(): string[] {
  return MACH_ORDER.filter(isMachUnlocked);
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

/** A engenhoca que está naquele slot? */
export function machineAt(lane: number, col: number): Machine | undefined {
  return G.machines.find((m) => m.lane === lane && m.col === col);
}
