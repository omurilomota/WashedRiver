/**
 * scene.ts — o desenho do campo.
 *
 * Recebe o estado da partida e devolve pixels. Não decide nada: quem
 * manda é o jogo. A HUD e os overlays de tela ficam em `ui.ts`.
 */
import { COLS, COLW, FIELD_R, H, LANES, LANE_H, LANE_Y0, SPAWN_X, VX, W, colX, lerp, plantY, rnd } from '../core/constants';
import { ctx } from '../core/canvas';
import { G, Game } from '../core/state';
import { BOSSES } from '../data';
import { SaveDB } from '../save/storage';
import {
  drawBackground,
  drawDecals,
  drawMachine,
  drawParticles,
  drawPickup,
  drawProjectile,
  drawVillage,
  drawWeather,
} from './sprites';
import { drawBossDeath, drawDeath, drawEnemy } from './creatures';
import { machCost, machineAt } from '../game/economy';

export function drawField(){
  ctx.clearRect(0,0,W,H);
  if(!G){return;}
  ctx.save();
  const shake=SaveDB.options.shake?G.shake:0;
  if(shake>.4)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));
  drawBackground(G.map,G,G.t);
  drawDecals(G);
  drawVillage(G,G.t);
  // colocação
  if(G.selected&&Game.screen==='play'&&Game.mouse){
    const c=Math.floor((Game.mouse.x-VX)/COLW),l=Math.floor((Game.mouse.y-LANE_Y0)/LANE_H);
    if(c>=0&&c<COLS&&l>=0&&l<LANES){
      const free=!machineAt(l,c),can=G.scrap>=machCost(G.selected);
      // Modo daltonismo: quem não distingue verde de vermelho precisa de
      // outra pista além da cor — tracejado e luminância diferente.
      const cb=!!SaveDB.options.cb;
      const okCol=cb?'rgba(255,225,120,.16)':'rgba(200,220,120,.12)';
      const noCol=cb?'rgba(255,150,60,.20)':'rgba(220,80,60,.14)';
      ctx.fillStyle=free&&can?okCol:noCol;
      ctx.fillRect(VX+c*COLW,LANE_Y0+l*LANE_H,COLW,LANE_H);
      ctx.strokeStyle='rgba(220,220,180,.25)';
      ctx.setLineDash([6,6]);
      for(let i=0;i<=COLS;i++){ctx.beginPath();ctx.moveTo(VX+i*COLW,LANE_Y0+l*LANE_H);ctx.lineTo(VX+i*COLW,LANE_Y0+(l+1)*LANE_H);ctx.stroke();}
      ctx.setLineDash([]);
      if(!(free&&can)){ // ocupado ou caro: borda cheia, sem depender de matiz
        ctx.setLineDash([3,3]);ctx.strokeStyle=cb?'rgba(255,180,90,.8)':'rgba(220,120,100,.5)';ctx.lineWidth=2;
        ctx.strokeRect(VX+c*COLW+1,LANE_Y0+l*LANE_H+1,COLW-2,LANE_H-2);
        ctx.setLineDash([]);ctx.lineWidth=1;
      }
      if(free&&G.selected!=='remover'){ctx.globalAlpha=.45;drawMachine({type:G.selected,x:colX(c),lane:l,t:G.t,hp:1,maxhp:1,anim:0,act:0,flash:0});ctx.globalAlpha=1;}
    }
  }
  // luz do holofote e ímã
  for(const m of G.machines){
    if(m.type==='holofote'||(m.type==='coisa_ze'&&m.variant==='holofote')){
      const reach=COLW*(3+.5*(G.up.holofote||0)),y0=plantY(m.lane)-40;
      const grd=ctx.createLinearGradient(m.x,0,m.x+reach,0);
      grd.addColorStop(0,`rgba(255,240,170,${.12+Math.sin(G.t*9)*.02})`);grd.addColorStop(1,'rgba(255,240,170,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(m.x+20,y0);ctx.lineTo(m.x+reach,y0-70);ctx.lineTo(m.x+reach,y0+64);ctx.closePath();ctx.fill();
    }
    if((m.type==='ima')&&Math.sin(G.t*4)>0){
      ctx.strokeStyle='rgba(180,220,255,.3)';ctx.lineWidth=1.2;ctx.setLineDash([4,6]);
      for(const p of G.pickups)if(!p.fly&&Math.abs(p.x-m.x)<COLW*1.4){ctx.beginPath();ctx.moveTo(m.x,plantY(m.lane)-26);ctx.lineTo(p.x,p.y);ctx.stroke();}
      ctx.setLineDash([]);
    }
  }
  for(let l=0;l<LANES;l++){
    for(const m of G.machines)if(m.lane===l)drawMachine(m);
    for(const p of G.props)if(p.lane===l)drawProp(p);
    const es=G.enemies.filter(e=>e.lane===l&&!e.boss).sort((a,b)=>b.x-a.x);
    for(const e of es)drawEnemy(e);
    for(const d of G.deaths)if(d.lane===l&&!BOSSES[d.type])drawDeath(d);
    if(G.boss&&G.boss.lane===l&&!G.bossDeath)drawEnemy(G.boss);
  }
  for(const d of G.deaths)if(BOSSES[d.type])drawBossDeath({...d,b:d.type});
  // molho (BLOCO M.6): maré subindo, nevoeiro e o peixe que assusta
  drawMicros(G);
  // apresentações diegéticas (BLOCO M.3): sombra passando no horizonte e
  // desenho na parede da vila. É a descoberta, não um banner de sistema.
  drawIntros(G);
  for(const p of G.projs)drawProjectile(p);
  for(const h of G.hazards)drawHazard(h);
  for(const p of G.pickups)drawPickup(p,G);
  drawParticles(G);
  drawWeather(G,G.t);
  if(G.baleiaWarn){const bw=G.baleiaWarn; if(Math.sin(G.t*12)>0){ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=4;ctx.fillStyle='#e8d9a8';ctx.font='bold 16px "Consolas","Menlo","Monaco",monospace';ctx.textAlign='center';ctx.fillText('🐋 BALEIA',colX(2),LANE_Y0+bw.lane*LANE_H+40);ctx.restore();ctx.textAlign='left';}}
  if(G.dark&&G.darkT>0){ctx.fillStyle='rgba(2,4,8,.55)';ctx.fillRect(0,0,W,H);}
  ctx.restore();
  const grd=ctx.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.98);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(8,6,3,.72)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
}
export function drawHazard(h){
  const y=LANE_Y0+h.lane*LANE_H;
  if(h.t<h.warn){
    ctx.fillStyle=`rgba(255,${60+Math.sin(h.t*20)*40},30,${.25+Math.sin(h.t*14)*.15})`;
    ctx.fillRect(VX,y,SPAWN_X-VX,LANE_H);
    ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=4;ctx.fillStyle='#f0e0a0';ctx.font='bold 13px "Consolas","Menlo","Monaco",monospace';ctx.fillText(h.kind==='train'?'APITO. SAIA DO TRILHO.':'ESTEIRA EM MOVIMENTO',VX+320,y+60);ctx.restore();
  }else{
    const p=(h.t-h.warn)/h.dur;
    if(h.kind==='train'){
      const x=lerp(SPAWN_X,VX-200,Math.min(1,p*1.3));
      ctx.fillStyle='#1a1c1a';ctx.fillRect(x-160,y+22,320,84);
      ctx.fillStyle='#3a4038';ctx.fillRect(x-140,y+34,280,30);
      ctx.fillStyle='#e8c84a';ctx.beginPath();ctx.arc(x+120,y+52,10,0,7);ctx.fill();
      ctx.fillStyle='#0e100e';
      for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x-100+i*60,y+100,18,0,7);ctx.fill();}
      ctx.fillStyle='rgba(200,220,200,.25)';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x-120+i*50,y-10-Math.sin(p*20+i)*10,10,0,7);ctx.fill();}
    }else{
      // A esteira ocupa a lane inteira. (O legado fazia y + h % 1, com h
      // sendo o objeto do perigo: dava NaN e a esteira nunca aparecia.)
      ctx.fillStyle='rgba(200,120,40,.5)';ctx.fillRect(VX,y,SPAWN_X-VX,LANE_H);
      for(let i=0;i<8;i++){ctx.fillStyle='#8a7a5a';ctx.fillRect(VX+(i*120+(h.t*140)%120),y+40+((h.t*80)%80),50,14);}
    }
  }
}
/**
 * Micro-surpresas visuais (BLOCO M.6).
 *
 * Só o que se vê: a maré subindo (faixa de água limpando o campo), o
 * nevoeiro (véu escuro) e o peixe grande saltando. Nada de texto na tela —
 * o aviso já saiu como faixa do radiador.
 */
