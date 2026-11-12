/**
 * audio.ts — música, ambiência e efeitos.
 *
 * Tudo sintetizado em WebAudio: nenhum arquivo de áudio no repo. O
 * contexto só nasce depois de um gesto do usuário (regra dos navegadores),
 * por isso `Snd.init()` é chamado no primeiro clique.
 */
import { clamp, rnd } from '../core/constants';
import { SaveDB } from '../save/storage';


/**
 * Uma trilha: o esqueleto da música. Cada mapa veste o mesmo tema com
 * outro modo, outro instrumento e outro ambiente.
 */
export interface Track {
  nome: string;
  bpm: number;
  root: number;
  mode: number[];
  lead: string;
  pad: string;
  perc: string[];
  amb: string;
  /** Camadas de música disponíveis nesta trilha. */
  layers: number;
  /** Delay do contratempo, em fração de step. */
  swing: number;
}

// Tema comum: graus da escala. Cada mapa veste o mesmo esqueleto.
export const MOTIF=[0,0,2,0, 4,0,2,0, 5,0,4,2, 0,-1,2,0, 7,0,5,4, 2,0,0,-1, 4,0,5,2, 4,2,0,-1];
export const TRACKS: Record<string, Track>={
  barra:{bpm:92,root:38,mode:[0,2,3,5,7,8,10],lead:'acc',pad:'reed',perc:['kick','lata','clank'],amb:'sea',
    nome:'PÍER, 3 DA MANHÃ',layers:4,swing:.04},
  farol:{bpm:70,root:33,mode:[0,2,3,5,7,8,10],lead:'bell',pad:'strings',perc:['bell','wood'],amb:'wind',
    nome:'QUATRO LÉGUAS DE NADA',layers:4,swing:0},
  estacao:{bpm:104,root:31,mode:[0,2,3,5,7,9,10],lead:'brass',pad:'strings',perc:['kick','rail','steam'],amb:'steam',
    nome:'TRILHO DAS 3H',layers:4,swing:0},
  feira:{bpm:112,root:36,mode:[0,2,4,5,7,9,10],lead:'acc',pad:'reed',perc:['drum','lata','crowd'],amb:'crowd',
    nome:'PEIXE DO DIA, DIA INCERTO',layers:4,swing:.06},
  fabrica:{bpm:96,root:29,mode:[0,1,3,5,6,8,10],lead:'synth',pad:'hum',perc:['steam','metal','kick'],amb:'factory',
    nome:'TURNO EXTRA (GRATUITO)',layers:4,swing:0},
  cemiterio:{bpm:64,root:33,mode:[0,2,3,5,7,8,10],lead:'choir',pad:'strings',perc:['wood','water','bell'],amb:'void',
    nome:'O QUE O MAR NÃO QUIS',layers:5,swing:0}
};

