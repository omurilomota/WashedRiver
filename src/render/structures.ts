/**
 * structures.ts — o desenho das estruturas das lanes de baixo.
 *
 * As lanes 4, 5 e 6 ganharam estruturas próprias por mapa (`maps.json`),
 * e o desenho antigo classificava por pedaço do nome: `s.id.includes('caixa')`,
 * `includes('valvula')` — cisterna acabava desenhada como casa, luminária
 * como casa, contêiner como casa. Aqui cada id novo tem a sua silhueta, e
 * `sprites.ts` só delega.
 *
 * O mundo é desenhado em torno da origem: (0,0) é a base da estrutura, o
 * que sobe é y negativo. Tamanhos ficam na faixa de 60x90, como as outras.
 */
import { ctx, rr } from '../core/canvas';
import type { MapDef, StructureDef } from '../data/types';

/** Sombra no chão — dá peso e tira a sensação de etiqueta colada. */
function sombra(w: number): void {
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.22, 0, 0, 7);
  ctx.fill();
}

/** Caixa com ripas (engradado, contêiner, estante). */
function ripado(x: number, y: number, w: number, h: number, cor: string): void {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (let i = y; i < y + h; i += Math.max(6, h / 4)) ctx.fillRect(x, i, w, 3);
  ctx.fillRect(x + w / 2 - 1, y, 2, h);
}

/** Rodinha de veículo. */
function roda(x: number, y: number, r: number): void {
  ctx.fillStyle = '#1a1e1e';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#5a5a50';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, 7);
  ctx.fill();
}

/** Lâmpada acesa com halo. */
function lampada(x: number, y: number, cor: string): void {
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 46);
  halo.addColorStop(0, 'rgba(255,225,150,.26)');
  halo.addColorStop(1, 'rgba(255,225,150,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 46, y - 46, 92, 92);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 7);
  ctx.fill();
}