export function drawMicros(g: { micros: { tipo: string; t: number; dur: number }[] }): void {
  for (const m of g.micros) {
    const p = Math.min(1, m.t / m.dur);
    if (m.tipo === 'mare') {
      // a maré sobe: uma laia de água sobe e desce nos 3 primeiros lanes
      const subida = Math.sin(p * Math.PI) * 26;
      ctx.fillStyle = 'rgba(20,60,60,.35)';
      ctx.fillRect(VX, LANE_Y0, FIELD_R - VX, subida);
      ctx.fillStyle = 'rgba(180,220,210,.20)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(VX + ((G!.t * 90 + i * 240) % (FIELD_R - VX)), LANE_Y0 + subida - 4, 40, 3);
      }
    } else if (m.tipo === 'nevoeiro') {
      ctx.fillStyle = `rgba(6,14,14,${0.5 * Math.sin(p * Math.PI)})`;
      ctx.fillRect(0, LANE_Y0, W, H - LANE_Y0);
    } else if (m.tipo === 'peixe') {
      // salto: um vulto atravessa a tela e volta pro mar. Não machuca.
      const x = lerp(FIELD_R + 60, VX - 60, p);
      const alto = Math.sin(p * Math.PI) * 90;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#101a1c';
      ctx.beginPath();
      ctx.ellipse(x, H - 60 - alto, 54, 20, -0.25, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 46, H - 66 - alto);
      ctx.lineTo(x - 74, H - 44 - alto);
      ctx.lineTo(x - 46, H - 52 - alto);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------
//  Apresentações diegéticas (BLOCO M.3)
// ---------------------------------------------------------------------

/**
 * Silhueta de um bicho no horizonte: forma escura passando pela margem
 * d'água antes dele entrar. Uma por bicho novo, e some sozinha.
 */
function silhuetaIntro(it: { type: string; lane: number; t: number; dur: number }): void {
  const g = G!;
  const r = (g.enemies.find((e) => e.type === it.type)?.r) || 18;
  const y = LANE_Y0 + it.lane * LANE_H + 40;
  const p = it.t / it.dur;
  // entra pela direita, atravessa a margem e sai — sem parar no campo
  const x = lerp(SPAWN_X + 60, FIELD_R - 40, Math.min(1, p * 1.4));
  ctx.save();
  ctx.globalAlpha = 0.55 * Math.sin(Math.min(1, p * 1.2) * Math.PI);
  ctx.fillStyle = '#050708';
  // corpo: silhueta genérica com o tamanho do bicho
  ctx.beginPath();
  ctx.ellipse(x, y - r, r * 0.9, r * 0.7, 0, 0, 7);
  ctx.fill();
  // traço que diferencia: espinha, asa, garra
  if (it.type === 'baiacu' || it.type === 'peixe_mae') {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6 + i * r * 0.3, y - r - r * 0.5);
      ctx.lineTo(x - r * 0.6 + i * r * 0.3, y - r - r * 0.95);
      ctx.stroke();
    }
  }
  if (it.type === 'gaivota' || it.type === 'gaivota_r' || it.type === 'mariposa') {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x - r * 1.4, y - r * 2.2, x - r * 1.9, y - r * 0.7);
    ctx.quadraticCurveTo(x - r * 1.1, y - r * 1.2, x, y - r * 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 1.4, y - r * 2.2, x + r * 1.9, y - r * 0.7);
    ctx.quadraticCurveTo(x + r * 1.1, y - r * 1.2, x, y - r * 0.8);
    ctx.fill();
  }
  if (it.type === 'enguia' || it.type === 'agua') {
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.8);
    ctx.quadraticCurveTo(x, y - r * 1.6, x + r, y - r * 0.8);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.restore();
}

