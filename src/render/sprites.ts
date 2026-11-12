/**
 * sprites.ts — cenário, estruturas, engenhocas e o que mora no campo.
 *
 * Tudo aqui é desenho puro: recebe estado, não muda regra. Os helpers
 * geométricos (`rr`, `eye`, `pose`) são compartilhados com `creatures.ts`.
 */
import { COLS, COLW, FIELD_R, H, LANES, LANE_H, LANE_Y0, VX, W, clamp, plantY, rnd } from '../core/constants';
import { ctx, rr, waterLines } from '../core/canvas';
import { G } from '../core/state';
import { CARTAZES } from '../data';
import { drawLaneFloorNova } from './lanes';
import { drawEstruturaNova } from './structures';
import { haloText, shadowEllipse } from './brush';

/**
 * Família de cada estrutura: define o **estrago** quando ela cai.
 *
 * É tabela de propósito. A classificação antiga era
 * `s.id.includes('caixa')`, `includes('valvula')` — e por isso cisterna,
 * luminária e contêiner nasciam desenhados como casa. Quem tem desenho
 * próprio em `structures.ts` não precisa de família: a família só serve
 * para o escombro.
 */
const FAMILIA_ESTRUTURA: Record<string,'boat'|'post'|'tank'|'house'>={
  barco:'boat',galpao:'boat',bote:'boat',navio:'boat',mastro:'boat',tenda:'boat',balsa:'boat',boia:'boat',
  poste:'post',sinaleira:'post',lanterna:'post',chamine:'post',relogio:'post',cruz:'post',
  luminaria:'post',relogio_ponto:'post',placa_fim:'post',marco:'post',farol_apagado:'post',farol_afundado:'post',
  comporta:'tank',valvula:'tank',caixa:'tank',caixa2:'tank',caldeira:'tank',guinda:'tank',
  cisterna:'tank',lata_agua:'tank',pilha_gelo:'tank',caldeirao:'tank',container:'tank',valvula_mestre:'tank',
  caminhao_gelo:'tank',empilhadeira:'tank',carroca:'tank',base_farol:'tank',engrenagem:'tank',batente:'tank',
  casco:'tank',guinda_quebrado:'tank',quilha:'tank',ancora:'tank',lona:'tank',painelon:'tank',fogareiro:'tank',
};

// `rr` e `waterLines` moram em core/canvas (são helper de canvas, não de
// cenário). Reexportados aqui porque o resto do jogo já importava deste
// módulo.
export { rr, waterLines };


export function eye(x: number,y: number,r: number,px?: number,py?: number,col?: string){ctx.fillStyle='#f0ecd0';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
  ctx.fillStyle=col||'#111';ctx.beginPath();ctx.arc(x+(px||0),y+(py||0),r*.5,0,7);ctx.fill();}
export function blinkEye(x: number,y: number,r: number,closed: boolean,px?: number,py?: number,col?: string){
  if(closed){ctx.strokeStyle='#1a1a10';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.stroke();return;}
  eye(x,y,r,px,py,col);
}
export function teeth(x: number,y: number,w: number,n: number,h: number,up?: boolean){ctx.fillStyle='#f4efd8';for(let i=0;i<n;i++){const tx=x+i*w/n;
  ctx.beginPath();ctx.moveTo(tx,y);ctx.lineTo(tx+w/n/2,y+(up?-h:h));ctx.lineTo(tx+w/n,y);ctx.fill();}}
export function lowHp(e: {maxhp: number;hp: number}){return e.maxhp>0&&e.hp/e.maxhp<.35;}
// 3 frames por estado, mudando o CONTORNO. Silhueta legível em preto.
export function pose(o: { flash?: number; act?: number; hypno?: number; reflectT?: number; burrow?: number; grounded?: number; air?: boolean; [k: string]: unknown },clock: number){
  const flash=o.flash||0,act=o.act||0,hypno=o.hypno||0,reflectT=o.reflectT||0,burrow=o.burrow||0,grounded=o.grounded||0;
  const hurt=flash>0, action=act>0||hypno>0||reflectT>0||burrow>0||(o.air&&grounded>0);
  const st=hurt?'hurt':action?'action':'idle';
  const f=Math.floor(clock*(hurt?18:action?11:3))%3;
  if(st==='hurt')return{st,f,tilt:[-.20,.14,-.07][f],sx:[.86,1.13,.93][f],sy:[1.10,.82,.95][f]};
  if(st==='action')return{st,f,tilt:[-.09,.11,-.03][f],sx:[1.13,1,.94][f],sy:[.91,1.07,1][f]};
  const breath=Math.sin(clock*1.6)*.018;
  return{st,f,tilt:[-.04,0,.04][f],sx:[1,.98,1.02][f]+breath,sy:[.99,1.02,.97][f]-breath};
}
export function note(x: number,y: number,txt: string,w: number){
  w=w||96;ctx.save();ctx.translate(x,y);ctx.rotate(rnd(-.04,.04));
  ctx.fillStyle='#d7c9a0';ctx.fillRect(0,0,w,30);ctx.fillStyle='#8a6a3a';ctx.fillRect(w/2-2,0,4,6);
  ctx.fillStyle='#4a3a24';ctx.font='7px monospace';txt.split('|').forEach((l,i)=>ctx.fillText(l,5,11+i*9));
  ctx.restore();
}

// =====================================================================
//  FUNDOS
// =====================================================================
// Cache offscreen da camada ESTÁTICA do fundo (céu + sol/lua + cenário estático de mapas totalmente estáticos).
// Partes animadas (cenário do mapa, pisos das lanes, margem d'água,
// clima) continuam desenhadas a cada frame. Fatia 1 do cache completo.
let _bgStatic: { id: string; canvas: HTMLCanvasElement } | null = null;
function bgStaticCanvas(map): HTMLCanvasElement {
  if (_bgStatic && _bgStatic.id === map.id) return _bgStatic.canvas;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const c2 = c.getContext('2d')!;
  // desenha a camada estática no offscreen
  const p = map.pal;
  // gradient vertical: céu
  const g = c2.createLinearGradient(0, 0, 0, LANE_Y0);
  g.addColorStop(0, p.sky1); g.addColorStop(1, p.sky2);
  c2.fillStyle = g; c2.fillRect(0, 0, W, LANE_Y0);
  // disco/sol/lua
  c2.fillStyle = p.sun; c2.globalAlpha = .5; c2.beginPath(); c2.arc(760, 42, 24, 0, 7); c2.fill(); c2.globalAlpha = 1;
  // cenário totalmente/parcialmente estático de alguns mapas também vai pro cache
  if (map.id === 'estacao') drawEstacao(map.pal, 0, c2);
  if (map.id === 'fabrica') drawFabricaStatic(c2);
  if (map.id === 'barra') drawBarraStatic(c2);
  if (map.id === 'farol') drawFarolStatic(c2);
  if (map.id === 'feira') drawFeiraStatic(c2);
  if (map.id === 'cemiterio') drawCemiterioStatic(c2);
  _bgStatic = { id: map.id, canvas: c };
  // névoa de calor/umidade na base fica desenhada em drawBackground (z-order original)
  return c;
}

export function drawBackground(map,G,t){
  t=t||0;const p=map.pal;
  // camada estática (cache offscreen): céu + sol/lua
  ctx.drawImage(bgStaticCanvas(map), 0, 0);

  if(map.id==='barra'){drawBarra(p,t);}
  else if(map.id==='farol'){drawFarol(p,t);}
  else if(map.id==='estacao'){/* cenário estático cacheado em bgStaticCanvas */}
  else if(map.id==='feira'){drawFeira(p,t);}
  else if(map.id==='fabrica'){drawFabrica(p,t);}
  else{drawCemiterio(p,t);}

  // os três corredores: cada um com piso próprio
  for(let l=0;l<LANES;l++)drawLaneFloor(map,p,l,t);
  // mar/margem à direita
  const g=ctx.createLinearGradient(FIELD_R-30,0,W,0);g.addColorStop(0,'rgba(5,18,20,0)');g.addColorStop(.35,p.water);g.addColorStop(1,'#061417');
  ctx.fillStyle=g;ctx.fillRect(FIELD_R-30,LANE_Y0,W-FIELD_R+30,H-LANE_Y0);
  ctx.fillStyle='rgba(200,220,200,.14)';
  for(let l=0;l<LANES;l++)for(let i=0;i<4;i++)ctx.fillRect(FIELD_R+4+Math.sin(t*2+i+l)*7,LANE_Y0+l*LANE_H+26+i*30,15,2);
  // névoa de calor/umidade na base (estática, mas desenhada por último para z-order)
  const hz=ctx.createLinearGradient(0,H-60,0,H);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,p.haze);
  ctx.fillStyle=hz;ctx.fillRect(0,H-60,W,60);
}


