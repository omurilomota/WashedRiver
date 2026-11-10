/**
 * main.ts — bootstrap.
 *
 * A cede o canvas ao jogo e draws o esqueleto do campo. O render completo
 * (cenário, criaturas, peças, efeitos, HUD) entra na F0 da migração.
 */
import { COLS, COLW, FIELD_R, H, LANES, LANE_H, LANE_Y0, W } from './core/constants';
import './styles/main.css';

const canvas = document.getElementById('cv') as HTMLCanvasElement | null;
if (!canvas) throw new Error('canvas #cv não encontrado no documento');

/** Contexto 2D garantido — o `throw` aqui é mais claro que `!` espalhado. */
function getCtx(el: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = el.getContext('2d');
  if (!context) throw new Error('contexto 2D indisponível');
  return context;
}

const ctx = getCtx(canvas);

// Escala fixa em 2: nítido em monitor de alta densidade, custo previsível.
const DPR = 2;
canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = '100%';
canvas.style.height = '100%';
ctx.scale(DPR, DPR);

/** Cores do esqueleto — as definitivas estão em `src/styles/main.css`. */
const PAL = {
  sky1: '#2c3a36',
  sky2: '#0a0c0b',
  ground: '#33352f',
  strip: '#55524a',
  sea: '#0d2a2e',
};

function draw(): void {
  // céu
  const sky = ctx.createLinearGradient(0, 0, 0, LANE_Y0);
  sky.addColorStop(0, PAL.sky1);
  sky.addColorStop(1, PAL.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, LANE_Y0);

  // mar à direita
  ctx.fillStyle = PAL.sea;
  ctx.fillRect(FIELD_R, LANE_Y0, W - FIELD_R, H - LANE_Y0);

  // lanes
  for (let l = 0; l < LANES; l++) {
    const y = LANE_Y0 + l * LANE_H;
    ctx.fillStyle = PAL.ground;
    ctx.fillRect(0, y, W, LANE_H);
    ctx.fillStyle = PAL.strip;
    ctx.fillRect(0, y, W, 4);

    // marcação das colunas de plantio
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      const x = 170 + c * COLW;
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x, y + LANE_H);
      ctx.stroke();
    }
  }

  // borda direita do campo
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(FIELD_R - 4, LANE_Y0, 4, H - LANE_Y0);

  // aviso de esqueleto
  ctx.fillStyle = '#d9cba0';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MARÉ PODRE — esqueleto em construção', W / 2, LANE_Y0 / 2 + 8);
}

draw();
