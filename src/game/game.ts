/**
 * game.ts — a simulação.
 *
 * Ondas, inimigos, engenhocas, projéteis, economia e as regras de
 * vitória/derrota. O estado vive em `src/core/state.ts`; o desenho vive
 * em `src/render/`; as telas, em `src/ui/`.
 *
 * Este módulo é o único que pendura métodos em `Game` — é assim que o
 * legado global-scope vira dependência explícita sem reescrever tudo de
 * uma vez.
 */
import {
  COLS,
  COLW,
  FIELD_R,
  H,
  LANES,
  LANE_H,
  LANE_Y0,
  SPAWN_X,
  STRUCTURES,
  VX,
  W,
  chance,
  clamp,
  colX,
  fmt,
  lerp,
  pick,
  plantY,
  randLane,
  rnd,
  shuffle,
} from '../core/constants';
import { addText, burst, canvas, ctx, stain } from '../core/canvas';
import { G, Game, setG } from '../core/state';
import type { Enemy, GameState, Machine, Offer, Phase, Pickup, WaveEntry } from '../core/state';
import type { DailyMod } from '../data/types';
import { dayKey, hashStr, mulberry } from '../core/rng';
import {
  BOSSES,
  DAILY_MODS,
  ENDINGS,
  ENEMY,
  LU_LINES,
  MACH,
  MACH_ORDER,
  MAPS,
  MAP_UNLOCKS,
  RADIO,
  TOQ_LINES,
  UPG,
  ZE_FALAS,
  ZE_RARO,
} from '../data';
import { SaveDB } from '../save/storage';
import { SFX, Snd } from '../audio/audio';
import { UI, openBossIntro } from '../ui/ui';
import { drawField } from '../render/scene';
import { deathDur } from '../render/creatures';
import { availableMachines, eff, isMachUnlocked, machCost, machineAt, structuresAlive } from './economy';



// ---------------------------------------------------------------------
// Utilidades de estado
// ---------------------------------------------------------------------
function announce(text: string, kind?: string): void {
  UI.toast(kind || 'story', text);
}

// ---------------------------------------------------------------------
// Início de partida
// ---------------------------------------------------------------------
Game.titleBackdrop=function(){
  Game.screen='title';
  Game.runOpts=null;
  setG(makeState(0,'title'));
  G.phaseIdx=0;G.phases=[{type:'idle'}];
  G.ze.say='A maré tá subindo. Ainda bem que eu não sei nadar.';G.ze.sayT=999;
  G.luAtWindow=true;G.toqAlive=true;G.zeHat=false;
};

function makeState(mapIndex: number, mode: GameState['mode'], opts?: { daily?: boolean; mods?: DailyMod[] }): GameState {
  const map=MAPS[clamp(mapIndex,0,MAPS.length-1)];
  const e=eff();
  const daily=!!(opts&&opts.daily);
  const dailyMods=(opts&&opts.mods)||[];
  const mods: Record<string, any>={};
  if(daily)for(const m of dailyMods){for(const k in m)if(k!=='id'&&k!=='nome'&&k!=='desc')mods[k]=m[k];}
  const startRes=daily&&mods.scrap?mods.scrap:(mode==='sandbox'?999999:200+e.startScrap);
  const st: GameState={
    mode,map,mapIndex,t:0,scrap:startRes,resMult:(map.resMult||1)*(daily&&mods.res?mods.res:1),
    machines:[],enemies:[],projs:[],pickups:[],parts:[],decals:[],texts:[],winds:[],props:[],deaths:[],hazards:[],
    selected:null,cds:{},phaseIdx:0,phaseT:0,spawnIdx:0,tideT:4,shake:0,flash:0,msg:'',msgT:0,
    over:false,win:false,kills:0,collected:0,destroyed:[],survived:0,
    structures:map.estruturas.map((lane,i)=>lane.map((s,j)=>({...s,alive:true}))),
    ze:{alive:true,say:'',sayT:0,nextSay:12,anim:0,repeat:0},zeSilent:0,zeHat:false,
    luAtWindow:true,toqAlive:true,toqSay:'',toqSayT:0,toqClicks:0,zeClicks:0,toqBoost:0,
    dogSay:0,luTalking:'',
    up:{},unlockedMach:{},dmgBonus:0,shields:e.shield||0,repairBank:e.repair||0,
    boss:null,bossDeath:null,dark:false,darkT:0,
    fireT:0,geladeiraScene:false,pirate:false,radioClicks:0,placementCount:0,cabraCount:0,
    mods,daily,sandbox:mode==='sandbox',dailyMods,
    phases:[],waves:[],weekSeed:0,newSeen:[],
    weather:map.weather,lastSave:Date.now(),
    endingChoice:null
  };
  st.waves=makeWaves(st,daily);
  st.phases=buildPhases(st);
  if(mode==='boss')st.scrap+=50;
  return st;
}
// ondas de campanha: 3, geradas com identidade do mapa
function makeWaves(st: GameState, daily: boolean): WaveEntry[][] {
  const map=st.map,diff=st.mods.hp||1,speed=st.mods.speed||1;
  const rng=daily?mulberry(hashStr(dayKey()+map.id)):Math.random;
  const pool=st.mods.pool||map.pool;
  const waves: WaveEntry[][]=[];
  const counts=daily?[7,13]:[7,13,20];
  for(let w=0;w<(daily?2:3);w++){
    const arr: WaveEntry[]=[];
    let poolW;
    if(w===0) poolW=['baiacu','enguia'];
    else if(w===1) poolW=['baiacu','enguia','caranguejo','ova','polvo','piranha'];
    else poolW=['baiacu','enguia','caranguejo','ova','polvo','piranha','bomba'];
    for(let i=0;i<counts[w];i++){
      const type=poolW[Math.floor(rng()*poolW.length)];
      const lane=Math.floor(rng()*LANES);
      const spacing=w===0?4.2:(w===1?3.0:2.6);
      const time=i*spacing+rng()*1.6;
      arr.push([time,type,lane,1+w*.12]);
    }
    // integração das 3 novas criaturas conforme especificação
    if(w===1){
      arr.push([30,'polvo',Math.floor(rng()*LANES),1.1]);
      for(let k=0;k<4;k++)arr.push([30+rng()*2,'piranha',Math.floor(rng()*LANES),1.1]);
      arr.push([30,'baleia',Math.floor(rng()*LANES),1]);
    }
    if(w===2){
      arr.push([12,'polvo',Math.floor(rng()*LANES),1.1]);
      arr.push([14,'polvo',Math.floor(rng()*LANES),1.1]);
      for(let k=0;k<5;k++)arr.push([18+rng()*4,'piranha',Math.floor(rng()*LANES),1.1]);
      arr.push([45,'baleia',Math.floor(rng()*LANES),1]);
    }
    // exclusivo do mapa aparece na segunda onda
    if(w>=1)for(const t of map.extra)arr.push([4+Math.floor(rng()*(counts[w]*2)),t,Math.floor(rng()*LANES),1.1]);
    if(daily&&st.mods.bossEarly&&w===1)arr.push([counts[w]*2,map.boss,1,1]);
    waves.push(arr.sort((a,b)=>a[0]-b[0]));
  }
  st.enemyHpMult=st.mods.enemyHp||1;st.speedMult=speed;
  return waves;
}
function makeEndlessWave(n: number, pool?: string[], diff?: number): WaveEntry[] {
  const types=(pool||[]).slice();const arr: WaveEntry[]=[];const dur=36+Math.min(14,n*2);
  let count, poolW;
  if(n===0){count=7;poolW=['baiacu','enguia'];}
  else if(n===1){count=13;poolW=['baiacu','enguia','caranguejo','ova','polvo','piranha'];}
  else{count=Math.min(22,9+Math.min(24,n*3));poolW=['baiacu','enguia','caranguejo','ova','polvo','piranha','bomba'];}
  const spc=n===0?4.2:2.6; for(let i=0;i<count;i++)arr.push([i*spc+rnd(0,1.5),pick(poolW),randLane(),1+Math.min(1,n*.09)]);
  // integração das novas criaturas na Noite Infinita
  if(n>=1){
    arr.push([30,'polvo',randLane(),1.1]);
    for(let k=0;k<4;k++)arr.push([30+rnd(0,2),'piranha',randLane(),1.1]);
  }
  if(n>=2){
    arr.push([12,'polvo',randLane(),1.1]);
    arr.push([14,'polvo',randLane(),1.1]);
    for(let k=0;k<5;k++)arr.push([18+rnd(0,4),'piranha',randLane(),1.1]);
    arr.push([45,'baleia',randLane(),1]);
  }
  if(n>=2 && n%3===2)arr.push([dur*.6,'bento',1,1+n*.07]);
  return arr.sort((a,b)=>a[0]-b[0]);
}
function buildPhases(st: GameState): Phase[] {
  if(st.mode==='boss')return[{type:'prep',dur:8,msg:'SÓ VOCÊ E ELE'},
    {type:'bossIntro',dur:2.6},{type:'boss'}];
  if(st.mode==='sandbox'||st.mode==='endless')return[{type:'prep',dur:10,msg:st.mode==='sandbox'?'AREIA LIVRE':'A NOITE NÃO TEM FIM'},
    {type:'wave',n:0},{type:'break'},{type:'wave',n:1}];
  if(st.daily)return[{type:'prep',dur:10,msg:'DESAFIO DO DIA'},{type:'wave',n:0},{type:'break'},{type:'wave',n:1},
    {type:'bossIntro',dur:2.6},{type:'boss'}];
  return[{type:'prep',dur:12,msg:'A MARÉ ESTÁ SUBINDO'},{type:'wave',n:0},
    {type:'break'},{type:'wave',n:1},{type:'break'},{type:'wave',n:2},
    {type:'break'},{type:'prep',dur:15,msg:'RESPIRO'},{type:'bossIntro',dur:2.6},{type:'boss'}];
}

