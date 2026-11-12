/**
 * creatures.ts — as criaturas, os chefes e o que sobra deles.
 *
 * Recebe estado, devolve pixels. A regra de quem é imune, quem voa e quem
 * morre mora em `src/data/balance.json` e em `src/game/game.ts`.
 */
import { FIELD_R, H, W, clamp, plantY, rnd } from '../core/constants';
import { ctx } from '../core/canvas';
import { blinkEye, eye, lowHp, pose, rr, teeth } from './sprites';
import { shadowEllipse } from './brush';


export function drawEnemy(e){
  if(e.boss){drawBoss(e);return;}
  const t=e.anim||0,low=lowHp(e),P=pose(e,t),f=P.f,act=P.st==='action',hurt=P.st==='hurt';
  const x=(e.x||0)+(low?Math.sin(t*38)*1.6:0),y=plantY(e.lane);
  const flying=e.air&&e.lit<=0;
  const hidden=e.type==='fantasma'&&!e.revealed&&!e.lit;
  ctx.save();ctx.translate(x,y);
  // sombra projetada uniforme (brush): lê-se a altura e o apoio no chão
  shadowEllipse(0, 2, (e.r || 12) * (e.air && e.lit <= 0 ? 0.7 : 1), (e.air && e.lit <= 0 ? 3 : 5), 0.32);
  // sombra separada quando voa: lê-se a altura
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(flying?8:0,2,e.r*(flying?.7:1),flying?3:5,0,0,7);ctx.fill();
  if(hidden){ // invisível: só a pegada e a ondulação
    ctx.fillStyle='rgba(180,200,190,.32)';
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-18+i*16,2+Math.sin(t*8+i),5,2,0,0,7);ctx.fill();}
    ctx.strokeStyle='rgba(200,220,210,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,-18,15,4,0,0,7);ctx.stroke();
    if(e.carry>0){ctx.fillStyle='rgba(200,220,210,.5)';ctx.font='9px monospace';ctx.fillText(e.carry,8,-20);}
    ctx.restore();return;
  }
  if(e.burrow>0){ // escavador: monte de terra e plaquinha
    ctx.fillStyle='#5a4630';ctx.beginPath();ctx.ellipse(0,-4,24,10,0,Math.PI,0);ctx.fill();
    ctx.fillStyle='#3a2e1e';ctx.fillRect(10,-24,3,18);ctx.fillStyle='#d8d0a0';rr(2,-34,26,12,2);ctx.fill();
    ctx.fillStyle='#222';ctx.font='bold 7px monospace';ctx.fillText('POR AQUI',4,-25);
    for(let i=0;i<4;i++){ctx.fillStyle='#7a6240';ctx.fillRect(-20+i*12,-10-Math.sin(t*12+i)*5,4,4);}
    ctx.restore();return;
  }
  ctx.translate(0,flying?-48:0);
  if(e.grounded>0)ctx.rotate(.12);
  if(e.hypno>0){ctx.translate(Math.sin(t*9)*2,0);}
  ctx.rotate(P.tilt);ctx.scale(P.sx,P.sy);
  const bite=e.eating?Math.abs(Math.sin(t*10))*6:0;
  if(e.lit>0){ctx.strokeStyle='rgba(255,240,170,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-e.r*.9,e.r+5,0,7);ctx.stroke();}
  if(e.hypno>0){ctx.fillStyle='#d8c0e0';ctx.font='bold 12px monospace';ctx.fillText('@',-4,-e.r-16+Math.sin(t*8)*3);}
  if(e.type==='pescador'){ctx.fillStyle='rgba(240,236,220,.9)';rr(-46,-82,90,18,4);ctx.fill();ctx.fillStyle='#222';ctx.font='9px monospace';ctx.fillText(e.saved?'...obrigado.':'Zé?',-36,-69);}
  const B=e.type;
  if(B==='baiacu'){
    ctx.fillStyle='#6a7a3a';ctx.fillRect(-10+Math.sin(t*8)*4+(act?3:0),-8,5,8);ctx.fillRect(6-Math.sin(t*8)*4,-8,5,8);
    for(let i=0;i<(low?8:10);i++){const a=i/10*Math.PI*2,rad=23+(act?5:0);
      ctx.fillStyle=i%3?'#b0b0a8':'#c84a3a';ctx.beginPath();ctx.arc(Math.cos(a)*rad,-28+Math.sin(a)*rad,4,0,7);ctx.fill();}
    ctx.fillStyle='#9bb04a';ctx.beginPath();ctx.arc(0,-28,22+(act?3:0)-(hurt?4:0),0,7);ctx.fill();
    ctx.fillStyle='#d8d890';ctx.beginPath();ctx.ellipse(-2,-18,14,8,0,0,7);ctx.fill();
    const seq=Math.floor(t*2.4)%5;
    blinkEye(-12,-32,6,seq===0,-2,1);blinkEye(2,-36,4,seq===1,-1,1);blinkEye(-6,-46,3,seq===2,0,1,'#a00');
    ctx.fillStyle='#3a1a1a';ctx.beginPath();ctx.ellipse(-16,-20,7,3+bite,0,0,7);ctx.fill();teeth(-22,-22,12,4,4,false);
  }else if(B==='enguia'){
    ctx.globalAlpha=e.dived?.22:1;
    if(e.dived){ctx.strokeStyle='rgba(200,220,200,.6)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-10+i*16,0,10+i*4,3,0,0,7);ctx.stroke();}}
    ctx.lineCap='round';ctx.strokeStyle='#15151c';ctx.lineWidth=16+(act?3:0);ctx.beginPath();
    for(let i=0;i<=8;i++){const px=-20+i*8,py=-14+Math.sin(t*9+i*.9+f*.7)*6*(i/8+.3);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.stroke();
    ctx.strokeStyle='rgba(140,60,180,.4)';ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle='#15151c';ctx.beginPath();ctx.ellipse(-24,-14,14,10,0,0,7);ctx.fill();
    blinkEye(-28,-18,6,f===2,-2,0,'#e8d020');eye(-20,-10,2.5,0,0,'#e8d020');
    ctx.fillStyle='#2a0a0a';ctx.beginPath();ctx.ellipse(-32,-8,6,2+bite*.5,0,0,7);ctx.fill();teeth(-38,-9,12,5,3,true);
    ctx.fillStyle='rgba(20,10,30,.5)';ctx.beginPath();ctx.ellipse(16,-2,16,3,0,0,7);ctx.fill();
  }else if(B==='ova'){
    ctx.save();ctx.scale(1+Math.sin(t*3)*.06,1-Math.sin(t*3)*.06);
    ctx.fillStyle='rgba(230,140,170,.75)';ctx.beginPath();ctx.ellipse(0,-26,30,24,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(255,200,215,.5)';ctx.beginPath();ctx.ellipse(-8,-34,10,6,0,0,7);ctx.fill();
    for(let i=0;i<(low?5:9);i++){const a=i*2.4,r=i*2.2,ox=Math.cos(a)*r,oy=-26+Math.sin(a)*r*.8,choc=i===Math.floor(t*2)%9;
      ctx.fillStyle=choc?'#f0a0b0':'#c0405a';ctx.beginPath();ctx.arc(ox,oy,5+(choc?2:0),0,7);ctx.fill();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(ox-1+Math.sin(t*2+i),oy,2,0,7);ctx.fill();}
    ctx.restore();
    ctx.fillStyle='rgba(230,140,170,.6)';for(let i=0;i<3;i++){const dy=(t*30+i*12)%24;ctx.beginPath();ctx.ellipse(-16+i*14,-6+dy,2,4,0,0,7);ctx.fill();}
    ctx.fillStyle='#4a0a1a';ctx.beginPath();ctx.ellipse(-26,-14,5,3+bite*.5,0,0,7);ctx.fill();
  }else if(B==='larva'){
    ctx.fillStyle='#e8e0b0';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-8+i*6,-6+Math.sin(t*20+i)*2,5-i*.6,0,7);ctx.fill();}
    ctx.fillStyle='#3a1010';ctx.beginPath();ctx.arc(-11,-6,3,0,7);ctx.fill();teeth(-14,-9,6,3,2,false);
    blinkEye(-8,-10,2,f===2,-1,0,'#a00');
  }else if(B==='caranguejo'||B==='caranguejo_m'){
    const col=B==='caranguejo_m'?'#a04a3a':'#a0442a';
    ctx.fillStyle='#8a3a2a';for(let i=0;i<4;i++){const lx=-12+i*8,ph=Math.sin(t*10+i*1.5)*4;ctx.fillRect(lx,-14,3,14+ph);ctx.fillRect(lx,-14,3,14-ph);}
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-20,24,14,0,0,7);ctx.fill();
    ctx.fillStyle='#c0603a';ctx.beginPath();ctx.ellipse(-4,-24,14,6,0,0,7);ctx.fill();
    const op=e.eating?Math.sin(t*12)*.4:0;
    if(!low){ctx.save();ctx.translate(-26,-14);ctx.rotate(.3+op);ctx.beginPath();ctx.ellipse(0,0,10,6,0,0,7);ctx.fill();ctx.restore();}
    ctx.save();ctx.translate(-22,-28);ctx.rotate(-.5-op);ctx.beginPath();ctx.ellipse(0,0,8,5,0,0,7);ctx.fill();ctx.restore();
    ctx.strokeStyle='#6a2a1a';ctx.lineWidth=2;[[-10,-6],[-2,-2],[6,-5]].forEach(([ox,oy],i)=>{ctx.beginPath();ctx.moveTo(ox,-30);ctx.lineTo(ox+oy*.5,-42);ctx.stroke();blinkEye(ox+oy*.5,-44,3.5,f===i,-1,0);});
    if(e.buff){ctx.save();ctx.rotate([-.08,0,.08][f]);ctx.fillStyle='#8a7a4a';ctx.fillRect(4,-64,4,22);
      ctx.fillStyle='#d8d0a8';rr(-12,-84,44,22,2);ctx.fill();ctx.strokeStyle='#5a4a2a';ctx.lineWidth=1;ctx.strokeRect(-12,-84,44,22);
      ctx.fillStyle='#7a2020';ctx.font='bold 10px monospace';ctx.fillText('GREVE!',-8,-69);ctx.restore();}
    if(B==='caranguejo_m'){ // foto do amigo, sempre úmida
      ctx.fillStyle='#d8c8a0';ctx.fillRect(8,-40,14,10);ctx.fillStyle='#6a4a3a';ctx.fillRect(10,-38,10,6);
      ctx.fillStyle='#222';ctx.fillRect(11,-36,2,2);ctx.fillRect(17,-36,2,2);}
  }else if(B==='bomba'){
    const p=1+Math.sin(t*4)*.06+(act?.09:0);ctx.save();ctx.scale(p,p);
    ctx.fillStyle='#5a7a9a';ctx.beginPath();ctx.arc(0,-26,24,0,7);ctx.fill();
    ctx.fillStyle='#7a9a6a';ctx.beginPath();ctx.arc(8,-18,8,0,7);ctx.fill();if(!low){ctx.beginPath();ctx.arc(-10,-36,6,0,7);ctx.fill();}
    ctx.fillStyle='#4a5a6a';ctx.beginPath();ctx.moveTo(22,-26);ctx.lineTo(34,-36);ctx.lineTo(34,-16);ctx.fill();
    ctx.fillStyle='#777';ctx.fillRect(-4,-56,8,8);ctx.fillRect(-8,-58,16,3);
    ctx.fillStyle=Math.sin(t*8)>0?'#ff2020':'#500';ctx.beginPath();ctx.arc(0,-62,3,0,7);ctx.fill();
    eye(-12,-30,6,2,0);eye(2,-30,6,-3,0);ctx.fillStyle='#2a1a1a';ctx.beginPath();ctx.ellipse(-16,-16,6,3,0,0,7);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#4a6a7a';ctx.fillRect(-8+Math.sin(t*8)*3,-6,4,6);ctx.fillRect(4-Math.sin(t*8)*3,-6,4,6);
    if(f===2){ctx.fillStyle='#fff';ctx.font='8px monospace';ctx.fillText('hmmm',-34,-8);}
  }else if(B==='gaivota'||B==='gaivota_r'){
    const big=B==='gaivota_r';
    if(flying&&Math.floor(t*1.2)%4===0){ctx.fillStyle='#c44';ctx.fillRect(-8,52+(t*40%40),5,3);}
    const flap=[-.45,-.05,.5][f]-(act?.25:0),ww=big?1.4:1;
    ctx.fillStyle=big?'#9aa8a0':'#b8c0b8';
    ctx.save();ctx.rotate(flap);ctx.beginPath();ctx.moveTo(0,-24);ctx.quadraticCurveTo(-30*ww,-56,-48*ww,-34);ctx.quadraticCurveTo(-30*ww,-30,0,-18);ctx.fill();ctx.restore();
    ctx.save();ctx.rotate(-flap);ctx.beginPath();ctx.moveTo(0,-24);ctx.quadraticCurveTo(28*ww,-56,46*ww,-34);ctx.quadraticCurveTo(28*ww,-30,0,-18);ctx.fill();ctx.restore();
    ctx.fillStyle=big?'#6a7a7a':'#8a9a9a';ctx.beginPath();ctx.ellipse(0,-22,20*ww,13,0,0,7);ctx.fill();
    ctx.fillStyle='#d8d0b0';ctx.beginPath();ctx.moveTo(-18,-24);ctx.lineTo(-36,-28);ctx.lineTo(-18,-18);ctx.fill();
    ctx.strokeStyle='#bbb';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-34,-26);ctx.lineTo(-42,-26);ctx.stroke();
    blinkEye(-8,-28,5,f===0,-1,0);blinkEye(2,-30,5,f===2,-1,0);
    ctx.fillStyle='#333';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(8+i*5,-14,2,0,7);ctx.fill();}
    if(big&&e.grabbed){ctx.fillStyle='#7a6a4a';ctx.fillRect(-30,-6,26,16);ctx.fillStyle='#c8b070';ctx.fillRect(-26,-2,18,8);
      ctx.fillStyle='#222';ctx.font='7px monospace';ctx.fillText('LEVANDO',-30,-8);}
    else if(!low){ctx.fillStyle='rgba(230,230,230,.5)';ctx.beginPath();ctx.ellipse(16,-8,10,7,.4,0,7);ctx.fill();}
  }else if(B==='tatu'){
    ctx.fillStyle='#6a5a3a';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(16+i*7,-10,8,9-i*.7,0,0,7);ctx.fill();}
    ctx.fillStyle='#8a7048';ctx.beginPath();ctx.ellipse(-6,-20,26,18,0,0,7);ctx.fill();
    ctx.strokeStyle='#4a3a24';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-22+i*10,-34);ctx.lineTo(-18+i*10,-6);ctx.stroke();}
    ctx.fillStyle='#c0a878';ctx.beginPath();ctx.moveTo(-28,-22);ctx.lineTo(-46,-14);ctx.lineTo(-28,-8);ctx.fill();
    ctx.strokeStyle='#888';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-40,-15,4+Math.sin(t*12)*2,0,7);ctx.stroke();
    blinkEye(-12,-26,4,f===2,-1,0,'#a00');
    ctx.fillStyle='#3a2a18';ctx.fillRect(-24,-2,8,5);ctx.fillRect(-2,-2,8,5);
    if(e.digCd<1.2){ctx.fillStyle='#e8d0a0';ctx.font='8px monospace';ctx.fillText('vai cavar',-30,-46);}
  }else if(B==='lata'){
    ctx.fillStyle='#9aa8a8';rr(-26,-42,52,30,6);ctx.fill();ctx.fillStyle='#c8d0c8';
    for(let i=0;i<5;i++)ctx.fillRect(-24+i*10,-40,3,26);
    if(low){ctx.fillStyle='#6a7272';ctx.fillRect(6,-42,12,12);}
    ctx.fillStyle='#5a6a6a';ctx.fillRect(-26,-16,52,5);
    ctx.fillStyle='#b0b8b0';ctx.beginPath();ctx.moveTo(24,-34);ctx.lineTo(40,-42);ctx.lineTo(40,-18);ctx.fill();
    ctx.fillStyle='#777';ctx.beginPath();ctx.arc(0,-38,7,0,7);ctx.fill();ctx.strokeStyle='#ddd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-38,4,0,7);ctx.stroke();
    blinkEye(-16,-28,5,f===1,1,0);blinkEye(-2,-28,5,f===1,-2,0);
    ctx.fillStyle='#2a1a1a';ctx.fillRect(-22,-10,14,3);
    ctx.fillStyle='rgba(220,240,240,.55)';ctx.beginPath();ctx.moveTo(-38,-8);ctx.lineTo(-30,-20);ctx.lineTo(-26,-6);ctx.fill();
    if(e.reflectT>0){ctx.strokeStyle='rgba(230,250,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-26,30+e.reflectT*20,0,7);ctx.stroke();}
  }else if(B==='fantasma'){
    ctx.globalAlpha=e.revealed>0?.78:.4;ctx.fillStyle='#9ab0a8';ctx.beginPath();ctx.ellipse(0,-24,22,17,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(20,-28);ctx.lineTo(38,-40);ctx.lineTo(34,-18);ctx.fill();
    ctx.fillStyle='#d8e8e0';ctx.beginPath();ctx.ellipse(-4,-30,10,5,0,0,7);ctx.fill();
    ctx.strokeStyle='#1a2020';ctx.lineWidth=2;[[-12,-26],[2,-26]].forEach(([ox,oy])=>{ctx.beginPath();ctx.moveTo(ox-3,oy-3);ctx.lineTo(ox+3,oy+3);ctx.moveTo(ox+3,oy-3);ctx.lineTo(ox-3,oy+3);ctx.stroke();});
    if(e.flee){ctx.fillStyle='rgba(210,210,190,.85)';rr(10,-20,18,14,3);ctx.fill();ctx.fillStyle='#555';ctx.font='bold 9px monospace';ctx.fillText(e.carry,12,-9);
      ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('>>>',30,-46+f*3);}
    ctx.globalAlpha=1;
  }else if(B==='polvo'){
    ctx.fillStyle='#6a4a5a';ctx.beginPath();ctx.ellipse(0,-30,24,20,0,0,7);ctx.fill();
    for(let i=0;i<5;i++){ctx.strokeStyle='#7a5a6a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-18+i*9,-16);
      ctx.quadraticCurveTo(-24+i*10,-2+Math.sin(t*4+i)*6,-30+i*11,10);ctx.stroke();}
    ctx.fillStyle='#8a6a7a';ctx.beginPath();ctx.arc(0,-34,12,0,7);ctx.fill();
    blinkEye(-7,-36,4,f===0,-1,0,'#e8d040');blinkEye(6,-36,4,f===2,-1,0,'#e8d040');
    ctx.fillStyle='#2a1a1a';ctx.beginPath();ctx.ellipse(0,-24,5,2,0,0,7);ctx.fill();
    // garrafas no corpo
    for(let i=0;i<5;i++){const bx=-16+i*8;ctx.fillStyle=['#4a7a4a','#7a5a3a','#3a6a7a'][i%3];ctx.fillRect(bx,-48+(i%2)*4,4,12);ctx.fillStyle='#d8d0b0';ctx.fillRect(bx,-50+(i%2)*4,4,3);}
    if(e.attached){ctx.strokeStyle='#8a5a3a';ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(18,-8+i*5);ctx.stroke();}
      ctx.fillStyle='#f0e0a0';ctx.font='7px monospace';ctx.fillText('DESLIGADO',-20,-58);}
  }else if(B==='agua'){
    ctx.fillStyle='rgba(150,200,190,.62)';ctx.beginPath();ctx.arc(0,-34,15,Math.PI,0);
    for(let i=0;i<6;i++){ctx.lineTo(-15+i*5,-20+Math.sin(t*4+i)*6);}ctx.fill();
    ctx.strokeStyle='rgba(190,230,220,.7)';ctx.lineWidth=2;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-10+i*7,-18);ctx.quadraticCurveTo(-12+i*7,-8+Math.sin(t*5+i)*3,-10+i*7,2);ctx.stroke();}
    ctx.fillStyle='rgba(220,245,240,.75)';ctx.beginPath();ctx.arc(0,-34,6,0,7);ctx.fill();
    if(e.lit>0){ctx.fillStyle='rgba(255,240,180,.7)';for(let i=0;i<3;i++)ctx.fillRect(rnd(-12,12),rnd(-40,-10),3,2);}
  }else if(B==='mariposa'){
    const flap=[-.5,-.05,.5][f];
    for(const s of[-1,1]){ctx.save();ctx.rotate(s*flap);
      ctx.fillStyle='rgba(170,190,195,.8)';ctx.beginPath();ctx.ellipse(s*22,-30,20,13,s*.3,0,7);ctx.fill();
      ctx.fillStyle='rgba(220,240,240,.35)';ctx.beginPath();ctx.ellipse(s*22,-32,12,7,s*.3,0,7);ctx.fill();ctx.restore();}
    ctx.fillStyle='#5a5a4a';ctx.beginPath();ctx.ellipse(0,-28,8,16,0,0,7);ctx.fill();
    ctx.fillStyle='#7a7a5a';ctx.beginPath();ctx.arc(0,-44,7,0,7);ctx.fill();
    blinkEye(-3,-44,3,f===1,-1,0);blinkEye(4,-44,3,f===1,-1,0);
    ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-2,-50);ctx.quadraticCurveTo(-8,-62,-14,-58);ctx.stroke();
    ctx.beginPath();ctx.moveTo(2,-50);ctx.quadraticCurveTo(8,-62,14,-58);ctx.stroke();
    if(e.lit>0){ctx.fillStyle='#ffd070';ctx.font='8px monospace';ctx.fillText('sol?',-10,-64);}
  }else if(B==='sapo'){
    const hop=e.jump?Math.sin(e.jump*Math.PI)*-30:0;
    ctx.translate(0,hop);
    ctx.fillStyle='#4a5a20';ctx.beginPath();ctx.ellipse(0,-16,22,15,0,0,7);ctx.fill();
    ctx.fillStyle='#6a7a30';ctx.beginPath();ctx.ellipse(-2,-22,14,9,0,0,7);ctx.fill();
    ctx.fillStyle='#8a9a3a';ctx.beginPath();ctx.arc(0,-30,11,0,7);ctx.fill();
    ctx.fillStyle='#3a4a10';for(const s of[-1,1]){ctx.beginPath();ctx.ellipse(s*20,-6,9,4,s*.4,0,7);ctx.fill();}
    eye(-4,-33,5,-1,0,'#e8c020');eye(5,-33,5,-1,0,'#e8c020');
    ctx.strokeStyle='#3a4a10';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-24);ctx.quadraticCurveTo(0,-20,8,-24);ctx.stroke();
    ctx.fillStyle='rgba(20,20,10,.5)';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(-14+i*11,2,4,2,0,0,7);ctx.fill();}
  }else if(B==='piranha'){
    const school=e.school||0;
    ctx.fillStyle=school>=2?'#9a4a3a':'#6a5a4a';ctx.beginPath();ctx.ellipse(0,-14,15,10,0,0,7);ctx.fill();
    ctx.fillStyle='#7a6a5a';ctx.beginPath();ctx.moveTo(12,-16);ctx.lineTo(24,-24);ctx.lineTo(22,-8);ctx.fill();
    eye(-7,-18,3,-1,0,'#e8e0c0');eye(2,-19,2,-1,0,'#a00');
    ctx.fillStyle='#3a1010';ctx.beginPath();ctx.ellipse(-8,-10,5,2+bite*.4,0,0,7);ctx.fill();
    teeth(-13,-11,10,4,3,true);
    if(school>=2){ctx.strokeStyle='#c84a3a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-12,22,0,7);ctx.stroke();}
  }else if(B==='baleia'){
    ctx.fillStyle='#5a7078';ctx.beginPath();ctx.ellipse(0,-40,44,30,0,0,7);ctx.fill();
    ctx.fillStyle='#7a9098';ctx.beginPath();ctx.ellipse(-4,-52,30,14,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(38,-42);ctx.lineTo(58,-54);ctx.lineTo(56,-30);ctx.fill();
    eye(-20,-48,7,-2,1);
    ctx.fillStyle='#3a4a50';ctx.beginPath();ctx.ellipse(-34,-38,6,3,0,0,7);ctx.fill();
    ctx.fillStyle='#c8b0a0';ctx.fillRect(10,-60,14,5);ctx.fillRect(12,-55,10,4);
    ctx.fillStyle='rgba(200,220,220,.4)';ctx.beginPath();ctx.arc(0,-78-(t*10%16),4,0,7);ctx.fill();
    ctx.fillStyle='#e8d9a8';ctx.font='8px monospace';ctx.fillText('NÃO MATE',-26,-86);
    for(let i=0;i<3;i++){ctx.strokeStyle='rgba(160,190,190,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(-10+i*12,-24,10+i*4,0,7);ctx.stroke();}
  }else if(B==='pescador'){
    ctx.fillStyle='#5a5a4a';ctx.fillRect(-10,-30,20,28);ctx.fillStyle='#3a5a6a';ctx.fillRect(-12,-42,24,16);
    ctx.fillStyle='#8aa8a0';ctx.beginPath();ctx.ellipse(0,-54,14,12,0,0,7);ctx.fill();
    ctx.fillStyle='#c8d8d0';ctx.beginPath();ctx.arc(4,-56,4,0,7);ctx.fill();eye(-5,-56,4,-1,0,'#223');
    ctx.fillStyle='#4a5a5a';ctx.beginPath();ctx.ellipse(-9,-46,7,4,0,0,7);ctx.fill();
    ctx.fillStyle='#e8c84a';ctx.fillRect(-15,-66,30,4);ctx.fillRect(-10,-76,20,10);
    ctx.strokeStyle='#8a8a7a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,-30);ctx.lineTo(-24,-12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(12,-30);ctx.lineTo(22,-12);ctx.stroke();
    ctx.fillStyle='#6a7a7a';ctx.fillRect(-26,-12,10,12);ctx.fillRect(16,-12,10,12);
    if(e.saved){ctx.fillStyle='#a8d8b0';ctx.font='8px monospace';ctx.fillText('obrigado',-22,-90);}
    else{ctx.fillStyle='rgba(240,236,220,.9)';rr(-46,-82,90,18,4);ctx.fill();ctx.fillStyle='#222';ctx.font='9px monospace';ctx.fillText(e.spoke||'Zé?',-38,-69);}
  }else if(B==='passageiro'){
    ctx.fillStyle='#3a4a5a';ctx.fillRect(-10,-32,20,30);
    ctx.fillStyle='#9ab0a8';ctx.beginPath();ctx.arc(0,-42,11,0,7);ctx.fill();
    ctx.fillStyle='#2a2a28';ctx.fillRect(-11,-54,22,5);ctx.fillStyle='#8a7a5a';ctx.fillRect(-8,-58,16,5);
    eye(-4,-43,3,-1,0);eye(4,-43,3,-1,0);
    ctx.fillStyle='#5a4a3a';ctx.fillRect(12,-22,14,12);ctx.fillStyle='#d8c8a0';ctx.fillRect(14,-20,10,3);
    ctx.strokeStyle='#4a4a44';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(-8,6);ctx.moveTo(8,-4);ctx.lineTo(8,6);ctx.stroke();
    if(e.switching){ctx.fillStyle='#ffd070';ctx.font='9px monospace';ctx.fillText('PRÓXIMO!',-24,-70);}
  }
  // "quase morrendo": sangue, contorno, peça faltando
  if(low&&e.type!=='baleia'&&e.type!=='pescador'){
    ctx.fillStyle='#8a1020';const dy=(t*40)%30;ctx.beginPath();ctx.ellipse(-e.r*.4,-6+dy,2,4,0,0,7);ctx.fill();
    ctx.strokeStyle='rgba(150,20,30,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-e.r*.9,e.r*.9,2.1,4.3);ctx.stroke();
    // feedback triplo: borda pulsante de baixa vida
    ctx.strokeStyle=`rgba(220,40,40,${0.35+Math.sin(t*8)*0.25})`;
    ctx.lineWidth=2.5;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.arc(0,-e.r*.9,e.r+4,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
  }
  // feedback triplo: intangível (fantasma não revelado) — contorno tracejado
  if(e.type==='fantasma'&&!e.revealed&&!e.lit){
    ctx.strokeStyle='rgba(180,200,190,.5)';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.ellipse(0,-18,26,14,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
  }
  // feedback triplo: "só luz" (água-viva) — silhueta luminosa quando acesa
  if(e.type==='agua'&&e.lit>0){
    ctx.strokeStyle=`rgba(255,240,180,${0.5+Math.sin(t*10)*0.2})`;
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-28,20,0,Math.PI*2);ctx.stroke();
  }
  if(e.flash>0){ctx.globalAlpha=Math.min(1,e.flash*4);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-e.r*.9,e.r,0,7);ctx.fill();ctx.globalAlpha=1;}
  // rim light sutil (luz global topo-esquerda)
  ctx.strokeStyle='rgba(230,220,180,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-e.r*.9,e.r+0.5,Math.PI*1.1,Math.PI*1.7);ctx.stroke();
  ctx.restore();
  if(e.boss||e.type==='mare')return;
  // barras só de chefe e de baleia (a baleia importa)
  if(e.type==='baleia'){ctx.fillStyle='#222';ctx.fillRect(x-30,y-105,60,4);ctx.fillStyle='#7a9a9a';ctx.fillRect(x-30,y-105,60*clamp(e.hp/e.maxhp,0,1),4);}
}

// =====================================================================
//  CHEFES — silhuetas de fase
// =====================================================================
export function drawBoss(e){
  const t=e.anim,y=plantY(e.lane),x=e.x;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,2,e.r+.2*(e.b==='bento'?30:0),9,0,0,7);ctx.fill();
  if(e.b==='bento'){
    const step=Math.sin(t*5),hat=e.phase>=2;
    ctx.fillStyle='#2a2a30';ctx.fillRect(-26+step*5,-14,18,14);ctx.fillRect(6-step*5,-14,18,14);ctx.fillRect(-30+step*5,-4,12,4);ctx.fillRect(2-step*5,-4,12,4);
    ctx.fillStyle='#6a7a3a';ctx.fillRect(-22,-32,14,20);ctx.fillRect(8,-32,14,20);
    ctx.fillStyle='#6a7a3a';ctx.beginPath();ctx.ellipse(0,-70,50+(e.phase>=3?4:0),42,0,0,7);ctx.fill();
    ctx.fillStyle='#8a9a4a';ctx.beginPath();ctx.ellipse(-8,-56,34,20,0,0,7);ctx.fill();
    for(let i=0;i<9;i++){ctx.fillStyle='rgba(50,70,30,.5)';ctx.beginPath();ctx.arc(-24+i*6,-86+(i%2)*8,5,0,7);ctx.fill();}
    ctx.fillStyle='#4a5a2a';ctx.beginPath();ctx.moveTo(46,-74);ctx.lineTo(70,-96+(t%2)*4);ctx.lineTo(66,-52);ctx.fill();
    if(e.phase>=3){ctx.fillStyle='#22305a';ctx.save();ctx.translate(16,-64);ctx.rotate(-.2);ctx.font='bold 12px monospace';ctx.fillText('MAMÃE',-22,0);ctx.restore();}
    ctx.fillStyle='#3a0a10';ctx.beginPath();ctx.ellipse(-32,-58,19,10+Math.abs(Math.sin(t*9))*5,0,0,7);ctx.fill();
    teeth(-52,-61,38,8,7,false);
    blinkEye(-26,-84,11,Math.floor(t*1.3)%4===0,-3,1);eye(-4,-90,4,-1,0,'#a00');
    if(!hat){ctx.fillStyle='#e8c84a';ctx.beginPath();ctx.ellipse(-14,-106,32,7,0,0,7);ctx.fill();ctx.fillRect(-30,-124,34,20);
      ctx.fillStyle='#c8a83a';ctx.fillRect(-30,-112,34,4);}
    else{ctx.fillStyle='#a00';ctx.fillRect(-40,-96,7,4);ctx.fillRect(-14,-102,7,4);}
    ctx.fillStyle='#4a3020';ctx.fillRect(-54,-64,16,3);ctx.fillRect(-56,-68,7,9);
    ctx.fillStyle='rgba(200,200,200,.4)';ctx.beginPath();ctx.arc(-56,-80-(t*7%10),3,0,7);ctx.fill();
    if(e.phase>=3&&Math.sin(t*9)>.3){ctx.fillStyle='rgba(255,60,40,.5)';ctx.beginPath();ctx.arc(-4,-92,5,0,7);ctx.fill();}
  }else if(e.b==='faroleiro'){
    const sway=Math.sin(t*2)*5;
    ctx.fillStyle='#22303a';ctx.beginPath();ctx.moveTo(-22,-6);ctx.lineTo(22,-6);ctx.lineTo(14,-70);ctx.lineTo(-14,-70);ctx.fill();
    ctx.fillStyle='#31424a';ctx.beginPath();ctx.moveTo(-14,-70);ctx.lineTo(14,-70);ctx.lineTo(8,-96);ctx.lineTo(-8,-96);ctx.fill();
    ctx.fillStyle='#8aa09a';ctx.beginPath();ctx.arc(0,-108,15,0,7);ctx.fill();
    ctx.fillStyle='#0e1618';ctx.beginPath();ctx.arc(0,-112,13,Math.PI,0);ctx.fill();
    ctx.fillStyle='#e8f0c0';ctx.beginPath();ctx.arc(0,-112,4,0,7);ctx.fill();
    const gl=ctx.createRadialGradient(0,-72,4,0,-72,50);gl.addColorStop(0,'rgba(255,245,180,.5)');gl.addColorStop(1,'rgba(255,245,180,0)');
    ctx.fillStyle=gl;ctx.fillRect(-50,-124,100,100);
    ctx.fillStyle='#e8d080';ctx.beginPath();ctx.arc(0,-74,9,0,7);ctx.fill();
    // braço com lampião
    ctx.save();ctx.rotate(-.5+Math.sin(t*3)*.2);ctx.strokeStyle='#31424a';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(12,-78);ctx.lineTo(46+sway,-58);ctx.stroke();
    ctx.fillStyle='#5a4a30';ctx.fillRect(40+sway,-66,14,20);ctx.fillStyle='#ffe8a0';ctx.fillRect(43+sway,-62,8,12);ctx.restore();
    ctx.fillStyle='#0e1618';ctx.beginPath();ctx.ellipse(-8,-104,3,2,0,0,7);ctx.ellipse(8,-104,3,2,0,0,7);ctx.fill();
    if(e.phase>=2){ctx.strokeStyle='rgba(230,255,220,.35)';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-72,20+i*12,0,7);ctx.stroke();}}
    if(e.phase>=3){ctx.fillStyle='rgba(240,255,230,.5)';for(let i=0;i<8;i++)ctx.fillRect(rnd(-20,20),rnd(-120,-20),2,2);}
  }else if(e.b==='maquinista'){
    const chug=Math.sin(t*7)*3;
    ctx.fillStyle='#3a2a22';ctx.fillRect(-58,-46,104,40);
    ctx.fillStyle='#2a1e18';ctx.beginPath();ctx.moveTo(-60,-46);ctx.lineTo(-10,-86);ctx.lineTo(40,-86);ctx.lineTo(46,-46);ctx.fill();
    ctx.fillStyle='#1a1412';ctx.beginPath();ctx.moveTo(46,-46);ctx.lineTo(70,-70);ctx.lineTo(70,-46);ctx.fill();
    ctx.fillStyle='#5a3a2a';rr(6,-98,20,20,3);ctx.fill();
    ctx.fillStyle='rgba(200,200,190,.4)';ctx.beginPath();ctx.arc(16,-124-(t*12%18),9,0,7);ctx.arc(10,-140-(t*12%18),7,0,7);ctx.fill();
    for(let i=0;i<3;i++){ctx.fillStyle='#1a1412';ctx.beginPath();ctx.arc(-32+i*26,-24,15,0,7);ctx.fill();
      ctx.strokeStyle='#6a5a40';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-32+i*26,-24,8+t%3,0,7);ctx.stroke();}
    ctx.fillStyle='#e8c84a';ctx.beginPath();ctx.arc(-48,-64,6,0,7);ctx.fill();
    ctx.fillStyle='#ffe89a';ctx.beginPath();ctx.arc(-48,-64,4,0,7);ctx.fill();
    // rosto do maquinista na janela
    ctx.fillStyle='#8aa09a';ctx.beginPath();ctx.arc(-6,-64,9,0,7);ctx.fill();ctx.fillStyle='#1a1412';ctx.fillRect(-14,-72,18,5);
    ctx.fillStyle='#1a1412';ctx.beginPath();ctx.arc(-9,-64,2,0,7);ctx.arc(-2,-64,2,0,7);ctx.fill();
    ctx.fillStyle='#8a1a1a';ctx.fillRect(-18,-54,26,4);
    ctx.strokeStyle='#6a5a40';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-86);ctx.lineTo(0,-98);ctx.stroke();
    if(e.phase>=2){ctx.fillStyle='#5a4a3a';ctx.fillRect(-70,-40,20,8);}
    if(e.phase>=3){ctx.fillStyle='rgba(255,120,40,.5)';ctx.beginPath();ctx.arc(16,-110,10+chug*3,0,7);ctx.fill();}
  }else if(e.b==='peixe_mae'){
    const infl=e.inflate?1+Math.sin(t*6)*.08:1;
    ctx.save();ctx.scale(infl,infl);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2;ctx.fillStyle=i%2?'#b0b0a8':'#c84a3a';
      ctx.beginPath();ctx.arc(Math.cos(a)*54,-64+Math.sin(a)*48,7,0,7);ctx.fill();}
    ctx.fillStyle='#9bb04a';ctx.beginPath();ctx.arc(0,-64,52,0,7);ctx.fill();
    ctx.fillStyle='#d8d890';ctx.beginPath();ctx.ellipse(-6,-42,34,20,0,0,7);ctx.fill();
    for(let i=0;i<12;i++){const a=i*2.1;ctx.fillStyle='#c0405a';ctx.beginPath();ctx.arc(Math.cos(a)*(20+(i%4)*6),-64+Math.sin(a)*(18+(i%3)*6),6,0,7);ctx.fill();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(Math.cos(a)*20-1,-64+Math.sin(a)*18,2,0,7);ctx.fill();}
    blinkEye(-26,-78,10,Math.floor(t*1.5)%4===0,-2,1);eye(-2,-88,5,-1,0,'#a00');
    ctx.fillStyle='#3a1a1a';ctx.beginPath();ctx.ellipse(-36,-48,15,8+Math.abs(Math.sin(t*4))*4,0,0,7);ctx.fill();teeth(-52,-50,32,7,6,false);
    ctx.fillStyle='#5a6a2a';ctx.beginPath();ctx.arc(28,-100,6,0,7);ctx.arc(40,-90,5,0,7);ctx.fill();
    ctx.restore();
  }else if(e.b==='gerente'){
    ctx.fillStyle='#2a2a2e';ctx.fillRect(-34,-70,68,64);
    ctx.fillStyle='#8a1a1a';ctx.beginPath();ctx.moveTo(-4,-70);ctx.lineTo(6,-70);ctx.lineTo(4,-34);ctx.lineTo(-8,-34);ctx.fill();
    ctx.fillStyle='#d8c8b0';ctx.beginPath();ctx.arc(0,-86,15,0,7);ctx.fill();
    ctx.fillStyle='#2a2a28';ctx.fillRect(-16,-90,32,5);ctx.fillStyle='#1a1a18';ctx.fillRect(-14,-94,6,6);ctx.fillRect(8,-94,6,6);
    ctx.fillStyle='#1a1a18';ctx.fillRect(-9,-84,5,3);ctx.fillRect(4,-84,5,3);ctx.fillStyle='#1a1a18';ctx.fillRect(-6,-76,12,3);
    // boca-esteira
    ctx.fillStyle='#0e0e10';rr(-24,-66,48,22,4);ctx.fill();
    for(let i=0;i<5;i++){ctx.fillStyle='#5a5a52';ctx.fillRect(-22+i*9,-62+(t*40+i*9)%14,7,4);}
    ctx.fillStyle='#c8b070';ctx.fillRect(-20,-66,40,3);
    // braços de cano
    ctx.strokeStyle='#5a5a52';ctx.lineWidth=6;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*30,-58);ctx.lineTo(s*44,-34+Math.sin(t*3+s)*5);ctx.stroke();
      ctx.fillStyle='#3a3a36';ctx.fillRect(s*44-6,-34+Math.sin(t*3+s)*5,12,10);}
    if(e.phase>=4){ctx.fillStyle='rgba(255,80,40,.35)';ctx.beginPath();ctx.arc(0,-52,26,0,7);ctx.fill();}
    ctx.fillStyle='#ffe;';if(e.phase>=5){ctx.fillStyle='#e8d070';ctx.font='bold 9px monospace';ctx.fillText('META!!',-20,-106);}
  }else if(e.b==='mare'){
    ctx.restore();drawMare(t,e);return;
  }
  ctx.restore();
}
export function drawMare(t,e){
  // não é bicho: uma parede de água com cara e voz
  const base=H+20,rise=e.rise||0;
  const grd=ctx.createLinearGradient(FIELD_R,0,W,H);
  grd.addColorStop(0,'rgba(20,60,60,.35)');grd.addColorStop(1,'rgba(6,25,30,.9)');
  ctx.fillStyle=grd;ctx.beginPath();
  ctx.moveTo(FIELD_R-30,H);
  for(let x=FIELD_R-30;x<=W;x+=20)ctx.lineTo(x,base-rise-Math.sin(x*.02+t*1.4)*22-Math.sin(x*.008+t*.7)*30);
  ctx.lineTo(W,H);ctx.fill();
  ctx.fillStyle='rgba(180,220,210,.16)';
  for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(W-80+Math.sin(t+i)*20,H-120-i*40-rise,60-i*6,16,0,0,7);ctx.fill();}
  // cara na espuma
  ctx.strokeStyle='rgba(210,235,225,.5)';ctx.lineWidth=3;
  for(const s of[-1,1]){ctx.beginPath();ctx.arc(W-110+s*34,H-230-rise+Math.sin(t*2)*6,22,0,7);ctx.stroke();}
  ctx.beginPath();ctx.arc(W-110,H-170-rise,32,.3,2.84);ctx.stroke();
  ctx.fillStyle='rgba(200,230,220,.6)';ctx.font='9px monospace';ctx.fillText('A MARÉ',W-136,H-300);
  if(e.phase===3){ctx.fillStyle='rgba(230,255,245,.25)';for(let i=0;i<20;i++)ctx.fillRect(rnd(FIELD_R,W),rnd(0,H),2,2);}
}