export const Snd=(function(){
  /**
   * O estado do áudio é um objeto com métodos pendurados depois — padrão
   * do legado. O TypeScript não infere isso, então a forma está escrita
   * aqui: é a API pública do módulo de som.
   *
   * Os nós do WebAudio ficam `any` de propósito: todos nascem nulos e
   * só existem depois do primeiro gesto do usuário. Tipá-los só produziria
   * `possibly null` em 200 linhas que já checam `if(!S.ctx)return`.
   */
  interface AmbNode {
    src: any;
    flt: any;
    g: any;
  }

  interface AudioState {
    ctx: any;
    master: any;
    music: any;
    sfx: any;
    amb: any;
    low: any;
    noise: any;
    brown: any;
    muted: boolean;
    vol: { master: number; music: number; sfx: number };
    track: string;
    intensity: number;
    step: number;
    next: number;
    timer: ReturnType<typeof setInterval> | null;
    pirate: boolean;
    paused: boolean;
    started: boolean;

    ambSea: AmbNode | null;
    ambWind: AmbNode | null;
    ambHiss: AmbNode | null;
    ambFab: AmbNode | null;
    ambHumGain: any;
    ambChoirGain: any;

    init(): void;
    resume(): void;
    applyVolumes(): void;
    toggleMute(): void;
    setTrack(id: string): void;
    setIntensity(n: number): void;
    pauseDuck(on: boolean): void;
    buildAmbience(): void;
    mixAmbience(): void;
    ambAccent(): void;
    tone(t: number, dur: number, type: string, f0: number, f1?: number | null, gain?: number, dest?: any): any;
    noiseHit(t: number, dur: number, type: string, freq: number, Q: number, gain: number, dest?: any): any;
    kick(t: number, g?: number): void;
    lata(t: number): void;
    clank(t: number, g?: number): void;
    bell(fq: number, t: number, g?: number, dur?: number): void;
    steam(t: number): void;
    wood(t: number): void;
    water(t: number): void;
    drum(t: number): void;
    instr(kind: string, midi: number, t: number, dur: number, g?: number): void;
    bass(midi: number, t: number, dur: number): void;
    schedule(): void;
    playStep(s: number, t: number, tr: Track, stepDur: number): void;
  }

  const S = {
    ctx: null,
    master: null,
    music: null,
    sfx: null,
    amb: null,
    low: null,
    noise: null,
    brown: null,
    muted: false,
    vol: { master: 0.9, music: 0.62, sfx: 0.85 },
    track: 'barra',
    intensity: 1,
    step: 0,
    next: 0,
    timer: null,
    pirate: false,
    paused: false,
    started: false,
    ambSea: null,
    ambWind: null,
    ambHiss: null,
    ambFab: null,
    ambHumGain: null,
    ambChoirGain: null,
  } as AudioState;
  const f=(m: number)=>440*Math.pow(2,(m-69)/12);

  S.init=function(){
    if(S.ctx)return;
    const AC=window.AudioContext||(window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;if(!AC)return;
    const c=S.ctx=new AC();
    S.master=c.createGain();S.low=c.createBiquadFilter();S.low.type='lowpass';S.low.frequency.value=18000;
    S.master.connect(S.low);S.low.connect(c.destination);
    S.music=c.createGain();S.sfx=c.createGain();S.amb=c.createGain();
    S.music.connect(S.master);S.sfx.connect(S.master);S.amb.connect(S.master);
    // ruído branco e marrom reaproveitados por tudo
    const len=c.sampleRate*2;S.noise=c.createBuffer(1,len,c.sampleRate);
    const d=S.noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    S.brown=c.createBuffer(1,len,c.sampleRate);const b=S.brown.getChannelData(0);let last=0;
    for(let i=0;i<len;i++){last=(last+.02*(Math.random()*2-1))/1.02;b[i]=last*3.4;}
    S.buildAmbience();
    S.applyVolumes();
    S.next=c.currentTime+.08;S.step=0;
    if(S.timer)clearInterval(S.timer);
    S.timer=setInterval(()=>S.schedule(),28);
    setInterval(()=>{if(!S.muted&&S.intensity>0&&Math.random()<.45)S.ambAccent();},7000);
  };
  S.resume=function(){if(S.ctx&&S.ctx.state==='suspended')S.ctx.resume();};
  S.applyVolumes=function(){
    const o=(typeof SaveDB!=='undefined')?SaveDB.options:{master:.9,music:.62,sfx:.85,mute:0};
    S.vol={master:o.master,music:o.music,sfx:o.sfx};S.muted=!!o.mute;
    if(!S.ctx)return;
    S.master.gain.value=S.muted?0:o.master;
    S.music.gain.value=o.music*.55;
    S.sfx.gain.value=o.sfx*.9;
    S.amb.gain.value=o.master*.5;
  };
  S.toggleMute=function(){const o=SaveDB.options;o.mute=o.mute?0:1;SaveDB.opt('mute',o.mute);S.applyVolumes();};
  S.setTrack=function(id){if(!TRACKS[id])id='barra';if(S.track===id&&S.started)return;S.track=id;S.intensity=1;S.step=0;if(S.ctx)S.next=S.ctx.currentTime+.05;};
  S.setIntensity=function(n){S.intensity=clamp(n,0,4);};
  S.pauseDuck=function(on){if(!S.ctx)return;S.paused=on;S.low.frequency.setTargetAtTime(on?520:18000,S.ctx.currentTime,.12);};
  S.started=true;

  // ---------- ambiente contínuo (todos os mapas, ganhos diferentes) ----------
  S.buildAmbience=function(){
    const c=S.ctx;
    if(!c)return;
    const mk=(buf: AudioBuffer | null,type: string,freq: number,q: number,gain: number): AmbNode=>{
      const s=c.createBufferSource();if(buf)s.buffer=buf;s.loop=true;
      const flt=c.createBiquadFilter();flt.type=type;flt.frequency.value=freq;flt.Q.value=q;
      const g=c.createGain();g.gain.value=gain;
      s.connect(flt);flt.connect(g);g.connect(S.amb);s.start();
      return{src:s,flt,g};
    };
    S.ambSea=mk(S.brown,'lowpass',380,.7,.22);
    S.ambWind=mk(S.noise,'bandpass',720,1.1,.05);
    S.ambHiss=mk(S.noise,'highpass',3400,1,.015);
    S.ambFab=mk(S.brown,'lowpass',150,2,.0);
    // zumbido de fábrica
    const hum=c.createOscillator();hum.type='sawtooth';hum.frequency.value=55;
    const hf=c.createBiquadFilter();hf.type='lowpass';hf.frequency.value=140;
    S.ambHumGain=c.createGain();S.ambHumGain.gain.value=0;
    hum.connect(hf);hf.connect(S.ambHumGain);S.ambHumGain.connect(S.amb);hum.start();
    // respiração lenta do mar/farol
    const lfo=c.createOscillator();lfo.frequency.value=.07;
    const lg=c.createGain();lg.gain.value=.09;lfo.connect(lg);lg.connect(S.ambSea.g.gain);lfo.start();
    // coral vazio do cemitério
    const ch=c.createOscillator();ch.type='triangle';ch.frequency.value=f(45);
    const chg=c.createGain();chg.gain.value=0;ch.connect(chg);chg.connect(S.amb);ch.start();
    S.ambChoirGain=chg;
  };
  S.mixAmbience=function(){
    if(!S.ctx)return;
    const t=S.ctx.currentTime,tr=TRACKS[S.track]||TRACKS.barra;
    const set=(node,v)=>{if(node)node.g.gain.setTargetAtTime(v,t,.6);};
    set(S.ambSea,tr.amb==='sea'?.26:tr.amb==='void'?.16:.09);
    set(S.ambWind,tr.amb==='wind'?.16:tr.amb==='void'?.07:.02);
    set(S.ambHiss,tr.amb==='steam'?.05:tr.amb==='factory'?.035:tr.amb==='void'?.02:.01);
    set(S.ambFab,0);
    if(S.ambHumGain)S.ambHumGain.gain.setTargetAtTime(tr.amb==='factory'?.16:0,t,.8);
    if(S.ambChoirGain)S.ambChoirGain.gain.setTargetAtTime(tr.amb==='void'?.05:0,t,1.2);
  };
  S.ambAccent=function(){
    if(!S.ctx||S.muted)return;const t=S.ctx.currentTime,tr=TRACKS[S.track];
    if(!tr)return;
    if(tr.amb==='wind')S.bell(f(tr.root+12),t,.09,3.5);
    if(tr.amb==='steam'){for(let i=0;i<3;i++)S.noiseHit(t+i*.18,.28,'highpass',2600,1,.05);}
    if(tr.amb==='crowd'){S.noiseHit(t,.9,'bandpass',880,1.4,.05);}
    if(tr.amb==='factory'){S.clank(t,.04);}
    if(tr.amb==='void'){S.bell(f(tr.root+7),t,.05,6);}
    if(tr.amb==='sea'){S.noiseHit(t,.8,'lowpass',500,1,.10);}
  };

  // ---------- primitivas ----------
  S.tone=function(t,dur,type,f0,f1,gain,dest){
    const c=S.ctx;if(!c)return; // sem contexto (jsdom/teste): som é opcional
    const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);
    if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+Math.min(.02,dur*.2));
    g.gain.exponentialRampToValueAtTime(.0008,t+dur);
    o.connect(g);g.connect(dest||S.sfx);o.start(t);o.stop(t+dur+.05);return o;
  };
  S.noiseHit=function(t,dur,type,freq,Q,gain,dest){
    const c=S.ctx;if(!c)return;const s=c.createBufferSource();s.buffer=S.noise;s.loop=true;
    const flt=c.createBiquadFilter();flt.type=type;flt.frequency.value=freq;flt.Q.value=Q;
    const g=c.createGain();g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
    s.connect(flt);flt.connect(g);g.connect(dest||S.sfx);s.start(t);s.stop(t+dur+.05);return flt;
  };
  S.kick=(t,g=.6)=>S.tone(t,.22,'sine',150,36,g,S.music);
  S.lata=t=>{S.noiseHit(t,.12,'bandpass',2700,8,.32,S.music);S.noiseHit(t,.07,'bandpass',900,9,.22,S.music);};
  S.clank=(t,g=.05)=>{S.tone(t,.28,'square',1245,null,g,S.music);S.tone(t,.28,'square',1870,null,g*.7,S.music);};
  S.bell=(fq,t,g=.06,dur=2)=>{S.tone(t,dur,'sine',fq,null,g,S.music);S.tone(t,dur*.7,'sine',fq*2.01,null,g*.4,S.music);};
  S.steam=t=>{S.noiseHit(t,.45,'highpass',3000,1,.14,S.music);S.noiseHit(t+.05,.3,'bandpass',5200,1,.08,S.music);};
  S.wood=t=>{S.noiseHit(t,.06,'lowpass',700,1,.2,S.music);S.tone(t,.08,'sine',180,120,.08,S.music);};
  S.water=t=>{S.tone(t,.28,'sine',420,180,.05,S.music);};
  S.drum=t=>{S.noiseHit(t,.1,'bandpass',1100,2,.15,S.music);S.tone(t,.12,'sine',160,90,.18,S.music);};

  // ---------- instrumentos melódicos ----------
  S.instr=function(kind,midi,t,dur,g=.07){
    const c=S.ctx;if(!c)return;const fq=f(midi);
    const bus=S.music;
    if(kind==='acc'){ // acordeão: três palhetas desafinadas
      const flt=c.createBiquadFilter();flt.type='lowpass';flt.frequency.value=1600;flt.Q.value=1.6;
      const gN=c.createGain();gN.gain.setValueAtTime(0,t);gN.gain.linearRampToValueAtTime(g,t+.04);
      gN.gain.setValueAtTime(g,t+dur*.8);gN.gain.linearRampToValueAtTime(0,t+dur);
      const vib=c.createOscillator();vib.frequency.value=5.5;const vg=c.createGain();vg.gain.value=5;vib.connect(vg);
      [[1.008,1],[.993,1],[.5,.3]].forEach(([r,v])=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=fq*r;
        vg.connect(o.detune);const og=c.createGain();og.gain.value=v;o.connect(og);og.connect(flt);o.start(t);o.stop(t+dur+.05);});
      vib.start(t);vib.stop(t+dur+.05);flt.connect(gN);gN.connect(bus);
    }else if(kind==='bell'){
      S.tone(t,dur*1.6,'sine',fq,null,g,bus);S.tone(t,dur*.9,'sine',fq*2.76,null,g*.4,bus);
    }else if(kind==='strings'){
      const o=c.createOscillator();o.type='sawtooth';o.frequency.value=fq;
      const o2=c.createOscillator();o2.type='sawtooth';o2.frequency.value=fq*1.005;
      const flt=c.createBiquadFilter();flt.type='lowpass';flt.frequency.value=1100;
      const gg=c.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g*.8,t+dur*.35);
      gg.gain.linearRampToValueAtTime(0,t+dur);o.connect(flt);o2.connect(flt);flt.connect(gg);gg.connect(bus);
      o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);
    }else if(kind==='brass'){
      const o=c.createOscillator();o.type='square';o.frequency.value=fq;
      const flt=c.createBiquadFilter();flt.type='lowpass';flt.Q.value=3;
      flt.frequency.setValueAtTime(500,t);flt.frequency.linearRampToValueAtTime(2200,t+Math.min(.18,dur));
      const gg=c.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g*.9,t+.04);
      gg.gain.linearRampToValueAtTime(0,t+dur);o.connect(flt);flt.connect(gg);gg.connect(bus);o.start(t);o.stop(t+dur+.05);
    }else if(kind==='synth'){
      const o=c.createOscillator();o.type='sawtooth';o.frequency.value=fq;
      const o2=c.createOscillator();o2.type='square';o2.frequency.value=fq*.5;
      const flt=c.createBiquadFilter();flt.type='lowpass';flt.Q.value=8;
      flt.frequency.setValueAtTime(300,t);flt.frequency.exponentialRampToValueAtTime(2600,t+.22);flt.frequency.exponentialRampToValueAtTime(400,t+dur);
      const gg=c.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g*.8,t+.05);
      gg.gain.linearRampToValueAtTime(0,t+dur);o.connect(flt);o2.connect(flt);flt.connect(gg);gg.connect(bus);
      o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);
    }else{ // choir
      const o=c.createOscillator();o.type='triangle';o.frequency.value=fq;
      const o2=c.createOscillator();o2.type='sine';o2.frequency.value=fq*1.5;
      const vib=c.createOscillator();vib.frequency.value=3.2;const vg=c.createGain();vg.gain.value=4;vib.connect(vg);vg.connect(o.detune);
      const gg=c.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g*.7,t+dur*.4);
      gg.gain.linearRampToValueAtTime(0,t+dur);o.connect(gg);o2.connect(gg);gg.connect(bus);
      o.start(t);o2.start(t);vib.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);vib.stop(t+dur+.05);
    }
  };
  S.bass=function(midi,t,dur){
    const c=S.ctx;if(!c)return;const fq=f(midi);
    const o=c.createOscillator();o.type='sawtooth';o.frequency.value=fq;
    const flt=c.createBiquadFilter();flt.type='lowpass';flt.frequency.value=260;
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+.03);
    g.gain.setValueAtTime(.22,t+dur*.75);g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(flt);flt.connect(g);g.connect(S.music);o.start(t);o.stop(t+dur+.02);
    S.tone(t,dur,'sine',fq/2,null,.1,S.music);
  };

  // ---------- relógio musical ----------
  S.schedule=function(){
    if(!S.ctx)return;
    if(S.ctx.state==='suspended')return;
    const tr=TRACKS[S.track]||TRACKS.barra;
    const stepDur=60/tr.bpm/4;
    while(S.next<S.ctx.currentTime+.18){
      S.playStep(S.step,S.next,tr,stepDur);
      S.step=(S.step+1)%32;
      S.next+=stepDur*(S.step%2===0?1+tr.swing:1-tr.swing);
    }
  };
  S.playStep=function(s,t,tr,stepDur){
    const I=S.muted?0:S.intensity;
    const bar=Math.floor(s/8)%4;
    const deg=MOTIF[s%MOTIF.length];
    const mode=tr.mode;
    // baixo sempre que houver alguma camada
    if(s%8===0&&I>=1) S.bass(tr.root+mode[bar%mode.length],t,stepDur*7.4);
    // pad
    if(s%16===0&&I>=1) S.instr(tr.pad,tr.root+12+mode[bar%mode.length],t,stepDur*15,.035);
    // melodia: o tema reconhecível
    if(deg>=0&&I>=2){
      const octave=(bar===3?12:0);
      const note=tr.root+24+(mode[deg%mode.length]||0)+octave+(S.pirate?rnd(-2,2):0);
      S.instr(S.pirate?'synth':tr.lead,note,t,stepDur*(deg>4?2.2:1.4),.055);
    }
    // percussão
    if(I>=3){
      const p=tr.perc;
      if(s%8===0)S.kick(t,.55);
      if(s%8===4&&p.includes('kick'))S.kick(t,.4);
      if(s%4===2&&p.includes('lata'))S.lata(t);
      if(s===6||s===14){if(p.includes('clank'))S.clank(t,.05);if(p.includes('rail'))S.steam(t);if(p.includes('metal'))S.steam(t);}
      if(s===12&&p.includes('wood'))S.wood(t);
      if(s===10&&p.includes('water'))S.water(t);
      if(s===8&&p.includes('bell'))S.bell(f(tr.root+24),t,.04,1.6);
      if(s===2&&p.includes('crowd'))S.noiseHit(t,.7,'bandpass',900,1.2,.04,S.music);
      if(s===3&&p.includes('drum'))S.drum(t);
    }
    // coral/4ª camada na intensidade máxima
    if(I>=4&&(s===0||s===16)) S.instr('choir',tr.root+36+mode[(bar+2)%mode.length],t,stepDur*13,.035);
    if(I>=4&&s===12) S.instr(tr.lead,tr.root+36+mode[3],t,stepDur*3,.03);
  };

  return S;
})();