Game.startCampaign=function(mapIndex){
  Snd.init();Snd.resume();Snd.applyVolumes();
  SaveDB.setSlot(SaveDB.slotIndex);
  const idx=clamp(Number(mapIndex)||0,0,MAPS.length-1);
  Game.runOpts={kind:'campaign',map:idx};
  setG(makeState(idx,'campaign'));
  Game.beginRun();
};
Game.continueCampaign=function(){
  const idx=clamp(SaveDB.slot.campaign,0,MAPS.length-1);
  Game.startCampaign(idx);
};
Game.startEndless=function(diff){
  Snd.init();Snd.resume();Snd.applyVolumes();
  const mapIndex=clamp(Number(diff&&diff.map)||0,0,MAPS.length-1);
  const level=Number(diff&&diff.level)||0;
  Game.runOpts={kind:'endless',map:mapIndex,level};
  setG(makeState(mapIndex,'endless'));
  G.endlessDiff=level;
  G.speedMult=1+G.endlessDiff*.15;G.enemyHpMult=1+G.endlessDiff*.2;
  G.waves=[makeEndlessWave(0,MAPS[mapIndex].pool),makeEndlessWave(1,MAPS[mapIndex].pool)];
  Game.beginRun();
};
Game.startBoss=function(mapIndex){
  Snd.init();Snd.resume();Snd.applyVolumes();
  const idx=clamp(Number(mapIndex)||0,0,MAPS.length-1);
  Game.runOpts={kind:'boss',map:idx};
  setG(makeState(idx,'boss'));
  Game.beginRun();
};
Game.startDaily=function(){
  Snd.init();Snd.resume();Snd.applyVolumes();
  const seed=hashStr(dayKey()+(SaveDB.slotIndex+1));
  const rng=mulberry(seed);
  const mods=shuffle(DAILY_MODS.slice()).filter(()=>rng()<.4).slice(0,2);
  const mapIndex=Math.floor(rng()*Math.min(MAPS.length,SaveDB.slot.campaign+1));
  if(!mods.length)mods.push(DAILY_MODS[0]);
  Game.runOpts={kind:'daily'};
  setG(makeState(mapIndex,'campaign',{daily:true,mods}));
  G.dailyMods=mods;G.mode='daily';
  Game.beginRun();
};
Game.startSandbox=function(){
  Snd.init();Snd.resume();Snd.applyVolumes();
  Game.runOpts={kind:'sandbox'};
  setG(makeState(5,'sandbox'));
  Game.beginRun();
};
Game.beginRun=function(){
  Game.paused=false;Game.screen='play';Game.modal=null;
  Game.offers=[];Game.shopItems=[];Game.bossIntro=null;
  Snd.setTrack(G.map.track);Snd.setIntensity(0);Snd.pauseDuck(false);
  UI.hideOverlays();UI.updateTopbar(G);
  if(G.map)announce(G.map.intro||'','story');
  if(G.dailyMods)announce('DESAFIO: '+G.dailyMods.map(m=>m.nome).join(' + ')+' — '+G.dailyMods.map(m=>m.desc).join(' '),'radio');
  announce('Onda de entrada em '+Math.round(G.phases[0].dur||0)+'s. Plante alguma coisa.','radio');
  if(eff().startBoias>0){let placed=0;for(let c=1;c<4&&placed<eff().startBoias;c++){placeMachine('boia',2,c,true);placed++;}}
  SaveDB.seenMach('boia');
};

// ---------------------------------------------------------------------
// Fase / ondas
// ---------------------------------------------------------------------
function currentPhase(): Phase {
  return G.phases[G.phaseIdx] || { type: 'idle' };
}
function announceWave(w: number): void {
  const msg='ONDA '+(w+1);
  announce(msg+' — '+(G.mode==='endless'?'SEM FIM':(w===0?'ELES SENTIRAM O CHEIRO':w===1?'TEM MAIS COISA VINDO':'TUDO QUE O MAR TINHA')),'story');
  Snd.setIntensity(Math.min(4,w+1));
  const rm=RADIO.find(r=>r.map===G.mapIndex&&r.wave===w+1);
  if(rm)setTimeout(()=>{if(G&&Game.screen==='play')announce('RÁDIO: '+rm.txt,'radio');},2200);
  if(G.ze.alive&&w>=1){G.ze.say=pick(['Agora vai.','Segura aí.','Não olha pro mar.']);G.ze.sayT=3.4;}
}
function nextPhase(): void {
  G.phaseIdx++;G.phaseT=0;G.spawnIdx=0;
  const ph=currentPhase();if(!ph){G.phaseIdx--;return;}
  if(ph.type==='wave'){
    if((ph.n||0)>=G.waves.length){
      if(G.mode==='campaign'){G.phases.splice(G.phaseIdx,1,{type:'bossIntro',dur:2.6},{type:'boss'});nextPhase();return;}
      if(G.mode==='endless'||G.mode==='sandbox'){
        const n=G.waves.length;G.waves.push(makeEndlessWave(n,G.map.pool,G.endlessDiff));
        G.phases.splice(G.phaseIdx,1,{type:'break'},{type:'wave',n:n});
        nextPhase();return;
      }
    }
    announceWave(ph.n||0);
  }
  if(ph.type==='break'){openShop();}
  if(ph.type==='bossIntro'){openBossIntro();}
  if(ph.type==='boss'){spawnBoss(G.map.boss,undefined,true);}
}
function advanceFromBreak(): void {
  const ph=currentPhase();
  if(ph.type==='break'){G.phaseIdx++;G.phaseT=0;G.spawnIdx=0;}
  Game.screen='play';Game.modal=null;UI.hideOverlays();UI.updateTopbar(G);
  Snd.pauseDuck(false);Snd.setIntensity(1);
  const w=currentPhase();
  if(w.type==='wave')announceWave(w.n||0);
  if(w.type==='bossIntro')openBossIntro();
}
function updatePhase(dt: number): void {
  const ph=currentPhase();
  if(!ph||ph.type==='idle')return;
  G.phaseT+=dt;
  if(ph.type==='prep'){if(G.phaseT>=(ph.dur||0))nextPhase();}
  else if(ph.type==='bossIntro'){if(G.phaseT>=(ph.dur||0))nextPhase();}
  else if(ph.type==='wave'){
    const list=G.waves[ph.n||0]||[];
    // aviso 2s antes da baleia-filhote
    if(G.spawnIdx<list.length && list[G.spawnIdx][1]==='baleia' && !list[G.spawnIdx]._warned && (list[G.spawnIdx][0]-G.phaseT)<=2){
      list[G.spawnIdx]._warned=true;
      const lane=list[G.spawnIdx][2];
      G.baleiaWarn={lane,t:2};
      G.ze.say='OLHA A BALEIA';G.ze.sayT=2.5;announce('OLHA A BALEIA','story');SFX.alarm();
    }
    if(G.baleiaWarn){G.baleiaWarn.t-=dt;if(G.baleiaWarn.t<=0)G.baleiaWarn=null;}
    while(G.spawnIdx<list.length&&list[G.spawnIdx][0]<=G.phaseT){
      const s=list[G.spawnIdx++];
      if(BOSSES[s[1]])spawnBoss(s[1],s[2]);else spawnEnemy(s[1],s[2],undefined,(s[3]||1)*(G.enemyHpMult||1));
    }
    if(G.spawnIdx>=list.length&&!G.enemies.some(e=>!e.neutral)&&!G.boss){G.survived++;nextPhase();}
  }else if(ph.type==='boss'){
    if(G.bossDeath&&G.bossDeath.t>G.bossDeath.dur)completeMap();
  }
}

// ---------------------------------------------------------------------
// Criaturas
// ---------------------------------------------------------------------
/**
 * Campos que toda criatura tem, comum ou chefe.
 *
 * O legado montava o objeto à mão em dois lugares — e o chefe ficava sem
 * metade dos campos (undefined). A fábrica garante a mesma forma para
 * todo mundo: nenhum código precisa saber se o bicho é chefe.
 */
function baseEnemy(o: {
  type: string;
  lane: number;
  x: number;
  hp: number;
  maxhp: number;
  speed: number;
  dps: number;
  scrap: number;
  r: number;
}): Enemy {
  return {
    type: o.type,
    lane: o.lane,
    x: o.x,
    hp: o.hp,
    maxhp: o.maxhp,
    speed: o.speed,
    dps: o.dps,
    scrap: o.scrap,
    r: o.r,
    anim: rnd(0, 9),
    act: 0,
    kb: 0,
    slow: 0,
    flash: 0,
    eating: null,
    biteT: 0,
    dived: false,
    diveT: rnd(0, 3),
    buff: false,
    enraged: false,
    air: false,
    neutral: false,
    human: false,
    grounded: 0,
    burrow: 0,
    digCd: rnd(2.5, 4.5),
    lit: 0,
    revealed: 0,
    reflectT: 0,
    hypno: 0,
    flee: false,
    carry: 0,
    attached: null,
    grabbed: null,
    jump: 0,
    jumpCd: rnd(2, 4),
    school: 0,
    switching: false,
    switchT: rnd(3, 6),
    saved: false,
    spoke: 'Zé?',
    // Campos de chefe, neutros aqui.
    phase: 0,
    phaseT: 0,
    actT: 0,
    rise: 0,
    darkCd: 0,
    inflate: false,
    inflT: 0,
    maeT: 0,
  };
}

