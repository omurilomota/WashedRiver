/* =====================================================================
   save.js — persistência e metajogo (localStorage, 3 slots)
   Nada aqui depende do DOM. Tudo é tolerante a arquivo:// e a save velho.
   ===================================================================== */
const SaveDB=(function(){
  const KEY='marepodre_save_v3';

  // Um slot novo. A ideia é que todo campo tenha fallback em ensure().
  function blankSlot(n){
    return {
      name:'SLOT '+(n+1), started:Date.now(), lastPlayed:0,
      campaign:0,              // maior índice de mapa liberado
      stars:{}, best:{},       // melhor resultado por mapa
      oldScrap:0,              // moeda meta, nunca reseta
      tree:{},                 // nível dos nós comprados
      seenB:{}, seenM:{},      // bestiário e galeria
      ach:{}, endings:{}, flags:{},
      daily:{date:'',score:0},
      endlessBest:{0:0,1:0,2:0},
      bossBest:{},
      runs:0, kills:0, minutes:0
    };
  }
  function blankData(){
    return {
      v:3, active:0,
      options:{master:.9,music:.62,sfx:.85,shake:1,cb:0,font:1,mute:0},
      slots:[blankSlot(0),blankSlot(1),blankSlot(2)]
    };
  }
  function clone(o){return JSON.parse(JSON.stringify(o));}

  let data=blankData();
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed&&Array.isArray(parsed.slots)&&parsed.slots.length===3){
        data=parsed;
        data.options=Object.assign({master:.9,music:.62,sfx:.85,shake:1,cb:0,font:1,mute:0},parsed.options||{});
        for(let i=0;i<3;i++)data.slots[i]=ensure(data.slots[i],i);
      }
    }
  }catch(e){/* save quebrado: começa limpo, sem drama */}

  // Preenche campos que faltam (save antigo / dados parciais)
  function ensure(s,i){
    const b=blankSlot(i);
    s=Object.assign(b,s||{});
    s.stars=s.stars||{}; s.best=s.best||{}; s.tree=s.tree||{}; s.seenB=s.seenB||{};
    s.seenM=s.seenM||{}; s.ach=s.ach||{}; s.endings=s.endings||{}; s.flags=s.flags||{};
    s.daily=s.daily||{date:'',score:0}; s.endlessBest=Object.assign({0:0,1:0,2:0},s.endlessBest||{});
    s.bossBest=s.bossBest||{};
    s.name=s.name||('SLOT '+(i+1));
    return s;
  }
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){/* modo privado: joga sem salvar */}
  }

  const api={
    get data(){return data;},
    get options(){return data.options;},
    get slot(){return data.slots[data.active];},
    get slotIndex(){return data.active;},
    save:persist,
    ensureAll(){for(let i=0;i<3;i++)data.slots[i]=ensure(data.slots[i],i);persist();},
    setSlot(i){if(i>=0&&i<3){data.active=i;persist();}},
    resetSlot(i){data.slots[i]=blankSlot(i);if(data.active===i)data.active=i;persist();},
    slotInfo(i){return data.slots[i]||blankSlot(i);},

    // ---- sucata velha e progresso ----
    addScrap(n){const s=api.slot;s.oldScrap=Math.max(0,(s.oldScrap||0)+Math.round(n));persist();return s.oldScrap;},
    unlockMap(i){const s=api.slot;if(i>s.campaign){s.campaign=i;s.flags['viu_mapa'+i]=true;persist();} },
    setStars(map,best,stars){const s=api.slot;
      s.stars[map]=Math.max(s.stars[map]||0,stars||0);
      s.best[map]=Math.max(s.best[map]||0,best||0);persist();},
    setEnding(id,text){const s=api.slot;if(!s.endings[id]){s.endings[id]=text;persist();}},
    finishRun(summary){ // chamado no fim de qualquer partida
      const s=api.slot;s.runs=(s.runs||0)+1;
      s.kills=(s.kills||0)+(summary.kills||0);
      s.minutes=(s.minutes||0)+Math.round((summary.time||0)/60);
      s.lastPlayed=Date.now();persist();
    },

    // ---- árvore ----
    nodeLvl(id){return api.slot.tree[id]||0;},
    buyNode(id){
      const node=(typeof TREE!=='undefined')?TREE.find(n=>n.id===id):null;
      if(!node)return false;
      const cur=api.nodeLvl(id);
      if(cur>=node.max)return false;
      if(node.req&&api.nodeLvl(node.req)<=0)return false;
      const cost=costOf(node,cur);
      if(api.slot.oldScrap<cost)return false;
      api.slot.oldScrap-=cost;api.slot.tree[id]=cur+1;persist();return true;
    },
    // ---- bestiário / galeria / conquistas ----
    seenEnemy(id){if(id&&!api.slot.seenB[id]){api.slot.seenB[id]=1;persist();}},
    seenMach(id){if(id&&!api.slot.seenM[id]){api.slot.seenM[id]=1;persist();}},
    achievement(id){
      if(!id)return false;
      if(api.slot.ach[id])return false;
      api.slot.ach[id]=Date.now();persist();return true;
    },
    hasAch(id){return !!api.slot.ach[id];},
    record(mode,score){
      const s=api.slot;
      if(mode==='endless'){const d=s.flags.endlessDiff||0;s.endlessBest[d]=Math.max(s.endlessBest[d]||0,score);}
      else if(mode==='boss'){s.bossBest[score.map]=Math.min(s.bossBest[score.map]||9999,score.time);}
      persist();
    },
    recordDaily(score){
      const s=api.slot,today=dayKey();
      if(s.daily.date!==today){s.daily={date:today,score:0};}
      s.daily.score=Math.max(s.daily.score,score);persist();
    },
    // ---- opções ----
    opt(k,v){data.options[k]=v;persist();}
  };

  // Custo crescente do nó: cada nível encarece um pouco.
  function costOf(node,lvl){
    if(typeof node.cost==='function')return node.cost(lvl);
    return Math.round(node.cost*Math.pow(1.55,lvl||0));
  }
  // Efeitos agregados da árvore, consultados no início da partida.
  api.eff=function(){
    const e={startScrap:0,extraOffer:false,repair:0,shield:0,machineHp:1,discount:0,luck:0,
             unlocks:{},metaBonus:0,startBoias:0,bossSecond:false};
    if(typeof TREE==='undefined')return e;
    for(const n of TREE){
      const lvl=api.nodeLvl(n.id);if(!lvl)continue;
      if(n.unlock)e.unlocks[n.unlock]=true;
      if(!n.per)continue;
      for(const k in n.per)e[k]=(e[k]||0)+n.per[k]*lvl;
    }
    return e;
  };
  api.costOf=costOf;
  return api;
})();