function drawBarraStatic(cx){
  // cenário estático: base, chaminés e guindaste
  cx.fillStyle='#161c1a';cx.fillRect(430,64,W-430,26);
  const stacks=[[520,58],[610,80],[700,44],[800,90],[880,62]];
  for(const [sx,sh] of stacks){cx.fillStyle='#161c1a';cx.fillRect(sx,90-sh,18,sh);cx.fillRect(sx-5,90-sh,28,5);}
  // guindaste
  cx.strokeStyle='#1a201c';cx.lineWidth=4;cx.beginPath();cx.moveTo(860,90);cx.lineTo(860,20);cx.lineTo(800,34);cx.stroke();
  cx.fillStyle='#1a201c';cx.fillRect(858,16,5,74);
}
function drawBarra(p,t,cx=ctx){
  // partes animadas: luz das chaminés + fumaça
  const stacks=[[520,58],[610,80],[700,44],[800,90],[880,62]];
  for(const [sx,sh] of stacks){cx.fillStyle=Math.sin(t*3+sx)>.7?'#ff4020':'#5a1a10';cx.fillRect(sx+7,88-sh,3,3);}
  cx.fillStyle='rgba(70,60,50,.25)';
  for(let i=0;i<5;i++){cx.beginPath();cx.arc(540+i*80+Math.sin(t*.3+i)*10,40-i*4,10+i*4,0,7);cx.fill();}
}
function drawFarolStatic(cx){
  // falésias e o farol (estáticos)
  cx.fillStyle='#1a2428';cx.beginPath();cx.moveTo(430,90);cx.lineTo(510,20);cx.lineTo(600,44);cx.lineTo(660,16);cx.lineTo(760,60);cx.lineTo(880,30);cx.lineTo(960,70);cx.lineTo(960,90);cx.fill();
  cx.fillStyle='#d8e0c8';cx.fillRect(690,18,10,30);cx.fillStyle='#2a3a3e';cx.fillRect(684,14,22,8);
  cx.fillStyle='#bfae7a';cx.fillRect(690,18,10,4);
}
function drawFarol(p,t,cx=ctx){
  // feixe do farol girando + linhas/ondas animadas
  const a=t*.5;
  const lx=695,ly=18;const grd=cx.createLinearGradient(lx,ly,lx+Math.cos(a)*260,ly+Math.sin(a)*70);
  grd.addColorStop(0,'rgba(255,245,190,.22)');grd.addColorStop(1,'rgba(255,245,190,0)');
  cx.fillStyle=grd;cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(lx+Math.cos(a-.14)*280,ly+Math.sin(a-.14)*80);cx.lineTo(lx+Math.cos(a+.14)*280,ly+Math.sin(a+.14)*80);cx.fill();
  cx.fillStyle='rgba(220,235,215,.10)';for(let i=0;i<3;i++)cx.fillRect(0,58+i*10+Math.sin(t+i)*3,W,2);
  // ondas batendo
  cx.strokeStyle='rgba(200,230,220,.25)';cx.lineWidth=1;
  for(let i=0;i<6;i++){cx.beginPath();cx.arc(180+i*130,LANE_Y0+2+Math.sin(t*1.5+i)*2,18,Math.PI,0);cx.stroke();}
}
function drawEstacao(_p,_t,cx=ctx){
  // teto da estação e fios
  cx.fillStyle='#1c2224';cx.fillRect(330,18,W-330,16);cx.fillRect(330,18,8,72);cx.fillRect(700,18,8,72);
  cx.strokeStyle='#39423e';cx.lineWidth=1;
  for(let i=0;i<4;i++){cx.beginPath();cx.moveTo(0,24+i*9);cx.bezierCurveTo(300,34+i*9,600,16+i*9,W,28+i*9);cx.stroke();}
  cx.fillStyle='#c8d8d0';cx.globalAlpha=.6;cx.font='8px monospace';cx.fillText('ESTAÇÃO AFOGADA',420,40);cx.globalAlpha=1;
  for(let i=0;i<4;i++){cx.fillStyle='#2a322e';cx.fillRect(360+i*150,58,42,26);cx.fillStyle='#6a7a6a';cx.font='7px monospace';cx.fillText(['NORTE','SUL','CEGO','—'][i],366+i*150,74);}
  // relógio parado
  cx.fillStyle='#1a201e';cx.beginPath();cx.arc(880,36,15,0,7);cx.fill();cx.strokeStyle='#d8d0a0';cx.lineWidth=2;
  cx.beginPath();cx.arc(880,36,11,0,7);cx.stroke();cx.beginPath();cx.moveTo(880,36);cx.lineTo(880,28);cx.moveTo(880,36);cx.lineTo(872,38);cx.stroke();
}
function drawFeiraStatic(cx){
  // barracas ao fundo com toldos coloridos (estáticas)
  const cols=['#b04836','#c8a03a','#4a7a6a','#a86a3a','#7a4a7a'];
  for(let i=0;i<7;i++){const x=320+i*95,y=34+((i%2)*8);
    cx.fillStyle='#2a2018';cx.fillRect(x,y+16,74,52);
    cx.fillStyle=cols[i%cols.length];cx.beginPath();cx.moveTo(x-8,y+18);cx.lineTo(x+37,y);cx.lineTo(x+82,y+18);cx.fill();
    cx.fillStyle='#e8d8b0';for(let k=0;k<4;k++)cx.fillRect(x+4+k*18,y+20,9,10);
    cx.fillStyle='#241a12';cx.fillRect(x+18,y+48,28,20);
    cx.fillStyle='#d8c8a0';cx.font='6px monospace';cx.fillText(['PEIXE','GELO','FIADO','RÁDIO','CARNE','ISCA','PEIXE'][i],x+16,y+46);}
}
function drawFeira(p,t,cx=ctx){
  // moscas e calor (animados)
  cx.fillStyle='#1a140c';for(let i=0;i<8;i++){const fx=(t*40+i*97)%W,fy=60+Math.sin(t*7+i)*10+i*2;cx.fillRect(fx,fy,2,2);}
  cx.strokeStyle='rgba(255,220,140,.10)';cx.lineWidth=2;
  for(let i=0;i<5;i++){cx.beginPath();cx.moveTo(320+i*130,H-6);cx.bezierCurveTo(340+i*130,H-30,340+i*130,H-50,320+i*130,H-70);cx.stroke();}
}
function drawFabricaStatic(cx){
  // galpões, canos e chaminés (estáticos)
  cx.fillStyle='#1a1412';cx.fillRect(300,22,W-300,68);
  cx.fillStyle='#2e201a';cx.fillRect(310,30,170,60);cx.fillRect(500,24,190,66);cx.fillRect(710,40,140,50);
  cx.fillStyle='#0e0b0a';for(let i=0;i<8;i++)cx.fillRect(320+i*20,40,12,18);
  for(let i=0;i<5;i++)cx.fillRect(520+i*30,44,18,24);
  cx.fillStyle='#3a261e';cx.fillRect(820,10,24,80);cx.fillRect(870,28,18,62);
  cx.strokeStyle='#4a3226';cx.lineWidth=8;cx.beginPath();cx.moveTo(340,46);cx.lineTo(460,46);cx.lineTo(460,68);cx.stroke();
  cx.fillStyle='#5a3a24';for(let i=0;i<5;i++)cx.fillRect(646+i*5,46,4,12);
}
function drawFabrica(p,t,cx=ctx){
  cx=cx||ctx;
  // fumaça animada
  for(let i=0;i<5;i++){cx.fillStyle=`rgba(70,60,55,${.18+Math.sin(t+i)*.05})`;cx.beginPath();cx.arc(832+Math.sin(t*.4+i)*14,36-i*18,12+i*5,0,7);cx.fill();}
  // luz vermelha piscando
  cx.fillStyle=Math.sin(t*4)>.6?'#ff5030':'#5a1a10';cx.beginPath();cx.arc(732,44,3,0,7);cx.fill();
}
function drawCemiterioStatic(cx){
  // terreno, lua e cascos (estáticos)
  cx.fillStyle='#0d1518';cx.beginPath();cx.moveTo(280,90);cx.lineTo(330,30);cx.lineTo(420,54);cx.lineTo(470,20);
  cx.lineTo(560,48);cx.lineTo(640,18);cx.lineTo(760,50);cx.lineTo(850,26);cx.lineTo(960,60);cx.lineTo(960,90);cx.fill();
  cx.fillStyle='#132023';cx.fillRect(0,0,W,90);
  // lua
  cx.fillStyle='#d8e0c8';cx.beginPath();cx.arc(800,42,18,0,7);cx.fill();cx.fillStyle='#132023';cx.beginPath();cx.arc(790,36,16,0,7);cx.fill();
  // cascos de navios
  const hulls=[[360,44,120,90],[520,26,170,100],[740,40,150,96]];
  for(const [hx,hy,hw,hh] of hulls){
    cx.fillStyle='#1a2224';cx.beginPath();cx.moveTo(hx,hy);cx.lineTo(hx+hw*.15,hy+hh*.4);cx.lineTo(hx+hw*.8,hy+hh*.4);cx.lineTo(hx+hw,hy);cx.fill();
    cx.strokeStyle='#2e3a3a';cx.lineWidth=2;cx.beginPath();cx.moveTo(hx+hw*.4,hy);cx.lineTo(hx+hw*.45,hy-hh*.5);cx.stroke();
    cx.fillStyle='#2a3434';cx.fillRect(hx+hw*.3,hy+8,hw*.5,10);
  }
}
function drawCemiterio(p,t,cx=ctx){
  // ondas animadas
  cx.strokeStyle='rgba(200,220,210,.14)';cx.lineWidth=1;
  for(let i=0;i<5;i++){cx.beginPath();cx.moveTo(0,70+i*4+Math.sin(t+i)*2);cx.bezierCurveTo(400,60+i*4,W-200,86+i*4,W,70+i*4);cx.stroke();}
  // cena secreta das 6 geladeiras (depende de estado)
  if(G&&G.geladeiraScene){
    for(let i=0;i<6;i++){cx.fillStyle='#9ab0b0';cx.fillRect(600+i*14,34,10,22);cx.fillStyle='#d8d8d0';cx.fillRect(600+i*14,34,10,3);}
    cx.fillStyle='#f0e0a0';cx.font='7px monospace';cx.fillText('6 GELADEIRAS. DONA LÚ VÊ.',560,26);
  }
}

