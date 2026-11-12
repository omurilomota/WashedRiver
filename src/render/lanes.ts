/**
 * lanes.ts — o terreno do campo: um piso por mapa, nas 6 lanes.
 *
 * Decisão (ADR 014, que substitui o recorte da ADR 011): o jogador precisa
 * reconhecer **um lugar** por mapa, não seis microcenários. O rio é rio nas
 * seis lanes, o penhasco é penhasco nas seis, o trilho é trilho nas seis.
 * Antes as lanes 0–2 tinham arte própria por mapa (píer/rua/canal) e as de
 * baixo herdavam um piso único — metade padronizada, metade não, e o campo
 * inteiro ficava confuso de ler.
 *
 * O que continua dando variedade é o **terreno** (props, sucata, set pieces)
 * e a **variação de arranjo** por lane (ADR 013): `v` (0–5) desloca os
 * elementos e muda o tom, para seis lanes iguais não virarem textura.
 *
 * É desenho puro: recebe estado, não muda regra. Nenhum número de lane,
 * coluna ou tamanho vive solto — sai de `core/constants`.
 */
import { FIELD_R, LANE_H, LANE_Y0, VX, W } from '../core/constants';
import { ctx, rr, waterLines } from '../core/canvas';
import type { MapDef, Palette } from '../data/types';

// ---------- peças de desenho compartilhadas ----------

/** Touceira de planta (mata, verdura, alguma coisa que ainda cresce). */
function arbusto(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.62, 0, 0, 7);
  g.fill();
}

/** Caixote de madeira. */
function caixote(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  g.fillStyle = '#6a5232';
  g.fillRect(x, y - h, w, h);
  g.fillStyle = '#4a3a20';
  g.fillRect(x, y - h, w, 3);
  g.fillRect(x + w / 2 - 1, y - h, 2, h);
}

/** Barril/tambor de pé. */
function barril(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string): void {
  g.fillStyle = cor;
  rr(x - r, y - r * 2.2, r * 2, r * 2.2, r * 0.3);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.fillRect(x - r, y - r * 1.2, r * 2, 2);
  g.fillRect(x - r, y - r * 0.4, r * 2, 2);
}

/** Poste/estaca de madeira. */
function poste(g: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  g.fillStyle = '#5a4a30';
  g.fillRect(x - 3, y - h, 6, h);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(x + 1, y - h, 2, h);
}

/** Prancha de píer/tábu atravessando a lane. */
function tabua(g: CanvasRenderingContext2D, y: number, h: number, corA: string, corB: string): void {
  g.fillStyle = corA;
  g.fillRect(VX, y, W - VX, h);
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.fillRect(VX, y + h, W - VX, 2);
  g.fillStyle = corB;
  for (let x = VX + 12; x < W - 12; x += 74) g.fillRect(x, y, 2, h);
}

/** Pedra/solta de riba. */
function pedra(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string): void {
  g.fillStyle = cor;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.66, 0, 0, 7);
  g.fill();
}

/** Poça de óleo/água parada no chão. */
function poca(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string): void {
  g.fillStyle = cor;
  g.beginPath();
  g.ellipse(x, y, r, r * 0.3, 0, 0, 7);
  g.fill();
}

/** Vapor subindo: o mapa esquenta, a comida ferve, a fábrica respira. */
function vapor(g: CanvasRenderingContext2D, x: number, y: number, t: number, n: number, cor: string): void {
  g.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const fy = y - ((t * 26 + i * 17) % 46);
    g.beginPath();
    g.arc(x + Math.sin(t * 2 + i) * 5, fy, 4 + i * 1.4, 0, 7);
    g.fill();
  }
}

/** Fio esticado entre dois pontos (varal, corda, rede). */
function fio(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, flacidez: number): void {
  g.strokeStyle = '#8a7a5a';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x1, y1);
  g.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + flacidez, x2, y2);
  g.stroke();
}

/** Faixa clara no topo da lane: faz o corredor ler como faixa. */
function faixa(g: CanvasRenderingContext2D, y: number, col: string, h: number): void {
  g.fillStyle = col;
  g.fillRect(VX, y, W - VX, h);
}

/** Tom da lane pela variação (ADR 013): mesma família, luz diferente. */
function tom(lista: readonly string[], v: number): string {
  return lista[v % lista.length];
}