// =====================================================================
//  MORTES — cada bicho tem o seu remate. Nada de particle burst único.
// =====================================================================
export function deathDur(type){
  return type==='bento'?6:type==='faroleiro'?6:type==='maquinista'?6.5:type==='peixe_mae'?7:type==='gerente'?6.5:type==='mare'?8:
    type==='ova'?2.6:type==='polvo'?2.4:type==='caranguejo'?2.6:type==='passageiro'?2.2:type==='pescador'?2.8:
    type==='bomba'?1.6:type==='baleia'?3.2:type==='agua'?1.8:type==='piranha'?1.6:1.9;
}
export function drawDeath(d){
  const t=d.t,p=t/d.dur;
  ctx.save();ctx.translate(d.x,d.y);
  // squash & stretch: impacto inicial, achatamento final
  const sq=1+Math.sin(p*Math.PI)*0.28*(1-p);
  const sy=1-Math.sin(p*Math.PI)*0.18*(1-p);
  ctx.scale(sq,sy);
  ctx.globalAlpha=clamp(1-Math.max(0,p-.7)/.3,0,1);
  const B=d.type;
  if(B==='baiacu'){ // murcha em bolha vazia que sobe e estoura
    if(t<.9){const s=1-t/.9*.82;ctx.save();ctx.scale(s,s);ctx.strokeStyle='#c8d0a0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-28,22,0,7);ctx.stroke();
      ctx.globalAlpha=1-t/.9;ctx.fillStyle='#9bb04a';ctx.beginPath();ctx.arc(0,-28,20,0,7);ctx.fill();
      ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,-34);ctx.lineTo(-9,-30);ctx.moveTo(-9,-34);ctx.lineTo(-15,-30);ctx.stroke();ctx.restore();}
    else{const by=-28-(t-.9)*46;ctx.strokeStyle='rgba(220,240,220,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,by,6+(t-.9)*6,0,7);ctx.stroke();
      if(t>1.35){ctx.fillStyle='#e8f0e0';ctx.font='10px monospace';ctx.fillText('pop',8,by);}}
  }else if(B==='enguia'){ // nó e afunda
    ctx.save();ctx.translate(0,Math.max(0,(t-.9)*28));ctx.strokeStyle='#15151c';ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(-30,-16);ctx.bezierCurveTo(-6,-40+t*6,26,-40+t*6,10,-16);ctx.bezierCurveTo(-4,4,-18,-30,26,-22);ctx.stroke();
    ctx.fillStyle='#15151c';ctx.beginPath();ctx.ellipse(-32,-16,10,7,0,0,7);ctx.fill();eye(-35,-18,3,0,0,'#e8d020');ctx.restore();
    ctx.fillStyle='#d8d0a0';ctx.font='9px monospace';ctx.fillText('nó.',18,-34);
  }else if(B==='ova'){ // choca um pintinho mutante que foge na tela
    ctx.fillStyle='rgba(230,140,170,.5)';ctx.beginPath();ctx.ellipse(0,-4,30,7,0,0,7);ctx.fill();
    const px=Math.max(0,(t-.35))*300;
    ctx.save();ctx.translate(px,-14);const hop=Math.abs(Math.sin(t*22))*5;ctx.translate(0,-hop);
    ctx.fillStyle='#e8d070';ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();
    ctx.fillStyle='#d84040';ctx.beginPath();ctx.moveTo(8,-2);ctx.lineTo(16,1);ctx.lineTo(8,3);ctx.fill();
    eye(2,-4,2.5,0,0);eye(-3,-4,2.5,0,0,'#a00');eye(1,3,2,0,0,'#a00');
    ctx.strokeStyle='#a87030';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,8);ctx.lineTo(-5,14);ctx.moveTo(3,8);ctx.lineTo(5,14);ctx.stroke();ctx.restore();
    ctx.fillStyle='#f0a0c0';ctx.font='9px monospace';ctx.fillText('PINTINHO? NÃO.',-40,-56);
  }else if(B==='larva'){ctx.fillStyle='#e8e0b0';ctx.beginPath();ctx.ellipse(0,-2,18,3,0,0,7);ctx.fill();
    ctx.fillStyle='#c8c0a0';ctx.font='9px monospace';ctx.fillText('ai',10,-12+(t*10%8));
  }else if(B==='caranguejo'||B==='caranguejo_m'){ // perde as garras e sai andando de lado
    ctx.fillStyle='#7a3020';ctx.beginPath();ctx.ellipse(0,-8,22,8,0,0,7);ctx.fill();
    for(const s of[-1,1]){const cx=s*t*70;ctx.save();ctx.translate(cx,-6);ctx.rotate(s*t*6);ctx.fillStyle='#a0442a';
      ctx.beginPath();ctx.ellipse(0,0,9,5,0,0,7);ctx.fill();ctx.strokeStyle='#8a3a2a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-6,4);ctx.lineTo(-10,8);ctx.moveTo(6,4);ctx.lineTo(10,8);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#d8d0a8';ctx.font='9px monospace';ctx.fillText(B==='caranguejo_m'?'FOLGOU. VINGARÁ.':'FOLGOU',-20,-40);
  }else if(B==='bomba'){ // espirro antes do estouro
    if(t<.45){const s=1+t*.7;ctx.save();ctx.scale(s,s);ctx.fillStyle='#5a7a9a';ctx.beginPath();ctx.arc(0,-26,24,0,7);ctx.fill();
      eye(-12,-30,6,2,0);eye(2,-30,6,-3,0);ctx.restore();
      ctx.fillStyle='#fff';ctx.font='bold 15px Impact,sans-serif';ctx.fillText('ATCHIM!',-28,-58-t*20);}
    else{const r=(t-.45)*150;ctx.strokeStyle=`rgba(255,180,80,${clamp(1-(t-.45),0,1)})`;ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,-26,r,0,7);ctx.stroke();
      ctx.fillStyle='#777';for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(Math.cos(i*1.1)*r*.6,-26+Math.sin(i*1.1)*r*.6,7,0,7);ctx.fill();}
      ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('saúde.',-14,-70);}
  }else if(B==='gaivota'||B==='gaivota_r'){
    ctx.save();ctx.translate(0,Math.min(50,t*40));ctx.rotate(t*7);ctx.fillStyle='#8a9a9a';
    ctx.beginPath();ctx.ellipse(0,-20,18,11,0,0,7);ctx.fill();ctx.fillStyle='#b8c0b8';ctx.beginPath();ctx.moveTo(-4,-20);ctx.lineTo(-34,-36);ctx.lineTo(-10,-12);ctx.fill();ctx.restore();
    ctx.fillStyle='rgba(230,230,230,.5)';ctx.beginPath();ctx.ellipse(18,-30-t*10,12,8,.4,0,7);ctx.fill();
    ctx.fillStyle='#d8d0a0';ctx.font='9px monospace';ctx.fillText(B==='gaivota_r'?'LARGOU TUDO':'NÃO SABIA VOAR',-48,-62);
    if(B==='gaivota_r'){ctx.fillStyle='#7a6a4a';ctx.fillRect(-30,10,24,14);}
  }else if(B==='tatu'){ctx.fillStyle='#5a4630';ctx.beginPath();ctx.ellipse(0,-4,26,10,0,Math.PI,0);ctx.fill();
    ctx.strokeStyle='#8a7a4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,-34);ctx.stroke();
    ctx.fillStyle='#d8d0a0';rr(0,-38,22,12,2);ctx.fill();ctx.fillStyle='#222';ctx.font='bold 9px monospace';ctx.fillText('FUI',4,-29);
  }else if(B==='lata'){ctx.save();ctx.scale(1,Math.max(.3,1-t));ctx.fillStyle='#9aa8a8';rr(-24,-34,48,26,4);ctx.fill();ctx.restore();
    ctx.strokeStyle='#ddd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(6,-12,7,0,7);ctx.stroke();
    ctx.fillStyle='#e8e8d8';ctx.font='bold 10px monospace';ctx.fillText('ABERTO',-22,-42);
  }else if(B==='fantasma'){ctx.globalAlpha=clamp(Math.sin(p*Math.PI)*.9,0,1);ctx.fillStyle='#a8c0b8';
    ctx.beginPath();ctx.ellipse(0,-24,20,16,0,0,7);ctx.fill();
    ctx.strokeStyle='#1a2020';ctx.lineWidth=2;[[-10,-26],[4,-26]].forEach(([ox,oy])=>{ctx.beginPath();ctx.moveTo(ox-3,oy-3);ctx.lineTo(ox+3,oy+3);ctx.moveTo(ox+3,oy-3);ctx.lineTo(ox-3,oy+3);ctx.stroke();});
    ctx.fillStyle='#d8e0d0';ctx.font='9px monospace';ctx.fillText('era pra ser invisível',-52,-50);
  }else if(B==='polvo'){ // garrafas caem, som de reciclagem, alguém agradece
    for(let i=0;i<9;i++){const bx=(i%3-1)*22+Math.sin(t*3+i)*6,by=-30+((t*90+i*14)%54);
      ctx.fillStyle=['#4a7a4a','#7a5a3a','#3a6a7a'][i%3];ctx.fillRect(bx,by,5,13);ctx.fillStyle='#d8d0b0';ctx.fillRect(bx,by-3,5,3);}
    ctx.fillStyle='#6a4a5a';ctx.beginPath();ctx.ellipse(0,-10,16,7,0,0,7);ctx.fill();
    ctx.fillStyle='#e8e0c0';ctx.font='9px monospace';ctx.fillText('RECICLADO.',-22,-58);
  }else if(B==='agua'){ // evapora deixando o formato molhado no chão
    ctx.fillStyle=`rgba(200,230,225,${clamp(1-p,0,1)*.45})`;ctx.beginPath();ctx.ellipse(0,-2,26,7,0,0,7);ctx.fill();
    ctx.globalAlpha=clamp(1-t,0,1);ctx.fillStyle='rgba(220,245,240,.7)';
    ctx.beginPath();ctx.arc(0,-30,14,Math.PI,0);ctx.lineTo(14,-16);ctx.lineTo(-14,-16);ctx.fill();
    ctx.fillStyle='#c8e0d8';ctx.font='8px monospace';ctx.fillText('só a marca',-20,-46);
  }else if(B==='mariposa'){ctx.fillStyle='rgba(180,190,190,.5)';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(-14+i*9,-14-i*3,7,4,i,0,7);ctx.fill();}
    ctx.fillStyle='#e8d9a8';ctx.font='8px monospace';ctx.fillText('teve um fim',-22,-42);
  }else if(B==='sapo'){ // cai no colo do próximo peixe: o próximo leva o tombo
    ctx.fillStyle='#4a5a20';ctx.beginPath();ctx.ellipse(0,-4,18,5,0,0,7);ctx.fill();
    ctx.fillStyle='#6a7a30';ctx.beginPath();ctx.ellipse(20+((t*40)%30),-4-((t*20)%16),10,7,0,0,7);ctx.fill();
    ctx.fillStyle='#e8e0a0';ctx.font='8px monospace';ctx.fillText('desculpa',-18,-30);
  }else if(B==='piranha'){const sb=d.swimBack?Math.min(1,t/.6)*-28:0;ctx.translate(sb,0);
    ctx.fillStyle='#6a5a4a';ctx.beginPath();ctx.ellipse(0,-2,12,3,0,0,7);ctx.fill();
    ctx.fillStyle='#f0ecd0';ctx.font='8px monospace';ctx.fillText('SOZINHA NÃO.',-4, -16+(t*8%10));
  }else if(B==='baleia'){ // cômico-trágico: encalha, o Zé fica calado
    ctx.save();ctx.rotate(.2);ctx.fillStyle='#5a7078';ctx.beginPath();ctx.ellipse(0,-18,40,22,0,0,7);ctx.fill();
    ctx.fillStyle='#3a4a50';ctx.beginPath();ctx.arc(-26,-18,6,0,7);ctx.fill();ctx.restore();
    ctx.fillStyle='#c8d8d8';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-6+i*12,-44-t*8%12,4,0,7);ctx.fill();}
    ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('ELA NÃO SABIA.',-40,-62);
  }else if(B==='pescador'){ // ele tira o boné, agradece e entra no mar
    ctx.fillStyle='#3a5a6a';ctx.fillRect(-8,-26,16,22);
    ctx.fillStyle='#8aa8a0';ctx.beginPath();ctx.ellipse(0,-34,12,10,0,0,7);ctx.fill();
    ctx.fillStyle='#e8c84a';ctx.fillRect(-14,-46,28,4);ctx.fillRect(-8,-54,16,8);
    ctx.fillStyle='#d8e8e0';ctx.font='9px monospace';ctx.fillText('ele acenou',8,-58);
    ctx.strokeStyle='#8aa8a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,-20);ctx.lineTo(-22+(t*20),-8);ctx.stroke();
  }else if(B==='passageiro'){ctx.fillStyle='#3a4a5a';ctx.fillRect(-8,-24,16,20);
    ctx.fillStyle='#5a4a3a';ctx.fillRect(10,-14,16,12);ctx.fillStyle='#d8c8a0';ctx.font='8px monospace';ctx.fillText('sem bagagem',-32,-40);
  }else if(B==='bento'){ /* chefe: tratado em drawBossDeath */ }
  else{ctx.fillStyle='#5a1a2a';ctx.beginPath();ctx.arc(0,-12,14*(1-p*.5),0,7);ctx.fill();}
  ctx.restore();ctx.globalAlpha=1;
}