// Pisos por corredor, por mapa
export function drawLaneFloor(map,p,l,t){
  const y=LANE_Y0+l*LANE_H;
  // lanes 4, 5 e 6: piso, props e silhueta próprios de cada mapa
  // (moram em lanes.ts — aqui ficava jardim e trapiche repetidos).
  if(l>=3){drawLaneFloorNova(map,p,l,t);return;}
  if(map.id==='barra'){
    if(l===0){ctx.fillStyle='#0f2e33';ctx.fillRect(VX,y,W-VX,LANE_H);waterLines(VX,y,W-VX,LANE_H,t,'rgba(120,160,140,.12)');
      for(let i=0;i<38;i++){if((i*7)%9===0)continue;ctx.fillStyle=`rgb(${76+(i%4)*12},${56+(i%3)*8},${34} )`;ctx.fillRect(VX+i*20,y+26,18,LANE_H-30);}
      ctx.fillStyle='#3a2a1a';for(let i=0;i<=COLS;i++)ctx.fillRect(VX+i*COLW-6,y+10,12,24);
      ctx.fillStyle='#2a1f14';ctx.fillRect(VX,y+24,FIELD_R-VX,4);}
    else if(l===1){ctx.fillStyle='#3a3834';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#55524a';ctx.fillRect(VX,y,W-VX,12);
      ctx.fillStyle='#6a6648';for(let x=VX+10;x<FIELD_R;x+=50)ctx.fillRect(x,y+74,24,4);
      for(let i=0;i<6;i++){const px=VX+90+i*120,py=y+50+Math.sin(t+i)*2;ctx.fillStyle='#1c1a1e';ctx.beginPath();ctx.ellipse(px,py,32,10,0,0,7);ctx.fill();
        ctx.fillStyle=`hsla(${(t*30+i*70)%360},55%,55%,.16)`;ctx.beginPath();ctx.ellipse(px,py,16,5,0,0,7);ctx.fill();}
      ctx.strokeStyle='#2a2824';ctx.lineWidth=2;for(let i=0;i<5;i++){const x=VX+50+i*160;ctx.beginPath();ctx.moveTo(x,y+40);ctx.lineTo(x+18,y+60);ctx.lineTo(x+10,y+84);ctx.stroke();}}
    else{ctx.fillStyle='#5a5a54';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#3d4a22';ctx.fillRect(VX,y+22,W-VX,LANE_H-40);
      waterLines(VX,y+28,W-VX,LANE_H-46,t*1.2,'rgba(160,180,90,.14)');
      for(let i=0;i<10;i++){ctx.fillStyle=i%3?'rgba(220,220,210,.35)':'#7a4a3a';const tx=VX+40+i*70,ty=y+46+Math.sin(t+i)*3;ctx.fillRect(tx,ty,10,4);}
      ctx.fillStyle='#4a4a44';ctx.fillRect(VX,y,W-VX,4);ctx.fillRect(VX,y+LANE_H-18,W-VX,4);}
  }else if(map.id==='farol'){
    if(l===0){ctx.fillStyle='#4a4a44';ctx.fillRect(VX,y,W-VX,LANE_H);
      for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#57574e':'#41413a';ctx.fillRect(VX+i*78,y+30,74,LANE_H-40);ctx.strokeStyle='#2e2e28';ctx.strokeRect(VX+i*78,y+30,74,LANE_H-40);}}
    else if(l===1){ctx.fillStyle='#5a564c';ctx.fillRect(VX,y,W-VX,LANE_H);
      for(let i=0;i<9;i++){ctx.fillStyle='#68635a';ctx.fillRect(VX+i*82,y+18+i%2*8,78,16);ctx.fillStyle='#3e3a32';ctx.fillRect(VX+i*82,y+34+i%2*8,78,4);}}
    else{ctx.fillStyle='#3a3a32';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#2a3a34';ctx.fillRect(VX,y+24,W-VX,LANE_H-34);
      waterLines(VX,y+30,W-VX,LANE_H-44,t,'rgba(180,210,200,.13)');
      ctx.fillStyle='#6a6a58';for(let i=0;i<7;i++){const rx=VX+50+i*110;ctx.beginPath();ctx.ellipse(rx,y+112,rnd(14,26),rnd(6,10),0,0,7);ctx.fill();}}
  }else if(map.id==='estacao'){
    if(l===0||l===2){ctx.fillStyle='#3a403c';ctx.fillRect(VX,y,W-VX,LANE_H);
      for(let i=0;i<Math.ceil((W-VX)/26);i++){ctx.fillStyle='#5a5040';ctx.fillRect(VX+i*26,y+58,20,10);}
      ctx.fillStyle='#7a7a6a';ctx.fillRect(VX,y+56,W-VX,4);ctx.fillRect(VX,y+70,W-VX,3);
      ctx.fillStyle='#2a302c';for(let i=0;i<9;i++)ctx.fillRect(VX+i*100,y+84,14,3);
      if(l===2){ctx.fillStyle='rgba(40,70,70,.45)';ctx.fillRect(VX,y+96,W-VX,LANE_H-96);waterLines(VX,y+100,W-VX,LANE_H-104,t,'rgba(160,200,190,.14)');}}
    else{ctx.fillStyle='#6a665a';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#7a7466';for(let i=0;i<12;i++)ctx.fillRect(VX+i*66,y+20,58,64);
      ctx.strokeStyle='#4a463c';ctx.lineWidth=1;for(let i=0;i<12;i++)ctx.strokeRect(VX+i*66,y+20,58,64);
      ctx.fillStyle='#c8b45a';ctx.fillRect(VX,y+88,W-VX,4);ctx.fillStyle='#2a2620';ctx.fillRect(VX,y+92,W-VX,8);}
  }else if(map.id==='feira'){
    if(l===0){ctx.fillStyle='#5a4a32';ctx.fillRect(VX,y,W-VX,LANE_H);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#66543a':'#524228';ctx.fillRect(VX+i*80,y+26,76,LANE_H-34);}
     	for(let i=0;i<6;i++){ctx.fillStyle=['#b04836','#c8a03a','#4a7a6a'][i%3];ctx.fillRect(VX+20+i*130,y+16,60,12);}}
    else if(l===1){ctx.fillStyle='#6a6050';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#7a7060';for(let i=0;i<20;i++)ctx.fillRect(VX+i*40,y+20,36,30);
      ctx.fillStyle='#5a5040';for(let i=0;i<20;i++)ctx.fillRect(VX+i*40,y+56,36,28);ctx.fillStyle='#8a6a3a';ctx.fillRect(VX,y+86,W-VX,3);}
    else{ctx.fillStyle='#4a4030';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#3a4a32';ctx.fillRect(VX,y+30,W-VX,LANE_H-40);
      for(let i=0;i<8;i++){ctx.fillStyle='#8a7a4a';ctx.fillRect(VX+30+i*110,y+60,26,20);ctx.fillStyle='#6a5a3a';ctx.fillRect(VX+36+i*110,y+52,14,10);}
      ctx.fillStyle='#7a6a3a';ctx.fillRect(VX,y+LANE_H-16,W-VX,6);}
  }else if(map.id==='fabrica'){
    if(l===0){ctx.fillStyle='#2e2a24';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#4a443a';ctx.fillRect(VX,y+40,W-VX,56);
      for(let i=0;i<24;i++){const off=(t*30)%36;ctx.fillStyle='#5a5244';ctx.fillRect(VX+i*34-off,y+42,26,8);}
      ctx.fillStyle='#e08a20';ctx.globalAlpha=.35;ctx.fillRect(VX,y+96,W-VX,4);ctx.globalAlpha=1;
      ctx.strokeStyle='#6a5a40';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(VX+40+i*38,y+68,10,0,7);ctx.stroke();}}
    else if(l===1){ctx.fillStyle='#3a322a';ctx.fillRect(VX,y,W-VX,LANE_H);
      ctx.fillStyle='#6a5040';ctx.fillRect(VX,y+20,W-VX,14);ctx.fillRect(VX,y+96,W-VX,12);
      ctx.fillStyle='#8a5a30';for(let i=0;i<8;i++)ctx.fillRect(VX+i*110,y+34,16,62);
      ctx.fillStyle='#4a6a4a';ctx.fillRect(VX,y+82,W-VX,5);}
    else{ctx.fillStyle='#2a3020';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#4a5a20';ctx.fillRect(VX,y+22,W-VX,LANE_H-34);
      ctx.fillStyle='rgba(160,200,60,.16)';for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(VX+60+i*130,y+70+Math.sin(t*2+i)*6,14+i*2,0,7);ctx.fill();}
      ctx.fillStyle='#3a4a1a';ctx.fillRect(VX,y+22,W-VX,5);ctx.fillStyle='#3a3a30';ctx.fillRect(VX,y+LANE_H-14,W-VX,5);}
  }else{
    if(l===0){ctx.fillStyle='#3a3428';ctx.fillRect(VX,y,W-VX,LANE_H);
      for(let i=0;i<30;i++){ctx.fillStyle=i%3?'#4a4030':'#2e2a22';ctx.fillRect(VX+i*26,y+26,24,LANE_H-30);}
      ctx.fillStyle='#6a5a3a';ctx.fillRect(VX,y+30,FIELD_R-VX,3);ctx.strokeStyle='#2a261e';ctx.lineWidth=2;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(VX+i*150,y+36);ctx.lineTo(VX+i*150,y+LANE_H-4);ctx.stroke();}}
    else if(l===1){ctx.fillStyle='#2e3234';ctx.fillRect(VX,y,W-VX,LANE_H);ctx.fillStyle='#3e4442';for(let i=0;i<14;i++)ctx.fillRect(VX+i*56,y+30,50,58);
      ctx.strokeStyle='#1e2422';ctx.lineWidth=2;for(let i=0;i<14;i++)ctx.strokeRect(VX+i*56,y+30,50,58);
      ctx.fillStyle='#8a8a70';ctx.fillRect(VX,y+88,W-VX,3);}
    else{ctx.fillStyle='#1a3034';ctx.fillRect(VX,y,W-VX,LANE_H);waterLines(VX,y+10,W-VX,LANE_H-10,t*1.3,'rgba(170,200,190,.16)',14);
      for(let i=0;i<6;i++){ctx.strokeStyle='#2a3a38';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(VX+40+i*150,y+30);ctx.lineTo(VX+40+i*150,y+LANE_H);ctx.stroke();}
      ctx.fillStyle='#6a5a3a';ctx.fillRect(VX,y+LANE_H-18,W-VX,8);}
  }
}