// =====================================================================
//  BARRA SUJA — o rio e o píer em todas as lanes
// =====================================================================
function barraNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  // água do rio por baixo de tudo
  faixa(g,y, tom(['#0f2e33', '#113338', '#0d2a30'], v), LANE_H);
  waterLines(VX, y + 10, W - VX, LANE_H - 20, t + v * 0.6, 'rgba(120,160,140,.13)', 13);
  // pranchões do píer atravessando o campo: é o chão de todas as lanes
  for (let i = 0; i < 7; i++) {
    tabua(g,y + 14 + i * 16 + (v % 2) * 4, 5, i % 2 ? '#5a4a30' : '#4d3f28', '#3d3018');
  }
  // estacas de amarração batendo na água
  for (let i = 0; i < 12; i++) poste(g,VX + 26 + i * 88 + v * 24, y + LANE_H, 22 + (i % 3) * 6);
  // sucata do rio: caixote, barril, rede, cano furado — um por lane
  if (v % 3 === 0) {
    caixote(g,VX + 210 + v * 40, y + LANE_H - 14, 46, 32);
    barril(g,VX + 300 + v * 40, y + LANE_H - 14, 11, '#7a6a3a');
    fio(g,VX + 360, y + 40, VX + 520, y + 44, 10);
  } else if (v % 3 === 1) {
    barril(g,VX + 620 + v * 30, y + LANE_H - 14, 13, '#8a5a2a');
    caixote(g,VX + 690 + v * 30, y + LANE_H - 34, 38, 24);
    poca(g,VX + 400 + v * 30, y + LANE_H - 8, 26, 'rgba(20,40,44,.45)');
  } else {
    fio(g,VX + 120, y + 30, VX + 420, y + 26, 12);
    caixote(g,VX + 880 + v * 24, y + LANE_H - 12, 40, 28);
    pedra(g,VX + 520 + v * 24, y + LANE_H - 10, 14, '#4a4238');
  }
  // um resto de barco encalhado de tempo em tempo (prop grande)
  if (v === 1 || v === 4) {
    g.fillStyle = '#2a2620';
    g.beginPath();
    g.moveTo(VX + 700, y + LANE_H - 6);
    g.lineTo(VX + 760, y + 30);
    g.lineTo(VX + 940, y + 24);
    g.lineTo(VX + 940, y + 70);
    g.lineTo(VX + 780, y + LANE_H - 6);
    g.closePath();
    g.fill();
    g.fillStyle = '#1a1612';
    for (let i = 0; i < 5; i++) g.fillRect(VX + 790 + i * 30, y + 34 + (i % 2) * 4, 16, 22);
  }
}

// =====================================================================
//  FAROL DO FIM — a costa de pedra em todas as lanes
// =====================================================================
function farolNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  faixa(g,y, tom(['#4a4a44', '#4d4d47', '#474741'], v), LANE_H);
  // lages soltas da costa
  for (let i = 0; i < 12; i++) {
    g.fillStyle = i % 2 ? '#57574e' : '#41413a';
    g.fillRect(VX + i * 88 + v * 16, y + 24 + (i % 3) * 8, 84 - (i % 3) * 6, LANE_H - 40 - (i % 3) * 8);
    g.strokeStyle = '#2e2e28';
    g.lineWidth = 1;
    g.strokeRect(VX + i * 88 + v * 16, y + 24 + (i % 3) * 8, 84 - (i % 3) * 6, LANE_H - 40 - (i % 3) * 8);
  }
  // erva rala e pedras soltas na beira
  for (let i = 0; i < 14; i++) arbusto(g,VX + 22 + i * 78 + v * 20, y + 34 + Math.sin(t + i) * 3, 6 + (i % 3), '#4a5a32');
  for (let i = 0; i < 7; i++) pedra(g,VX + 70 + i * 158 + v * 26, y + LANE_H - 12, 16 + (i % 3) * 6, '#3a3a34');
  //Restinga molhada no fundo
  waterLines(VX, y + LANE_H - 16, W - VX, 14, t + v * 0.4, 'rgba(160,190,170,.12)');
  // sucata da costa: âncora, corda, boia velha
  if (v % 3 === 0) {
    poste(g,VX + 300 + v * 30, y + LANE_H - 6, 30);
    g.strokeStyle = '#5a5148';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(VX + 300 + v * 30, y + LANE_H - 42);
    g.lineTo(VX + 300 + v * 30, y + LANE_H - 58);
    g.stroke();
  } else if (v % 3 === 1) {
    g.strokeStyle = '#a09070';
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(VX + 500 + i * 130 + v * 24, y + 30, 9 + i, 0, Math.PI * 1.4);
      g.stroke();
    }
  } else {
    fio(g,VX + 160, y + 34, VX + 460, y + 40, 10);
    pedra(g,VX + 760 + v * 24, y + LANE_H - 8, 20, '#2e3230');
  }
  // a base do farol, uma vez a cada duas lanes (prop grande)
  if (v % 2 === 0) {
    g.fillStyle = '#2e3230';
    g.beginPath();
    g.moveTo(VX + 620 + v * 30, y + 10);
    g.lineTo(VX + 700 + v * 30, y + 10);
    g.lineTo(VX + 694 + v * 30, y - 46);
    g.lineTo(VX + 626 + v * 30, y - 46);
    g.closePath();
    g.fill();
    g.fillStyle = '#1c201e';
    g.fillRect(VX + 626 + v * 30, y - 58, 68, 14);
  }
}

