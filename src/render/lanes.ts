/**
 * lanes.ts — o piso das lanes de baixo (3, 4 e 5).
 *
 * Decisão (ADR 011): as lanes de baixo compartilham **um** piso por mapa.
 * Antes cada mapa carregava três artes (`l === 3` / `l === 4` / `else`), mas
 * a unificação forçava `l = 3` e os outros dois ramos eram código morto —
 * com os nomes das lanes 4/5 em `maps.json` prometendo um cenário que não
 * existia. Aqui cada mapa desenha o seu piso único, e o nome das três
 * lanes de baixo repete o do piso.
 *
 * É desenho puro: recebe estado, não muda regra. Nenhum número de lane,
 * coluna ou tamanho vive solto — sai de `core/constants`.
 */
import { FIELD_R, LANE_H, LANE_Y0, VX, W } from '../core/constants';
import { ctx, rr, waterLines } from '../core/canvas';
import type { MapDef, Palette } from '../data/types';

/** Touceira de planta (mata, verdura, alguma coisa que ainda cresce). */
function arbusto(x: number, y: number, r: number, col: string): void {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, 7);
  ctx.fill();
}

/** Caixote de madeira. */
function caixote(x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#6a5232';
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = '#4a3a20';
  ctx.fillRect(x, y - h, w, 3);
  ctx.fillRect(x + w / 2 - 1, y - h, 2, h);
}

/** Poste de madeira (cerca, vara, estaca). */
function poste(x: number, y: number, h: number): void {
  ctx.fillStyle = '#5a4a30';
  ctx.fillRect(x - 3, y - h, 6, h);
}

/** Vapor subindo: o mapa esquenta, a comida ferve, a fábrica respira. */
function vapor(x: number, y: number, t: number, n: number, cor: string): void {
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const fy = y - ((t * 26 + i * 17) % 46);
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 2 + i) * 5, fy, 4 + i * 1.4, 0, 7);
    ctx.fill();
  }
}

/** Fio esticado entre dois pontos (varal, corda, rede). */
function fio(x1: number, y1: number, x2: number, y2: number, flacidez: number): void {
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + flacidez, x2, y2);
  ctx.stroke();
}

/** Faixa clara no topo da lane: faz o corredor ler como faixa. */
function faixa(y: number, col: string, h: number): void {
  ctx.fillStyle = col;
  ctx.fillRect(VX, y, W - VX, h);
}

// =====================================================================
//  BARRA SUJA — vila à chuva
// =====================================================================
function barraNova(p: Palette, y: number, t: number): void {
  // JARDIM RIBEIRINHO — terra, canteiro, água de chuva
  faixa(y, '#2f3a2c', LANE_H);
  waterLines(VX, y + 4, W - VX, 16, t, 'rgba(140,190,150,.14)', 12);
  for (let i = 0; i < 5; i++) {
    const cx = VX + 40 + i * 200;
    rr(cx, y + 54, 168, 46, 8);
    ctx.fillStyle = '#4a3a24';
    ctx.fill();
    ctx.fillStyle = '#5a6a34';
    for (let k = 0; k < 5; k++) arbusto(cx + 22 + k * 32, y + 62 + Math.sin(t + k) * 2, 9 + (k % 3) * 3, '#5a7a34');
    arbusto(cx + 84, y + 48, 14, '#6a8a3a');
  }
  // cisterna grande, com torneira pingando
  ctx.fillStyle = '#5a6a56';
  rr(VX + 130, y + 8, 96, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#4a5a48';
  ctx.fillRect(VX + 134, y + 8, 88, 8);
  ctx.fillStyle = '#7a8a70';
  ctx.fillRect(VX + 196, y + 30, 8, 10);
  ctx.fillStyle = 'rgba(180,210,200,.55)';
  ctx.fillRect(VX + 199, y + 40 + ((t * 30) % 8), 2, 6);
  // cerca de varas e flores de beira
  for (let i = 0; i < 18; i++) poste(VX + 24 + i * 62, y + LANE_H, 26);
  ctx.strokeStyle = '#6a5a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(VX, y + LANE_H - 24);
  ctx.lineTo(FIELD_R, y + LANE_H - 26);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = ['#d06080', '#e0a040', '#c8d070'][i % 3];
    ctx.beginPath();
    ctx.arc(VX + 16 + i * 74, y + LANE_H - 4, 3, 0, 7);
    ctx.fill();
  }
}