// =====================================================================
//  CLIMA — cada mapa tem um, e todos fazem alguma coisa
// =====================================================================
export function drawWeather(G,t){
  const w=G.map.weather;
  if(w==='rain'||w==='storm'||w==='gale'){
    ctx.strokeStyle=w==='gale'?'rgba(200,220,210,.22)':'rgba(180,200,210,.22)';ctx.lineWidth=1;
    for(let i=0;i<70;i++){
      const sx=(i*137+ (w==='gale'?t*260:t*80))%W, sy=(i*83+t*380)%H;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-(w==='gale'?18:5),sy+14);ctx.stroke();
    }
    if(w==='storm'&&Math.sin(t*1.7)>.985){ctx.fillStyle='rgba(220,240,255,.35)';ctx.fillRect(0,0,W,H);}
  }
  if(w==='fog'){
    for(let i=0;i<6;i++){const fx=((i*210+t*14)%(W+200))-100;
      const grd=ctx.createRadialGradient(fx,130+i*56,10,fx,130+i*56,150);
      grd.addColorStop(0,'rgba(200,220,215,.10)');grd.addColorStop(1,'rgba(200,220,215,0)');
      ctx.fillStyle=grd;ctx.fillRect(fx-150,60+i*56,300,140);}
  }
  if(w==='heat'){
    ctx.fillStyle='rgba(30,20,10,.22)';
    for(let i=0;i<9;i++){const fx=(i*119+t*60)%W,fy=(i*71+t*33)%H;ctx.fillRect(fx,fy,2,2);}
    ctx.strokeStyle='rgba(255,210,120,.06)';ctx.lineWidth=2;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,120+i*110+Math.sin(t+i)*4);ctx.bezierCurveTo(300,110+i*110,W-300,130+i*110,W,120+i*110);ctx.stroke();}
  }
  if(w==='ash'){
    ctx.fillStyle='rgba(230,210,190,.18)';
    for(let i=0;i<60;i++){const fx=(i*151+t*(12+i%5))%W,fy=(i*97+t*(18+(i%7)*4))%H;ctx.fillRect(fx,fy,2,3);}
    ctx.fillStyle='rgba(255,90,30,.05)';ctx.fillRect(0,0,W,H);
  }
  // tint de onda: crepúsculo, noite, madrugada, amanhecer
  const tints=['rgba(30,30,60,0)','rgba(10,18,40,.28)','rgba(4,8,20,.42)','rgba(240,170,110,.12)'];
  ctx.fillStyle=tints[clamp(G.waveIdx||0,0,3)];ctx.fillRect(0,0,W,H);
  if(G.dark){ctx.fillStyle='rgba(2,4,8,.62)';ctx.fillRect(0,0,W,H);}
}