// =====================================================================
//  ESTAÇÃO AFOGADA — o trilho e a plataforma em todas as lanes
// =====================================================================
function estacaoNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  faixa(g,y, '#3a403c', LANE_H);
  // dormentes e trilhos atravessando o campo
  for (let i = 0; i < 12; i++) {
    g.fillStyle = '#4a3a20';
    g.fillRect(VX + i * 92 + v * 14, y + 58, 84, 16);
  }
  g.fillStyle = '#6a6a58';
  g.fillRect(VX, y + 52, W - VX, 4);
  g.fillRect(VX, y + 76, W - VX, 4);
  // trilho de rolos de carga no meio do caminho
  g.fillStyle = '#2a2e2a';
  for (let i = 0; i < 22; i++) g.fillRect(VX + 20 + i * 50 + v * 8, y + 62, 26, 6);
  // plataforma de pedra nas lanes pares
  if (v % 2 === 0) {
    g.fillStyle = '#5a5a50';
    for (let i = 0; i < 12; i++) g.fillRect(VX + i * 100 + v * 12, y + 20, 92, 24);
    g.fillStyle = '#7a7a6a';
    g.fillRect(VX, y + 18, W - VX, 3);
  }
  // sucata da estação: malas, engradado, palete
  if (v % 3 === 0) {
    for (let i = 0; i < 3; i++) {
      const cx = VX + 180 + i * 230 + v * 34;
      g.fillStyle = '#6a5232';
      g.fillRect(cx, y + 4, 96, 50);
      g.fillStyle = '#4a3a20';
      for (let k = 0; k < 3; k++) g.fillRect(cx, y + 4 + k * 16, 96, 3);
    }
  } else if (v % 3 === 1) {
    g.fillStyle = '#7a5a3a';
    g.fillRect(VX + 760 + v * 16, y + 14, 54, 40);
    g.fillStyle = '#5a3a24';
    g.fillRect(VX + 748 + v * 16, y + 52, 78, 26);
  } else {
    g.fillStyle = '#4a3a20';
    g.fillRect(VX + 60 + v * 20, y + 34, 70, 8);
    g.fillRect(VX + 64 + v * 20, y + 42, 8, 10);
    g.fillRect(VX + 118 + v * 20, y + 42, 8, 10);
  }
  // goteras do teto
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(180,200,210,.28)';
    g.fillRect(VX + 330 + i * 320, y + 60 + ((t * 40 + i * 30 + v * 12) % 30), 2, 8);
  }
}

