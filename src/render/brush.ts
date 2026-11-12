/**
 * brush.ts — camada de desenho compartilhada.
 *
 * Centraliza as regras visuais que antes eram pintadas "à mão" em cada
 * entidade: sombra projetada uniforme, contorno consistente e derivação
 * de luz/sombra a partir de uma cor-base (`shade`).
 *
 * A paleta do jogo é muted e de alto contraste; `shade()` trabalha em
 * HSL para preservar matiz e saturação, ajustando só a luminosidade.
 */
import { ctx } from '../core/canvas';

export function shade(hex: string, delta: number): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const nl = Math.max(0, Math.min(1, l + delta));
  const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
  const p = 2 * nl - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const rr = Math.round(hue2rgb(h / 360 + 1 / 3) * 255);
  const gg = Math.round(hue2rgb(h / 360) * 255);
  const bb = Math.round(hue2rgb(h / 360 - 1 / 3) * 255);
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

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