/** Estrutura das lanes de baixo. Devolve true se desenhou (e o chamador para). */
export function drawEstruturaNova(s: StructureDef, map: MapDef, t: number): boolean {
  switch (s.id) {
    // ---------- Barra Suja ----------
    case 'cisterna': // cisterna da vila
      sombra(24);
      ctx.fillStyle = '#5a6a56';
      rr(-17, -46, 34, 46, 10);
      ctx.fill();
      ctx.fillStyle = '#42503f';
      ctx.fillRect(-19, -50, 38, 7);
      ctx.fillStyle = '#6a7a64';
      ctx.fillRect(11, -20, 7, 9);
      ctx.fillStyle = 'rgba(170,205,195,.5)';
      ctx.fillRect(13, -11 + ((t * 22) % 6), 2, 7);
      return true;
    case 'cerca': // cerca do jardim
      ctx.strokeStyle = '#6a5a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, -30);
      ctx.lineTo(24, -30);
      ctx.moveTo(-24, -16);
      ctx.lineTo(24, -16);
      ctx.stroke();
      ctx.fillStyle = '#5a4a30';
      for (let i = -20; i <= 20; i += 10) ctx.fillRect(i - 2, -34, 4, 34);
      return true;
    case 'carroca': // carroça do Zé
      sombra(28);
      ctx.fillStyle = '#6a5232';
      ctx.fillRect(-20, -26, 40, 24);
      ctx.fillStyle = '#4a3a20';
      ctx.fillRect(-22, -28, 44, 5);
      ctx.strokeStyle = '#5a4a30';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, -26);
      ctx.lineTo(30, -4);
      ctx.stroke();
      roda(-11, -2, 9);
      roda(12, -2, 9);
      return true;
    case 'lata_agua': // lata d'água suspensa
      ctx.strokeStyle = '#7a6a4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -52);
      ctx.lineTo(16, -52);
      ctx.stroke();
      ctx.fillStyle = '#8a8a70';
      rr(-16, -46, 32, 40, 6);
      ctx.fill();
      ctx.fillStyle = '#6a6a58';
      ctx.fillRect(-18, -48, 36, 5);
      ctx.beginPath();
      ctx.moveTo(16, -34);
      ctx.lineTo(26, -28);
      ctx.lineTo(16, -24);
      ctx.fill();
      ctx.fillStyle = 'rgba(170,205,195,.5)';
      ctx.fillRect(24, -24 + ((t * 26) % 20), 2, 8);
      return true;
    case 'muro_vila': // muro da vila
      sombra(30);
      ctx.fillStyle = '#5a5148';
      ctx.fillRect(-30, -34, 60, 34);
      ctx.fillStyle = '#4a4438';
      for (let i = -30; i < 30; i += 12) ctx.fillRect(i, -34, 2, 34);
      ctx.fillStyle = '#3a342c';
      ctx.fillRect(-30, -40, 60, 7);
      ctx.fillStyle = '#2a2620';
      ctx.fillRect(-8, -12, 16, 12);
      ctx.fillStyle = '#8a8070';
      ctx.fillRect(-10, -18, 20, 5);
      return true;
    case 'monturo': // monturo do beco      ctx.fillStyle = '#3e382c';
      sombra(26);
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-10, -30);
      ctx.lineTo(14, -34);
      ctx.lineTo(26, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a5040';
      ctx.fillRect(-6, -42, 12, 10);
      ctx.fillStyle = '#6a6a52';
      ctx.fillRect(-18, -22, 10, 4);
      ctx.fillRect(8, -18, 14, 4);
      return true;

    // ---------- Farol do Fim ----------
    case 'base_farol': // base do farol velho
      sombra(30);
      ctx.fillStyle = '#4a4a42';
      ctx.fillRect(-28, -22, 56, 22);
      ctx.fillStyle = '#3a3a32';
      ctx.fillRect(-16, -48, 32, 26);
      ctx.strokeStyle = '#2a2a24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -46);
      ctx.lineTo(6, -24);
      ctx.stroke();
      ctx.fillStyle = '#8a8070';
      ctx.fillRect(-6, -54, 12, 8);
      return true;
    case 'engrenagem': { // engrenagem quebrada
      sombra(22);
      const dentes = 8;
      ctx.fillStyle = '#5a5148';
      for (let i = 0; i < dentes; i++) {
        const a = (i / dentes) * Math.PI * 2 + t * 0.15;
        ctx.save();
        ctx.translate(Math.cos(a) * 20, -34 + Math.sin(a) * 20);
        ctx.rotate(a);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, -34, 16, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#2a2a24';
      ctx.beginPath();
      ctx.arc(0, -34, 5, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#3a342c';
      ctx.fillRect(-3, -18, 6, 18);
      return true;
    }
    case 'farol_apagado': // farol apagado
      sombra(16);
      ctx.fillStyle = '#3a4046';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-9, -54);
      ctx.lineTo(9, -54);
      ctx.lineTo(14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a3036';
      ctx.fillRect(-12, -62, 24, 9);
      ctx.fillStyle = Math.sin(t * 1.6) > .93 ? '#e8d070' : '#1a2024';
      ctx.beginPath();
      ctx.arc(0, -57, 4, 0, 7);
      ctx.fill();
      return true;
    case 'marco': // marco de pedra da rota
      sombra(18);
      ctx.fillStyle = '#5a5a50';
      ctx.fillRect(-11, -32, 22, 32);
      ctx.fillStyle = '#6a6a5a';
      ctx.fillRect(-13, -36, 26, 6);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(-9, -22, 18, 3);
      return true;
    case 'trapiche': // trapiche velho
      ctx.fillStyle = '#4a3a26';
      ctx.fillRect(-26, -12, 52, 12);
      ctx.fillStyle = '#3a2e1e';
      for (let i = -20; i <= 20; i += 13) ctx.fillRect(i, -12, 5, 30);
      ctx.fillStyle = 'rgba(40,60,60,.45)';
      ctx.fillRect(-26, 14, 52, 8);
      waterLinesTrapiche();
      return true;
    case 'cais': // cais do fundo
      sombra(24);
      ctx.fillStyle = '#4a4438';
      ctx.fillRect(-24, -14, 48, 14);
      ctx.fillStyle = '#5a5248';
      for (let i = -18; i <= 18; i += 9) ctx.fillRect(i, -18, 6, 4);
      ctx.fillStyle = '#2a2a24';
      ctx.fillRect(-20, -38, 8, 24);
      ctx.beginPath();
      ctx.arc(-16, -40, 6, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12, -8, 9, Math.PI, Math.PI * 2);
      ctx.stroke();
      return true;
    case 'farol_afundado': // farol afundado
      sombra(18);
      ctx.fillStyle = '#34404a';
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(-10, -50);
      ctx.lineTo(10, -50);
      ctx.lineTo(16, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(30,50,60,.55)';
      ctx.fillRect(-18, -20, 36, 20);
      ctx.fillStyle = '#22303a';
      ctx.fillRect(-11, -56, 22, 8);
      return true;

    // ---------- Estação Afogada ----------
    case 'engradado': // engradado de malas
      sombra(28);
      ripado(-26, -40, 52, 40, '#6a5232');
      ctx.fillStyle = '#8a7a54';
      ctx.fillRect(-14, -34, 28, 16);
      ctx.fillStyle = '#3a2e1a';
      ctx.font = '6px monospace';
      ctx.fillText('MALAS', -11, -24);
      return true;
    case 'palete': // palete de carga
      sombra(26);
      ctx.fillStyle = '#7a6a44';
      ctx.fillRect(-24, -16, 48, 6);
      ctx.fillStyle = '#5a4a2e';
      for (let i = -20; i <= 20; i += 16) ctx.fillRect(i, -10, 8, 10);
      ctx.fillStyle = '#8a7a54';
      ctx.fillRect(-22, -26, 44, 10);
      return true;
    case 'prateleira': // prateleira do depósito
      sombra(28);
      ctx.fillStyle = '#5a5040';
      for (let i = 0; i < 3; i++) ctx.fillRect(-26, -40 + i * 14, 52, 4);
      ripado(-22, -54, 20, 14, '#6a5a3a');
      ripado(2, -54, 20, 14, '#7a6a44');
      ripado(-22, -40, 16, 14, '#4a5a4a');
      ripado(6, -40, 18, 14, '#5a4a3a');
      return true;
    case 'luminaria': // luminária do depósito
      sombra(14);
      ctx.strokeStyle = '#3a3e3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -60);
      ctx.stroke();
      ctx.fillStyle = '#2a2e2a';
      ctx.fillRect(-9, -66, 18, 5);
      lampada(0, -70, '#ffe8a0');
      ctx.fillStyle = '#5a5248';
      ctx.fillRect(-7, -8, 14, 8);
      return true;
    case 'batente': // batente de fim de trilho
      sombra(26);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(-20, -30, 40, 30);
      ctx.fillStyle = '#8a2a20';
      ctx.fillRect(-22, -36, 44, 8);
      ctx.fillStyle = '#4a4a40';
      ctx.fillRect(-24, -6, 48, 6);
      return true;
    case 'placa_fim': // placa de fim de linha
      sombra(16);
      ctx.fillStyle = '#5a5248';
      ctx.fillRect(-3, -44, 6, 44);
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(-26, -60, 52, 20);
      ctx.strokeStyle = '#3a2e1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-26, -60, 52, 20);
      ctx.fillStyle = '#e8d8b0';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('FIM', -8, -47);
      return true;

    // ---------- Feira do Peixe ----------
    case 'lona': // lona do camelô
      sombra(28);
      ctx.fillStyle = '#b04836';
      ctx.beginPath();
      ctx.moveTo(-28, -30);
      ctx.lineTo(0, -44);
      ctx.lineTo(28, -30);
      ctx.lineTo(24, -24);
      ctx.lineTo(-24, -24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a3a20';
      ctx.fillRect(-26, -24, 4, 24);
      ctx.fillRect(22, -24, 4, 24);
      ctx.fillStyle = '#8a8078';
      ctx.fillRect(-16, -20, 32, 14);
      ctx.fillStyle = '#9aa08c';
      ctx.fillRect(-12, -18, 24, 6);
      return true;
    case 'sombrinha': // sombrinha da feira
      sombra(20);
      ctx.fillStyle = '#5a4a2a';
      ctx.fillRect(-2, -30, 4, 30);
      ctx.fillStyle = '#c8a03a';
      ctx.beginPath();
      ctx.moveTo(-26, -32);
      ctx.quadraticCurveTo(0, -56, 26, -32);
      ctx.quadraticCurveTo(0, -40, -26, -32);
      ctx.fill();
      ctx.fillStyle = '#e8c84a';
      ctx.beginPath();
      ctx.arc(0, -52, 3, 0, 7);
      ctx.fill();
      return true;
    case 'caminhao_gelo': // caminhão de gelo
      sombra(34);
      ctx.fillStyle = '#8a8a7a';
      ctx.fillRect(-30, -44, 44, 40);
      ctx.fillStyle = '#6a6a60';
      ctx.fillRect(-30, -44, 44, 7);
      ctx.fillStyle = '#3a4038';
      ctx.fillRect(14, -30, 18, 26);
      ctx.fillStyle = '#9ab0ac';
      ctx.fillRect(16, -28, 10, 10);
      roda(-18, -2, 8);
      roda(18, -2, 8);
      ctx.fillStyle = '#c8d8d0';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('GELO', -24, -20);
      return true;
    case 'pilha_gelo': // pilha de gelo
      sombra(24);
      for (let i = 0; i < 3; i++) {
        const bx = -20 + (i % 2) * 18;
        const by = -36 + Math.floor(i / 2) * 18;
        ctx.fillStyle = 'rgba(205,228,228,.65)';
        ctx.fillRect(bx, by, 22, 16);
        ctx.strokeStyle = 'rgba(120,150,150,.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, 22, 16);
      }
      ctx.fillStyle = 'rgba(200,225,225,.35)';
      ctx.fillRect(-24, -2, 48, 4);
      return true;
    case 'painelon': // panelão grande
      sombra(34);
      ctx.fillStyle = '#2e2a24';
      ctx.beginPath();
      ctx.ellipse(0, -6, 34, 8, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#3a342c';
      ctx.fillRect(-24, -46, 48, 40);
      ctx.fillStyle = '#5a5044';
      ctx.fillRect(-27, -50, 54, 6);
      ctx.fillStyle = '#6a5a48';
      ctx.beginPath();
      ctx.ellipse(0, -50, 22, 6, 0, 0, Math.PI);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const fh = 8 + Math.sin(t * 8 + i * 2) * 5;
        ctx.fillStyle = i % 2 ? '#e08a20' : '#ffd070';
        ctx.fillRect(-12 + i * 10, -2, 6, 4);
        ctx.fillRect(-9 + i * 10, -2 - fh, 3, fh);
      }
      return true;
    case 'fogareiro': // fogareiro
      sombra(24);
      ctx.fillStyle = '#4a4238';
      ctx.fillRect(-20, -18, 40, 18);
      ctx.fillStyle = '#2a2620';
      for (let i = 0; i < 3; i++) ctx.fillRect(-16 + i * 13, -22, 9, 4);
      ctx.fillStyle = '#5a5040';
      ctx.fillRect(-6, -36, 12, 14);
      ctx.fillStyle = '#7a6a4a';
      ctx.fillRect(-10, -40, 20, 5);
      ctx.fillStyle = Math.sin(t * 7) > .5 ? '#ffb040' : '#8a4a20';
      ctx.fillRect(-3, -30, 6, 4);
      return true;

    // ---------- Fábrica Podre ----------
    case 'container': { // contêiner encalhado
      sombra(34);
      const cor = '#7a3a24';
      ctx.fillStyle = cor;
      ctx.fillRect(-30, -40, 60, 36);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      for (let i = -28; i < 28; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -40);
        ctx.lineTo(i, -4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(-30, -8, 60, 4);
      ctx.fillStyle = '#5a2a18';
      ctx.fillRect(-30, -40, 60, 5);
      return true;
    }
    case 'empilhadeira': { // empilhadeira parada
      sombra(28);
      ctx.fillStyle = '#8a6a20';
      ctx.fillRect(-18, -24, 36, 22);
      ctx.fillStyle = '#5a4a16';
      ctx.fillRect(-22, -30, 8, 28);
      ctx.fillStyle = '#3a3a2a';
      ctx.fillRect(12, -40, 5, 38);
      ctx.fillStyle = '#6a5a2a';
      ctx.fillRect(17, -14, 16, 5);
      ctx.fillStyle = '#2a2e22';
      ctx.fillRect(-14, -44, 22, 16);
      ctx.fillStyle = '#9ab0ac';
      ctx.fillRect(-12, -42, 14, 11);
      roda(-8, -1, 7);
      roda(12, -1, 7);
      return true;
    }
    case 'caldeirao': { // caldeirão grande
      sombra(32);
      ctx.fillStyle = '#4a4438';
      rr(-22, -52, 44, 52, 10);
      ctx.fill();
      ctx.fillStyle = '#5a5246';
      ctx.fillRect(-24, -54, 48, 7);
      ctx.fillStyle = '#e05a20';
      ctx.fillRect(-14, -40, 28, 5);
      ctx.fillStyle = '#8a7a4a';
      ctx.fillRect(16, -28, 6, 12);
      ctx.strokeStyle = '#c8c0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(19, -34, 7, 0, 7);
      ctx.stroke();
      vaporCaldeirao(t);
      return true;
    }
    case 'valvula_mestre': // válvula mestre
      sombra(28);
      ctx.fillStyle = '#4a4438';
      ctx.fillRect(-26, -16, 52, 16);
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(-6, -34, 12, 18);
      ctx.strokeStyle = '#c8b45a';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.4 + (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(Math.cos(a) * 15, -34 + Math.sin(a) * 15);
        ctx.stroke();
      }
      ctx.fillStyle = '#5a5248';
      ctx.beginPath();
      ctx.arc(0, -34, 6, 0, 7);
      ctx.fill();
      return true;
    case 'mesa_gerente': { // mesa do gerente
      sombra(38);
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(-32, -26, 64, 7);
      ctx.fillStyle = '#4a3420';
      ctx.fillRect(-28, -19, 6, 19);
      ctx.fillRect(22, -19, 6, 19);
      ripado(-24, -42, 22, 14, '#8a7a54');
      ctx.fillStyle = '#2a2a26';
      ctx.fillRect(2, -40, 28, 12);
      ctx.fillStyle = '#c8c0a0';
      ctx.fillRect(6, -44, 20, 5);
      ctx.strokeStyle = '#3a342a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(26, -26);
      ctx.lineTo(26, -10);
      ctx.stroke();
      lampada(26, -8, '#ffe8a0');
      return true;
    }
    case 'relogio_ponto': // relógio de ponto
      sombra(14);
      ctx.fillStyle = '#4a4a44';
      ctx.fillRect(-3, -34, 6, 34);
      ctx.fillStyle = '#2a2a24';
      ctx.beginPath();
      ctx.arc(0, -40, 14, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#c8c0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -40, 10, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(0, -47);
      ctx.moveTo(0, -40);
      ctx.lineTo(-6, -38);
      ctx.stroke();
      return true;

    // ---------- Cemitério de Barcos ----------
    case 'casco': { // casco encalhado
      sombra(36);
      ctx.fillStyle = '#22292c';
      ctx.beginPath();
      ctx.moveTo(-34, 0);
      ctx.lineTo(-20, -34);
      ctx.lineTo(24, -34);
      ctx.lineTo(34, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a2022';
      for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 11, -30 + (i % 2) * 3, 5, 16);
      ctx.fillStyle = '#2a3434';
      ctx.fillRect(-8, -42, 26, 8);
      return true;
    }
    case 'guinda_quebrado': // guindaste quebrado
      sombra(24);
      ctx.strokeStyle = '#3a4438';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-14, -50);
      ctx.lineTo(4, -58);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, -55);
      ctx.lineTo(14, -34);
      ctx.stroke();
      ctx.fillStyle = '#4a4a40';
      ctx.fillRect(-24, -4, 40, 4);
      return true;
    case 'quilha': // quilha de navio
      ctx.strokeStyle = '#3a3228';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, -6, 30, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.fillStyle = '#2e2a22';
      ctx.fillRect(-30, -2, 60, 6);
      ctx.fillStyle = '#4a4238';
      for (let i = -24; i <= 24; i += 16) ctx.fillRect(i, -30, 5, 14);
      return true;
    case 'ancora': // âncora cravada
      sombra(26);
      ctx.strokeStyle = '#5a5148';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -44);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -48, 7, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20, -6);
      ctx.quadraticCurveTo(0, -30, 20, -6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,26,22,.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 6, 0, 0, 7);
      ctx.fill();
      return true;
    case 'lapides': // lápides
      sombra(24);
      ctx.fillStyle = '#8a8a7a';
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-22, -30);
      ctx.arc(-11, -30, 11, Math.PI, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(6, -22, 7, 22);
      ctx.fillRect(1, -32, 17, 7);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(-22, -4, 44, 4);
      return true;
    default:
      return false;
  }
}

/** Água batendo no trapiche. */
function waterLinesTrapiche(): void {
  ctx.strokeStyle = 'rgba(150,190,180,.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-24, 12 + i * 6);
    ctx.lineTo(24, 10 + i * 6);
    ctx.stroke();
  }
}

/** Vapor do caldeirão. */
function vaporCaldeirao(t: number): void {
  ctx.fillStyle = 'rgba(210,215,200,.15)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-8 + i * 6, -58 - ((t * 24 + i * 14) % 34), 3 + i, 0, 7);
    ctx.fill();
  }
}