// =====================================================================
//  FEIRA DO PEIXE — a calçada e as barracas em todas as lanes
// =====================================================================
function feiraNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  faixa(g,y, tom(['#6a5a42', '#6d5d45', '#67573f'], v), LANE_H);
  // calçada de pedra
  for (let i = 0; i < 20; i++) {
    g.fillStyle = i % 2 ? '#7a7060' : '#6a6050';
    g.fillRect(VX + i * 54 + v * 10, y + 18 + (i % 2) * 6, 50, LANE_H - 34);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(VX + i * 54 + v * 10, y + 18 + (i % 2) * 6, 50, 3);
  }
  // lona esfarrapada de alguma barraca por cima
  if (v % 2 === 0) {
    g.fillStyle = '#b04836';
    g.beginPath();
    g.moveTo(VX + 60 + v * 26, y + 8);
    g.lineTo(VX + 380 + v * 26, y + 16);
    g.lineTo(VX + 360 + v * 26, y + 34);
    g.lineTo(VX + 80 + v * 26, y + 28);
    g.closePath();
    g.fill();
    poste(g,VX + 70 + v * 26, y + 44, 92);
    poste(g,VX + 372 + v * 26, y + 48, 92);
  }
  // caixas de peixe com gelo
  for (let i = 0; i < 4; i++) {
    const cx = VX + 460 + i * 128 + v * 30;
    g.fillStyle = '#8a8078';
    g.fillRect(cx, y + 22, 92, 40);
    g.fillStyle = '#d8d8d0';
    g.fillRect(cx + 6, y + 26, 80, 12);
    g.fillStyle = '#3a2a1a';
    g.fillRect(cx, y + 62, 92, 4);
  }
  vapor(g,VX + 500 + v * 20, y + 18, t, 3, 'rgba(220,230,225,.18)');
  // poeira e tampa de gargalo no chão
  g.fillStyle = 'rgba(60,40,20,.25)';
  for (let i = 0; i < 12; i++) {
    const fx = VX + ((t * 40 + i * 97 + v * 40) % (W - VX));
    g.fillRect(fx, y + 96 + (i % 3) * 6, 8, 2);
  }
  // sombrinha do camelô numa lane sim, noutra não
  if (v % 3 === 1) {
    caixote(g,VX + 40 + v * 20, y + LANE_H - 8, 48, 34);
    g.fillStyle = '#c8a03a';
    g.beginPath();
    g.arc(VX + 300 + v * 20, y + LANE_H - 14, 30, Math.PI, 0);
    g.fill();
    g.fillStyle = '#4a3a20';
    g.fillRect(VX + 297 + v * 20, y + LANE_H - 14, 5, 24);
  }
}

// =====================================================================
//  FÁBRICA PODRE — o piso de fábrica em todas as lanes
// =====================================================================
function fabricaNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  faixa(g,y, tom(['#3a3a32', '#3d3d35', '#383832'], v), LANE_H);
  // piso de concreto com grade
  for (let i = 0; i < 10; i++) {
    g.fillStyle = '#4a443a';
    g.fillRect(VX + i * 116 + v * 18, y + 40, 110, 56);
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(VX + i * 116 + v * 18, y + 96, 110, 4);
  }
  // faixa de perigo
  g.strokeStyle = '#c8a03a';
  g.lineWidth = 2;
  g.setLineDash([22, 16]);
  g.beginPath();
  g.moveTo(VX, y + 26);
  g.lineTo(FIELD_R, y + 26);
  g.stroke();
  g.setLineDash([]);
  // manchas de óleo e poças
  for (let i = 0; i < 5; i++) poca(g, VX + 140 + i * 212 + v * 22, y + 108, 44, 'rgba(10,14,12,.4)');
  // contêineres empilhados (prop grande, uma vez a cada duas lanes)
  if (v % 2 === 0) {
    const cores = ['#7a3a24', '#3a5a6a', '#6a5a24'];
    for (let i = 0; i < 3; i++) {
      const cx = VX + 160 + i * 250 + v * 30;
      g.fillStyle = cores[i % 3];
      g.fillRect(cx, y + 10, 190, 40);
      g.fillStyle = cores[i % 3];
      g.fillRect(cx + 40, y - 34, 110, 44);
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.moveTo(cx + 16 + k * 34, y + 10);
        g.lineTo(cx + 16 + k * 34, y + 50);
        g.stroke();
      }
      g.strokeRect(cx + 40, y - 34, 110, 44);
    }
  }
  // vapor de cano e luz de alerta
  vapor(g,VX + 300 + v * 40, y + 14, t, 3, 'rgba(210,215,200,.15)');
  if (Math.sin(t * 4 + v) > 0.7) {
    g.fillStyle = '#ff5030';
    g.beginPath();
    g.arc(VX + 980 + v * 20, y + 30, 3, 0, 7);
    g.fill();
  }
}