/**
 * Desenho na parede da vila: cartaz tosco mostrando o bicho que vem.
 * Fica pendurado um tempo e some — o jogador que quiser, olha.
 */
function cartazIntro(it: { type: string; lane: number; t: number; dur: number }): void {
  const y = plantY(it.lane);
  const some = it.t > it.dur - 2; // pisca antes de cair
  ctx.save();
  if (Math.floor(it.t * 4) % 2 === 0 || !some) {
    ctx.translate(60, y - 92);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#d7c9a0';
    ctx.fillRect(0, 0, 44, 34);
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(20, -6, 4, 8);
    ctx.fillStyle = '#3a3020';
    ctx.font = '6px monospace';
    ctx.fillText('TEM', 4, 12);
    ctx.fillText('BICHO', 4, 20);
    ctx.fillText('NOVO', 4, 28);
  }
  ctx.restore();
}

/** Desenha as apresentações rolando. */
export function drawIntros(g: { intros: { type: string; lane: number; kind: string; t: number; dur: number }[] }): void {
  for (const it of g.intros) {
    if (it.kind === 'silhueta') silhuetaIntro(it);
    else if (it.kind === 'cartaz') cartazIntro(it);
  }
}

export function drawProp(p){
  const y=plantY(p.lane),step=Math.sin(p.anim*5);
  ctx.fillStyle='#2a2a30';ctx.fillRect(p.x-22+step*5,y-14,16,14);ctx.fillRect(p.x+4-step*5,y-14,16,14);
  ctx.fillRect(p.x-26+step*5,y-4,10,4);ctx.fillRect(p.x-step*5,y-4,10,4);
  ctx.fillStyle='#5a1a2a';ctx.fillRect(p.x-18,y-18,12,4);ctx.fillRect(p.x+6,y-18,12,4);
}

// ---------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------