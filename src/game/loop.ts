/**
 * loop.ts — o relógio do jogo.
 *
 * `requestAnimationFrame` com delta limitado: se a aba travou ou o
 * jogador minimizeu, o primeiro quadro de volta não joga dez segundos
 * de simulação de uma vez.
 */
import { drawFrame, update } from './game';

let last = performance.now();

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    update(dt);
    drawFrame();
  } catch (err) {
    console.error('MARÉ PODRE:', err);
  }
  requestAnimationFrame(loop);
}

/** Liga o loop. Chamar uma vez, no arranque. */
export function startLoop(): void {
  last = performance.now();
  requestAnimationFrame(loop);
}
