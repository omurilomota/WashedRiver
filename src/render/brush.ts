/**
 * brush.ts — camada de desenho compartilhado.
 *
 * Centraliza as regras visuais que antes eram pintadas "à mão" em cada
 * entidade: sombra projetada uniforme e texto com halo. A paleta do jogo é
 * muta e de alto contraste; a sombra é sempre preta com alpha baixo, para
 * não competir com a cor da peça.
 */
import { ctx } from '../core/canvas';

export function shadowEllipse(
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha = 0.3,
  color = '#000',
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function haloText(
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  halo = 'rgba(0,0,0,.75)',
  blur = 3,
): void {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = halo;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