// =====================================================================
//  FAROL DO FIM — penhascos, neblina
// =====================================================================
function farolNova(p: Palette, y: number, t: number): void {
  // FAROL VELHO — a base de um farol que ninguém acende mais
  faixa(y, '#3c4038', LANE_H);
  ctx.fillStyle = '#33372f';
  for (let i = 0; i < 12; i++) ctx.fillRect(VX + i * 92, y + 20 + (i % 2) * 6, 88, 16);
  // torre rachada (prop grande)
  ctx.fillStyle = '#2e3230';
  ctx.beginPath();
  ctx.moveTo(VX + 620, y + 8);
  ctx.lineTo(VX + 700, y + 8);
  ctx.lineTo(VX + 694, y - 46);
  ctx.lineTo(VX + 626, y - 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c201e';
  ctx.fillRect(VX + 626, y - 58, 68, 14);
  ctx.strokeStyle = '#1c201e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(VX + 640, y + i * 22 - 14);
    ctx.lineTo(VX + 672 + i * 6, y + i * 22 + 4);
    ctx.stroke();
  }
  // pedras e erva rala
  ctx.fillStyle = '#2a2e2a';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(VX + 60 + i * 150, y + LANE_H - 12, 18 + (i % 3) * 6, 7, 0, 0, 7);
    ctx.fill();
  }
  for (let i = 0; i < 16; i++) arbusto(VX + 20 + i * 70, y + 40 + Math.sin(t + i) * 3, 6, '#4a5a32');
  waterLines(VX, y + LANE_H - 14, W - VX, 14, t, 'rgba(160,190,170,.12)');
}

// =====================================================================
//  ESTAÇÃO AFOGADA — tempestade
// =====================================================================
function estacaoNova(p: Palette, y: number, t: number): void {
  // ARMAZÉM DE BAGAGEM — trilho de carga, engradado, malas
  faixa(y, p.ground, LANE_H);
  ctx.fillStyle = '#c8b45a';
  ctx.fillRect(VX, y + 58, W - VX, 3);
  // trilho de rolos
  ctx.fillStyle = '#2a2e2a';
  for (let i = 0; i < 22; i++) ctx.fillRect(VX + 20 + i * 50, y + 62, 26, 6);
  // engradados alinhados (prop grande)
  for (let i = 0; i < 3; i++) {
    const cx = VX + 180 + i * 230;
    ctx.fillStyle = '#6a5232';
    ctx.fillRect(cx, y + 4, 96, 50);
    ctx.fillStyle = '#4a3a20';
    for (let k = 0; k < 3; k++) ctx.fillRect(cx, y + 4 + k * 16, 96, 3);
  }
  // pilha de malas
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(VX + 760, y + 14, 54, 40);
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(VX + 748, y + 52, 78, 26);
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(VX + 796, y + 26, 44, 30);
  ctx.fillStyle = '#d8c8a0';
  ctx.font = '6px monospace';
  ctx.fillText('FRÁGIL', VX + 758, y + 30);
  // palete solto e goteras do teto
  ctx.fillStyle = '#4a3a20';
  ctx.fillRect(VX + 60, y + 34, 70, 8);
  ctx.fillRect(VX + 64, y + 42, 8, 10);
  ctx.fillRect(VX + 118, y + 42, 8, 10);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(180,200,210,.28)';
    ctx.fillRect(VX + 330 + i * 320, y + 60 + ((t * 40 + i * 30) % 30), 2, 8);
  }
}

// =====================================================================
//  FEIRA DO PEIXE — calor
// =====================================================================
function feiraNova(p: Palette, y: number, t: number): void {
  // CAMELÔ DO PEIXE — lonas, caixas, gelo derretendo
  faixa(y, '#6a5a42', LANE_H);
  // lona esfarrapada esticada (prop)
  ctx.fillStyle = '#b04836';
  ctx.beginPath();
  ctx.moveTo(VX + 60, y + 6);
  ctx.lineTo(VX + 380, y + 14);
  ctx.lineTo(VX + 360, y + 32);
  ctx.lineTo(VX + 80, y + 26);
  ctx.closePath();
  ctx.fill();
  poste(VX + 70, y + 40, 96);
  poste(VX + 372, y + 44, 96);
  fio(VX + 74, y - 54, VX + 372, y - 50, 14);
  // caixas de peixe com gelo
  for (let i = 0; i < 5; i++) {
    const cx = VX + 460 + i * 120;
    ctx.fillStyle = '#8a8078';
    ctx.fillRect(cx, y + 22, 92, 40);
    ctx.fillStyle = '#d8d8d0';
    ctx.fillRect(cx + 6, y + 26, 80, 12);
    ctx.fillStyle = '#9aa08c';
    ctx.fillRect(cx + 14, y + 28, 60, 6);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx, y + 62, 92, 4);
  }
  vapor(VX + 500, y + 20, t, 3, 'rgba(220,230,225,.18)');
  // caixote e sombrinha
  caixote(VX + 40, y + LANE_H - 8, 48, 34);
  ctx.fillStyle = '#c8a03a';
  ctx.beginPath();
  ctx.arc(VX + 300, y + LANE_H - 14, 30, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#4a3a20';
  ctx.fillRect(VX + 297, y + LANE_H - 14, 5, 24);
  // poeira e tampa de gargalo no chão
  ctx.fillStyle = 'rgba(60,40,20,.25)';
  for (let i = 0; i < 12; i++) {
    const fx = VX + ((t * 40 + i * 97) % (W - VX));
    ctx.fillRect(fx, y + 96 + (i % 3) * 6, 8, 2);
  }
}