// =====================================================================
//  VILA, ESTRAGOS E NPCS
// =====================================================================
export function drawStructure(s,lane,i,map,t){
  const bx=i===0?58:126,by=plantY(lane);
  // Família da estrutura. É tabela, não advinhação por pedaço do nome:
  // `s.id.includes('caixa')` já classificou cisterna como casa.
  const kind=FAMILIA_ESTRUTURA[s.id]||'house';
  if(!s.alive){ // estrago permanente
    ctx.save();ctx.translate(bx,by);
    if(kind==='boat'){ctx.rotate(.5);ctx.fillStyle='#4a3a2a';ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(30,0);ctx.lineTo(22,14);ctx.lineTo(-22,14);ctx.fill();
      ctx.fillStyle='#6a2a20';ctx.fillRect(-10,-8,20,10);}
    else if(kind==='post'){ctx.rotate(-1.1);ctx.fillStyle='#4a4a44';ctx.fillRect(-3,-80,6,80);ctx.fillStyle='#e8c070';ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(0,-84,6,0,7);ctx.fill();ctx.globalAlpha=1;}
    else if(kind==='tank'){ctx.fillStyle='#3a3a30';ctx.beginPath();ctx.ellipse(0,0,26,8,0,0,7);ctx.fill();ctx.fillStyle='#4a4a3a';ctx.fillRect(-14,-10,28,10);
      if(map.id==='fabrica'||map.id==='barra'){ctx.fillStyle='rgba(160,200,70,.35)';for(let k=0;k<3;k++)ctx.fillRect(10+k*10,2,18,3);}}
    else{ctx.fillStyle='#4a4438';ctx.fillRect(-26,-30,52,30);ctx.fillStyle='#5a3a2a';ctx.beginPath();ctx.moveTo(-30,-30);ctx.lineTo(0,-46);ctx.lineTo(30,-30);ctx.fill();
      ctx.fillStyle='rgba(80,75,70,.35)';for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(0,-40-(t*9+k*16)%40,9+k*3,0,7);ctx.fill();}}
    ctx.restore();
    return;
  }
  ctx.save();ctx.translate(bx,by);
  // estruturas das lanes de baixo têm silhueta própria (structures.ts)
  if(drawEstruturaNova(s,map,t)){ctx.restore();return;}
  if(kind==='boat'){
    ctx.fillStyle='#0a2024';ctx.beginPath();ctx.ellipse(0,2,42,7,0,0,7);ctx.fill();
    const bob=Math.sin(t*1.3+i*2)*2;ctx.translate(0,bob);
    ctx.fillStyle=s.id==='navio'||s.id==='navio_mãe'?'#3a4a4a':'#8a2a22';
    ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(34,0);ctx.lineTo(26,14);ctx.lineTo(-26,14);ctx.fill();
    ctx.fillStyle='#d8c8a0';ctx.fillRect(-32,-3,64,4);
    if(s.id==='navio'){ctx.fillStyle='#3a4a4a';ctx.fillRect(-10,-48,50,12);ctx.fillRect(-4,-62,36,14);
      ctx.strokeStyle='#2a3434';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(-22,-56);ctx.stroke();ctx.fillStyle='#c8c0a0';ctx.beginPath();ctx.arc(-22,-58,4,0,7);ctx.fill();}
    else if(s.id==='mastro'){ctx.strokeStyle='#5a5040';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-70);ctx.stroke();
      ctx.fillStyle='#8a8a70';ctx.fillRect(-22,-68,44,5);ctx.fillStyle='#5a4a3a';ctx.fillRect(-12,-20,24,18);}
    else{ctx.fillStyle='#5a4a3a';ctx.fillRect(-12,-22,24,20);ctx.fillStyle='#8ab';ctx.fillRect(-8,-18,9,7);
      ctx.fillStyle='#e0d0b0';ctx.font='6px monospace';ctx.fillText('ESPERANÇA II',-28,10);}
    if(map.id==='cemiterio'){ctx.fillStyle='rgba(180,200,190,.2)';ctx.beginPath();ctx.arc(18,-6,6,0,7);ctx.fill();}
  }else if(kind==='post'){
    const h=s.id==='relogio'?66:94;
    ctx.fillStyle='#4a4a44';ctx.fillRect(-3,-h,6,h);
    if(s.id==='relogio'){ctx.fillStyle='#2a2a24';ctx.beginPath();ctx.arc(0,-h-10,13,0,7);ctx.fill();ctx.strokeStyle='#c8c0a0';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,-h-10,9,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-h-10);ctx.lineTo(0,-h-16);ctx.moveTo(0,-h-10);ctx.lineTo(-5,-h-8);ctx.stroke();}
    else{ctx.fillStyle='#4a4a44';ctx.fillRect(-16,-h+8,32,4);
      if(s.id.includes('lanterna')||s.id.includes('sinaleira')||s.id.includes('cruz')){
        ctx.fillStyle=s.id.includes('cruz')?'#8a8070':'#e8d070';ctx.fillRect(-7,-h-4,14,8);}
      const on=map.id==='farol'?'#e8f0c0':'#ffd070';
      ctx.fillStyle=on;ctx.globalAlpha=.9;ctx.fillRect(-5,-h+4,10,6);ctx.globalAlpha=1;
      const grd=ctx.createRadialGradient(0,-h+6,2,0,-h+6,44);grd.addColorStop(0,'rgba(255,225,150,.22)');grd.addColorStop(1,'rgba(255,225,150,0)');
      ctx.fillStyle=grd;ctx.fillRect(-44,-h-38,88,88);}
  }else if(kind==='tank'){
    ctx.fillStyle='#4a4a40';rr(-20,-40,40,42,4);ctx.fill();
    ctx.fillStyle='#6a6a58';ctx.fillRect(-24,-44,48,6);
    ctx.fillStyle=map.id==='fabrica'?'#8a4a20':'#5a8a5a';ctx.fillRect(-4,-16,8,18);
    if(s.id.includes('caixa')){ctx.fillStyle='#7a6a4a';ctx.fillRect(-14,-30,28,4);}
  }else{
    ctx.fillStyle=map.id==='feira'?'#c8a03a':'#6a5a48';ctx.fillRect(-30,-58,60,58);
    ctx.fillStyle=map.id==='cemiterio'?'#2e3a3a':'#5a3a2a';ctx.beginPath();ctx.moveTo(-36,-58);ctx.lineTo(0,-82);ctx.lineTo(36,-58);ctx.fill();
    ctx.fillStyle='#1a1a18';ctx.fillRect(12,-30,16,30);
    // janela: Dona Lú mora aí
    const wx=-20,wy=-46;
    ctx.fillStyle=G.luAtWindow?'#e8c860':'#20241c';ctx.fillRect(wx,wy,18,14);
    ctx.fillStyle='#3a2a20';ctx.fillRect(wx+8,wy,2,14);
    if(G.luAtWindow){
      ctx.fillStyle='#c89a70';ctx.beginPath();ctx.arc(wx+9,wy+7,5,0,7);ctx.fill();
      ctx.fillStyle='#ddd0c0';ctx.beginPath();ctx.arc(wx+9,wy+4,5,Math.PI,0);ctx.fill();
    }
    ctx.fillStyle=map.id==='fabrica'?'#8a4a20':'#5a4a3a';ctx.fillRect(-26,-66,8,10);
    // cartaz do mapa
    ctx.save();ctx.translate(-24,-30);ctx.rotate(-.03);ctx.fillStyle='#c8bb92';ctx.fillRect(0,0,30,18);
    ctx.fillStyle='#3a3020';ctx.font='4px monospace';const txt=(CARTAZES[map.id]||[''])[i%3]||'';
    (txt.slice(0,13).match(/.{1,7}/g)||[]).forEach((ln,k)=>ctx.fillText(ln,2,7+k*6));ctx.restore();
  }
  ctx.restore();
}
let _villageBase: HTMLCanvasElement | null = null;
function villageBase(): HTMLCanvasElement {
  if(_villageBase) return _villageBase;
  const c = document.createElement('canvas');
  c.width = VX; c.height = H;
  const c2 = c.getContext('2d')!;
  const sidewalk=['#1e2622','#25251f','#1a201a','#222a24','#1c2228','#20262a'];
  c2.fillStyle='#151a18';c2.fillRect(0,LANE_Y0,VX-4,H-LANE_Y0);
  for(let l=0;l<LANES;l++){
    c2.fillStyle=sidewalk[l%sidewalk.length];c2.fillRect(0,LANE_Y0+l*LANE_H,VX-4,LANE_H);
    c2.fillStyle='#0c100e';c2.fillRect(VX-6,LANE_Y0+l*LANE_H,6,LANE_H);
  }
  c2.fillStyle='#2e2a22';for(let l=0;l<LANES;l++){c2.fillRect(VX-10,LANE_Y0+l*LANE_H+30,4,LANE_H-40);}
  _villageBase = c;
  return c;
}
export function drawVillage(G,t){
  const map=G.map;
  // calçada da vila (cache offscreen: estático)
  ctx.drawImage(villageBase(),0,0);
  // vizinhos extras nas novas lanes (animados)
  for(let l=3;l<LANES;l++){
    const x=30+Math.sin(G.t*1.2+l)*6, y=plantY(l)-18;
    ctx.fillStyle=l%2?'#5a5a6a':'#6a5a4a';ctx.fillRect(x-4,y-14,8,14);
    ctx.fillStyle='#c8a070';ctx.beginPath();ctx.arc(x,y-18,4.5,0,7);ctx.fill();
    ctx.fillStyle='#2a2a28';ctx.fillRect(x-3,y-22,6,3);
  }
  for(let l=0;l<LANES;l++){
    const lane=G.structures[l]||[];
    for(let i=0;i<lane.length;i++)drawStructure(lane[i],l,i,map,t);
  }
  drawZe(G,t);
  if(G.luAtWindow)drawLu(G,t);
  drawToquinho(G,t);
  drawRealDog(G,t);
  // chuva de rádio/letreiro
  ctx.save();ctx.translate(12,LANE_Y0+16);ctx.rotate(-.05);
  ctx.fillStyle='#2a2a22';ctx.fillRect(0,0,104,22);
  ctx.fillStyle='#c8b060';ctx.font='bold 9px monospace';ctx.fillText('BARRA SUJA',6,10);
  ctx.fillStyle='#8a8a6a';ctx.font='6px monospace';ctx.fillText('POP. 7 (ONTEM 9)',6,18);ctx.restore();
}
export function drawZe(G,_t){
  const z=G.ze,x=46,g=plantY(1)+2,sw=Math.sin(z.anim*4)*6;
  if(!z.alive){
    ctx.fillStyle='#2a4a6a';ctx.fillRect(x-8,g-6,16,6);ctx.fillStyle='#c8a070';ctx.fillRect(x+2,g-2,5,4);
    return;
  }
  ctx.fillStyle='#4a3a2a';ctx.fillRect(x-6,g-26,12,26);
  ctx.fillStyle='#7a6a4a';ctx.fillRect(x-7,g-46,14,22);
  ctx.fillStyle='#c8a070';ctx.beginPath();ctx.arc(x,g-52,7,0,7);ctx.fill();
  if(G.zeHat){ctx.fillStyle='#e8c84a';ctx.fillRect(x-11,g-61,22,5);ctx.fillRect(x-7,g-70,14,9);ctx.fillStyle='#c8a83a';ctx.fillRect(x-7,g-65,14,3);}
  else{ctx.fillStyle='#2a4a6a';ctx.fillRect(x-8,g-60,16,5);ctx.fillRect(x-11,g-56,8,2);}
  ctx.fillStyle='#444';ctx.fillRect(x-4,g-50,8,3);
  ctx.strokeStyle='#8a6a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+6,g-40);ctx.lineTo(x+18+sw,g);ctx.stroke();
  ctx.fillStyle='#b8a060';ctx.fillRect(x+12+sw,g-4,12,5);
  if(z.sayT>0){ctx.font='10px monospace';const w=Math.min(190,ctx.measureText(z.say).width+12);
    ctx.fillStyle='rgba(240,236,220,.94)';rr(x-4,g-84,w,20,4);ctx.fill();
    ctx.fillStyle='#222';ctx.fillText(z.say.slice(0,30),x+2,g-70);}
}
export function drawLu(G,_t){
  const x=124,y=plantY(1)-76;
  ctx.fillStyle='#1a1a18';ctx.fillRect(x-12,y,20,16);
  ctx.fillStyle='#d8c8b8';ctx.beginPath();ctx.arc(x-2,y+9,5,0,7);ctx.fill();
  ctx.fillStyle='#b8a898';ctx.beginPath();ctx.arc(x-2,y+5,5,Math.PI,0);ctx.fill();
  ctx.fillStyle='#2a2a28';ctx.fillRect(x-5,y+6,2,2);ctx.fillRect(x+1,y+6,2,2);
  if(G.luTalking){ctx.fillStyle='rgba(240,236,220,.94)';const w=Math.min(180,ctx.measureText(G.luTalking).width+12);
    rr(20,y-26,w,20,4);ctx.fill();ctx.fillStyle='#222';ctx.font='9px monospace';ctx.fillText(G.luTalking.slice(0,40),25,y-13);}
}
export function drawToquinho(G,t){
  if(!G.toqAlive)return;
  const lane=2,x=70+Math.sin(t*.6)*22+(G.toqBoost||0),y=plantY(lane)+2,run=Math.sin(t*8)*5;
  ctx.fillStyle='#3a5a8a';ctx.fillRect(x-4,y-18,8,12);
  ctx.fillStyle='#c8a070';ctx.beginPath();ctx.arc(x,y-23,5.5,0,7);ctx.fill();
  ctx.fillStyle='#1a1a18';ctx.fillRect(x-6,y-29,12,4);ctx.fillStyle='#c44';ctx.fillRect(x-6,y-31,8,2);
  ctx.fillStyle='#4a3a2a';ctx.fillRect(x-3+run,y-6,3,7);ctx.fillRect(x+1-run,y-6,3,7);
  ctx.strokeStyle='#8a7a5a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+4,y-16);ctx.lineTo(x+14,y-26);ctx.stroke();
  if(G.toqSay){ctx.fillStyle='rgba(240,236,220,.9)';rr(x+8,y-46,Math.min(150,ctx.measureText(G.toqSay).width+12),16,3);ctx.fill();
    ctx.fillStyle='#222';ctx.font='8px monospace';ctx.fillText(G.toqSay.slice(0,34),x+12,y-35);}
}
export function drawRealDog(G,t){
  const x=94+Math.sin(t*1.3)*8,y=plantY(2)+4;
  ctx.fillStyle='#7a5a3a';ctx.fillRect(x-8,y-12,16,8);ctx.fillStyle='#8a6a4a';ctx.beginPath();ctx.arc(x+9,y-14,5,0,7);ctx.fill();
  ctx.fillStyle='#7a5a3a';ctx.beginPath();ctx.moveTo(x+12,y-18);ctx.lineTo(x+16,y-22);ctx.lineTo(x+14,y-14);ctx.fill();
  ctx.strokeStyle='#7a5a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-8,y-8);ctx.lineTo(x-12,y-16+Math.sin(t*9)*4);ctx.stroke();
  ctx.fillStyle='#1a1008';ctx.fillRect(x+11,y-15,2,2);
  if(G.dogSay){ctx.fillStyle='#eee';ctx.font='8px monospace';ctx.fillText('au.',x+14,y-24);}
}