function spawnEnemy(type: string, lane: number, x?: number, scale?: number): Enemy | null {
  if (!ENEMY[type]) return null;
  const d = ENEMY[type];
  const s = scale || 1;
  const e = baseEnemy({
    type,
    lane,
    x: x === undefined ? SPAWN_X + rnd(0, 40) : x,
    hp: d.hp * s,
    maxhp: d.hp * s,
    speed: d.speed * (G.speedMult || 1) * (1 + (s - 1) * 0.25),
    dps: d.dps,
    scrap: d.scrap,
    r: d.r,
  });
  // As traits vêm da definição: `neutral` e `human` dizem o que não se
  // pode matar (ADR 004). Antes elas viviam só no JSON e o bicho em
  // campo nascia sem elas.
  e.air = !!d.air;
  e.neutral = !!d.neutral;
  e.human = !!d.human;
  G.enemies.push(e);
  SFX.enter(type);
  if (!SaveDB.slot.seenB[type]) {
    SaveDB.seenEnemy(type);
    announce('NOVO: ' + d.nome + ' — ' + d.hint, 'ach');
  }
  return e;
}
function spawnBoss(id: string, lane?: number, noIntro?: boolean): void {
  const B=BOSSES[id];if(!B)return;
  if(G.boss)return;
  const hp=B.hp*(G.enemyHpMult||1);
  const e=baseEnemy({
    type:id,
    lane:lane===undefined?1:lane,
    x:SPAWN_X+60,
    hp,
    maxhp:hp,
    speed:B.speed,
    dps:B.dps,
    scrap:0,
    r:B.r,
  });
  e.boss=true;
  e.b=id;
  e.anim=0;
  e.revealed=1;
  e.phase=1;
  e.phaseT=0;
  e.actT=3;
  e.rise=0;
  e.darkCd=6;
  e.inflate=false;
  e.inflT=0;
  e.maeT=0;
  G.enemies.push(e);G.boss=e;G.dark=false;
  SFX.enter(id);Snd.setIntensity(4);
  if(!noIntro)Game.bossIntro={b:id,t:0,dur:2.8,total:B};
  announce((B.nome)+' — '+B.hint,'story');
  SaveDB.seenEnemy(id);
}
function isTargetable(e: Enemy | undefined | null, allowHidden?: boolean): boolean {
  if(!e||e.burrow>0)return false;
  if(e.boss)return true;
  if(ENEMY[e.type]&&ENEMY[e.type].human)return false;
  if(e.neutral)return false;
  if(e.air&&e.lit<=0&&e.grounded<=0)return false;
  if(e.type==='enguia'&&e.dived&&e.lit<=0)return false;
  if(e.type==='fantasma'&&!e.revealed&&e.lit<=0&&!allowHidden)return false;
  if(e.flee)return false;
  return true;
}
function damageEnemy(e: Enemy, dmg: number, src?: string): void {
  if(!e||e.burrow>0)return;
  if(e.neutral)return;
  if(e.boss){damageBoss(e,dmg,src);return;}
  if(e.human||ENEMY[e.type].human||e.type==='pescador'){
    e.revealed=1;e.spoke=pick(['Zé?','Meu barco...','Eu não quero machucar.']);e.act=.5;
    addText(e.x,plantY(e.lane)-e.r-16,'ELE É GENTE','#f0d0a0');SFX.human();return;
  }
  if(e.type==='agua'&&e.lit<=0&&src!=='boom'&&src!=='fire'){e.revealed=1;addText(e.x,plantY(e.lane)-e.r-10,'não é física','#a8c8c8');return;}
  if(e.buff)dmg*=.4;
  if(e.type==='lata'&&src==='toast'){ /* torradeira nem chega a chamar */ }
  e.hp-=dmg;e.flash=.18;e.act=.25;e.revealed=1.2;e.lit=Math.max(e.lit,.4);
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e: Enemy, noChain?: boolean): void {
  if(e&&e.type==='baleia')return;
  const i=G.enemies.indexOf(e);if(i<0)return;G.enemies.splice(i,1);
  if(e.type==='mare')return;
  G.kills++;if(e.type!=='baleia'&&e.type!=='pescador')G.collected+=0;
  const y=plantY(e.lane);
  const ichor=e.type==='enguia'?'#1b1b22':e.type==='ova'?'#e07a9a':e.type==='lata'?'#6a8a9a':e.type==='polvo'?'#5a3a52':'#5a1a2a';
  stain(e.x+rnd(-8,8),y+rnd(0,10),ichor,e.boss?50:undefined);
  burst(e.x,y-e.r*.8,e.boss?40:6,ichor,140,500,3,.5);
  if(ENEMY[e.type].scrap>0)dropScrap(e.x,y-e.r,Math.round(ENEMY[e.type].scrap*(1+eff().luck)*(G.resMult||1)),true);
  const _swimBack = e.type==='piranha' && !G.enemies.some(o=>o!==e&&o.type==='piranha'&&o.lane===e.lane);
  G.deaths.push({type:e.type,x:e.x,y,lane:e.lane,t:0,dur:deathDur(e.type),dir:Math.random()<.5?-1:1,swimBack:_swimBack});
  SFX.death(e.type);
  if(noChain)return;
  if(e.type==='ova'){for(let k=0;k<3;k++){const l=spawnEnemy('larva',e.lane,e.x+rnd(-20,20));if(l)l.kb=rnd(-70,110);}
    addText(e.x,y-20,'PINTINHO? NÃO.','#f0a0c0');}
  else if(e.type==='bomba'){explode(e.x,e.lane,70,100);}
  else if(e.type==='sapo'){const near=G.enemies.filter(o=>o.lane===e.lane&&Math.abs(o.x-e.x)<90)[0];
    if(near){damageEnemy(near,35,'splat');addText(e.x,y-34,'COLO DE ALGUÉM','#c8d070');}}
  else if(e.type==='caranguejo_m'){for(const o of G.enemies)if(o.type==='caranguejo'&&Math.abs(o.x-e.x)<220){o.rage=7;o.speed*=1.5;addText(o.x,plantY(o.lane)-40,'VINGANÇA','#e0a040');}}
  else if(e.type==='baleia'){G.zeSilent=1;G.ze.say='...';G.ze.sayT=4;SaveDB.achievement('baleia');announce('O ZÉ NÃO VAI FALAR NESSA ONDA.','story');}
}
function steal(p: Pickup, e: Enemy): void {
  e.carry+=p.v;e.flee=true;e.act=.6;e.revealed=1;
  const i=G.pickups.indexOf(p);if(i>=0)G.pickups.splice(i,1);
  SFX.steal();addText(p.x,p.y-12,'-'+p.v,'#e08080');
}
function explode(x: number, lane: number, dmgE: number, dmgM: number, big?: boolean): void {
  SFX.explode();G.shake=Math.max(G.shake,big?18:10);
  burst(x,plantY(lane)-30,big?60:36,'#ffb040',big?460:360,200,rnd(4,9),.6);
  burst(x,plantY(lane)-30,big?40:26,'#333',160,-60,rnd(5,10),1.2);
  stain(x,plantY(lane),'#1a1410',big?60:46);
  for(const e of [...G.enemies])if(Math.abs(e.lane-lane)<=1&&Math.abs(e.x-x)<COLW*1.6)damageEnemy(e,dmgE,big?'boom':'boom');
  for(const m of [...G.machines])if(Math.abs(m.lane-lane)<=1&&Math.abs(m.x-x)<COLW*1.6&&!m.dead)damageMachine(m,dmgM);
}
function damageBoss(e: Enemy, dmg: number, src?: string): void {
  if(e.b==='mare'){addText(e.x-30,plantY(1)-160,'NÃO DÁ','#c8e0d8');return;}
  if(e.inflate)dmg*=.15;
  e.hp-=dmg;e.flash=.16;e.act=.3;
  if(e.hp<=0&&!G.bossDeath){bossDefeated(e);}
}

// ---------------------------------------------------------------------
// Engenhocas
// ---------------------------------------------------------------------
function placeMachine(k: string, l: number, c: number, freeGift?: boolean): boolean {
  if(!MACH[k]||k==='remover')return false;
  if(machineAt(l,c))return false;
  const discountFree=freeGift||G.sandbox;
  if(!discountFree){
    if(!isMachUnlocked(k)){addText(colX(c),plantY(l)-60,'trancado','#c88');return false;}
    if(G.scrap<machCost(k)){addText(colX(c),plantY(l)-60,'sucata de menos','#c88');return false;}
    if((G.cds[k]||0)>0)return false;
    G.scrap-=machCost(k);G.cds[k]=MACH[k].cd;
  }
  const hpBonus=1+(eff().machineHp||0)+(G.hpBonus||0);
  const hp=Math.round(MACH[k].hp*hpBonus);
  const m={type:k,lane:l,col:c,x:colX(c),hp,maxhp:hp,t:rnd(0,3),timer:0,anim:0,act:0,flash:0,jam:0,
    variant:k==='coisa_ze'?pick(['torradeira','ventilador','radio','boia','bujao','holofote']):null};
  G.machines.push(m);SFX.place();burst(m.x,plantY(l),10,'#8a7a5a',120,400,3,.5);
  SaveDB.seenMach(k);G.placementCount++;
  if(G.sandbox&&G.placementCount>=50)if(SaveDB.achievement('sandbox50'))announce('CONQUISTA: testador de gambiarra','ach');
  if(G.map.id==='cemiterio'&&G.machines.filter(x=>x.type==='geladeira'||x.type==='geladeira_bomba').length>=6&&!G.geladeiraScene){
    G.geladeiraScene=true;SaveDB.achievement('geladeiras');announce('SEIS GELADEIRAS. A DONA LÚ OLHOU. NINGUÉM FALA DISSO.','ach');SFX.laugh();
  }
  return true;
}
function damageMachine(m: Machine, d: number): void {if(m.dead)return;m.hp-=d;m.flash=.15;m.act=.2;if(m.hp<=0)destroyMachine(m,true);}
function destroyMachine(m: Machine, violent?: boolean): void {
  if(m.dead)return;m.dead=true;
  if(!G.firstPieceLost){G.firstPieceLost=true;announce('Sua peça caiu. Planta outra ali.','story');}
  const i=G.machines.indexOf(m);if(i>=0)G.machines.splice(i,1);
  for(const e of G.enemies){if(e.eating===m)e.eating=null;if(e.attached===m){e.attached=null;e.grabbed=null;}}
  if(violent){
    SFX.metal();burst(m.x,plantY(m.lane)-25,20,'#9a9a8a',220,500,rnd(2,6),.9);
    dropScrap(m.x,plantY(m.lane)-25,Math.round(machCost(m.type)*.4),true);
    if(m.type==='bujao')explode(m.x,m.lane,150+40*(G.up.bujao||0),25);
    if(m.type==='coisa_ze'&&m.variant==='bujao')explode(m.x,m.lane,120,20);
    if(m.type==='geladeira_bomba')explode(m.x,m.lane,170,60,true);
  }
}
function upgradeMachine(k: string): boolean {
  if(!UPG[k])return false;
  G.up[k]=Math.min(3,(G.up[k]||0)+1);
  if(k==='geladeira')for(const m of G.machines)if(m.type==='geladeira'){const bonus=Math.round(MACH.geladeira.hp*(1+.6*(G.up[k]-1)));m.hp+=bonus-m.maxhp;m.maxhp=bonus;m.act=.5;}
  for(const m of G.machines)if(m.type===k){m.act=.6;}
  addText(480,300,'+ '+(UPG[k][G.up[k]-1]||''),'#e8c84a');SFX.level();
  announce('ZÉ: enfiei '+UPG[k][G.up[k]-1]+' na '+MACH[k].nome+'.','story');
  return true;
}
function dropScrap(x: number, y: number, v: number, auto?: boolean): void {G.pickups.push({x,y,v:Math.max(1,Math.round(v)),auto:!!auto,life:14,t:0,fly:false,vy:auto?-120:0,bob:rnd(0,6)});}
function collect(p: Pickup): void {p.fly=true;SFX.pickup();}

