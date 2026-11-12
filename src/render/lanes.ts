/**
 * lanes.ts — o piso das lanes novas (4, 5 e 6).
 *
 * Com 6 lanes, metade do campo não existia como cenário: as lanes de
 * índice 3 e 4 mostravam o mesmo jardim e o mesmo trapiche em todos os
 * mapas, e a lane de índice 5 herdava o piso da lane 2. Aqui cada mapa
 * tem piso, props e silhueta próprios nas três lanes de baixo.
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
function barraNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // HORTA DO ZÉ — fileiras de verdura, lata d'água, cavalete
    faixa(y, p.ground, LANE_H);
    for (let i = 0; i < 6; i++) {
      const ry = y + 26 + i * 16;
      ctx.fillStyle = i % 2 ? '#4a4228' : '#423c24';
      ctx.fillRect(VX, ry, W - VX, 6);
      ctx.fillStyle = '#5a7a34';
      for (let k = 0; k < 22; k++) arbusto(VX + 14 + k * 50, ry + 2 + (k % 2), 6 + (k % 3) * 2, '#5a7a34');
    }
    // lata d'água suspensa (prop grande)
    ctx.fillStyle = '#4a5a48';
    rr(VX + 150, y + 2, 74, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#6a7a60';
    ctx.fillRect(VX + 148, y + 2, 78, 6);
    ctx.fillStyle = '#8a9a80';
    ctx.beginPath();
    ctx.moveTo(VX + 224, y + 18);
    ctx.lineTo(VX + 250, y + 28);
    ctx.lineTo(VX + 224, y + 30);
    ctx.fill();
    fio(VX + 186, y, VX + 186, 0, 0);
    // cavalete e varal de roupa
    ctx.strokeStyle = '#7a6a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(VX + 430, y + 56);
    ctx.lineTo(VX + 430, y + 10);
    ctx.moveTo(VX + 380, y + 12);
    ctx.lineTo(VX + 480, y + 12);
    ctx.stroke();
    fio(VX + 300, y + 30, VX + 600, y + 30, 8);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = ['#c8b8a0', '#8a9a80', '#a07850'][i % 3];
      ctx.fillRect(VX + 320 + i * 56, y + 30, 26, 20);
    }
    // caixotes e pedras no caminho
    caixote(VX + 620, y + LANE_H - 12, 44, 30);
    caixote(VX + 660, y + LANE_H - 42, 36, 24);
    ctx.fillStyle = '#6a6a62';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.ellipse(VX + 40 + i * 108, y + LANE_H - 10, 12, 5, 0, 0, 7);
      ctx.fill();
    }
  } else {
    // BECO DO ZÉ — viela entre muros, escada, entulho
    faixa(y, '#3a3a34', LANE_H);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = i % 2 ? '#43423a' : '#38372f';
      ctx.fillRect(VX + i * 46, y + 6, 44, LANE_H - 12);
    }
    // muros do beco, com telhado por cima
    ctx.fillStyle = '#2a2a26';
    ctx.fillRect(VX, y - 30, 46, 40);
    ctx.fillRect(VX + 980, y - 30, 46, 40);
    ctx.fillRect(VX + 160, y - 16, 210, 26);
    // escada de incêndio subindo o muro
    ctx.strokeStyle = '#4a4438';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(VX + 40 + i * 34, y - 10 + i * 5);
      ctx.lineTo(VX + 74 + i * 34, y + 6 + i * 5);
      ctx.stroke();
    }
    // lâmpada do beco + luz
    poste(VX + 560, y + 40, 74);
    ctx.fillStyle = '#ffd070';
    ctx.beginPath();
    ctx.arc(VX + 560, y - 40, 7, 0, 7);
    ctx.fill();
    const lum = ctx.createRadialGradient(VX + 560, y - 40, 2, VX + 560, y - 40, 70);
    lum.addColorStop(0, 'rgba(255,210,120,.20)');
    lum.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = lum;
    ctx.fillRect(VX + 490, y - 66, 140, 104);
    // entulho, caixote e lixo
    ctx.fillStyle = '#4a4230';
    ctx.beginPath();
    ctx.moveTo(VX + 640, y + LANE_H);
    ctx.lineTo(VX + 660, y + LANE_H - 34);
    ctx.lineTo(VX + 740, y + LANE_H - 30);
    ctx.lineTo(VX + 760, y + LANE_H);
    ctx.fill();
    caixote(VX + 240, y + LANE_H - 10, 40, 26);
    caixote(VX + 276, y + LANE_H - 34, 32, 22);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ['#6a6a5a', '#8a8a70', '#5a5040'][i % 3];
      ctx.fillRect(VX + 80 + i * 96, y + 90, 14, 4);
    }
  }
}

// =====================================================================
//  FAROL DO FIM — penhascos, neblina
// =====================================================================
function farolNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // TRAPICHE VELHO — pedra molhada, cordas e âncora
    faixa(y, p.strip, LANE_H);
    ctx.fillStyle = '#2a2e30';
    for (let i = 0; i < 16; i++) ctx.fillRect(VX + i * 70, y + 24 + (i % 2) * 8, 66, 12);
    waterLines(VX, y + 40, W - VX, 26, t, 'rgba(170,200,190,.16)');
    // âncora grande (prop)
    ctx.strokeStyle = '#5a5148';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(VX + 500, y + 90);
    ctx.lineTo(VX + 500, y + 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(VX + 500, y + 24, 9, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(VX + 470, y + 100);
    ctx.quadraticCurveTo(VX + 500, y + 64, VX + 530, y + 100);
    ctx.stroke();
    // estacas e cordas enroladas
    for (let i = 0; i < 14; i++) {
      const h = 24 + (i % 3) * 8;
      ctx.fillStyle = '#3a2e22';
      ctx.fillRect(VX + 18 + i * 78, y + LANE_H - h - 10, 8, h);
      ctx.fillStyle = '#2a2218';
      ctx.fillRect(VX + 14 + i * 78, y + LANE_H - h - 14, 16, 6);
    }
    ctx.strokeStyle = '#a09070';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(VX + 240 + i * 190, y + 20, 11, 0, Math.PI * 1.4);
      ctx.stroke();
    }
    fio(VX + 60, y + 10, VX + 200, y + 18, 10);
    // pedras lisas e algas
    for (let i = 0; i < 9; i++) arbusto(VX + 30 + i * 122, y + LANE_H - 18, 10, '#2a4a34');
  } else {
    // ROTA DO FAROLEIRO — trilha de pedra, marcos e vento
    faixa(y, p.ground, LANE_H);
    ctx.fillStyle = '#5a5a50';
    for (let i = 0; i < 14; i++) {
      const px = VX + 20 + i * 80;
      ctx.beginPath();
      ctx.ellipse(px + Math.sin(i) * 6, y + 46 + (i % 3) * 12, 26 + (i % 4) * 4, 13, 0, 0, 7);
      ctx.fill();
    }
    // dois marcos de pedra marcando a subida (prop)
    for (const mx of [VX + 260, VX + 800]) {
      ctx.fillStyle = '#4a4a42';
      ctx.fillRect(mx, y + 6, 26, 74);
      ctx.fillStyle = '#3a3a32';
      ctx.fillRect(mx, y + 6, 26, 8);
      ctx.fillStyle = '#c8c0a0';
      ctx.fillRect(mx + 4, y - 4, 18, 12);
    }
    // poste com placa da rota
    poste(VX + 540, y + 60, 96);
    ctx.fillStyle = '#6a5a3a';
    ctx.fillRect(VX + 500, y - 44, 80, 26);
    ctx.fillStyle = '#3a2e1a';
    ctx.font = '7px monospace';
    ctx.fillText('ROTA', VX + 516, y - 26);
    // gravetos e mato seco ao vento
    ctx.strokeStyle = '#7a7a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const gx = VX + 16 + i * 80;
      const sw = Math.sin(t * 2.4 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(gx, y + LANE_H - 8);
      ctx.quadraticCurveTo(gx + sw, y + LANE_H - 26, gx + sw * 2, y + LANE_H - 40);
      ctx.stroke();
    }
  }
}

// =====================================================================
//  ESTAÇÃO AFOGADA — tempestade
// =====================================================================
function estacaoNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // DEPÓSITO — prateleiras, caixas, luminária acesa
    faixa(y, '#3a4038', LANE_H);
    // prateleiras com caixas
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = '#5a5040';
      ctx.fillRect(VX + 30, y + 14 + r * 26, W - VX - 60, 5);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = ['#7a6a44', '#8a7a54', '#6a5a3a', '#5a6a54'][(i + r) % 4];
        ctx.fillRect(VX + 40 + i * 86, y + 8 + r * 26 - 24, 54, 24);
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(VX + 40 + i * 86, y + 8 + r * 26 - 6, 54, 6);
      }
    }
    // luminária pendurada com halo (prop)
    ctx.strokeStyle = '#2a2e2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(VX + 560, y);
    ctx.lineTo(VX + 560, y - 46);
    ctx.stroke();
    ctx.fillStyle = '#c8b070';
    ctx.beginPath();
    ctx.moveTo(VX + 548, y - 46);
    ctx.lineTo(VX + 572, y - 46);
    ctx.lineTo(VX + 578, y - 34);
    ctx.lineTo(VX + 542, y - 34);
    ctx.closePath();
    ctx.fill();
    const halo = ctx.createRadialGradient(VX + 560, y - 32, 2, VX + 560, y - 32, 130);
    halo.addColorStop(0, 'rgba(230,200,140,.20)');
    halo.addColorStop(1, 'rgba(230,200,140,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(VX + 400, y - 120, 320, 190);
    // serragem no chão e sacos
    ctx.fillStyle = '#5a4a2a';
    for (let i = 0; i < 20; i++) ctx.fillRect(VX + i * 56, y + LANE_H - 16, 22, 6);
    ctx.fillStyle = '#8a7a54';
    ctx.beginPath();
    ctx.ellipse(VX + 130, y + LANE_H - 22, 26, 16, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(VX + 158, y + LANE_H - 30, 22, 14, 0, 0, 7);
    ctx.fill();
  } else {
    // FIM DE LINHA — dormente, trilho e erva
    faixa(y, '#33362e', LANE_H);
    ctx.fillStyle = '#4a3a20';
    for (let i = 0; i < 12; i++) ctx.fillRect(VX + i * 92, y + 58, 84, 16);
    ctx.fillStyle = '#6a6a58';
    ctx.fillRect(VX, y + 50, W - VX, 4);
    ctx.fillRect(VX, y + 76, W - VX, 4);
    // batente de fim de linha (prop grande)
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(VX + 900, y + 8, 34, 90);
    ctx.fillStyle = '#8a2a20';
    ctx.fillRect(VX + 896, y, 42, 12);
    ctx.fillStyle = '#e8d8b0';
    ctx.font = '7px monospace';
    ctx.fillText('FIM', VX + 904, y + 8);
    // placa na parede
    ctx.fillStyle = '#1a201e';
    ctx.fillRect(VX + 120, y - 18, 150, 22);
    ctx.fillStyle = '#c8c0a0';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('FIM DE LINHA', VX + 128, y - 4);
    // erva e dormente solto
    for (let i = 0; i < 14; i++) arbusto(VX + 20 + i * 80, y + 34 + Math.sin(t + i) * 2, 7, '#4a5a30');
    ctx.fillStyle = '#3a2e1a';
    ctx.fillRect(VX + 480, y + LANE_H - 18, 90, 12);
  }
}

// =====================================================================
//  FEIRA DO PEIXE — calor
// =====================================================================
function feiraNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // GELO — blocos, caminhão frigorífico, água de degelo
    faixa(y, p.strip, LANE_H);
    waterLines(VX, y + 20, W - VX, 20, t, 'rgba(190,220,215,.20)');
    // caminhão frigorífico (prop grande)
    ctx.fillStyle = '#8a8a80';
    ctx.fillRect(VX + 700, y + 12, 200, 62);
    ctx.fillStyle = '#6a6a60';
    ctx.fillRect(VX + 700, y + 12, 200, 10);
    ctx.fillStyle = '#2a2e2a';
    ctx.fillRect(VX + 900, y + 34, 44, 40);
    ctx.fillStyle = '#7a8a8a';
    ctx.fillRect(VX + 904, y + 38, 28, 16);
    for (const wx of [VX + 722, VX + 830]) {
      ctx.fillStyle = '#1a1e1e';
      ctx.beginPath();
      ctx.arc(wx, y + 76, 13, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#5a5a50';
      ctx.beginPath();
      ctx.arc(wx, y + 76, 5, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#c8d8d0';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('GELO', VX + 712, y + 50);
    // pilha de blocos de gelo rachada
    ctx.fillStyle = 'rgba(200,225,225,.55)';
    for (let i = 0; i < 6; i++) {
      const bx = VX + 300 + (i % 3) * 54;
      const by = y + 40 + Math.floor(i / 3) * 34;
      ctx.fillRect(bx, by, 48, 30);
      ctx.strokeStyle = 'rgba(120,150,150,.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, 48, 30);
      ctx.beginPath();
      ctx.moveTo(bx + 6, by);
      ctx.lineTo(bx + 26, by + 30);
      ctx.stroke();
    }
    vapor(VX + 320, y + 38, t, 3, 'rgba(210,230,225,.16)');
    // poças de degelo e escorrimão
    ctx.fillStyle = 'rgba(150,190,190,.22)';
    for (let i = 0; i < 7; i++) ctx.fillRect(VX + 20 + i * 150, y + 90, 60, 6);
  } else {
    // CALDEIRÃO DO PEIXE — panelões, fogo e vapor
    faixa(y, '#4a3a2a', LANE_H);
    // panelão grande (prop)
    ctx.fillStyle = '#2e2a24';
    ctx.beginPath();
    ctx.ellipse(VX + 560, y + 74, 66, 14, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(VX + 496, y + 20, 128, 54);
    ctx.fillStyle = '#5a5044';
    ctx.fillRect(VX + 490, y + 14, 140, 8);
    ctx.fillStyle = '#6a5a48';
    ctx.beginPath();
    ctx.ellipse(VX + 560, y + 14, 44, 10, 0, 0, Math.PI);
    ctx.fill();
    // fogo do fogareiro
    for (let i = 0; i < 5; i++) {
      const fh = 14 + Math.sin(t * 9 + i) * 8;
      ctx.fillStyle = i % 2 ? '#e08a20' : '#ffd070';
      ctx.beginPath();
      ctx.moveTo(VX + 520 + i * 20, y + 88);
      ctx.lineTo(VX + 530 + i * 20, y + 88 - fh);
      ctx.lineTo(VX + 540 + i * 20, y + 88);
      ctx.fill();
    }
    vapor(VX + 560, y + 8, t, 5, 'rgba(220,225,215,.16)');
    // segundo panelão pequeno e tábua de cortar
    ctx.fillStyle = '#332e26';
    ctx.beginPath();
    ctx.ellipse(VX + 240, y + 86, 40, 9, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#3e382e';
    ctx.fillRect(VX + 202, y + 56, 76, 30);
    ctx.fillStyle = '#8a7a54';
    ctx.fillRect(VX + 900, y + 70, 120, 10);
    ctx.fillStyle = '#c8b8a0';
    ctx.fillRect(VX + 920, y + 58, 16, 12);
    // balde e óleo no chão
    ctx.fillStyle = '#5a5040';
    ctx.fillRect(VX + 60, y + 76, 26, 26);
    ctx.fillStyle = 'rgba(20,16,10,.4)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(VX + 400 + i * 150, y + 110, 26, 5, 0, 0, 7);
      ctx.fill();
    }
  }
}

// =====================================================================
//  FÁBRICA PODRE — cinzas
// =====================================================================
function fabricaNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // CALDEIRAS — tanques grandes, tubos e vapor
    faixa(y, '#33362c', LANE_H);
    ctx.fillStyle = '#4a5040';
    for (let i = 0; i < 10; i++) ctx.fillRect(VX + i * 112, y + 22, 108, 10);
    // caldeiras (prop grande)
    for (let i = 0; i < 2; i++) {
      const cx = VX + 200 + i * 480;
      ctx.fillStyle = '#4a4438';
      rr(cx, y + 16, 190, 76, 14);
      ctx.fill();
      ctx.fillStyle = '#5a5246';
      ctx.fillRect(cx, y + 16, 190, 10);
      ctx.fillStyle = '#e05a20';
      ctx.fillRect(cx + 30, y + 34, 34, 8);
      ctx.fillRect(cx + 76, y + 34, 34, 8);
      // válvula e manômetro
      ctx.fillStyle = '#8a7a4a';
      ctx.fillRect(cx + 150, y + 40, 8, 16);
      ctx.strokeStyle = '#c8c0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 154, y + 34, 8, 0, 7);
      ctx.stroke();
      // tubo descendo
      ctx.strokeStyle = '#3a342c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 190, y + 30);
      ctx.lineTo(cx + 240, y + 30);
      ctx.lineTo(cx + 240, y + 92);
      ctx.stroke();
      vapor(cx + 60, y + 14, t + i, 4, 'rgba(210,215,200,.15)');
    }
    // grade e gotas de óleo
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    for (let i = 0; i < 8; i++) ctx.fillRect(VX + 30 + i * 140, y + 96, 60, 5);
  } else {
    // ESCRITÓRIO DO GERENTE — mesa, arquivo e luminária
    faixa(y, '#3e3a30', LANE_H);
    ctx.fillStyle = '#2e2a24';
    for (let i = 0; i < 6; i++) ctx.fillRect(VX + i * 190, y + 26 + (i % 2) * 10, 186, 16);
    // tapete quadrado no chão
    ctx.fillStyle = '#5a3a2a';
    ctx.fillRect(VX + 420, y + 84, 220, 34);
    // mesa grande do gerente (prop)
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(VX + 400, y + 48, 260, 12);
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(VX + 410, y + 60, 10, 50);
    ctx.fillRect(VX + 640, y + 60, 10, 50);
    // arquivos e máquina de escrever em cima
    ctx.fillStyle = '#8a7a54';
    for (let i = 0; i < 4; i++) ctx.fillRect(VX + 408 + i * 16, y + 26, 14, 22);
    ctx.fillStyle = '#2a2a26';
    ctx.fillRect(VX + 480, y + 34, 52, 14);
    ctx.fillStyle = '#c8c0a0';
    ctx.fillRect(VX + 486, y + 28, 40, 7);
    // luminária de mesa acesa
    ctx.strokeStyle = '#3a342a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(VX + 620, y + 48);
    ctx.lineTo(VX + 620, y + 14);
    ctx.stroke();
    ctx.fillStyle = '#5a5040';
    ctx.beginPath();
    ctx.moveTo(VX + 606, y + 14);
    ctx.lineTo(VX + 634, y + 14);
    ctx.lineTo(VX + 640, y + 4);
    ctx.lineTo(VX + 600, y + 4);
    ctx.closePath();
    ctx.fill();
    const luz = ctx.createRadialGradient(VX + 620, y + 6, 2, VX + 620, y + 6, 90);
    luz.addColorStop(0, 'rgba(255,220,150,.20)');
    luz.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = luz;
    ctx.fillRect(VX + 520, y - 80, 200, 160);
    // quadro do relógio de ponto na parede
    ctx.fillStyle = '#2a2e28';
    ctx.fillRect(VX + 900, y + 24, 70, 44);
    ctx.fillStyle = '#c8b45a';
    ctx.font = '7px monospace';
    ctx.fillText('07:00', VX + 916, y + 50);
  }
}

// =====================================================================
//  CEMITÉRIO DE BARCOS — vendaval
// =====================================================================
function cemiterioNova(p: Palette, l: number, y: number, t: number): void {
  l = 3; // unificado: mesmo piso em todas as lanes de baixo
  if (l === 3) {
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
  } else if (l === 4) {
    // OSSOS DO CASCO — costelas do navio na água rasa
    faixa(y, p.water, LANE_H);
    waterLines(VX, y, W - VX, LANE_H, t * 1.2, 'rgba(150,180,180,.14)');
    // costelas (prop)
    ctx.strokeStyle = '#3a3228';
    ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const rx = VX + 160 + i * 150;
      ctx.beginPath();
      ctx.arc(rx, y + 92, 52 + (i % 2) * 14, Math.PI, Math.PI * 1.45);
      ctx.stroke();
    }
    // quilha ainda de pé
    ctx.fillStyle = '#2a2a22';
    ctx.fillRect(VX + 120, y + 90, 780, 10);
    ctx.fillStyle = '#33302a';
    ctx.fillRect(VX + 120, y + 84, 780, 6);
    // âncora cravada na areia
    ctx.strokeStyle = '#5a5148';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(VX + 950, y + 92);
    ctx.lineTo(VX + 950, y + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(VX + 950, y + 44, 8, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(VX + 926, y + 92);
    ctx.quadraticCurveTo(VX + 950, y + 58, VX + 974, y + 92);
    ctx.stroke();
    // tábuas soltas e lama
    ctx.fillStyle = '#4a4238';
    for (let i = 0; i < 10; i++) {
      const a = Math.sin(t * 1.5 + i) * 3;
      ctx.save();
      ctx.translate(VX + 30 + i * 108, y + 30 + a);
      ctx.rotate(Math.sin(t + i) * .04);
      ctx.fillRect(0, 0, 66, 6);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(10,14,12,.35)';
    ctx.fillRect(VX, y + LANE_H - 16, W - VX, 16);
  } else {
    // MARGEM DO CEMITÉRIO — lápides, cruzes e maré subindo
    faixa(y, '#262c26', LANE_H);
    ctx.fillStyle = '#31362c';
    for (let i = 0; i < 7; i++) ctx.fillRect(VX + i * 160, y + 60, 154, 8);
    // lápides (prop)
    for (let i = 0; i < 9; i++) {
      const lx = VX + 26 + i * 122;
      ctx.fillStyle = '#8a8a7a';
      if (i % 3 === 0) {
        ctx.fillRect(lx, y + 22, 8, 40);
        ctx.fillRect(lx - 7, y + 32, 22, 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(lx, y + 62);
        ctx.lineTo(lx, y + 28);
        ctx.arc(lx + 13, y + 28, 13, Math.PI, 0);
        ctx.lineTo(lx + 26, y + 62);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(lx, y + 58, 26, 6);
    }
    // maré batendo na margem
    waterLines(VX, y + 78, W - VX, 34, t, 'rgba(190,215,205,.20)', 10);
    ctx.strokeStyle = 'rgba(200,225,210,.20)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(VX + 80 + i * 230, y + LANE_H - 6 + Math.sin(t * 2 + i) * 3, 30, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // placa enferrujada e erva morta
    ctx.fillStyle = '#5a4a32';
    ctx.fillRect(VX + 940, y + 34, 74, 30);
    ctx.strokeStyle = '#3a3022';
    ctx.lineWidth = 1;
    ctx.strokeRect(VX + 940, y + 34, 74, 30);
    ctx.fillStyle = '#c8b890';
    ctx.font = '6px monospace';
    ctx.fillText('AQUI NÃO', VX + 948, y + 52);
    for (let i = 0; i < 12; i++) arbusto(VX + 20 + i * 92, y + 14, 5, '#3e4430');
  }
}

/** Piso das lanes 4, 5 e 6: cada mapa desenha as suas três. */
export function drawLaneFloorNova(map: MapDef, p: Palette, l: number, t: number): void {
  const y = LANE_Y0 + l * LANE_H;
  if (map.id === 'barra') barraNova(p, l, y, t);
  else if (map.id === 'farol') farolNova(p, l, y, t);
  else if (map.id === 'estacao') estacaoNova(p, l, y, t);
  else if (map.id === 'feira') feiraNova(p, l, y, t);
  else if (map.id === 'fabrica') fabricaNova(p, l, y, t);
  else cemiterioNova(p, l, y, t);
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