// =====================================================================
//  MÁQUINAS
// =====================================================================
export function drawUpgrades(m){
  const n=(G.up&&G.up[m.type])||0;if(!n)return;
  if(m.type==='torradeira'){if(n>=1){ctx.fillStyle='#e8c84a';ctx.fillRect(-26,-30,52,5);ctx.fillRect(-26,-20,52,4);}
    if(n>=2){ctx.fillStyle='#8a3030';ctx.fillRect(-8,-45,16,5);} if(n>=3){ctx.fillStyle='#ff7030';ctx.beginPath();ctx.arc(0,-16,4,0,7);ctx.fill();}}
  else if(m.type==='geladeira'||m.type==='geladeira_bomba'){if(n>=1){ctx.fillStyle='#e8d050';ctx.beginPath();ctx.arc(-8,-58,5,0,7);ctx.fill();}
    if(n>=2){ctx.strokeStyle='#bbb';ctx.lineWidth=3;ctx.strokeRect(-22,-74,44,74);} if(n>=3){ctx.fillStyle='#e0e0d0';ctx.fillRect(-18,-70,8,8);ctx.fillRect(10,-24,8,8);}}
  else if(m.type==='ventilador'){if(n>=1){ctx.save();ctx.translate(0,-40);ctx.rotate(-m.t*9);ctx.fillStyle='#b8c0b8';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.ellipse(12,0,9,3,0,0,7);ctx.fill();}ctx.restore();}
    if(n>=2){ctx.fillStyle='#8a5a2a';ctx.fillRect(-18,-16,36,6);} if(n>=3){ctx.strokeStyle='rgba(220,230,220,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-40,29,0,7);ctx.stroke();}}
  else if(m.type==='boia'){if(n>=1){ctx.strokeStyle='#bbb';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-18+i*9,-2);ctx.lineTo(-14+i*9,10);ctx.stroke();}}
    if(n>=2){ctx.fillStyle='#aaa';ctx.fillRect(16,-32,10,4);ctx.fillRect(18,-38,4,10);} if(n>=3){ctx.strokeStyle='#c88a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,-46);ctx.lineTo(14,-74);ctx.stroke();ctx.fillStyle='#ff5';ctx.fillRect(12,-78,4,4);}}
  else if(m.type==='bujao'){if(n>=1){ctx.strokeStyle='#aaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-20);ctx.lineTo(18,-26);ctx.stroke();}
    if(n>=2){ctx.fillStyle='#ffb040';ctx.fillRect(-4,-70,8,5);} if(n>=3){ctx.fillStyle='#b83020';rr(14,-46,12,40,4);ctx.fill();ctx.fillStyle='#fff';ctx.font='7px monospace';ctx.fillText('14',16,-32);}}
  else if(m.type==='holofote'){if(n>=1){ctx.fillStyle='#fff2a0';ctx.beginPath();ctx.arc(0,-52,7,0,7);ctx.fill();}
    if(n>=2){ctx.fillStyle='#c8c8b8';ctx.beginPath();ctx.moveTo(-16,-58);ctx.lineTo(-16,-36);ctx.lineTo(16,-36);ctx.lineTo(16,-58);ctx.fill();}
    if(n>=3){ctx.strokeStyle='#e8c84a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.quadraticCurveTo(-30,0,-40,-20);ctx.stroke();}}
  else{ // genérico: sucata pregada, mas com uma marca por peça
    for(let i=0;i<n;i++){ctx.fillStyle=['#c8a040','#8a9a8a','#c05030'][i%3];ctx.fillRect(-18+i*13,-68-i*2,8,5);}
    ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,-62);ctx.lineTo(10,-56);ctx.stroke();
  }
}
/**
 * Registro declarativo de desenho por tipo de máquina.
 *
 * Primeiro passo da migração: tipos migrados saem do `if/else`
 * gigante de `drawMachine` e viram entradas aqui. O restante ainda
 * cai no `else if` legado, até ser migrado aos poucos.
 */
type MachineDrawerCtx = { m: any; k: string; t: number; act: boolean; hurt: boolean; f: number; dmg: number };
const MACHINE_DRAWERS: Record<string, (c: MachineDrawerCtx) => void> = {
  boia: ({ t, act, hurt, f }) => {
    ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(0,-4,24,9,0,0,7);ctx.fill();
    const bob=Math.sin(t*2)*2+(act?3:0);ctx.translate(0,bob);
    ctx.fillStyle='#d85a2a';ctx.beginPath();ctx.arc(0,-28,20+(act?3:0)-(hurt?3:0),0,7);ctx.fill();
    ctx.fillStyle='#e8e0d0';ctx.fillRect(-20,-32,40,8);ctx.fillStyle='rgba(80,40,20,.5)';ctx.beginPath();ctx.arc(8,-20,6,0,7);ctx.fill();
    ctx.strokeStyle='#8a8a7a';ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-18+i*12,-10);ctx.lineTo(-12+i*12,6+(act?4:0));ctx.stroke();}
    ctx.strokeStyle='#555';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-48);ctx.quadraticCurveTo([-4,0,4][f],-60,0,-64);ctx.stroke();
    ctx.fillStyle=['#500','#ff3030','#a30'][f];ctx.beginPath();ctx.arc(0,-65,3,0,7);ctx.fill();
    ctx.fillStyle='#d8c070';ctx.fillRect(0,-63,[10,14,8][f],6);
  },
  torradeira: ({ act, hurt, f }) => {
    const st=act?1:0;
    ctx.fillStyle='#8a4a1a';ctx.fillRect(-20,-6,40,6);ctx.fillStyle='#b8b8b0';rr(-24,-40,48,34,6);ctx.fill();
    ctx.fillStyle='#e0e0d8';rr(-20,-38,20,30,4);ctx.fill();ctx.fillStyle='#333';ctx.fillRect(-16,-42,12,4);ctx.fillRect(2,-42,12,4);
    if(hurt){ctx.fillStyle='#555';ctx.fillRect(-16,-42,12,4);}
    ctx.fillStyle='#222';ctx.fillRect(26,-30+st*8,6,10);ctx.fillRect(22,-26+st*8,6,3);
    ctx.fillStyle='#d8a85a';if(st){ctx.fillRect(-14,-56,10,16);ctx.fillRect(4,-54,10,14);}
    ctx.strokeStyle='#222';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-24,-12);
    ctx.quadraticCurveTo([-38,-44,-32][f],[-4,-2,2][f],[-38,-30,-36][f],4);ctx.stroke();
    ctx.fillStyle='#ff6020';ctx.beginPath();ctx.arc([-38,-30,-36][f],4,2,0,7);ctx.fill();
  },
  lancador_lata: ({ act, hurt }) => {
    const st=act?1:0;
    ctx.fillStyle='#4a4a42';ctx.fillRect(-18,-8,36,8);
    ctx.fillStyle='#6a6a60';rr(-22,-34,44,28,4);ctx.fill();
    ctx.fillStyle='#8a8a7a';ctx.fillRect(10,-30,18,8);
    ctx.fillStyle='#3a3a34';ctx.fillRect(-20,-32,20,20);
    ctx.fillStyle='#9aa8a0';ctx.beginPath();ctx.arc(24+st*6,-26,6,0,7);ctx.fill();
    ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-10);ctx.lineTo(-30,4);ctx.stroke();
    if(hurt){ctx.fillStyle='#555';ctx.fillRect(-10,-28,8,6);}
  },
  ventilador: ({ t, act, hurt, f }) => {
    ctx.fillStyle='#6a6a62';rr(-14,-20,28,20,3);ctx.fill();ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(0,-40,24,0,7);ctx.fill();
    ctx.fillStyle='#3a3a3a';ctx.beginPath();ctx.arc(0,-40,20,0,7);ctx.fill();
    ctx.save();ctx.translate(0,-40);ctx.rotate(t*(act?30:6)+f*.4);ctx.fillStyle='#8aa0a0';
    for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.ellipse(10,0,11+(act?4:0),5,0,0,7);ctx.fill();}ctx.restore();
    ctx.strokeStyle='#999';ctx.lineWidth=1;for(let i=-16;i<=16;i+=8){ctx.beginPath();ctx.moveTo(i,-40-Math.sqrt(400-i*i));ctx.lineTo(i,-40+Math.sqrt(400-i*i));ctx.stroke();}    ctx.fillStyle='#555';ctx.beginPath();ctx.arc(0,-40,4,0,7);ctx.fill();if(hurt){ctx.fillStyle='#222';ctx.fillRect(-6,-22,12,4);}
  },
  geladeira: ({ k, t, act, hurt, dmg }) => {
    ctx.fillStyle=k==='geladeira_bomba'?'#a07050':'#8aa0a0';rr(-22,-74,44,74,4);ctx.fill();
    ctx.fillStyle='#7a9090';ctx.fillRect(-22,-50,44,3);ctx.fillStyle='#ddd';ctx.fillRect(14,-68,3,14);ctx.fillRect(14,-44,3,30);
    ctx.fillStyle='rgba(120,60,20,.6)';ctx.beginPath();ctx.arc(-10,-20,7,0,7);ctx.arc(8,-60,5,0,7);ctx.fill();
    ctx.fillStyle='#c44';ctx.fillRect(-14,-40,10,8);ctx.fillStyle='#4a8';ctx.fillRect(-2,-34,8,6);
    const cyc=(t*.7)%3,mg=cyc>2.3?(cyc-2.3)*45:0;
    ctx.fillStyle='#e03030';rr(-14,-40+mg,10,8,2);ctx.fill();
    if(k==='geladeira_bomba'){ctx.fillStyle='#3a2a1a';ctx.fillRect(-8,-14,16,5);ctx.fillStyle='#ff4020';ctx.fillRect(-4,-9,8,3);
      ctx.strokeStyle='#a03020';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-20);ctx.quadraticCurveTo(0,-26,6,-20);ctx.stroke();}
    if(act){ctx.fillStyle='rgba(200,230,160,.3)';ctx.beginPath();ctx.arc(-24,-60,10,0,7);ctx.fill();}
    if(dmg>.3||hurt){ctx.strokeStyle='#2a3a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-70);ctx.lineTo(-6,-52);ctx.lineTo(-12,-38);ctx.stroke();}
    ctx.fillStyle='rgba(120,200,80,.25)';ctx.beginPath();ctx.arc(-10+Math.sin(t*2)*4,-84-(t*10%14),4,0,7);ctx.fill();
  },
  bujao: ({ t, act, f }) => {
    ctx.fillStyle='#b83020';rr(-17,-54,34,54,8);ctx.fill();ctx.fillStyle='#d04030';rr(-15,-52,12,50,6);ctx.fill();
    ctx.fillStyle='#777';ctx.fillRect(-8,-62,16,8);
    ctx.save();ctx.translate(0,-66);ctx.rotate([-.2,0,.2][f]+(act?Math.sin(t*20)*.3:0));ctx.fillStyle='#aaa';ctx.fillRect(-10,-2,20,3);ctx.fillStyle='#777';ctx.fillRect(-3,-6,6,6);ctx.restore();
    ctx.fillStyle='#8a8a7a';ctx.fillRect(-17,-30,34,7);ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.fillText('P13',-10,-36);
    ctx.fillStyle=act?'#ffe060':'rgba(255,220,60,.6)';ctx.beginPath();ctx.arc(6,-18,3+(act?2:0),0,7);ctx.fill();
  },
  holofote: ({ t, act, f }) => {
    ctx.fillStyle='#4a4a42';ctx.fillRect(-16,-12,32,12);ctx.fillStyle='#6a6a60';ctx.fillRect(-8,-30,16,20);
    const sw=[-.12,0,.12][f]+(act?.1:0);ctx.save();ctx.translate(0,-40);ctx.rotate(sw);
    ctx.fillStyle='#8a8a7a';rr(-20,-16,40,26,6);ctx.fill();ctx.fillStyle='#3a3a34';ctx.beginPath();ctx.moveTo(18,-13);ctx.lineTo(30,-16);ctx.lineTo(30,10);ctx.lineTo(18,7);ctx.fill();
    ctx.fillStyle=Math.sin(t*13)>.9?'#ffe270':'#fff0a0';ctx.beginPath();ctx.ellipse(29,-3,4,11,0,0,7);ctx.fill();ctx.restore();
    ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-12);ctx.quadraticCurveTo(-26,-4,-24,4);ctx.stroke();
  },
  ima: ({ t, act, f }) => {
    ctx.fillStyle='#4a4a42';ctx.fillRect(-16,-10,32,10);ctx.strokeStyle='#c03030';ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,-26,14,Math.PI,0);ctx.stroke();
    ctx.fillStyle='#d8d8d0';ctx.fillRect(-19,-28,5,8);ctx.fillRect(14,-28,5,8);
    ctx.save();ctx.rotate([-.3,0,.3][f]+(act?Math.sin(t*14)*.2:0));ctx.strokeStyle=`rgba(180,220,255,${act?.8:.25})`;ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-26,20+i*8,-2.4,-.7);ctx.stroke();}ctx.restore();
  },
  radio: ({ act, f }) => {
    ctx.fillStyle='#7a5a35';rr(-22,-44,44,42,4);ctx.fill();ctx.fillStyle='#3a2a1a';ctx.fillRect(-16,-38,26,22);
    ctx.fillStyle='#9a8a5a';for(let i=0;i<5;i++)ctx.fillRect(-14+i*5,-36,2,18);
    ctx.fillStyle='#d8b050';ctx.beginPath();ctx.arc(13,-27,6,0,7);ctx.fill();ctx.fillStyle='#444';ctx.fillRect(6,-40,4,4);
    ctx.strokeStyle='#bbb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,-44);ctx.lineTo([20,24,18][f],-70);ctx.stroke();
    if(act){ctx.fillStyle='#d8c0e0';ctx.font='bold 12px monospace';ctx.fillText('♪',-36,-54+f*4);ctx.fillText('?',30,-60-f*3);}
  },
  estilingue: ({ act, f }) => {
    ctx.fillStyle='#5a4028';ctx.fillRect(-6,-70,12,62);
    ctx.strokeStyle='#8a6a3a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,-66);ctx.lineTo(-14,-86);ctx.moveTo(14,-66);ctx.lineTo(14,-86);ctx.stroke();
    ctx.strokeStyle='#3a2a1a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-14,-86);ctx.lineTo(0,-54+([0,6,3][f]));ctx.lineTo(14,-86);ctx.stroke();
    ctx.fillStyle='#c8b070';ctx.fillRect(-8,-90,16,6);
    if(act){ctx.fillStyle='#9aa8a0';ctx.fillRect(-13,-80,26,10);}
    ctx.fillStyle='#6a5030';ctx.beginPath();ctx.arc(-20,-40,7,0,7);ctx.arc(20,-40,7,0,7);ctx.fill();
  },
  aspirador: ({ t, act, f }) => {
    ctx.fillStyle='#7a8a6a';rr(-16,-46,32,36,6);ctx.fill();ctx.fillStyle='#4a5a3a';ctx.fillRect(-20,-30,40,14);
    ctx.fillStyle='#a8b89a';ctx.beginPath();ctx.ellipse(-22,-24,10,7,0,0,7);ctx.fill();
    ctx.strokeStyle='#4a4030';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(10,-18);ctx.lineTo(20,0);ctx.stroke();
    for(let i=0;i<3;i++){const lx=-8+i*8;ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,-6);ctx.lineTo(lx-3*(f-1),2);ctx.stroke();}
    if(act){ctx.strokeStyle='rgba(200,220,200,.5)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-22,-24,12+i*8+t%10,-2.6,-.5);ctx.stroke();}}
    ctx.fillStyle='#c44';ctx.beginPath();ctx.arc(0,-38,4,0,7);ctx.fill();
  },
  batedeira: ({ t, act }) => {
    ctx.fillStyle='#7a6a5a';rr(-12,-24,24,24,4);ctx.fill();
    ctx.save();ctx.translate(0,-42);ctx.rotate(t*12);ctx.fillStyle='#8a9a9a';ctx.beginPath();ctx.arc(0,0,14,0,7);ctx.fill();
    ctx.fillStyle='#b8c8c8';ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(10,4);ctx.lineTo(-10,4);ctx.fill();ctx.restore();
    ctx.strokeStyle='#ddd';ctx.lineWidth=3;
    for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*10,-38);ctx.lineTo(s*18,-60);ctx.stroke();ctx.fillStyle='#eee';ctx.beginPath();ctx.moveTo(s*18,-60);ctx.lineTo(s*26,-66);ctx.lineTo(s*18,-50);ctx.fill();}
    if(act){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-42,22,0,7);ctx.stroke();}
    ctx.fillStyle='#333';ctx.fillRect(-10,-14,4,4);ctx.fillRect(6,-14,4,4);
  },
  espelho: ({ f, act }) => {
    ctx.fillStyle='#5a4a3a';ctx.fillRect(-3,-46,6,46);ctx.fillStyle='#8a9a9a';rr(-18,-88,36,46,4);ctx.fill();
    ctx.fillStyle='#c8d8d8';ctx.beginPath();ctx.moveTo(-14,-84);ctx.lineTo(4,-84);ctx.lineTo(-10,-56);ctx.lineTo(-14,-58);ctx.fill();
    ctx.strokeStyle='#ddd';ctx.lineWidth=2;rr(-18,-88,36,46,4);ctx.stroke();
    if(act){ctx.strokeStyle='rgba(230,250,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-64,26+f*6,0,7);ctx.stroke();}
  },
  pneu: ({ t, act }) => {
    ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(0,-10,24,22,0,0,7);ctx.fill();ctx.fillStyle='#2a2a28';ctx.beginPath();ctx.ellipse(0,-10,13,11,0,0,7);ctx.fill();
    ctx.fillStyle='#3a2a20';ctx.fillRect(-20,-4,40,10);ctx.fillStyle='#4a3a2a';ctx.fillRect(-24,2,48,5);
    const fire=G.map.weather!=='rain'||G.fireT>0;
    if(fire){ctx.fillStyle=`rgba(255,${120+Math.sin(t*9)*60},30,.8)`;
      for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(-14+i*9,-30-Math.sin(t*7+i)*6,5,9+Math.sin(t*5+i)*4,0,0,7);ctx.fill();}}
    else{ctx.fillStyle='rgba(120,120,120,.4)';ctx.beginPath();ctx.arc(0,-30-(t*10%14),5,0,7);ctx.fill();}
    if(act){ctx.fillStyle='rgba(255,160,60,.25)';ctx.beginPath();ctx.arc(0,-20,34,0,7);ctx.fill();}
  },
  aranha: ({ t, act }) => {
    ctx.fillStyle='#4a4030';ctx.fillRect(-8,-60,10,54);
    for(let i=0;i<3;i++){ctx.strokeStyle='#5a5040';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-52+i*12);ctx.lineTo(-22,-58+i*14+Math.sin(t*3+i)*4);ctx.stroke();}
    ctx.fillStyle='#6a5a4a';ctx.beginPath();ctx.arc(0,-62,13,0,7);ctx.fill();
    ctx.fillStyle='#8a7a5a';ctx.fillRect(-6,-58,16,6);
    ctx.fillStyle='#c8a040';ctx.fillRect(0,-46,4,10);
    for(let i=0;i<3;i++){ctx.fillStyle='#ffd070';ctx.beginPath();ctx.arc(-6+i*6,-66,2,0,7);ctx.fill();}
    ctx.strokeStyle='#4a4030';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-70);ctx.lineTo(10,-82);ctx.stroke();
    if(act){ctx.strokeStyle='rgba(220,200,140,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,-54);ctx.lineTo(40,-64);ctx.stroke();}
  },
  cachorro: ({ act, f }) => {
    ctx.fillStyle='#7a8a8a';rr(-14,-40,28,30,4);ctx.fill();ctx.fillStyle='#a8b8b8';ctx.fillRect(-16,-44,32,5);
    ctx.strokeStyle='#8a5a3a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(14,-40,9,0,7);ctx.stroke();
    ctx.fillStyle='#d8c8a0';ctx.beginPath();ctx.ellipse(0,-22,12,4,0,0,7);ctx.fill();
    ctx.fillStyle='#1a1a18';ctx.beginPath();ctx.arc(-6,-32,2.5,0,7);ctx.arc(6,-32,2.5,0,7);ctx.fill();
    ctx.fillStyle='#8a6a4a';ctx.beginPath();ctx.ellipse(-12,-20,5,3,0,0,7);ctx.fill();
    ctx.fillStyle='#555';ctx.fillRect(-10,-54,20,8);
    if(act){ctx.fillStyle='#eee';ctx.font='bold 11px monospace';ctx.fillText('AU',-4,-60+f*3);}
  },
  coisa_ze: ({ t, act }) => {
    ctx.fillStyle='#6a6a5a';rr(-20,-50,40,44,3);ctx.fill();ctx.fillStyle='#c8a040';ctx.fillRect(-16,-46,30,6);
    ctx.fillStyle='#8a5a3a';ctx.fillRect(-8,-40,16,20);ctx.fillStyle='#d8d0a0';ctx.fillRect(-12,-16,24,5);
    ctx.fillStyle='#c44';ctx.beginPath();ctx.arc(14,-16,4,0,7);ctx.fill();
    ctx.strokeStyle='#aaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(10,-48);ctx.lineTo(20,-64+Math.sin(t*4)*4);ctx.stroke();
    if(act){ctx.fillStyle='#ffe080';ctx.font='bold 9px monospace';ctx.fillText('?',-4,-56);}
  },
};