// =====================================================================
//  FÁBRICA PODRE — cinzas
// =====================================================================
function fabricaNova(_p: Palette, y: number, _t: number): void {
  // PÁTIO DE CARGA — contêineres, empilhadeira, marcação
  faixa(y, '#3a3a32', LANE_H);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(VX + 120 + i * 210, y + 100, 52, 8, 0, 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = '#c8a03a';
  ctx.lineWidth = 2;
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.moveTo(VX, y + 60);
  ctx.lineTo(FIELD_R, y + 60);
  ctx.stroke();
  ctx.setLineDash([]);
  // contêineres empilhados (prop grande)
  const cores = ['#7a3a24', '#3a5a6a', '#6a5a24'];
  for (let i = 0; i < 3; i++) {
    const cx = VX + 160 + i * 250;
    ctx.fillStyle = cores[i % 3];
    ctx.fillRect(cx, y + 10, 190, 40);
    ctx.fillStyle = cores[i % 3];
    ctx.fillRect(cx + 40, y - 34, 110, 44);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + 16 + k * 34, y + 10);
      ctx.lineTo(cx + 16 + k * 34, y + 50);
      ctx.stroke();
    }
    ctx.strokeRect(cx + 40, y - 34, 110, 44);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(cx, y + 44, 190, 6);
  }
  // empilhadeira parada
  ctx.fillStyle = '#8a6a20';
  ctx.fillRect(VX + 720, y + 50, 90, 30);
  ctx.fillStyle = '#5a4a16';
  ctx.fillRect(VX + 716, y + 44, 20, 40);
  ctx.fillStyle = '#2a2e22';
  for (const wx of [VX + 738, VX + 800]) {
    ctx.beginPath();
    ctx.arc(wx, y + 84, 11, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#5a5a40';
    ctx.beginPath();
    ctx.arc(wx, y + 84, 4, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#c8b45a';
  ctx.fillRect(VX + 760, y + 88, 40, 5);
}

// =====================================================================
//  CEMITÉRIO DE BARCOS — vendaval
// =====================================================================
function cemiterioNova(p: Palette, y: number, t: number): void {
  // CASCO ENCALHADO — navio encalhado, corrente e guindaste
  faixa(y, '#2c3234', LANE_H);
  waterLines(VX, y + 84, W - VX, 34, t * 1.1, 'rgba(150,180,180,.16)', 14);
  // casco (prop grande)
  ctx.fillStyle = '#22292c';
  ctx.beginPath();
  ctx.moveTo(VX + 300, y + 88);
  ctx.lineTo(VX + 340, y + 6);
  ctx.lineTo(VX + 640, y + 2);
  ctx.lineTo(VX + 640, y + 62);
  ctx.lineTo(VX + 420, y + 88);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a2022';
  for (let i = 0; i < 6; i++) ctx.fillRect(VX + 360 + i * 44, y + 14 + (i % 2) * 6, 22, 30);
  ctx.strokeStyle = '#2e3a3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(VX + 640, y + 60);
  ctx.lineTo(VX + 700, y + 40);
  ctx.lineTo(VX + 700, y + 88);
  ctx.stroke();
  // guindaste quebrado e corrente frouxa
  ctx.strokeStyle = '#3a4438';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(VX + 150, y + 88);
  ctx.lineTo(VX + 150, y + 4);
  ctx.lineTo(VX + 96, y + 22);
  ctx.stroke();
  ctx.strokeStyle = '#4a4a40';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    ctx.lineTo(VX + 96 - i * 4 + Math.sin(i + t) * 6, y + 26 + i * 9);
  }
  ctx.stroke();
  // pedras e erva morta na beira
  for (let i = 0; i < 8; i++) arbusto(VX + 30 + i * 130, y + 96, 9, '#2e3428');
}

/** Piso das lanes 4, 5 e 6: cada mapa desenha o seu (único). */
export function drawLaneFloorNova(map: MapDef, p: Palette, l: number, t: number): void {
  drawLaneFloorNovaEm(map, p, t, LANE_Y0 + l * LANE_H);
}

/**
 * O mesmo piso com Y explícito.
 *
 * Existe para o teste comparar a **arte** sem o deslocamento de lane: com
 * `drawLaneFloorNova` as assinatas diferem só pelo Y, e um teste de
 * "lanes iguais" passaria por vacuidade.
 */
export function drawLaneFloorNovaEm(map: MapDef, p: Palette, t: number, y: number): void {
  if (map.id === 'barra') barraNova(p, y, t);
  else if (map.id === 'farol') farolNova(p, y, t);
  else if (map.id === 'estacao') estacaoNova(p, y, t);
  else if (map.id === 'feira') feiraNova(p, y, t);
  else if (map.id === 'fabrica') fabricaNova(p, y, t);
  else cemiterioNova(p, y, t);
  // Profundidade: sombra suave no topo e na base da lane dá volume ao corredor.
  const top = ctx.createLinearGradient(0, y, 0, y + 14);
  top.addColorStop(0, 'rgba(0,0,0,.22)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(VX, y, W - VX, 14);
  const bot = ctx.createLinearGradient(0, y + LANE_H - 16, 0, y + LANE_H);
  bot.addColorStop(0, 'rgba(0,0,0,0)');
  bot.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = bot;
  ctx.fillRect(VX, y + LANE_H - 16, W - VX, 16);
}
