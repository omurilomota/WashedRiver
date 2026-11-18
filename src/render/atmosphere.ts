/**
 * atmosphere.ts — profundidade, clima e foco.
 *
 * Estratégia visual (o que este arquivo garante):
 *
 * 1. **Luz global**: a cena inteira assume luz vinda de cima/esquerda. O
 *    acabamento das peças e dos bichos já segue essa direção; esta camada
 *    adiciona o brilho de horizonte e as sombras laterais para o campo não
 *    parecer uma colagem de sprites.
 * 2. **Três planos**: fundo (cache), campo jogável (lanes/atores) e
 *    primeiro plano (silhuetas escuras nas bordas). O primeiro plano não
 *    cobre o corredor: só emoldura.
 * 3. **Clima com a paleta do mapa**: névoa, poeira de calor e cinzas usam
 *    `map.pal`, não uma cor fixa. Farol ganha feixes; fábrica ganha partículas;
 *    feira ganha reverberação. O efeito é atmosférico, nunca um filtro que
 *    esconde hitbox.
 * 4. **Foco**: uma vinheta curta nas laterais e uma faixa de profundidade no
 *    topo/base conduzem o olho ao centro do campo jogável.
 *
 * Tudo é desenho puro e determinístico (sem `Math.random`): o mesmo quadro
 * desenha o mesmo resultado. Os testes de render assinam as operações.
 */
import { FIELD_R, H, LANE_Y0, VX, W } from '../core/constants';
import { ctx } from '../core/canvas';
import type { MapDef } from '../data/types';

/** Direção da luz global (topo-esquerda). Usada como contrato visual. */
export const LIGHT = { x: -0.55, y: -0.83 } as const;

/** Intensidades da camada. Baixas de propósito: atmosfera, não cortina. */
export const ATMOSFERA = {
  horizonte: 0.2,
  nevoa: 0.09,
  primeiroPlano: 0.52,
  poeira: 0.28,
  foco: 0.32,
} as const;

/** Poeira/ash determinística: posição presa ao tempo, sem estado global. */
function poeira(map: MapDef, t: number, cor: string, n: number, y0: number, y1: number): void {
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const x = (i * 137 + t * (8 + (i % 4) * 2)) % W;
    const y = y0 + ((i * 61 + t * (5 + (i % 3))) % Math.max(1, y1 - y0));
    const s = i % 4 === 0 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
}