export function drawMachine(m){
  const icon=m._icon, x=m.x,y=icon?0:plantY(m.lane), t=icon?G.t:(m.t||0);m.t=t;
  const P=pose(m,t),f=P.f,act=P.st==='action',hurt=P.st==='hurt';
  const dmg=m.maxhp?clamp(1-m.hp/m.maxhp,0,1):0;
  ctx.save();ctx.translate(x,y);
  if(!icon){ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,2,26,6,0,0,7);ctx.fill();}
  ctx.rotate(P.tilt);ctx.scale(P.sx,P.sy);
  const k=m.type;
  const __drawer = MACHINE_DRAWERS[k];
  if(__drawer){__drawer({m,k,t,act,hurt,f,dmg});}
  drawUpgrades(m);
  if(hurt){ctx.fillStyle='#ffb040';for(let i=0;i<3;i++)ctx.fillRect(rnd(-16,16),rnd(-40,-10),2,2);}
  // rim light (luz global topo-esquerda)
  ctx.strokeStyle='rgba(230,220,180,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-24,24,Math.PI*1.05,Math.PI*1.65);ctx.stroke();
  ctx.restore();
  if(dmg>.02&&!icon){ctx.fillStyle='#222';ctx.fillRect(x-18,y+6,36,4);ctx.fillStyle='#b8b060';ctx.fillRect(x-18,y+6,36*(1-dmg),4);}
}