// =====================================================================
//  CEMITÉRIO DE BARCOS — a água rasa e as carcaças em todas as lanes
// =====================================================================
function cemiterioNova(g: CanvasRenderingContext2D, y: number, t: number, v: number): void {
  faixa(g,y, tom(['#1a3034', '#1d3438', '#172d31'], v), LANE_H);
  waterLines(VX, y + 8, W - VX, LANE_H - 16, t * 1.1 + v * 0.5, 'rgba(150,180,180,.14)', 14);
  // fundo de areia e lama
  g.fillStyle = 'rgba(10,14,12,.35)';
  g.fillRect(VX, y + LANE_H - 18, W - VX, 18);
  // quilhas e costelas encalhadas (prop grande)
  g.strokeStyle = '#3a3228';
  g.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const rx = VX + 150 + i * 240 + v * 26;
    g.beginPath();
    g.arc(rx, y + 96, 46 + (i % 2) * 14, Math.PI, Math.PI * 1.45);
    g.stroke();
  }
  // tábuas soltas boiando
  g.fillStyle = '#4a4238';
  for (let i = 0; i < 10; i++) {
    const a = Math.sin(t * 1.5 + i + v) * 3;
    g.save();
    g.translate(VX + 30 + i * 108 + v * 22, y + 30 + a);
    g.rotate(Math.sin(t + i + v) * 0.04);
    g.fillRect(0, 0, 66, 6);
    g.restore();
  }
  // erva morta e âncora cravada
  for (let i = 0; i < 8; i++) arbusto(g,VX + 30 + i * 130 + v * 22, y + 96, 9, '#2e3428');
  if (v % 3 === 2) {
    g.strokeStyle = '#5a5148';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(VX + 950 + v * 12, y + LANE_H - 6);
    g.lineTo(VX + 950 + v * 12, y + LANE_H - 50);
    g.stroke();
  }
}

// ---------- despacho ----------

/** Piso das 6 lanes: cada mapa desenha o seu terreno (único). */
export function drawLaneFloorNova(
  map: MapDef,
  p: Palette,
  l: number,
  t: number,
  /** Contexto de destino. Omissão = ctx do jogo (caminho ao vivo/testes). */
  g?: CanvasRenderingContext2D,
): void {
  // 6 lanes → variação 0–5 (ADR 013)
  drawLaneFloorNovaEm(map, p, t, LANE_Y0 + l * LANE_H, l, g);
}

/**
 * O mesmo terreno com Y e variação explícitos.
 *
 * Existe para o teste comparar a **arte** sem o deslocamento de lane: com
 * `drawLaneFloorNova` as assinatas diferem só pelo Y, e um teste de
 * "lanes iguais" passaria por vacuidade.
 */
export function drawLaneFloorNovaEm(
  map: MapDef,
  p: Palette,
  t: number,
  y: number,
  v: number,
  /**
   * Contexto de destino.
   *
   * O cache do piso (`sprites.ts`) passa o offscreen; omissão = ctx do jogo,
   * que é o que os testes de render assinam. **A ausência deste parâmetro foi
   * um bug real:** o cache chamava a arte sem contexto, a arte desenhava na
   * tela e o offscreen nascia vazio — o piso piscava a cada refresh.
   */
  g: CanvasRenderingContext2D = ctx,
): void {
  if (map.id === 'barra') barraNova(g, y, t, v);
  else if (map.id === 'farol') farolNova(g, y, t, v);
  else if (map.id === 'estacao') estacaoNova(g, y, t, v);
  else if (map.id === 'feira') feiraNova(g, y, t, v);
  else if (map.id === 'fabrica') fabricaNova(g, y, t, v);
  else cemiterioNova(g, y, t, v);
  // Profundidade: sombra suave no topo e na base da lane dá volume ao corredor.
  const top = g.createLinearGradient(0, y, 0, y + 14);
  top.addColorStop(0, 'rgba(0,0,0,.22)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top;
  g.fillRect(VX, y, W - VX, 14);
  const bot = g.createLinearGradient(0, y + LANE_H - 16, 0, y + LANE_H);
  bot.addColorStop(0, 'rgba(0,0,0,0)');
  bot.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = bot;
  g.fillRect(VX, y + LANE_H - 16, W - VX, 16);
}
