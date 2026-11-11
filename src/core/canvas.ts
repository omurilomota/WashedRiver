/**
 * canvas.ts — o canvas do jogo e os efeitos que nasce(m) nele.
 *
 * A escala é fixa em 2 (e não `devicePixelRatio`): o layout é idêntico em
 * qualquer máquina, e o custo é previsível. Em monitor 4K o canvas é
 * grande, mas o conteúdo é desenhado em 1280x846 lógicos.
 */
import { H, W } from './constants';
import { G } from './state';

/** Escala de resolução fixa. */
export const DPR = 2;

export const canvas = document.getElementById('cv') as HTMLCanvasElement;

function getCtx(el: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = el.getContext('2d');
  if (!context) throw new Error('contexto 2D indisponível');
  return context;
}

export const ctx = getCtx(canvas);

canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = '100%';
canvas.style.height = '100%';
ctx.scale(DPR, DPR);

/**
 * Retângulo de canto arredondado (caminho pronto, é só preencher).
 *
 * Vive aqui porque é helper de canvas: o cenário (`render/`) e as
 * criaturas (`render/creatures.ts`) usam o mesmo, e nenhum dos dois
 * precisa saber do outro.
 */
export function rr(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Linhas de água (ondulação em faixas). */
export function waterLines(
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  col: string,
  gap?: number,
): void {
  ctx.fillStyle = col;
  gap = gap || 18;
  for (let i = 0; i < Math.floor(h / gap); i++) {
    const yy = y + 8 + i * gap;
    const off = Math.sin(t * 1.4 + i * 0.7) * 12;
    for (let xx = x + off; xx < x + w; xx += 62) {
      ctx.fillRect(xx, yy, 26 + Math.sin(t + i) * 8, 2);
    }
  }
}
/** Explosão de partículas. */
export function burst(
  x: number,
  y: number,
  count?: number,
  color?: string,
  spdMin?: number,
  spdMax?: number,
  size?: number,
  life?: number,
): void {
  if (!G) return;
  count = count || 8;
  spdMin = spdMin || 120;
  spdMax = spdMax || 300;
  size = size || 3;
  life = life || 0.5;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = spdMin + Math.random() * (spdMax - spdMin);
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      life: life * (0.6 + Math.random() * 0.8),
      max: life,
      color: color ?? '#fff',
      size: (typeof size === 'number' ? size : 3) * (0.6 + Math.random() * 0.8),
      g: 300,
    });
  }
}

/** Mancha permanente no chão. */
export function stain(x: number, y: number, color?: string, r?: number): void {
  if (!G) return;
  G.decals.push({ x, y, r: r || 30, color: color || '#1a1410', a: 0.35 });
}

/** Texto flutuante (dano, aviso). */
export function addText(x: number, y: number, text: unknown, color?: string): void {
  if (!G) return;
  G.texts.push({ x, y, text: String(text), color: color || '#fff', life: 1.4 });
}