// =====================================================================
//  SUCATA, PROJÉTEIS, EFEITOS
// =====================================================================
export function drawPickup(p,G){
  const res=G&&G.map?G.map.res:'sucata';
  ctx.save();ctx.translate(p.x,p.y+(p.fly||p.auto?0:Math.sin(G.t*3+(p.bob||0))*3));
  if(p.life<3&&!p.fly&&Math.sin(G.t*12)>0)ctx.globalAlpha=.4;
  shadowEllipse(0,10,12,3,.25,'#000');
  if(res==='óleo'){ctx.fillStyle='#3a3a30';ctx.fillRect(-7,-10,14,18);ctx.fillStyle='#8a7a3a';ctx.fillRect(-5,-14,10,4);ctx.fillStyle='#c8b050';ctx.font='bold 7px monospace';ctx.fillText('OIL',-8,3);}
  else if(res==='vapor'){ctx.strokeStyle='#d8e8e0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-4,9,.4,5.9);ctx.stroke();ctx.beginPath();ctx.arc(0,-4,5,.4,5.9);ctx.stroke();}
  else if(res==='peixe fresco'){ctx.fillStyle='#8aa8a0';ctx.beginPath();ctx.ellipse(0,0,11,6,0,0,7);ctx.fill();ctx.fillStyle='#c8d8d0';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(16,-5);ctx.lineTo(16,5);ctx.fill();eye(-5,-1,2,-1,0);}
  else if(res==='energia'){ctx.fillStyle='#c8c040';ctx.beginPath();ctx.moveTo(2,-12);ctx.lineTo(-7,2);ctx.lineTo(0,2);ctx.lineTo(-3,12);ctx.lineTo(8,-3);ctx.lineTo(1,-3);ctx.fill();}
  else if(res==='tudo'){ctx.fillStyle='#9aa8a0';rr(-9,-8,18,16,3);ctx.fill();ctx.fillStyle='#c0503a';ctx.fillRect(-6,-2,12,5);ctx.fillStyle='#e8c84a';ctx.fillRect(-10,-12,6,6);}
  else{ctx.fillStyle='#9aa8a0';rr(-9,-8,18,16,3);ctx.fill();ctx.fillStyle='#6a7870';ctx.fillRect(-9,-8,18,3);ctx.fillStyle='#c0503a';ctx.fillRect(-6,-2,12,5);ctx.fillStyle='#7a6a40';ctx.fillRect(6,-13,4,6);}
  if(Math.sin(G.t*6+(p.bob||0))>.7){ctx.fillStyle='#fff';ctx.fillRect(-4,-12,2,2);}
  ctx.restore();
}
export function drawProjectile(p){
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);
  if(p.kind==='can'){ctx.fillStyle='#9aa8a0';rr(-7,-7,14,14,3);ctx.fill();ctx.fillStyle='#6a7870';ctx.fillRect(-7,-7,14,3);}
  else if(p.kind==='mirror'){ctx.fillStyle='#c8e0e0';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(7,0);ctx.lineTo(0,8);ctx.lineTo(-7,0);ctx.fill();}
  else if(p.kind==='scrap'){ctx.fillStyle='#c0503a';ctx.fillRect(-6,-6,12,12);ctx.fillStyle='#8a9a8a';ctx.fillRect(-6,-6,12,3);}
  else if(p.kind==='lata_proj'){ctx.fillStyle='#9aa8a0';rr(-8,-6,16,12,3);ctx.fill();ctx.fillStyle='#7a8a80';ctx.fillRect(-8,-6,16,3);ctx.fillStyle='#c0c8c0';ctx.fillRect(-2,-2,4,4);}
  else{const enemy=p.enemy;ctx.fillStyle=enemy?'#8aa0a8':'#a8743a';rr(-8,-8,16,16,4);ctx.fill();
    ctx.fillStyle=enemy?'#d8e8f0':'#e0b878';rr(-6,-6,12,12,3);ctx.fill();}
  ctx.restore();
  if(p.kind!=='mirror'){ctx.fillStyle=p.enemy?'rgba(200,240,255,.4)':'rgba(255,180,80,.3)';
    ctx.fillRect(p.x+(p.vx>0?-20:8),p.y-2,14,3);}
}
export function drawParticles(G){
  for(const q of G.parts){ctx.globalAlpha=clamp(q.life/(q.max||1),0,1);ctx.fillStyle=q.color;
    if(q.round){ctx.beginPath();ctx.arc(q.x,q.y,q.size/2,0,7);ctx.fill();}else ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size);}
  ctx.globalAlpha=1;
  for(const tx of G.texts){ctx.globalAlpha=clamp(tx.life,0,1);ctx.textAlign='center';
    haloText(tx.text,tx.x,tx.y,'bold 12px "Consolas","Menlo","Monaco",monospace',tx.color,'rgba(0,0,0,.8)',4);}
  ctx.globalAlpha=1;ctx.textAlign='left';
}
export function drawDecals(G){
  for(const d of G.decals){ctx.globalAlpha=d.a;ctx.fillStyle=d.color;ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.4,0,0,7);ctx.fill();}
  ctx.globalAlpha=1;
}