// Chave do dia local (usa o relógio do sistema: diário funciona offline)
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// RNG determinístico para o desafio diário
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Conquistas: ids, nome e descrição. "oculta" não aparece até ser obtida.
const ACHIEVEMENTS=[
  {id:'ze_amigo',nome:'ZÉ FALOU',desc:'Você insistiu. Ele contou do irmão.'},
  {id:'pirata',nome:'FREQUÊNCIA LIVRE',desc:'Sintonizou a estação que não existe.'},
  {id:'geladeiras',nome:'SEIS GELADEIRAS',desc:'No cemitério. Exatamente seis. A Dona Lú viu.'},
  {id:'toquinho_viu',nome:'TOQUINHO VIU TUDO',desc:'Ele viu. Ele sempre vê.'},
  {id:'bota',nome: 'BOTAS NA AREIA',desc:'As botas do Seu Bento foram cumprimentadas.'},
  {id:'noite10',nome:'MADRUGADA 10',desc:'Chegou à onda 10 da Noite Infinita.'},
  {id:'tres_finais',nome:'TRÊS FINS',desc:'Terminou a campanha de três jeitos. Nenhum limpo.'},
  {id:'pescador',nome:'ELE LEMBROU',desc:'Redirecionou o Pescador sem matar.'},
  {id:'baleia',nome:'MÃE VAI FICAR BRAVA',desc:'A baleia-filhote não chegou do outro lado.'},
  {id:'sem_farol',nome:'NO ESCURO',desc:'Sobreviveu ao Faroleiro sem acender holofote.'},
  {id:'maré',nome:'A MARÉ',desc:'Amanheceu no Cemitério de Barcos.'},
  {id:'sandbox50',nome:'TESTADOR DE GAMBIARRA',desc:'Cinquenta engenhocas na areia. Nenhuma boa.'}
];
function achName(id){const a=ACHIEVEMENTS.find(x=>x.id===id);return a?a.nome:id;}