export function drawAtmosphere(map: MapDef, t: number): void {
  const p = map.pal;
  const inicio = LANE_Y0 - 34;
  ctx.save();

  // 1. Brilho de horizonte: separa o cenário do campo e dá a hora do dia.
  const horizonte = ctx.createLinearGradient(0, inicio, 0, LANE_Y0 + 118);
  horizonte.addColorStop(0, p.haze);
  horizonte.addColorStop(0.42, p.haze);
  horizonte.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = ATMOSFERA.horizonte;
  ctx.fillStyle = horizonte;
  ctx.fillRect(0, inicio, W, 152);
  ctx.globalAlpha = 1;

  // 2. Névoa em bancos largos: clima de farol/tempestade/vendaval.
  if (map.weather === 'fog' || map.weather === 'storm' || map.weather === 'gale') {
    ctx.fillStyle = p.haze;
    for (let i = 0; i < 3; i++) {
      const x = ((t * (11 + i * 4) + i * 430) % (W + 220)) - 110;
      const y = LANE_Y0 + 8 + i * 34 + Math.sin(t * 0.35 + i) * 7;
      ctx.globalAlpha = ATMOSFERA.nevoa + i * 0.012;
      ctx.beginPath();
      ctx.ellipse(x, y, 190 + i * 34, 17 + i * 3, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 2b. Marca de cada mapa: uma camada curta que muda com o lugar. Feira e
  // cemitério podem dividir clima, mas não dividem assinatura visual.
  if (map.id === 'barra') {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(VX + ((i * 211 + t * 18) % (FIELD_R - VX)), LANE_Y0 + 22 + i * 27, 46, 2);
    }
    ctx.globalAlpha = 1;
  } else if (map.id === 'estacao') {
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#d8e8e0';
    for (let i = 0; i < 4; i++) {
      const x = VX + 120 + i * 260 + Math.sin(t * 0.6 + i) * 18;
      ctx.beginPath();
      ctx.ellipse(x, LANE_Y0 + 20 + i * 18, 34, 7, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (map.id === 'cemiterio') {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = p.sun;
    ctx.beginPath();
    ctx.ellipse(W * 0.66, LANE_Y0 + 8, 90, 10, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 3. Feixes do farol: luz que atravessa a cena, com direção consistente.
  if (map.id === 'farol') {
    const pulso = 0.05 + Math.sin(t * 0.8) * 0.012;
    ctx.globalAlpha = pulso;
    ctx.fillStyle = '#fff0b0';
    ctx.beginPath();
    ctx.moveTo(W - 120, -20);
    ctx.lineTo(W + 80, H * 0.62);
    ctx.lineTo(W - 250, H * 0.82);
    ctx.lineTo(W - 420, 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 4. Partículas de clima: poeira de calor e cinza de fábrica.
  if (map.weather === 'heat') poeira(map, t, 'rgba(255,225,160,.55)', 15, LANE_Y0, H - 20);
  if (map.weather === 'ash') poeira(map, t, 'rgba(210,205,190,.5)', 22, LANE_Y0, H - 20);
  ctx.globalAlpha = 1;

  // 5. Vinheta lateral curta: foco no corredor, sem apagar as bordas.
  const lateral = ctx.createLinearGradient(0, 0, W, 0);
  lateral.addColorStop(0, 'rgba(2,5,4,.42)');
  lateral.addColorStop(0.08, 'rgba(2,5,4,0)');
  lateral.addColorStop(0.92, 'rgba(2,5,4,0)');
  lateral.addColorStop(1, 'rgba(2,5,4,.42)');
  ctx.fillStyle = lateral;
  ctx.fillRect(0, LANE_Y0, W, H - LANE_Y0);

  // 6. Primeiro plano: estacas/silhuetas nas bordas, nunca no campo.
  ctx.globalAlpha = ATMOSFERA.primeiroPlano;
  ctx.fillStyle = '#030605';
  for (let i = 0; i < 4; i++) {
    const x = i * 7 + 2;
    ctx.fillRect(x, H - 58 - (i % 2) * 9, 5, 58);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(W - 10 - i * 8, H - 44 - (i % 2) * 7, 5, 44);
  }
  ctx.globalAlpha = 1;

  // 7. Chão escurece para o ator: a base da tela vira peso, não buraco.
  const base = ctx.createLinearGradient(0, H - 34, 0, H);
  base.addColorStop(0, 'rgba(0,0,0,0)');
  base.addColorStop(1, 'rgba(2,5,4,.38)');
  ctx.fillStyle = base;
  ctx.fillRect(0, H - 34, W, 34);

  // 8. Foco global: vinheta radial curta, ancorada no centro do campo.
  const foco = ctx.createRadialGradient(W * 0.5, H * 0.48, H * 0.3, W * 0.5, H * 0.5, W * 0.72);
  foco.addColorStop(0, 'rgba(0,0,0,0)');
  foco.addColorStop(1, `rgba(2,5,4,${ATMOSFERA.foco})`);
  ctx.fillStyle = foco;
  ctx.fillRect(0, LANE_Y0, W, H - LANE_Y0);

  // 9. Sheen direcional: o mesmo topo-esquerda das peças e dos bichos.
  const luz = ctx.createLinearGradient(0, 0, W * 0.7, H);
  luz.addColorStop(0, 'rgba(255,244,200,.035)');
  luz.addColorStop(0.45, 'rgba(255,244,200,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(VX, LANE_Y0, FIELD_R - VX, H - LANE_Y0);

  ctx.restore();
}