// =====================================================================
//  MORTE DE CHEFE — 5 a 8 segundos, sem pressa
// =====================================================================
export function drawBossDeath(d){
  const t=d.t,p=t/d.dur;
  ctx.save();ctx.translate(d.x,d.y);
  const sq=1+Math.sin(p*Math.PI)*0.22*(1-p);
  const sy=1-Math.sin(p*Math.PI)*0.14*(1-p);
  ctx.scale(sq,sy);
  const B=d.b;
  if(B==='bento'){ // as botas andam, o chapéu desce, a tatuagem borbulha
    const bx=-t*55;
    ctx.fillStyle='#2a2a30';
    ctx.fillRect(bx-24+Math.sin(t*8)*5,-16,17,15);ctx.fillRect(bx+6-Math.sin(t*8)*5,-16,17,15);
    ctx.fillRect(bx-28+Math.sin(t*8)*5,-5,11,4);ctx.fillRect(bx+2-Math.sin(t*8)*5,-5,11,4);
    ctx.fillStyle='#5a1a2a';ctx.fillRect(bx-20,-20,13,4);ctx.fillRect(bx+7,-20,13,4);
    ctx.fillStyle='#6a7a3a';ctx.beginPath();ctx.ellipse(0,-34,34,17,0,0,7);ctx.fill();
    ctx.fillStyle='#22305a';ctx.font='bold 14px monospace';ctx.fillText('MAMÃE',-28,-30);
    for(let i=0;i<4;i++){ctx.fillStyle='#22305a';ctx.beginPath();ctx.arc(-22+i*14,-44-Math.sin(t*4+i)*6,3,0,7);ctx.fill();}
    const hatY=-64+Math.sin(t*4)*10;
    ctx.fillStyle='#e8c84a';ctx.beginPath();ctx.ellipse(20,hatY,26,6,0,0,7);ctx.fill();ctx.fillRect(6,hatY-16,28,16);
    ctx.fillStyle='#c8a83a';ctx.fillRect(6,hatY-6,28,4);
    ctx.fillStyle='#e8d9a8';ctx.font='10px monospace';
    ctx.fillText('AS BOTAS CONTINUARAM.',-44,-98);
    if(t>2.4)ctx.fillText('O CHAPÉU VOLTOU. O DONO NÃO.',-62,-84);
    if(t>4.2)ctx.fillText('E A TATUAGEM FICOU NA AREIA.',-66,-72);
    ctx.fillStyle='rgba(60,48,90,.5)';for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(rnd(-40,40),rnd(-60,-10)-((t*8)%20),rnd(1,3),0,7);ctx.fill();}
  }else if(B==='faroleiro'){ // a luz sai dele e entra no mar; ele fica pequeno
    const gl=ctx.createRadialGradient(0,-72,4,0,-72,90*(1-p));
    gl.addColorStop(0,'rgba(255,245,190,.55)');gl.addColorStop(1,'rgba(255,245,190,0)');
    ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,-72,90*(1-p),0,7);ctx.fill();
    ctx.fillStyle='#22303a';ctx.beginPath();ctx.moveTo(-20,-4);ctx.lineTo(20,-4);ctx.lineTo(12,-66);ctx.lineTo(-12,-66);ctx.fill();
    ctx.fillStyle='#8aa09a';ctx.beginPath();ctx.arc(0,-78,12*(1-p*.4),0,7);ctx.fill();
    ctx.fillStyle='#0e1618';ctx.beginPath();ctx.arc(0,-82,10*(1-p*.4),Math.PI,0);ctx.fill();
    ctx.fillStyle='#3a3a2a';ctx.fillRect(-30,-4,60,4);
    ctx.fillStyle='#0e0e0c';ctx.beginPath();ctx.arc(30+((t*14)%40),-8,8,0,7);ctx.fill();
    if(t>1.2){ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('A LUZ ENTROU NO MAR.',-52,-100);}
    if(t>3){ctx.fillStyle='#c8d8c0';ctx.font='9px monospace';ctx.fillText('O POSTO FICOU VAZIO. O CHAPÉU TAMBÉM.',-80,-86);}
    ctx.fillStyle=`rgba(255,245,190,${.4*(1-p)})`;ctx.fillRect(-90,-140,180,150);
  }else if(B==='maquinista'){ // descarrilha, apita, as rodas continuam
    ctx.save();ctx.rotate(clamp(t*.5,0,.4));ctx.fillStyle='#3a2a22';ctx.fillRect(-50,-40,90,34);
    ctx.fillStyle='#1a1412';ctx.beginPath();ctx.moveTo(40,-40);ctx.lineTo(60,-60);ctx.lineTo(60,-40);ctx.fill();ctx.restore();
    for(const s of[-1,1]){const cx=s*(30+t*80);ctx.strokeStyle='#6a5a40';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,-10,13,0,7);ctx.stroke();}
    ctx.fillStyle='rgba(200,200,190,.35)';for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(-40+i*24,-52-Math.sin(t*3+i)*14,10+i*2,0,7);ctx.fill();}
    ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('O APITO CONTINUA.',-40,-100);
    ctx.fillStyle='#8a7a5a';ctx.fillRect(-8,-70,16,8);ctx.fillStyle='#e8d070';ctx.fillRect(12,-64,10,4);
    if(t>3)ctx.fillText('NINGUÉM VIU O CONDUTOR.',-52,-86);
  }else if(B==='peixe_mae'){ // explode em 50 peixes: a maternidade
    if(t<1.4){const s=1+t*.4;ctx.save();ctx.scale(s,s);ctx.fillStyle='#9bb04a';ctx.beginPath();ctx.arc(0,-54,48,0,7);ctx.fill();
      ctx.fillStyle='#d8d890';ctx.beginPath();ctx.ellipse(-4,-38,30,18,0,0,7);ctx.fill();ctx.restore();
      ctx.fillStyle='#fff';ctx.font='bold 13px Impact,sans-serif';ctx.fillText('PREPARA...',-38,-110);
    }else{
      for(let i=0;i<50;i++){const a=i*2.39,sp=(t-1.4)*(60+i*3),fx=Math.cos(a)*sp,fy=Math.sin(a)*sp*.55-((t-1.4)*(t-1.4))*25;
        const fxp=fx-((t-1.4)*60);
        ctx.fillStyle=i%3?'#9bb04a':'#c8843a';ctx.beginPath();ctx.ellipse(fxp,fy-24,5,3,0,0,7);ctx.fill();
        ctx.fillStyle='#222';ctx.beginPath();ctx.arc(fxp-2,fy-25,1,0,7);ctx.fill();}
      ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('50 FILHOTES. TODOS COM FOME.',-64,-96);
      if(t>4)ctx.fillText('VOCÊ VIU DE ONDE VINHAM, AGORA.',-64,-82);
    }
  }else if(B==='gerente'){ // a esteira cospe papelada e ele reclama
    ctx.fillStyle='#2a2a2e';ctx.fillRect(-30,-40,60,36);ctx.fillStyle='#0e0e10';ctx.fillRect(-18,-30,36,10);
    for(let i=0;i<12;i++){const px=(i%4)*16-24-Math.sin(t*6+i)*4,py=-20+((t*70+i*11)%60);
      ctx.fillStyle='#e8e0d0';ctx.fillRect(px,py,12,8);ctx.fillStyle='#9a9a90';ctx.fillRect(px,py+2,9,1);}
    ctx.fillStyle='#e8d9a8';ctx.font='9px monospace';ctx.fillText('FORA DO HORÁRIO.',-36,-76);
    if(t>2.4)ctx.fillText('O CRACHÁ VIROU PEIXE.',-36,-62);
    if(t>4.4){ctx.fillStyle='#c8a060';rr(-20,-58,40,22,2);ctx.fill();ctx.fillStyle='#3a2a1a';ctx.font='7px monospace';ctx.fillText('META',-10,-45);}
  }else{ // A MARÉ: não morre, amanhece
    const dawn=clamp(p*1.6,0,1);
    ctx.fillStyle=`rgba(255,180,110,${dawn*.35})`;ctx.fillRect(FIELD_R-100,0,W-FIELD_R+100,H);
    ctx.fillStyle='#e8d9a8';ctx.font='bold 12px monospace';ctx.fillText('AMANHECEU.',-40,-80);
    if(t>2){ctx.fillStyle='#f0e4bd';ctx.fillText('O MAR NÃO FOI EMBORA.',-56,-62);}
    if(t>4){ctx.fillStyle='#c8d8c0';ctx.fillText('ELE SÓ PAROU DE GRITAR.',-56,-46);}
    ctx.fillStyle='rgba(220,240,230,.3)';for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(rnd(-60,60),rnd(-100,-10),rnd(2,5),0,7);ctx.fill();}
  }
  ctx.restore();ctx.globalAlpha=1;
}