// =====================================================================
//  SFX — entrada e morte PRÓPRIAS para cada criatura
// =====================================================================
export const SFX=(function(){
  const now=()=>Snd.ctx?Snd.ctx.currentTime:0;
  const ok=()=>!!Snd.ctx;
  const api={
    shoot(){if(!ok())return;const t=now();Snd.tone(t,.09,'square',900,320,.10);Snd.noiseHit(t,.04,'highpass',3000,1,.08);},
    can(){if(!ok())return;const t=now();Snd.tone(t,.18,'square',1700,null,.06);Snd.noiseHit(t,.16,'bandpass',3400,4,.12);},
    hit(){if(!ok())return;Snd.noiseHit(now(),.06,'lowpass',1400,1,.16);},
    squish(){if(!ok())return;const t=now();const fq=Snd.noiseHit(t,.28,'lowpass',2200,2,.4);fq.frequency.exponentialRampToValueAtTime(160,t+.28);Snd.tone(t,.16,'sine',150,50,.24);},
    pop(){if(!ok())return;Snd.tone(now(),.06,'square',420,900,.07);},
    plop(){if(!ok())return;const t=now();Snd.tone(t,.2,'sine',180,650,.2);Snd.noiseHit(t,.28,'lowpass',900,1,.3);},
    explode(){if(!ok())return;const t=now();const fq=Snd.noiseHit(t,.75,'lowpass',3600,1,.8);fq.frequency.exponentialRampToValueAtTime(70,t+.7);Snd.tone(t,.55,'sine',90,26,.65);},
    place(){if(!ok())return;const t=now();Snd.noiseHit(t,.12,'lowpass',520,1,.35);Snd.tone(t,.16,'square',720,null,.04);},
    pickup(){if(!ok())return;const t=now();Snd.tone(t,.06,'square',1750,null,.06);Snd.tone(t+.05,.08,'square',2400,null,.05);},
    cash(){if(!ok())return;const t=now();[880,1320,1760].forEach((fv,i)=>Snd.tone(t+i*.06,.16,'square',fv,null,.05));},
    crash(){if(!ok())return;const t=now();Snd.noiseHit(t,.9,'lowpass',1200,1,.8);Snd.tone(t,.9,'sine',70,24,.6);for(let i=0;i<5;i++)Snd.noiseHit(t+i*.07,.05,'bandpass',rnd(700,2600),4,.32);},
    gust(){if(!ok())return;const t=now();const c=Snd.ctx,s=c.createBufferSource();s.buffer=Snd.noise;s.loop=true;
      const fq=c.createBiquadFilter();fq.type='bandpass';fq.frequency.value=650;fq.Q.value=1.4;
      const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.26,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+.55);
      s.connect(fq);fq.connect(g);g.connect(Snd.sfx);s.start(t);s.stop(t+.6);},
    light(){if(!ok())return;Snd.noiseHit(now(),.08,'bandpass',4800,2,.08);},
    hypno(){if(!ok())return;const t=now();for(let i=0;i<5;i++)Snd.tone(t+i*.08,.3,'sine',300+i*55,null,.045);},
    steal(){if(!ok())return;const t=now();Snd.tone(t,.12,'square',1250,520,.08);Snd.tone(t+.08,.12,'square',880,300,.06);},
    dig(){if(!ok())return;const t=now();for(let i=0;i<4;i++)Snd.noiseHit(t+i*.07,.09,'lowpass',320,1,.22);},
    bite(){if(!ok())return;Snd.noiseHit(now(),.05,'bandpass',2500,3,.2);},
    metal(){if(!ok())return;const t=now();Snd.tone(t,.38,'square',1080,null,.07);Snd.tone(t,.38,'square',1610,null,.045);Snd.noiseHit(t,.28,'lowpass',1900,1,.32);},
    // Lata batendo: o cachorro empurra, o passageiro troca de trilho.
    lata(){if(!ok())return;const t=now();Snd.tone(t,.12,'square',1700,null,.07);Snd.noiseHit(t,.1,'bandpass',2700,6,.14);},
    // Vapor: o maquinista apita, o gerente abre a reunião.
    steam(){if(!ok())return;const t=now();Snd.noiseHit(t,.45,'highpass',3000,1,.14);Snd.noiseHit(t+.05,.3,'bandpass',5200,1,.08);},
    laugh(){if(!ok())return;const t=now();[175,155,132,120].forEach((fv,i)=>Snd.tone(t+i*.19,.16,'sawtooth',fv,fv*.86,.12));},
    reflect(){if(!ok())return;const t=now();Snd.tone(t,.22,'square',2400,null,.07);Snd.tone(t+.04,.22,'square',3600,null,.04);},
    ui(){if(!ok())return;const t=now();Snd.tone(t,.035,'square',900,null,.035);},
    back(){if(!ok())return;const t=now();Snd.tone(t,.05,'square',500,null,.04);},
    level(){if(!ok())return;const t=now();[523,659,784].forEach((fv,i)=>Snd.tone(t+i*.08,.3,'triangle',fv,null,.07));},
    coin(){if(!ok())return;const t=now();Snd.tone(t,.1,'square',1320,null,.05);Snd.tone(t+.09,.18,'square',1760,null,.05);},
    human(){if(!ok())return;const t=now();Snd.noiseHit(t,.5,'bandpass',420,1,.1);Snd.tone(t,.5,'sine',120,95,.1);},
    alarm(){if(!ok())return;const t=now();for(let i=0;i<3;i++)Snd.tone(t+i*.24,.2,'square',440,880,.08);},
    bossIntro(){if(!ok())return;const t=now();Snd.tone(t,2.2,'sine',55,40,.55);Snd.tone(t,.4,'square',110,null,.12);Snd.tone(t+2.3,1.6,'sawtooth',82,55,.15);Snd.noiseHit(t,2.4,'lowpass',200,1,.2);},
    bossDeath(){if(!ok())return;const t=now();[0,.18,.42,.8].forEach((d,i)=>{Snd.tone(t+d,1.2,'sine',140/(i+1),40,.5);Snd.noiseHit(t+d,.9,'lowpass',700,1,.4);});api.laugh();},
    // ---- entrada: dá pra reconhecer quem vem sem olhar ----
    enter(type){
      if(!ok())return;const t=now();
      const map={
        baiacu:()=>{Snd.tone(t,.1,'sine',330,90,.18);Snd.noiseHit(t,.07,'lowpass',900,1,.14);},
        enguia:()=>{const fq=Snd.noiseHit(t,.5,'bandpass',1600,3,.16);fq.frequency.exponentialRampToValueAtTime(210,t+.5);Snd.tone(t,.4,'sine',200,70,.06);},
        ova:()=>{Snd.tone(t,.22,'sine',110,240,.24);Snd.noiseHit(t,.18,'lowpass',500,1,.24);},
        larva:()=>{Snd.tone(t,.05,'square',1500,2100,.05);},
        caranguejo:()=>{Snd.noiseHit(t,.04,'bandpass',3200,9,.19);Snd.noiseHit(t+.13,.04,'bandpass',2700,9,.17);},
        caranguejo_m:()=>{Snd.noiseHit(t,.04,'bandpass',3200,9,.19);Snd.noiseHit(t+.13,.04,'bandpass',2700,9,.17);Snd.tone(t+.2,.3,'square',160,null,.05);},
        bomba:()=>{Snd.noiseHit(t,.4,'highpass',4200,1,.1);Snd.tone(t,.4,'square',1200,null,.015);},
        bento:()=>{Snd.tone(t,.5,'sine',70,42,.5);api.laugh();},
        gaivota:()=>{Snd.tone(t,.28,'sawtooth',780,300,.1);Snd.tone(t+.1,.2,'sawtooth',620,240,.07);},
        gaivota_r:()=>{Snd.tone(t,.2,'sawtooth',980,420,.12);Snd.tone(t+.14,.3,'sawtooth',760,260,.09);Snd.noiseHit(t,.3,'bandpass',2200,2,.08);},
        tatu:()=>{for(let i=0;i<3;i++)Snd.noiseHit(t+i*.13,.1,'lowpass',260,1,.24);},
        lata:()=>{Snd.tone(t,.4,'square',1750,null,.05);Snd.tone(t,.4,'square',2630,null,.03);Snd.noiseHit(t,.1,'bandpass',4000,6,.15);},
        fantasma:()=>{Snd.tone(t,.8,'sine',900,880,.012);},
        polvo:()=>{const fq=Snd.noiseHit(t,.55,'bandpass',900,3,.12);fq.frequency.exponentialRampToValueAtTime(300,t+.55);},
        agua:()=>{Snd.tone(t,.9,'sine',1300,1250,.015);Snd.noiseHit(t,.7,'highpass',3600,1,.02);},
        mariposa:()=>{Snd.tone(t,.25,'sine',700,900,.02);Snd.noiseHit(t+.1,.2,'highpass',5000,1,.03);},
        sapo:()=>{Snd.tone(t,.08,'square',180,90,.14);Snd.noiseHit(t+.12,.1,'lowpass',700,1,.12);},
        piranha:()=>{Snd.noiseHit(t,.05,'bandpass',3600,5,.13);Snd.tone(t+.06,.05,'square',2200,null,.03);},
        baleia:()=>{Snd.tone(t,1.4,'sine',95,62,.28);Snd.tone(t+.2,1.2,'sine',140,90,.12);},
        pescador:()=>{api.human();Snd.tone(t+.5,.4,'sine',300,260,.03);},
        passageiro:()=>{Snd.steam(t);Snd.tone(t+.2,.3,'sine',200,140,.06);},
        faroleiro:()=>{Snd.bell(440,t,.12,3);Snd.tone(t+1,.9,'sine',70,50,.3);},
        maquinista:()=>{Snd.steam(t);[0,.3,.6].forEach((d,i)=>Snd.tone(t+d,.25,'square',300-i*40,null,.06));},
        peixe_mae:()=>{Snd.tone(t,.9,'sine',130,60,.3);Snd.tone(t+.3,.7,'sine',180,80,.12);},
        gerente:()=>{Snd.steam(t);Snd.tone(t+.1,.5,'sawtooth',110,null,.1);Snd.noiseHit(t+.2,.5,'bandpass',600,2,.06);},
        mare:()=>{for(let i=0;i<4;i++)Snd.noiseHit(t+i*.5,1.6,'lowpass',420,1,.14);Snd.tone(t,3,'sine',46,38,.2);}
      };
      (map[type]||(()=>api.squish()))();
    },
    // ---- morte: remate próprio ----
    death(type){
      if(!ok())return;const t=now();
      const map={
        baiacu:()=>{Snd.tone(t,.45,'sine',600,140,.18);Snd.tone(t+.42,.06,'sine',900,1500,.1);},
        enguia:()=>{Snd.tone(t,.5,'sine',220,50,.18);Snd.noiseHit(t,.5,'lowpass',400,1,.16);},
        ova:()=>{api.plop();Snd.tone(t+.15,.3,'square',900,1600,.1);},
        larva:()=>{Snd.tone(t,.06,'square',500,120,.08);},
        caranguejo:()=>{api.metal();Snd.noiseHit(t+.2,.3,'bandpass',2400,8,.12);},
        caranguejo_m:()=>{api.metal();Snd.tone(t+.15,.4,'sawtooth',220,180,.1);api.laugh();},
        bomba:()=>{Snd.noiseHit(t,.16,'bandpass',900,2,.15);Snd.tone(t,.18,'square',300,90,.12);api.explode();},
        bento:()=>{api.bossDeath();},
        gaivota:()=>{Snd.tone(t,.55,'sawtooth',400,60,.13);Snd.noiseHit(t,.3,'lowpass',700,1,.16);},
        gaivota_r:()=>{Snd.tone(t,.55,'sawtooth',600,60,.13);api.metal();},
        tatu:()=>{Snd.noiseHit(t,.6,'lowpass',200,1,.3);Snd.tone(t,.5,'sine',100,45,.16);},
        lata:()=>{api.metal();Snd.tone(t,.3,'square',2100,400,.06);},
        fantasma:()=>{Snd.tone(t,.9,'sine',1200,180,.08);},
        polvo:()=>{for(let i=0;i<11;i++)Snd.tone(t+i*.073,.1,'square',rnd(900,2600),null,.035);Snd.noiseHit(t,.3,'highpass',4000,1,.1);},
        agua:()=>{Snd.noiseHit(t,.8,'highpass',5000,1,.14);Snd.tone(t,.8,'sine',1600,300,.04);},
        mariposa:()=>{Snd.noiseHit(t,.25,'highpass',6000,1,.08);Snd.tone(t,.2,'sine',1200,300,.03);},
        sapo:()=>{Snd.tone(t,.2,'square',260,70,.14);Snd.noiseHit(t,.15,'lowpass',600,1,.18);api.plop();},
        piranha:()=>{Snd.tone(t,.06,'square',1800,600,.08);Snd.noiseHit(t,.08,'highpass',4200,4,.1);},
        baleia:()=>{Snd.tone(t,1.6,'sine',95,38,.3);Snd.noiseHit(t,1.2,'lowpass',300,1,.2);},
        pescador:()=>{api.human();},
        passageiro:()=>{Snd.steam(t);Snd.tone(t+.1,.3,'sine',160,70,.08);},
        faroleiro:()=>{api.bossDeath();Snd.bell(220,t+.3,.1,4);},
        maquinista:()=>{api.bossDeath();Snd.steam(t);Snd.steam(t+.4);},
        peixe_mae:()=>{api.bossDeath();for(let i=0;i<6;i++)api.pop();},
        gerente:()=>{api.bossDeath();Snd.steam(t+.2);},
        mare:()=>{for(let i=0;i<7;i++)Snd.noiseHit(t+i*.4,1.8,'lowpass',500,1,.12);}
      };
      (map[type]||(()=>api.squish()))();
    }
  };
  return api;
})();