// ---------------------------------------------------------------------
// Atualização
// ---------------------------------------------------------------------
export function update(dt: number){
  if(!G)return;
  G.t+=dt;
  // ambiente e cenário continuam vivos mesmo no menu
  for(const d of G.deaths)d.t+=dt;
  G.deaths=G.deaths.filter(d=>d.t<d.dur);
  for(const p of G.props){p.anim+=dt;p.x-=26*dt;}G.props=G.props.filter(p=>p.x>-50);
  for(const w of G.winds){w.x+=w.vx*dt;w.life-=dt;}G.winds=G.winds.filter(w=>w.life>0);
  for(const q of G.parts){q.vx*=Math.exp(-1.5*dt);q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;}
  G.parts=G.parts.filter(q=>q.life>0);
  for(const tx of G.texts){tx.y-=30*dt;tx.life-=dt;}G.texts=G.texts.filter(tx=>tx.life>0);
  for(const s of G.structures)for(const st of s)if(!st.alive&&Math.random()<dt*.6)G.parts.push({x:st===s[0]?58:126,y:plantY(G.structures.indexOf(s))-20,vx:rnd(-6,6),vy:rnd(-18,-8),life:rnd(1,2),max:2,color:'rgba(90,85,75,.5)',size:rnd(3,7),g:-8});
  if(G.ze.sayT>0)G.ze.sayT-=dt;
  if(G.toqSayT>0)G.toqSayT-=dt;
  G.toqBoost=Math.sin(G.t*.8)*10;
  G.shake*=Math.exp(-6*dt);G.flash=Math.max(0,G.flash-dt*1.5);G.msgT-=Math.max(0,dt);

  if(Game.screen!=='play'||Game.paused)return;
  if(Game.bossIntro&&Game.bossIntro.t<Game.bossIntro.dur){Game.bossIntro.t+=dt;if(Game.bossIntro.t>=Game.bossIntro.dur){Game.bossIntro=null;if(currentPhase().type==='bossIntro'){G.phaseIdx++;G.phaseT=0;spawnBoss(G.map.boss,undefined,true);}}return;}
  if(G.bossDeath){G.bossDeath.t+=dt;if(G.bossDeath.t>G.bossDeath.dur)completeMap();return;}

  updatePhase(dt);
  G.tideT-=dt;
  if(G.tideT<=0){G.tideT=G.map.weather==='rain'?3.5:6;const l=randLane();dropScrap(rnd(FIELD_R-60,FIELD_R),plantY(l)-20,Math.round(25*(G.resMult||1)),false);}
  G.scrap += 8*dt;
  for(const k in G.cds)G.cds[k]=Math.max(0,G.cds[k]-dt);

  // Zé e NPCs
  if(!G.zeSilent&&G.ze.alive){G.ze.nextSay-=dt;if(G.ze.nextSay<=0){G.ze.say=pick(ZE_FALAS);G.ze.sayT=4;G.ze.nextSay=rnd(16,26);}G.ze.anim+=dt;}
  else G.ze.anim+=dt*.2;
  if(G.luAtWindow&&chance(dt*.05)){G.luTalking=pick(LU_LINES);setTimeout(()=>{if(G)G.luTalking='';},2600);}
  if(G.toqAlive&&chance(dt*.04)){G.toqSay=pick(TOQ_LINES);G.toqSayT=3;}

  updateWeatherMech(dt);
  updateLights(dt);
  updateMachines(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateBossSpecials(dt);
  updateHazards(dt);
  updatePickups(dt);
  updateAmbientAchievements();

  if(G.hitsThisSecond===undefined)G.hitsThisSecond=0;
}
function updateWeatherMech(dt: number): void {
  const w=G.map.weather;
  if(w==='rain'){G.fireT=(G.t%12<6)?1:0;}
  else G.fireT=1;
  if(w==='fog')G.fog=true;
  if(w==='gale'){for(const p of G.projs)p.x-=14*dt;for(const e of G.enemies)e.x-=4*dt;}
  if(w==='ash')G.ash=true;
}
function updateLights(dt: number): void {
  for(const e of G.enemies)e.lit=0;
  for(const m of G.machines){
    if(m.jam>0){m.jam-=dt;continue;}
    const isHolo=m.type==='holofote'||(m.type==='coisa_ze'&&m.variant==='holofote');
    if(!isHolo)continue;
    const reach=COLW*(3+.5*(G.up.holofote||0));
    for(const e of G.enemies){
      if(e.lane!==m.lane||e.x<m.x-20||e.x>m.x+reach)continue;
      e.lit=.28;e.slow=Math.max(e.slow,.3);
      if(e.air&&e.grounded<=0){e.air=false;e.grounded=4;e.act=.5;burst(e.x,plantY(e.lane)-40,8,'#b8b0a0',120,400,3,.6);}
      if(e.type==='enguia')e.dived=false;
      if(e.type==='tatu')e.digCd=Math.max(e.digCd,1.4);
      if(e.type==='fantasma')e.revealed=Math.max(e.revealed,.4);
      if(e.type==='mariposa'){e.act=.4;damageEnemy(e,10,'light');}
      if(e.type==='agua')e.act=.4;
    }
  }
}
function nearMach(m: Machine, type: string): boolean {return G.machines.some(o=>o!==m&&o.lane===m.lane&&o.type===type&&Math.abs(o.x-m.x)<COLW*1.2);}
function updateMachines(dt: number): void {
  const slow=G.map.weather==='ash'?1.15:1;
  for(const m of G.machines){
    if(m.dead)continue;
    m.t+=dt;m.anim=Math.max(0,m.anim-dt);m.act=Math.max(0,m.act-dt);m.flash=Math.max(0,m.flash-dt);
    if(m.grabbed!=null){m.grabbed-=dt;if(m.grabbed<=0){destroyMachine(m,true);}continue;}
    if(m.jam>0)continue;
    m.timer+=dt*slow;
    const kind=(m.type==='coisa_ze'?m.variant:m.type)||m.type;
    const up=kind==='coisa_ze'?0:(G.up[kind]||0);
    if(kind==='boia'){
      const every=(9-1.6*up)*(nearMach(m,'ima')?.7:1);
      if(m.timer>every){m.timer=0;m.act=.6;m.anim=.5;dropScrap(m.x+rnd(-24,24),plantY(m.lane)-50,25+10*up,false);
        if(m.type==='coisa_ze')dropScrap(m.x,plantY(m.lane)-60,30,false);SFX.pop();}
    }else if(kind==='torradeira'){
      const reach=G.map.id==='fog'?W:W;
      const tgt=G.enemies.some(e=>e.lane===m.lane&&e.x>m.x+10&&e.x<reach+10&&isTargetable(e));
      const rate=(1.4-.14*up)*(m.type==='coisa_ze'?1.1:1);
      if(tgt&&m.timer>rate){m.timer=0;m.anim=.3;m.act=.35;SFX.shoot();
        const n=1+(up>=2?1:0);
        for(let i=0;i<n;i++)G.projs.push({x:m.x+16+i*8,y:plantY(m.lane)-38,lane:m.lane,vx:330*(G.map.weather==='fog'?.86:1),dmg:(20+5*up)*(1+G.dmgBonus),rot:0,kind:'toast',enemy:false});
      }
    }else if(kind==='lancador_lata'){
      const reach=W;
      const tgt=G.enemies.some(e=>e.lane===m.lane&&e.x>m.x+10&&e.x<reach+10&&isTargetable(e));
      const rate=2.0-.15*up;
      if(tgt&&m.timer>rate){m.timer=0;m.anim=.4;m.act=.4;SFX.metal();
        const n=1+(up>=2?1:0);
        for(let i=0;i<n;i++)G.projs.push({x:m.x+18+i*10,y:plantY(m.lane)-40,lane:m.lane,vx:280,dmg:(35+8*up)*(1+G.dmgBonus),rot:0,kind:'lata_proj',enemy:false});
      }
    }else if(kind==='ventilador'){
      if(m.timer>3-.25*up){
        const ahead=G.enemies.filter(e=>e.lane===m.lane&&e.x>m.x&&e.x<m.x+3*COLW&&e.burrow<=0&&!isMachGrabbed(e));
        if(ahead.length){m.timer=0;m.anim=.8;m.act=.8;SFX.gust();
          const doubled=nearMach(m,'radio');
          for(const e of ahead){
            if(e.air){e.air=false;e.grounded=4;e.act=.6;burst(e.x,plantY(e.lane)-40,8,'#b8b0a0',120,400,3,.6);}
            const f=e.boss?60:(360+120*up)*(e.hypno>0?2:1);e.kb+=f;e.slow=1.3;
            if(doubled&&!e.boss&&e.type!=='pescador'){e.hypno=Math.max(e.hypno,.8);}
          }
          for(let i=0;i<6;i++)G.winds.push({x:m.x+30,y:plantY(m.lane)-rnd(10,55),life:rnd(.5,.9),vx:rnd(300,500)});}
      }
    }else if(kind==='holofote'){
      if(m.timer>2.6){m.timer=0;m.act=.5;SFX.light();}
    }else if(kind==='ima'){
      if(m.timer>1.2){m.timer=0;m.act=.4;const r=COLW*(1.1+.3*up);
        for(const p of G.pickups)if(!p.fly&&Math.abs(p.x-m.x)<r&&Math.abs(p.y-plantY(m.lane))<LANE_H)collect(p);}
    }else if(kind==='radio'){
      if(m.timer>11-up){
        const cand=G.enemies.filter(e=>!e.boss&&e.type!=='pescador'&&e.burrow<=0&&!e.flee&&Math.abs(e.x-m.x)<COLW*3.5&&isTargetable(e));
        if(cand.length){m.timer=0;m.act=1;SFX.hypno();
          if(nearMach(m,'radio')){for(const e of cand)if(Math.abs(e.x-m.x)<COLW*2.5){e.hypno=2.2;e.act=1;e.eating=null;}}
          else{const e=cand.sort((a,b)=>a.x-b.x)[0];e.hypno=2.2;e.act=1;e.eating=null;addText(e.x,plantY(e.lane)-e.r-22,'OUVINDO RÁDIO','#d8c0e0');}
          if(G.enemies.some(e=>e.type==='pescador'&&Math.abs(e.x-m.x)<COLW*3))redirectPescador();
        }
      }
    }else if(kind==='estilingue'){
      if(m.timer>3.2-.3*up){const tgt=G.enemies.find(e=>e.lane===m.lane&&e.x>m.x+20&&isTargetable(e)&&Math.abs(e.x-m.x)<W);
        if(tgt){m.timer=0;m.act=.5;SFX.can();G.projs.push({x:m.x+10,y:plantY(m.lane)-52,lane:m.lane,vx:520,dmg:(45+12*up)*(1+G.dmgBonus),rot:0,kind:'can',silent:true,enemy:false});}}
    }else if(kind==='aspirador'){
      if(m.timer>2.6){const cand=G.enemies.filter(e=>!e.boss&&e.type!=='pescador'&&e.burrow<=0&&e.x>m.x&&e.x<m.x+2*COLW&&ENEMY[e.type]&&ENEMY[e.type].hp<150&&!e.neutral);
        if(cand.length){m.timer=0;m.act=.7;SFX.gust();
          for(const e of cand){e.kb-=140+40*up;e.slow=.8;if(nearMach(m,'bujao'))e.kb-=90;}
          burst(m.x+20,plantY(m.lane)-20,8,'rgba(180,200,190,.5)',100,-40,3,.4);}
      }
    }else if(kind==='batedeira'){
      if(m.timer>.6){m.timer=0;m.act=.3;
        for(const e of G.enemies)if(e.lane===m.lane&&e.x>m.x-20&&e.x<m.x+COLW*.9&&isTargetable(e)){damageEnemy(e,9+4*up,'blade');SFX.hit();}
      }
    }else if(kind==='espelho'){
      if(m.timer>.9){m.timer=0;m.act=.4;
        for(const p of G.projs)if(p.enemy&&p.lane===m.lane&&p.x>m.x-40&&p.x<m.x+60){const i=G.projs.indexOf(p);if(i>=0)G.projs.splice(i,1);
          G.projs.push({x:m.x+20,y:p.y,lane:p.lane,vx:380,dmg:18,kind:'mirror',enemy:false});SFX.reflect();break;}
      }
    }else if(kind==='pneu'){
      const burning=G.fireT>0;
      if(m.timer>.7){m.timer=0;m.act=.3;
        if(burning)for(const e of G.enemies)if(e.lane===m.lane&&e.x>m.x-10&&e.x<m.x+(nearMach(m,'ventilador')?2.4:1.4)*COLW)damageEnemy(e,6+3*(G.up.pneu||0),'fire');
      }
    }else if(kind==='aranha'){
      if(m.timer>3.6){const tgt=G.enemies.filter(e=>e.x>m.x+10&&isTargetable(e));
        if(tgt.length){m.timer=0;m.act=.4;SFX.shoot();
          for(let l=0;l<LANES;l++)G.projs.push({x:m.x+10,y:plantY(l)-40,lane:l,vx:420,dmg:(13+4*(G.up.aranha||0))*(1+G.dmgBonus),rot:0,kind:'can',silent:true,enemy:false});}
      }
    }else if(kind==='cachorro'){
      if(m.timer>3.2){const small=G.enemies.filter(e=>e.lane===m.lane&&e.x>m.x&&e.x<m.x+2.2*COLW&&!e.boss&&!e.neutral&&ENEMY[e.type]&&ENEMY[e.type].hp<120);
        if(small.length){m.timer=0;m.act=.6;SFX.lata();for(const e of small)e.kb+=120;G.dogSay=.6;}
        if(G.enemies.some(e=>e.type==='pescador'&&Math.abs(e.x-m.x)<COLW*2.5)&&(nearMach(m,'radio')||chance(.35)))redirectPescador();
      }
    }
  }
  for(const m of G.machines)if(m.act===0&&m.jam<=0)m.jam=0;
  if(G.machines.length!==G.machines.filter(m=>!m.dead).length)G.machines=G.machines.filter(m=>!m.dead);
}
function isMachGrabbed(e: Enemy): boolean {return e.grabbed!=null;}
function redirectPescador(): void {
  const e=G.enemies.find(o=>o.type==='pescador'&&!o.saved);
  if(!e)return;
  e.saved=true;e.flee=true;e.spoke='...obrigado.';e.speed=34;e.act=1;
  addText(e.x,plantY(e.lane)-80,'ELE LEMBROU','#a8d8b0');SFX.human();
  if(SaveDB.achievement('pescador'))announce('CONQUISTA: ele lembrou. Ninguém morreu dessa vez.','ach');
  dropScrap(e.x,plantY(e.lane)-30,80,true);
  G.ze.say='Ele ainda sabia voltar.';G.ze.sayT=4;
}
function damageBossByFire(e){}
function updateEnemies(dt: number): void {
  for(let n=G.enemies.length-1;n>=0;n--){
    const e=G.enemies[n];if(!e)continue;
    if(e.hp<=0){if(e.boss)continue;G.enemies.splice(n,1);continue;}
    e.anim+=dt;e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.act=Math.max(0,e.act-dt);
    e.revealed=Math.max(0,e.revealed-dt);e.grounded=Math.max(0,e.grounded-dt);e.reflectT=Math.max(0,e.reflectT-dt);
    if(e.jump!==undefined&&e.jump>0)e.jump=Math.max(0,e.jump-dt);
    if(e.boss){updateBossBase(e,dt);continue;}
    if(e.type==='enguia'){e.diveT+=dt;e.dived=e.lit<=0&&(e.diveT%3.5)>2.2;}
    if(e.type==='caranguejo')e.buff=G.enemies.some(o=>o!==e&&o.type==='caranguejo'&&o.lane===e.lane&&Math.abs(o.x-e.x)<240);
    if(e.rage>0){e.rage-=dt;}
    if(e.type==='piranha')e.school=G.enemies.filter(o=>o.type==='piranha'&&Math.abs(o.x-e.x)<200&&o.lane===e.lane).length;
    if(e.type==='polvo'&&e.attached)continue;
    if(e.type==='tatu'){
      if(e.burrow>0){e.burrow-=dt;
        if(!e.dug&&e.burrow<.6){e.dug=true;const from=e.x;e.x-=rnd(2,3)*COLW;
          burst(from,plantY(e.lane),14,'#6a5a3a',150,400,4,.6);burst(e.x,plantY(e.lane),14,'#6a5a3a',150,-100,4,.8);
          stain(e.x,plantY(e.lane)+4,'#3a2e1e',26);SFX.dig();}
        if(e.burrow<=0){e.burrow=0;e.digCd=rnd(5,8);e.act=.5;}
        continue;}
      e.digCd-=dt;if(e.digCd<=0&&e.x>VX+2*COLW&&e.lit<=0){e.burrow=1.1;e.dug=false;e.act=.6;e.digCd=999;}
    }
    if(e.type==='fantasma'){
      for(const p of [...G.pickups])if(!p.fly&&!p.auto&&Math.abs(p.x-e.x)<40&&Math.abs(p.y-(plantY(e.lane)-20))<80){steal(p,e);break;}
      if(e.flee){e.x+=e.speed*1.7*dt;if(e.x>SPAWN_X){G.enemies.splice(n,1);addText(W-100,plantY(e.lane)-50,'LEVOU '+e.carry,'#e08080');}continue;}
    }
    if(e.type==='pescador'&&e.saved){e.x+=e.speed*dt;if(e.x>W+60){G.enemies.splice(n,1);dropScrap(200,plantY(1)-40,40,true);}continue;}
    if(e.hypno>0){e.hypno-=dt;e.eating=null;e.x+=13*dt;e.act=.3;continue;}
    if(e.type==='passageiro'){
      e.switchT-=dt;
      if(e.switchT<.8)e.switching=true;
      if(e.switchT<=0){e.switchT=rnd(4,7);e.switching=false;let nl=randLane();if(nl===e.lane)nl=(nl+1)%LANES;e.lane=nl;e.y=plantY(nl);SFX.lata();burst(e.x,plantY(nl),6,'#8a9a8a',100,300,3,.4);}
    }
    if(e.type==='sapo'){
      e.jumpCd-=dt;if(e.jumpCd<=0){e.jumpCd=rnd(3,4.6);e.jump=.5;e.x-=2*COLW;e.act=.6;SFX.pop();}
    }
    if(e.type==='gaivota_r'&&e.grabbed!=null){e.x+=e.speed*dt;continue;}
    if(e.kb!==0){e.x+=e.kb*dt;e.kb*=Math.exp(-5*dt);if(Math.abs(e.kb)<2)e.kb=0;e.x=Math.min(e.x,SPAWN_X+40);}
    // contato com máquinas
    let blocked: Machine|null=null;
    // A Baleia-Filhote não é alvo, mas pisa nas peças e quebra: ela é
    // visita, não bicho. (O Pescador é gente: não bloqueia, não quebra.)
    if(!(e.air&&e.grounded<=0)&&e.type!=='pescador'&&!e.saved){
      for(const m of G.machines){if(m.lane!==e.lane||m.dead)continue;
        if(e.x-e.r*.8<=m.x+22&&e.x>=m.x-8){blocked=m;break;}}
    }
    if(blocked){
      if(e.type==='polvo'){e.attached=blocked;blocked.jam=4.5;e.act=1;SFX.metal();G.ze.say='Ele desligou a geladeira.';G.ze.sayT=3;continue;}
      if(e.type==='gaivota_r'){e.grabbed=blocked;blocked.grabbed=1.6;e.act=1;SFX.steal();G.ze.say='Tá levando a peça.';G.ze.sayT=3;continue;}
      if(blocked.type==='bujao'){destroyMachine(blocked,true);continue;}
      if(e.type==='bomba'){explode(e.x,e.lane,40,110);killEnemy(e,true);G.enemies.splice(G.enemies.indexOf(e),1);continue;}
      if(e.type==='baleia'){damageMachine(blocked,30*dt);e.eating=blocked;continue;}
      e.eating=blocked;e.biteT+=dt;e.act=.2;
      damageMachine(blocked,e.dps*(e.buff?.7:1)*dt);
      if(e.biteT>.55){e.biteT=0;SFX.bite();burst(blocked.x,plantY(e.lane)-30,3,'#8a8a7a',80,400,2,.4);}
    }else{
      e.eating=null;
      const sp=e.speed*(e.slow>0?.45:1)*(e.type==='piranha'&&e.school>=3?2.0:1)*(1+(e.rage?0:0));
      e.x-=sp*dt;
      if(e.type==='baleia'&&e.x<VX+20){G.enemies.splice(n,1);G.ze.say='Ela não sabia.';G.ze.sayT=4;
        addText(VX+20,plantY(e.lane)-60,'ELA NÃO SABIA.','#e8d9a8');
        SaveDB.achievement('baleia_ok');announce('A BALEIA-FILHOTE PASSOU. NINGUÉM MORREU.','radio');continue;}
      if(e.x<VX+8&&e.type!=='baleia')breach(e);
    }
  }
  G.enemies=G.enemies.filter(e=>e);
}
function updateBossBase(e: Enemy, dt: number): void {
  e.anim+=dt;e.flash=Math.max(0,e.flash-dt);e.phaseT+=dt;e.actT-=dt;
  const frac=e.hp/e.maxhp;
  const wantPhase=e.b==='gerente'?clamp(1+Math.floor((1-frac)*7),1,7):frac>.66?1:frac>.33?2:3;
  if(wantPhase>e.phase){e.phase=wantPhase;e.act=1;G.shake=12;SFX.enter(e.b);Snd.setIntensity(4);
    addText(e.x,plantY(e.lane)-140,'FASE '+e.phase,'#e8c84a');G.flash=.4;}
  if(e.b==='mare'){e.rise=clamp(e.phaseT/120,0,1)*100;e.hp=e.maxhp;e.actT-=dt;
    if(e.actT<=0){e.actT=rnd(2.2,3.4);const lane=randLane();const t=pick(['baiacu','enguia','piranha','polvo','agua','fantasma']);spawnEnemy(t,lane,SPAWN_X+rnd(0,80),1.2);}
    e.maeT=(e.maeT||0)+dt;if(e.maeT>120){bossDefeated(e);}return;}
  // movimento e ataque corpo a corpo
  if(e.breachCd>0)e.breachCd-=dt;
  let blocked: Machine|null=null;
  for(const m of G.machines){if(m.lane!==e.lane||m.dead)continue;if(e.x-e.r*.8<=m.x+24&&e.x>=m.x-10){blocked=m;break;}}
  if(blocked){e.eating=blocked;blocked.grabbed=undefined;damageMachine(blocked,e.dps*dt*.5);
    if(e.b==='bento'&&!e.ate&&blocked.maxhp){e.ate=1;addText(blocked.x,plantY(e.lane)-70,'ELE MORDEU A PEÇA','#e0a040');}
  }else{e.eating=null;if(!(e.b==='faroleiro'&&e.phase>=2))e.x-=e.speed*dt*(e.phase>=3?1.25:1);}
  if(e.x<VX+40){breach(e);e.x=SPAWN_X-30;}
}
function updateBossSpecials(dt: number): void {
  const e=G.boss;if(!e||G.bossDeath)return;
  if(e.b==='bento'){
    if(e.actT<=0){e.actT=e.phase>=3?4:6.5;SFX.laugh();
      if(e.phase>=2){const lane=randLane();spawnEnemy(pick(['bomba','caranguejo','baiacu']),lane,SPAWN_X,1);}
      if(e.phase>=3){G.projs.push({x:e.x-40,y:plantY(e.lane)-50,lane:e.lane,vx:-280,dmg:25,kind:'scrap',enemy:true,rot:0});}
      addText(e.x,plantY(e.lane)-130,e.phase>=3?'TÁ COM FOME?':'CHAMA O REFORÇO','#e0a040');
    }
  }else if(e.b==='faroleiro'){
    e.darkCd-=dt;
    if(e.darkCd<=0&&e.phase>=1){e.darkCd=e.phase>=3?8:12;
      G.dark=!G.dark;G.darkT=G.dark?4:0;Snd.bell(220,Snd.ctx?Snd.ctx.currentTime:0,.08,2);
      announce(G.dark?'A LUZ APAGOU. HOLOFOTE AINDA ACENDE.':'A LUZ VOLTOU.','story');
      if(e.phase>=3){G.darkT=6;G.dark=true;setTimeout(()=>{if(G)G.dark=false;},6000);}
      for(const m of G.machines)if(m.type==='holofote'||(m.type==='coisa_ze'&&m.variant==='holofote'))G.up.holofote=Math.max(G.up.holofote,0);
    }
    if(G.dark)G.darkT=Math.max(0,G.darkT-dt);
    if(G.darkT<=0&&G.dark&&e.phase<3)G.dark=false;
    if(e.actT<=0){e.actT=e.phase>=2?4:6;SFX.enter('mariposa');
      spawnEnemy(pick(['mariposa','agua','gaivota']),randLane(),SPAWN_X,1);
      if(e.phase>=2){const l=randLane();e.lane=l;e.x=SPAWN_X-20;burst(e.x,plantY(l),10,'rgba(255,240,180,.5)',100,0,3,.6);}
    }
  }else if(e.b==='maquinista'){
    e.actT-=dt;
    if(e.actT<=0){e.actT=e.phase>=3?4:6.5;SFX.steam();
      const lane=randLane();G.hazards.push({kind:'train',lane,t:0,warn:2.6,dur:1.6,dmg:60,phase:e.phase});
      announce('O TRILHO '+(lane+1)+' VAI PASSAR. SAI DAÍ.','story');}
    if(chance(dt*.25))spawnEnemy(pick(['passageiro','piranha']),randLane(),SPAWN_X,1);
  }else if(e.b==='peixe_mae'){
    e.inflT-=dt;
    if(e.inflT<=0){e.inflate=!e.inflate;e.inflT=e.inflate?3:4;if(e.inflate)addText(e.x,plantY(e.lane)-160,'INCHOU. NÃO BATE.','#e8d070');}
    e.actT-=dt;
    if(e.actT<=0){e.actT=e.phase>=3?2.6:4;SFX.plop();
      for(let i=0;i<(e.phase>=3?3:2);i++)spawnEnemy(pick(['baiacu','piranha']),randLane(),SPAWN_X,1.1);}
  }else if(e.b==='gerente'){
    e.actT-=dt;
    if(e.actT<=0){e.actT=3.4;SFX.steam();
      const lane=randLane();G.hazards.push({kind:'conveyor',lane,t:0,warn:1.6,dur:2.2,dmg:30,phase:e.phase});
      spawnEnemy(pick(['lata','polvo','fantasma']),lane,SPAWN_X,1);
      announce('REUNIÃO NA LINHA '+(lane+1)+'. PAUTA: VOCÊ.','story');
    }
  }
}
function updateProjectiles(dt: number): void {
  for(let i=G.projs.length-1;i>=0;i--){
    const p=G.projs[i];p.x+=p.vx*dt;p.rot=(p.rot||0)+dt*10;
    if(p.x>W+30||p.x<VX-40){G.projs.splice(i,1);continue;}
    if(p.enemy||p.kind==='mirror'){
      if(p.enemy){
        const m=G.machines.filter(o=>o.lane===p.lane&&Math.abs(o.x-p.x)<22).sort((a,b)=>b.x-a.x)[0];
        if(m){G.projs.splice(i,1);damageMachine(m,20);SFX.hit();burst(p.x,p.y,5,'#d8a85a',120,400,2,.3);}
      }
      continue;
    }
    const hit=G.enemies.find(e=>e.lane===p.lane&&Math.abs(e.x-p.x)<e.r*.95&&isTargetable(e,p.silent));
    if(hit){
      G.projs.splice(i,1);
      if(hit.type==='lata'&&p.kind==='toast'){
        hit.reflectT=.6;hit.act=.6;
        G.projs.push({x:hit.x-10,y:p.y,lane:p.lane,vx:-300,dmg:p.dmg,kind:'toast',enemy:true,rot:0});
        SFX.reflect();addText(hit.x,p.y-20,'DEVOLVO','#c8e0e8');burst(hit.x,p.y,6,'#d8e8f0',160,300,3,.4);
      }else{
        damageEnemy(hit,p.dmg, p.kind==='can'?'can':'toast');SFX.hit();burst(p.x,p.y,5,p.kind==='can'?'#9aa8a0':'#d8a85a',120,400,2,.3);
        if(G.mode==='boss'||hit.boss)SFX.hit();
      }
    }
  }
}
function updateHazards(dt: number): void {
  for(let i=G.hazards.length-1;i>=0;i--){
    const h=G.hazards[i];h.t+=dt;
    if(h.t>=h.warn&&h.t<h.warn+h.dur){
      if(!h.hit){h.hit=true;SFX.crash();G.shake=16;
        for(const m of G.machines)if(m.lane===h.lane)damageMachine(m,h.dmg);
        for(const e of G.enemies)if(e.lane===h.lane&&!e.boss&&e.type!=='baleia'&&e.type!=='pescador')damageEnemy(e,h.kind==='train'?90:25,'boom');}
    }
    if(h.t>h.warn+h.dur+.3)G.hazards.splice(i,1);
  }
}
function updatePickups(dt: number): void {
  for(let i=G.pickups.length-1;i>=0;i--){
    const p=G.pickups[i];p.t+=dt;
    if(p.fly){const tx=56,ty=42,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
      if(d<18){G.scrap+=p.v;G.collected+=p.v;G.pickups.splice(i,1);continue;}
      p.x+=dx/d*950*dt;p.y+=dy/d*950*dt;continue;}
    if(p.auto){p.vy+=400*dt;p.y+=p.vy*dt;if(p.t>.6)collect(p);continue;}
    p.x-=4*dt;p.life-=dt;
    if(p.life<=0){G.pickups.splice(i,1);burst(p.x,p.y,4,'#6a8a8a',60,200,2,.4);}
  }
}
function updateAmbientAchievements(): void {
  if(G.mode==='endless'&&G.survived>=10&&SaveDB.achievement('noite10'))announce('CONQUISTA: madrugada 10','ach');
}
function Structure_hasLost(){return G.structures.flat().some(s=>!s.alive);}

// ---------------------------------------------------------------------
// Invasão / fim
// ---------------------------------------------------------------------
function breach(e: Enemy): void {
  if(e.boss&&e.b==='mare')return;
  const idx=G.enemies.indexOf(e);if(idx>=0&&!e.boss)G.enemies.splice(idx,1);
  G.shake=20;G.flash=1;SFX.crash();
  burst(120,plantY(e.lane)-30,40,'#6a5a4a',260,500,rnd(3,7),1);
  const lane=G.structures[e.lane];
  const s=lane.find(s=>s.alive);
  if(G.shields>0&&!e.boss){G.shields--;announce('A TÁBUA DE RESERVA SEGUROU. UMA.','story');addText(150,plantY(e.lane)-60,'TÁBUA','#e8c84a');if(e.x<W)G.enemies.push(e);return;}
  if(G.sandbox){announce('SANDBOX: nada quebrou. O ZÉ AGRADECE.','radio');if(!e.boss)G.enemies.push(e);e.x=SPAWN_X;return;}
  if(s){s.alive=false;G.destroyed.push(s.nome);G.ze.say=pick(['Ai.','Já era.','Não.','Levanta, Zé.']);G.ze.sayT=3;
    if(!G.firstVillageLost){G.firstVillageLost=true;announce('A vila sentiu isso. Não deixa de novo.','story');}
    announce(s.msg,'story');}
  else if(G.ze.alive&&G.structures[e.lane].every(s=>!s.alive)){
    G.ze.alive=false;
    burst(50,plantY(1)-30,30,'#7a1a2a',220,500,undefined,1);stain(50,plantY(1),'#5a1a2a',30);
    announce('PERDEMOS O ZÉ.','story');
  }
  if(G.structures.flat().every(s=>!s.alive)&&!G.ze.alive)endRun(false);
  else if(!G.ze.alive)endRun(false);
}
function bossDefeated(e: Enemy): void {
  if(G.bossDeath)return;
  const idx=G.enemies.indexOf(e);if(idx>=0)G.enemies.splice(idx,1);
  if(G.boss===e)G.boss=null;
  G.enemies=G.enemies.filter(o=>o.boss?false:true);
  const bId=e.b||e.type;
  G.bossDeath={b:bId,x:Math.min(e.x,W-120),y:plantY(e.lane),lane:e.lane,t:0,dur:deathDur(bId)};
  G.deaths.push({type:bId,x:Math.min(e.x,W-120),y:plantY(e.lane),lane:e.lane,t:0,dur:deathDur(bId)});
  SFX.death(e.b);G.shake=20;G.flash=.6;Snd.setIntensity(1);
  G.kills++;dropScrap(e.x,plantY(e.lane)-40,120,true);G.zeHat=(e.b==='bento');
  if(e.b==='mare'){SaveDB.achievement('maré');}
  if(e.b==='faroleiro'&&!G.machines.some(m=>m.type==='holofote'))SaveDB.achievement('sem_farol');
  announce('ACABOU. UM DELES, PELO MENOS.','story');
}
function completeMap(): void {
  if(Game.screen==='end')return;
  const loss=STRUCTURES-structuresAlive();
  const stars=loss===0?3:loss<=2?2:1;
  const base=Math.round((55+stars*30+G.kills*.5+G.survived*8)*(1+(eff().metaBonus||0)/100));
  const meta=G.mode==='sandbox'?0:base;
  if(meta)SaveDB.addScrap(meta);
  if(G.mode==='campaign'){
    SaveDB.setStars(G.mapIndex,99,stars);
    SaveDB.unlockMap(Math.min(MAPS.length-1,G.mapIndex+1));
    SaveDB.record('campaign',{});
    SaveDB.finishRun({kills:G.kills,time:G.t});
  }else if(G.mode==='daily'){SaveDB.recordDaily(G.survived);SaveDB.finishRun({kills:G.kills,time:G.t});}
  else SaveDB.finishRun({kills:G.kills,time:G.t});
  SaveDB.save();
  const summary={win:true,mode:G.mode,mapIndex:G.mapIndex,mapName:G.map.nome,kills:G.kills,time:G.t,stars,meta,
    survived:G.survived,lost:G.structures.flat().filter(s=>!s.alive).map(s=>s.nome)};
  Game.screen='end';
  if(G.mode==='campaign'&&G.mapIndex===MAPS.length-1)setTimeout(()=>UI.epilogue(),900);
  else UI.end(summary);
}
function endRun(win: boolean): void {
  if(Game.screen==='end'||G.over)return;
  G.over=true;G.win=win;
  const stars=win?3:Math.max(0,structuresAlive()>=2?1:0);
  const meta=G.mode==='sandbox'?0:Math.round((10+G.kills*.4+G.survived*5)*(1+(eff().metaBonus||0)/100));
  if(meta)SaveDB.addScrap(meta);
  SaveDB.finishRun({kills:G.kills,time:G.t});
  SaveDB.save();
  if(G.mode==='endless'){SaveDB.record('endless',{time:G.survived});}
  Snd.setIntensity(0);
  Game.screen='end';
  UI.end({win:false,mode:G.mode,mapIndex:G.mapIndex,mapName:G.map.nome,kills:G.kills,time:G.t,stars,meta,
    survived:G.survived,lost:G.structures.flat().filter(s=>!s.alive).map(s=>s.nome)});
}

// ---------------------------------------------------------------------
// Escolhas do Zé / loja / pausa
// ---------------------------------------------------------------------
function openShop(): void {
  Snd.setIntensity(0);Snd.pauseDuck(true);
  Game.screen='shop';
  if(G.repairBank>0){G.repairBank--;const dead=G.structures.flat().find(s=>!s.alive);if(dead){dead.alive=true;announce('REBOQUE: '+dead.nome+' VOLTOU. MAL.','story');}}
  const offers: Offer[]=[];
  const locked=availableMachines().filter(()=>false);
  const notOwned=MACH_ORDER.filter(k=>!isMachUnlocked(k)&&k!=='coisa_ze'&&k!=='remover');
  if(notOwned.length)offers.push({kind:'unlock',k:pick(notOwned)});
  const ups=MACH_ORDER.filter(k=>isMachUnlocked(k)&&UPG[k]&&(G.up[k]||0)<3&&k!=='coisa_ze'&&k!=='remover');
  if(ups.length)offers.push({kind:'up',k:pick(ups)});
  offers.push({kind:'scrap'});
  offers.push({kind:'repair'});
  offers.push({kind:'heal'});
  const chosen: Offer[]=[];for(const o of shuffle(offers)){if(!chosen.some(c=>c.kind===o.kind))chosen.push(o);if(chosen.length>=(eff().extraOffer?4:3))break;}
  Game.offers=chosen;
  Game.shopItems=[
    {id:'repair',nome:'REBOCAR UMA PAREDE',desc:'Conserta uma estrutura caída. Fica torta.',cost:90},
    {id:'heal',nome:'GRAXA NAS PEÇAS',desc:'Cura todas as engenhocas e +10% de dano nesta partida.',cost:120},
    {id:'shield',nome:'TÁBUA DE RESERVA',desc:'Barra a próxima invasão. Só uma.',cost:80}
  ];
  Game.zeGiftPending=true;
  UI.shop();
  // presente do Zé, uma vez por partida
  if(!G.zeGiftGiven){
    G.zeGiftGiven=true;
    const k=pick(MACH_ORDER.filter(x=>x!=='remover'&&x!=='coisa_ze'));
    const free: [number,number][]=[];for(let l=0;l<LANES;l++)for(let c=0;c<COLS;c++)if(!machineAt(l,c))free.push([l,c]);
    if(free.length){const [l,c]=pick(free);placeMachine(k,l,c,true);
      announce('O ZÉ MONTou '+MACH[k].nome.toUpperCase()+' SOZINHO E SAIU. NÃO PERGUNTA.','ach');}
  }
}
Game.chooseOffer=function(i){
  const o=Game.offers[i];if(!o)return;
  if(o.kind==='unlock'&&o.k){G.unlockedMach[o.k]=true;G.pendingUnlock=o.k;SaveDB.seenMach(o.k);
    announce('DESBLOQUEADO: '+MACH[o.k].nome+'. Já vai aparecer na sua banca.','ach');}
  else if(o.kind==='up'&&o.k)upgradeMachine(o.k);
  else if(o.kind==='scrap'){G.scrap+=150;addText(60,50,'+150','#e8c84a');SFX.cash();}
  else if(o.kind==='repair'){const d=G.structures.flat().find(s=>!s.alive);if(d){d.alive=true;announce('REBOCOU '+d.nome+'. NÃO FICOU BONITO.','story');}}
  else if(o.kind==='heal'){for(const m of G.machines)m.hp=m.maxhp;G.dmgBonus+=.1;announce('GRAXA: PEÇAS NOVAS EM FOLHA. +10% DE DANO.','story');}
  SaveDB.save();advanceFromBreak();
};
Game.buyShopItem=function(id){
  const it=Game.shopItems.find(s=>s.id===id);if(!it)return;
  if(G.scrap<it.cost){announce('SUCATA DE MENOS.','story');return;}
  G.scrap-=it.cost;
  if(id==='repair'){const d=G.structures.flat().find(s=>!s.alive);if(d){d.alive=true;}else G.scrap+=it.cost;}
  if(id==='heal'){for(const m of G.machines)m.hp=m.maxhp;G.dmgBonus+=.1;}
  if(id==='shield')G.shields++;
  SFX.cash();UI.shop();
};
Game.pause=function(){if(Game.screen!=='play')return;Game.paused=true;Game.screen='pause';Snd.pauseDuck(true);UI.pause();};
Game.resume=function(){if(Game.screen!=='pause')return;Game.paused=false;Game.screen='play';Snd.pauseDuck(false);UI.hideOverlays();};
Game.restart=function(){if(Game.runOpts)Game.startFromOpts(Game.runOpts);else Game.quitToTitle();};
Game.quitToTitle=function(){Game.screen='title';Game.paused=false;Snd.pauseDuck(false);Snd.setIntensity(1);
  Game.titleBackdrop();UI.title();Snd.setTrack('barra');};
Game.startFromOpts=function(o){
  if(o.kind==='campaign')Game.startCampaign(o.map);
  else if(o.kind==='endless')Game.startEndless({level:o.level,map:o.map});
  else if(o.kind==='boss')Game.startBoss(o.map);
  else if(o.kind==='daily')Game.startDaily();
  else Game.startSandbox();
};
// guarda de opção para reinício
const origStartCampaign=Game.startCampaign;
// ---------------------------------------------------------------------
// Opções, rádio e conquistas escondidas
// ---------------------------------------------------------------------
Game.option=function(k,v){
  SaveDB.opt(k,v);
  document.body.classList.toggle('cb',!!SaveDB.options.cb);
  document.documentElement.style.setProperty('--fs',String(SaveDB.options.font||1));
  Snd.applyVolumes();
  if(k==='shake')document.body.classList.toggle('lowshake',!SaveDB.options.shake);
};
Game.toggleMute=function(){Snd.init();Snd.toggleMute();UI.toast('radio',Snd.muted?'MUDO (M)':'SOM DE VOLTA (M)');};
Game.radioClick=function(){
  SaveDB.slot.radioClicks=((SaveDB.slot.radioClicks as number)||0)+1;
  if(G)G.radioClicks=(G.radioClicks||0)+1;
  const n=(G&&G.radioClicks)||1;
  const lines=['...','A frequência está morta.','...meninos, se estão ouvindo, não venham.','...a maré não perdoa, mas ela conversa.'];
  if(n===3){Snd.pirate=true;SaveDB.achievement('pirata');announce('ESTAÇÃO PIRATA: "A VOZ DO RÁDIO" ENTROU NO AR. NINGUÉM SABE DE ONDE.','radio');}
  else announce('RÁDIO: '+lines[Math.min(n,lines.length-1)],'radio');
};
Game.zeClick=function(){
  if(!G)return;G.zeClicks++;
  if(G.zeClicks===20){SaveDB.achievement('ze_amigo');G.ze.say=ZE_RARO;G.ze.sayT=9;announce('CONQUISTA: ZÉ FALOU.','ach');SFX.human();}
  else{G.ze.say=pick(['Que é?','Tô ocupado.','Se for vender coisa, não quero.','A maré não tá pra conversa.']);G.ze.sayT=2.5;}
};
Game.toqClick=function(){
  if(!G)return;G.toqClicks++;
  if(G.toqClicks>=10){SaveDB.achievement('toquinho_viu');G.toqSay='Eu vi tudo.';G.toqSayT=6;announce('CONQUISTA: TOQUINHO VIU TUDO. ELE NÃO CONTA O QUÊ.','ach');}
  else{G.toqSay=pick(TOQ_LINES);G.toqSayT=3;G.toqBoost=4;}
};
Game.bootsClick=function(){
  if(!G||!G.props.length)return;
  G.botaClicks=(G.botaClicks||0)+1;
  if(G.botaClicks>=5){SaveDB.achievement('bota');announce('CONQUISTA: as botas foram cumprimentadas. Elas responderam.','ach');}
  else addText(G.props[0].x,plantY(G.props[0].lane)-20,'oi','#e8d9a8');
};
Game.finishEnding=function(id){
  const e=ENDINGS.find(x=>x.id===id);if(!e)return;
  SaveDB.setEnding(id,e.txt);
  const all=Object.keys(SaveDB.slot.endings).length;
  if(all>=3)SaveDB.achievement('tres_finais');
  SaveDB.addScrap(120);SaveDB.save();
  Game.screen='end';UI.ending(e,all>=3);
};
Game.buyNode=function(id){
  if(SaveDB.buyNode(id)){SFX.level();UI.tree();}
  else UI.toast('story','SUCATA VELHA DE MENOS, ou falta pré-requisito.');
};
Game.currentMap=()=>G?G.map:null;

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------
function canvasPos(ev: MouseEvent): { x: number; y: number } {const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};}
function onCanvasDown(ev: MouseEvent): void {
  if(Game.screen!=='play'||Game.paused||!G||G.over)return;
  const p=canvasPos(ev);
  if(ev.button===2){G.selected=null;return;}
  // segredos: Zé, Toquinho, botas, cão
  if(Math.hypot(p.x-46,p.y-(plantY(1)-50))<30){Game.zeClick();return;}
  if(G.toqAlive&&Math.hypot(p.x-(70+Math.sin(G.t*.6)*22),p.y-(plantY(2)-24))<26){Game.toqClick();return;}
  if(G.props.length&&Math.hypot(p.x-G.props[0].x,p.y-plantY(G.props[0].lane))<34){Game.bootsClick();return;}
  // sucata primeiro
  for(const k of G.pickups){if(!k.fly&&!k.auto&&Math.hypot(k.x-p.x,k.y-p.y)<30){collect(k);return;}}
  // cartas
  if(p.y<86){const k=UI.cardAt(p.x,p.y);if(k){
    if(!isMachUnlocked(k)){announce('O ZÉ AINDA NÃO TROUXE ISSO.','story');return;}
    G.selected=G.selected===k?null:k;SFX.ui();}return;}
  const c=Math.floor((p.x-VX)/COLW),l=Math.floor((p.y-LANE_Y0)/LANE_H);
  if(c<0||c>=COLS||l<0||l>=LANES){G.selected=null;return;}
  if(G.selected==='remover'){
    const m=machineAt(l,c);if(m){const v=Math.round(machCost(m.type)*.25);destroyMachine(m,false);G.scrap+=v;
      addText(m.x,plantY(l)-60,'+'+v,'#9ab');SFX.metal();G.cabraCount++;}
    G.selected=null;return;
  }
  if(G.selected){
    const k=G.selected;
    const ok=placeMachine(k,l,c);
    if(ok&&!ev.shiftKey)G.selected=null;
    if(ok)SFX.place();
  }
}
window.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){
    if(Game.screen==='shop')return;
    if(Game.screen==='play'&&G)G.selected=null;
    if(Game.screen==='pause')Game.resume();
    return;
  }
  if(ev.key==='p'||ev.key==='P'){if(Game.screen==='play')Game.pause();else if(Game.screen==='pause')Game.resume();return;}
  if(ev.key==='m'||ev.key==='M'){Game.toggleMute();return;}
  if(G&&Game.screen==='play'){
    const list=availableMachines();const n=parseInt(ev.key);
    if(n>=1&&n<=9&&list[n-1])G.selected=list[n-1];
  }
});
canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
canvas.addEventListener('mousedown',onCanvasDown);
canvas.addEventListener('mousemove',ev=>{const p=canvasPos(ev);Game.mouse=p;});

/**
 * Desenha um quadro: o campo, depois a HUD e os overlays de tela.
 * A ordem importa: a HUD fica por cima do campo.
 */
export function drawFrame(): void {
  drawField();
  if (Game.screen === 'play' || Game.screen === 'pause') {
    UI.drawHUD(G);
    UI.drawScene(G);
  }
}

// ---------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------
Game.needAudio=function(){Snd.init();Snd.resume();Snd.applyVolumes();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&Game.screen==='play')Game.pause();});
