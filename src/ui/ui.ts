/**
 * ui.ts — telas, menus, HUD, codex, árvore, loja e epílogo.
 *
 * DOM para texto; canvas para HUD. Tudo acionado por `data-act`.
 *
 * A UI observa o estado e **emite** ações (`Game.xxx`); o jogo nunca
 * importa a UI para decidir regra — só para mostrar e avisar.
 */
import { H, STRUCTURES, W, clamp, fmt, plantY, shuffle } from '../core/constants';
import { ctx } from '../core/canvas';
import { G, Game } from '../core/state';
import { dayKey, hashStr, mulberry } from '../core/rng';
import {
  ACHIEVEMENTS,
  BOSSES,
  DAILY_MODS,
  ECONOMIA,
  ENDINGS,
  ENEMY,
  ENEMY_ORDER,
  MACH,
  MACH_ORDER,
  MAPS,
  RADIO,
  TREE,
  TREE_BRANCHES,
  UPG,
} from '../data';
import { KEY, SaveDB } from '../save/storage';
import { SFX, Snd, TRACKS } from '../audio/audio';
import { drawMachine, rr } from '../render/sprites';
import { drawBoss } from '../render/creatures';
import { availableMachines, impostoDoRound, machCost, structuresAlive } from '../game/economy';

export const UI=(function(){
  const $=(id: string): HTMLElement|null=>document.getElementById(id);
  /** Elemento que precisa existir: se sumiu, o jogo quebrou de vez. */
  const must=(id: string): HTMLElement=>{
    const el=$(id);
    if(!el)throw new Error('elemento #'+id+' não encontrado no documento');
    return el;
  };
  const scr=must('screen'),shopEl=must('shop'),top=must('topbar');

  // ---------- utilidades ----------
  function stars(n: number){return '<span class="stars">'+'★'.repeat(n)+'☆'.repeat(3-n)+'</span>';}
  function openScreens(){scr.classList.remove('hidden');}
  function hide(){scr.classList.add('hidden');shopEl.classList.add('hidden');}
  function setScreen(html){scr.innerHTML='<div class="scr"><div class="scr-inner">'+html+'</div></div>';openScreens();}
  function btn(label: string,act: string,arg?: string | number,cls?: string){return '<button class="btn '+(cls||'')+'" data-act="'+act+'"'+(arg!==undefined?' data-arg="'+arg+'"':'')+'>'+label+'</button>';}
  function tag(t: string,cls?: string){return '<span class="tag '+(cls||'')+'">'+t+'</span>';}
  function meta(){return SaveDB.slot.oldScrap||0;}
  const toast=(kind,text)=>{
    const box=$('toasts');if(!box)return;
    const d=document.createElement('div');d.className='toast '+(kind||'');d.textContent=text;box.appendChild(d);
    while(box.children.length>4&&box.firstChild)box.removeChild(box.firstChild);
    setTimeout(()=>{d.style.transition='opacity .4s';d.style.opacity='0';setTimeout(()=>d.remove(),420);},kind==='ach'?6000:5200);
  };
  function achCount(){return Object.keys(SaveDB.slot.ach||{}).length;}
  function mapUnlocked(i){return i<=SaveDB.slot.campaign;}

  // ---------- TÍTULO ----------
  function title(){
    const s=SaveDB.slot;
    const slotHTML=[0,1,2].map(i=>{const sl=SaveDB.slotInfo(i);
      return '<div class="slot '+(i===SaveDB.slotIndex?'on':'')+'" data-act="slot" data-arg="'+i+'" tabindex="0">'+
        '<b>'+sl.name+'</b><small>'+(sl.oldScrap||0)+' sucata velha · '+Object.keys(sl.ach||{}).length+' selos</small>'+
        '<small>Mapa '+(sl.campaign+1)+'/6'+(sl.lastPlayed?' · jogado':' · novo')+'</small></div>';}).join('');
    setScreen(
      '<div class="logo">MARÉ<br><em>PODRE</em></div>'+
      '<div class="logo-sub">A COSTA NÃO PERDOA · CAPÍTULO FINAL</div>'+
      '<div class="slotbar">'+slotHTML+'</div>'+
      '<div class="menu">'+
        (s.campaign>0||s.lastPlayed? btn('CONTINUAR CAMPANHA','continue','','primary') : btn('COMEÇAR A CAMPANHA','maps','','primary'))+
        btn('MAPAS','maps')+
      '</div>'+
      '<div class="menu">'+
        btn('NOITE INFINITA','endlessmenu','','small')+
        btn('MODO CHEFE','bossmenu','','small')+
        btn('DESAFIO DO DIA','dailymenu','','small')+
        btn('SANDBOX','sandbox','','small')+
      '</div>'+
      '<div class="menu">'+
        btn('BESTIÁRIO','codex','','tiny')+btn('ÁRVORE','tree','','tiny')+btn('OPÇÕES','options','','tiny')+
        btn('SLOTS','slots','','tiny')+btn('COMO JOGAR','help','','tiny')+
      '</div>'+
      '<div class="bottomline">Sucata velha: <b class="gold">'+meta()+'</b> · selos: '+achCount()+'/'+ACHIEVEMENTS.length+' · mapa liberado: '+Math.min(MAPS.length,s.campaign+1)+'/'+MAPS.length+'<br>'+
      'A música, os bichos e a vila são sintetizados na hora. Clique uma vez pra liberar o som.</div>'
    );
    top.classList.add('hidden');
  }

  // ---------- SLOTS ----------
  function slots(){
    const cards=[0,1,2].map(i=>{const s=SaveDB.slotInfo(i);
      return '<div class="slot '+(i===SaveDB.slotIndex?'current':'')+'">'+
        '<h3>'+s.name+'</h3>'+
        '<div class="kv">sucata velha: <b>'+s.oldScrap+'</b><br>campanha: <b>'+Math.min(MAPS.length,s.campaign+1)+'/'+MAPS.length+'</b><br>partidas: <b>'+(s.runs||0)+'</b> · selos: <b>'+Object.keys(s.ach||{}).length+'/'+ACHIEVEMENTS.length+'</b><br>'+
        'último jogo: '+(s.lastPlayed?new Date(s.lastPlayed).toLocaleDateString('pt-BR'):'nunca')+'</div>'+
        '<div class="row" style="justify-content:flex-start">'+btn('USAR','slot',i,'small')+
        '<button class="btn dark" data-act="newslot" data-arg="'+i+'">APAGAR</button></div></div>';}).join('');
    setScreen('<h2 style="font-family:Impact;font-weight:400;color:var(--bone);font-size:30px;margin:0">SLOTS</h2>'+
      '<p class="muted">Cada slot tem sua própria árvore, campanha e bestiário. A sucata velha não viaja.</p>'+
      '<div class="slots">'+cards+'</div>'+
      '<div class="space"></div>'+btn('VOLTAR','title','','small'));
  }

  // ---------- MAPAS ----------
  function mapArt(m){const p=m.pal;return 'background:linear-gradient(180deg,'+p.sky1+' 0%,'+p.sky2+' 55%,'+p.water+' 56%,'+p.water+' 100%)';}
  /**
   * Tela de seleção de plantas (BLOCO M.4).
   *
   * Antes da partida o jogador monta um deck de 7 e joga com ele: menos
   * opções, mais compromisso. Cartas grandes, contador, trava bloqueada
   * mostrando o que ainda não existe, e o Zé comentando a escolha.
   */
  let deckSel: string[] = [];
  function deckScreen(map: number){
    deckSel = (SaveDB.getDeck(map) || []).slice(0, 7);
    api.deckMapa = map;
    drawDeck(map);
  }
  function drawDeck(map: number){
    // Pé de Cabra é ferramenta, não peça: não entra no deck
    const liberadas = availableMachines().filter(k => k !== 'remover');
    const trava = MACH_ORDER.filter(k => MACH[k] && k !== 'remover' && !liberadas.includes(k));
    const cartas = liberadas.map(k => {
      const on = deckSel.includes(k);
      const custo = machCost(k);
      return '<div class="node '+(on ? 'max' : '')+'" data-act="deckpick" data-arg="'+k+'" tabindex="0" style="cursor:pointer">'+
        '<h4>'+MACH[k].nome+(on ? ' ✔' : '')+'</h4>'+
        '<small>'+MACH[k].desc+'</small>'+
        '<div class="cost"><span>'+(k === 'coisa_ze' ? 'DO ZÉ' : custo + ' sucata')+'</span><span>vida '+(MACH[k].hp||'?')+' · '+(MACH[k].cd||'?')+'s</span></div>'+
        '</div>';
    }).join('');
    const tranca = trava.map(k => {
      const dica = SaveDB.slot.seenM[k] ? MACH[k].sin : 'O Zé ainda não trouxe isso.';
      return '<div class="node locked"><h4>???</h4><small>'+dica+'</small></div>';
    }).join('');
    const n = deckSel.length;
    const pode = n === 7;
    const zeDeck = zeComentaDeck(deckSel, liberadas);
    const top = '<h2 style="font-family:Impact;font-weight:400;color:var(--bone);font-size:32px;margin:0">O QUE LEVAR</h2>'+
      '<p class="muted">Sete peças. Escolhe com cuidado — na volta pro corredor não tem troca.</p>'+
      '<div class="kv" style="margin:8px 0">ESCOLHIDAS: <b class="'+(pode ? 'gold' : 'bad')+'">'+n+'/7</b>'+
      (pode ? '' : ' <span class="muted">— faltam ' + (7 - n) + '</span>')+'</div>'+
      (zeDeck ? '<p class="ze" style="border-left:2px solid #6c5b21;padding-left:8px;color:#e3cf95;font-style:italic;margin:0 0 10px">ZÉ: '+zeDeck+'</p>' : '')+
      '<div class="row">'+btn(pode ? 'COMEÇAR' : 'FALTAM ' + (7 - n), pode ? 'deckgo' : 'nada', '' + map, pode ? 'primary' : '')+'</div>'+
      '<div class="space"></div>';
    const grade = '<div class="branches" style="grid-template-columns:repeat(2,1fr)">'+cartas+tranca+'</div>';
    setScreen(top + grade +
      '<div class="row" style="margin-top:14px">'+btn('GUARDAR PRA DEPOIS','decksave','' + map, 'small')+btn('VOLTAR','maps','','small')+'</div>');
  }
  /** O Zé comenta a escolha: peça cara demais, barata demais, ou balde. */
  function zeComentaDeck(deck: string[], liberadas: string[]): string {
    if (deck.length === 0) return 'Nada? Vai de mão abanando, então.';
    const custo = (k: string) => MACH[k] ? (MACH[k].cost || 0) : 0;
    const soma = deck.reduce((a, k) => a + custo(k), 0);
    const mediano = liberadas.map(custo).sort((a, b) => a - b)[Math.floor(liberadas.length / 2)] || 100;
    const baldes = deck.filter(k => k === 'geladeira' || k === 'geladeira_bomba').length;
    if (baldes >= 4) return 'Quatro geladeira. Isso é mudança, não defesa.';
    if (soma > mediano * deck.length * 1.6) return 'Tudo caro. Quando a maré vier, tu vai tá catando moeda.';
    if (soma < mediano * deck.length * 0.5) return 'Tudo barato. Corajoso. Ou com pressa.';
    if (deck.includes('coisa_ze')) return 'Levando a minha obra. Ela funciona. Mais ou menos.';
    return 'Escolheu. Agora aguenta.';
  }
  function maps(){
    const cards=MAPS.map((m,i)=>{
      const unl=mapUnlocked(i);const st=SaveDB.slot.stars[i]||0;
      // resetar save deste mapa: só faz sentido em mapa já aberto/jogado
      const podeLimpar=unl&&(st>0||(SaveDB.slot.best[i]||0)>0);
      return '<div class="mapcard '+(unl?'':'locked')+'" data-act="'+(unl?'deck':'nada')+'" data-arg="'+i+'">'+
        '<div class="art" style="'+mapArt(m)+'"><div class="no">'+(i+1)+'</div>'+(unl?'<div class="stars">'+stars(st)+'</div>':'<div class="stars" style="color:#777">TRANCADO</div>')+'</div>'+
        '<h3>'+m.nome+'</h3><p>'+m.sub+'</p>'+
        '<div class="tags">'+tag(m.weather.toUpperCase())+tag(m.resShort,'hot')+tag(m.boss==='mare'?'FINAL':'CHEFE')+'</div>'+
        '<p style="margin-top:6px;color:#8d907c">'+m.bio+'</p>'+
        (podeLimpar?'<p style="margin-top:8px">'+btn('APAGAR ESTE MAPA','resetmapa',''+i,'tiny')+'</p>':'')+
        '</div>';}).join('');
    setScreen('<h2 style="font-family:Impact;font-weight:400;color:var(--bone);font-size:30px;margin:0">A COSTA</h2>'+
      '<p class="muted">Três ondas e um chefe por mapa. Terminar um mapa abre o próximo. Você pode voltar e melhorar a nota.</p>'+
      '<div class="mapgrid">'+cards+'</div>'+
      '<div class="space"></div>'+btn('VOLTAR','title','','small'));
  }

  // ---------- MODOS ----------
  function endlessMenu(){
    const map=clamp(SaveDB.slot.campaign,0,5);
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">NOITE INFINITA</h2>'+
      '<p class="muted">Sem chefe marcado, sem amanhã. A cada três ondas vem um Seu Bento de encomenda. Melhor marca: '+JSON.stringify(SaveDB.slot.endlessBest)+'.</p>'+
      '<div class="mapgrid" style="grid-template-columns:repeat(3,1fr)">'+
      [['DEVAGAR','costa calma, maré mansa',0],['COMO SEMPRE','do jeito que o mar gosta',1],['SEM DÓ','eles comeram o almoço',2]].map(d=>
        '<div class="mapcard" data-act="deckendless" data-arg="'+d[2]+'"><div class="art" style="background:linear-gradient(180deg,#1a2a2e,#0a1418)"><div class="no">∞</div></div>'+
        '<h3>'+d[0]+'</h3><p>'+d[1]+'</p><div class="tags">'+tag('MAPA: '+MAPS[map].nome)+'</div></div>').join('')+
      '</div><div class="space"></div>'+btn('VOLTAR','title','','small'));
  }
  function bossMenu(){
    const cards=MAPS.map((m,i)=>{const b=BOSSES[m.boss];const unl=mapUnlocked(i);const best=SaveDB.slot.bossBest[i];
      return '<div class="mapcard '+(unl?'':'locked')+'" data-act="'+(unl?'deckboss':'nada')+'" data-arg="'+i+'">'+
        '<div class="art" style="'+mapArt(m)+'"><div class="no">'+(i+1)+'</div></div>'+
        '<h3>'+b.nome+'</h3><p>'+b.desc+'</p><div class="tags">'+tag('FASES: '+(m.boss==='mare'?'SOBREVIVER':m.boss==='gerente'?'7':'3'))+'</div>'+
        (best?'<p class="gold">melhor: '+Math.round(best)+'s</p>':'')+'</div>';}).join('');
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">MODO CHEFE</h2>'+
      '<p class="muted">Sem onda de aquecimento. Você entra com 200 de sucata e a vila inteira de pé. É treino. Sua vila quebra de verdade.</p>'+
      '<div class="mapgrid">'+cards+'</div><div class="space"></div>'+btn('VOLTAR','title','','small'));
  }
  function dailyPreview(){
    const seed=hashStr(dayKey()+(SaveDB.slotIndex+1)),rng=mulberry(seed);
    const mods=shuffle(DAILY_MODS.slice()).filter(()=>rng()<.4).slice(0,2);
    const mapIndex=Math.floor(rng()*Math.min(6,SaveDB.slot.campaign+1));
    return{mods:mods.length?mods:[DAILY_MODS[0]],map:mapIndex};
  }
  function dailyMenu(){
    const d=dailyPreview(),done=SaveDB.slot.daily&&SaveDB.slot.daily.date===dayKey();
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">DESAFIO DO DIA</h2>'+
      '<p class="muted">Data do sistema: '+dayKey()+' · mapa: '+MAPS[d.map].nome+'</p>'+
      '<div class="grid2">'+d.mods.map(m=>'<div class="offer"><div class="kind">MODIFICADOR</div><h4>'+m.nome+'</h4><p>'+m.desc+'</p></div>').join('')+'</div>'+
      '<p class="muted" style="margin-top:10px">Recorde de hoje: <b class="gold">'+(done?SaveDB.slot.daily.score:0)+'</b> ondas aguentadas.</p>'+
      '<div class="row">'+btn('JOGAR O DIA','daily','','primary')+btn('VOLTAR','title','','small')+'</div>');
  }

  // ---------- PAUSA ----------
  function pause(){
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:34px;color:var(--bone)">PAUSA</h2>'+
      '<p class="muted">'+G.map.nome+' · '+String(G.map.resShort)+' · onda '+(G.survived+1)+' · '+Math.round(G.t)+'s<br>'+
      'peças: '+G.machines.length+' · bichos mortos: '+G.kills+' · sucata: '+G.scrap+'</p>'+
      '<div class="menu">'+btn('RETOMAR','resume','','primary')+btn('OPÇÕES','options','')+btn('BESTIÁRIO','codex','')+
      btn('REINICIAR','retry','','danger')+btn('SALVAR','save','','small')+btn('SAIR PRO TÍTULO','title','','small')+'</div>'+
      '<div class="bottomline">Salva automaticamente a cada onda e ao pausar. ESC ou P pausa, M silencia, 1–9 escolhe peça.<br>Legenda: 🟩 estrutura de pé · 🟥 destruída · ícones da vila = vidas.</div>');
  }

  // ---------- OPÇÕES ----------
  function options(){
    const o=SaveDB.options;
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">OPÇÕES</h2>'+
      '<div class="opts">'+
      slider('master','VOLUME GERAL',o.master)+slider('music','MÚSICA',o.music)+slider('sfx','EFEITOS',o.sfx)+
      '<div class="opt"><label>TREMER A TELA<span class="sub">Desligue se passar mal. É sério.</span></label>'+
        '<select data-act="opt" data-arg="shake">'+(o.shake?'<option value="1" selected>LIGADO</option><option value="0">DESLIGADO</option>':'<option value="1">LIGADO</option><option value="0" selected>DESLIGADO</option>')+'</select></div>'+
      '<div class="opt"><label>MODO DALTONISMO<span class="sub">Troca cores de estado e reforça bordas.</span></label>'+
        '<select data-act="opt" data-arg="cb">'+(o.cb?'<option value="1" selected>LIGADO</option><option value="0">DESLIGADO</option>':'<option value="1">LIGADO</option><option value="0" selected>DESLIGADO</option>')+'</select></div>'+
      '<div class="opt"><label>TAMANHO DA LETRA<span class="sub">Interface acima do canvas.</span></label>'+
        '<select data-act="opt" data-arg="font">'+[.9,1,1.15,1.3,1.45].map(v=>'<option value="'+v+'" '+(o.font===v?'selected':'')+'>'+Math.round(v*100)+'%</option>').join('')+'</select></div>'+
      '<div class="opt"><label>SOM<span class="sub">Também no M durante o jogo.</span></label>'+
        '<select data-act="muteopt">'+(Snd.muted?'<option value="0">LIGADO</option><option value="1" selected>MUDO</option>':'<option value="0" selected>LIGADO</option><option value="1">MUDO</option>')+'</select></div>'+
      '</div>'+
      '<div class="row" style="margin-top:14px">'+btn('VOLTAR','back','','small')+btn('SALVAR TUDO','save','','small')+'</div>'+
      '<div class="row" style="margin-top:10px">'+btn('EXPORTAR SAVE','export','','small')+btn('IMPORTAR SAVE','import','','small')+'</div>'+
      '<p class="muted" style="margin-top:12px">Toda escolha do Zé pausa o jogo: não existe evento com tempo obrigatório.</p>');
  }
  function slider(id,label,v){
    return '<div class="opt"><label>'+label+'<span class="sub">'+Math.round(v*100)+'%</span></label>'+
      '<input type="range" min="0" max="1" step="0.05" value="'+v+'" data-act="vol" data-arg="'+id+'"></div>';
  }

  // ---------- CODEX ----------
  let codexTab='bestiary';
  function codex(tab?: string){
    if(tab)codexTab=tab;
    const s=SaveDB.slot;
    // BLOCO M.5: o bestiário abre por MORTE (mateiB), a galeria por construção
    // (seenM) e os chefes por vitória (venciB). Save novo: tudo vazio.
    const mates=Object.keys(s.mateiB||{}).length,plantadas=Object.keys(s.seenM||{}).length;
    const tabs=['bestiary','machines','chefes','radio','ach'];
    const nomeTab: Record<string,string>={bestiary:'BICHOS',machines:'ENGENHOCAS',chefes:'CHEFES',radio:'RÁDIO',ach:'SELOS'};
    let body='';
    if(codexTab==='bestiary'){
      body='<div class="codexGrid">'+ENEMY_ORDER.map(id=>{
        const e=ENEMY[id],visto=!!s.mateiB[id];
        return '<div class="beast '+(visto?'seen':'locked')+'"><h4>'+(visto?e.nome:'???')+'</h4>'+
          '<p>'+(visto?e.desc:'Não matou esse ainda. Ou não voltou pra contar.')+'</p>'+
          '<div class="kill">'+(visto?'COMO RESOLVER: '+e.hint+'<br><span class="muted">FATO INÚTIL: '+(e.fato||'—')+'</span>':'DICA: aparece, morre, volta aqui.')+'</div></div>';}).join('')+'</div>'+
        '<p class="muted" style="margin-top:8px">'+mates+'/'+ENEMY_ORDER.length+' bichos no caderno. O resto continua borrado — e é por isso que você volta.</p>';
    }else if(codexTab==='machines'){
      body='<div class="codexGrid">'+MACH_ORDER.filter(k=>k!=='remover').map(id=>{const m=MACH[id],visto=!!s.seenM[id];
        return '<div class="beast '+(visto?'seen':'locked')+'"><h4>'+(visto?m.nome:'???')+'</h4><p>'+(visto?m.desc:'Ainda não construiu essa.')+'</p>'+
          '<div class="kill">'+(visto?'CUSTO '+machCost(id)+' · VIDA '+m.hp+' · RECARGA '+m.cd+'s · NÍVEL MAX '+(UPG[id]?UPG[id].length:0)+'<br><span class="muted">SINERGIA: '+m.sin+' · FATO INÚTIL: '+(m.fato||'—')+'</span>':'')+'</div></div>';}).join('')+'</div>'+
        '<p class="muted" style="margin-top:8px">'+plantadas+'/18 engenhocas na galeria. Planta uma vez, fica no caderno pra sempre.</p>';
    }else if(codexTab==='chefes'){
      body='<div class="codexGrid">'+Object.entries(BOSSES).map(([id,b])=>{
        const vencido=!!s.venciB[id];
        return '<div class="beast '+(vencido?'seen':'locked')+'"><h4>'+(vencido?b.nome:'???')+'</h4>'+
          '<p>'+(vencido?b.desc:'Ninguém derrotou esse ainda. O Zé não comenta.')+'</p>'+
          '<div class="kill">'+(vencido?'FASES: 3+ · HP '+b.hp+'<br><span class="muted">FATO INÚTIL: '+(b.fato||'—')+'</span> · ZÉ: "Sobreviveu. Não pergunte como."':'')+'</div></div>';}).join('')+'</div>'+
        '<p class="muted" style="margin-top:8px">'+Object.keys(s.venciB||{}).length+'/6 chefes no caderno. Cada um é um mapa, e cada mapa é uma história.</p>';
    }else if(codexTab==='radio'){
      body='<div class="scroll"><div class="panel">'+
        RADIO.map(r=>'<p style="margin-bottom:7px">'+(r.map<=s.campaign?'<span class="acid">['+MAPS[r.map].nome+']</span> '+r.txt:'<span class="muted">[frequência morta]</span>')+'</p>').join('')+
        '</div></div><p class="muted">A Voz do Rádio fala em todas as frequências. Nenhuma é oficial.</p>';
    }else{
     body='<div class="codexGrid">'+ACHIEVEMENTS.map(a=>{const got=!!s.ach[a.id];
        return '<div class="beast '+(got?'seen':'locked')+'"><h4>'+(got?a.nome:'SELO OCULTO')+'</h4><p>'+(got?a.desc:'O Zé sabe. Não fala.')+'</p></div>';}).join('')+
        '</div><p class="muted">Conquistas não dão vantagem. Dão assunto.</p>';
    }
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:30px;color:var(--bone)">CADERNO DO ZÉ</h2>'+
      '<div class="tabs">'+tabs.map(t=>'<div class="tab '+(codexTab===t?'on':'')+'" data-act="codextab" data-arg="'+t+'">'+nomeTab[t]+'</div>').join('')+'</div>'+body+
      '<div class="space"></div>'+btn('VOLTAR','back','','small'));
  }


  // ---------- ÁRVORE ----------
  function tree(){
    const s=SaveDB.slot;
    const branches=TREE_BRANCHES.map(b=>{
      const nodes=TREE.filter(n=>n.br===b.id).map(n=>{
        const lvl=SaveDB.nodeLvl(n.id),maxed=lvl>=n.max,cost=SaveDB.costOf(n,lvl);
        const reqOk=!n.req||SaveDB.nodeLvl(n.req)>0;
        const afford=s.oldScrap>=cost;
        return '<div class="node '+(maxed?'max':'')+' '+(reqOk?'':'locked')+'"><h4>'+n.nome+'</h4><small>'+n.desc+'</small>'+
          '<div class="cost"><span class="pips">'+'●'.repeat(lvl)+'○'.repeat(n.max-lvl)+'</span>'+
          (maxed?'<span class="gold">COMPRADO</span>':
            '<span>'+cost+' <button class="btn tiny" data-act="buynode" data-arg="'+n.id+'" '+(afford&&reqOk?'':'disabled')+'>PÔR</button></span>')+
          '</div></div>';
      }).join('');
      return '<div class="branch '+b.id+'"><h3>'+b.nome+'</h3><p>'+b.desc+'</p>'+nodes+'</div>';
    }).join('');
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">ÁRVORE DA MARÉ</h2>'+
      '<p class="muted">Sucata velha: <b class="gold">'+meta()+'</b> · ganha ao terminar partidas. Nada aqui conserta o mar.</p>'+
      '<div class="branches">'+branches+'</div><div class="space"></div>'+btn('VOLTAR','back','','small'));
  }
  // ---------- COMO JOGAR ----------
  function help(){
    setScreen('<h2 style="font-family:Impact;font-weight:400;font-size:32px;color:var(--bone)">COMO SOBREVIVER</h2>'+
      '<div class="grid2" style="text-align:left">'+
      '<div class="panel"><h3>O BÁSICO</h3><p>Clique numa carta e depois numa vaga do corredor. Botão direito cancela. 1–9 seleciona. Shift planta várias com a mesma escolha. ESC ou P pausa.</p>'+
      '<p>Passe o mouse na sucata boiando pra catar (clique também vale). O Ímã faz isso por você. Bichos mortos também largam sucata.</p>'+
      '<p>Cada corredor tem duas estruturas. Quando um bicho chega, alguma coisa quebra pra sempre. Quando as 12 caem, ele come o Zé.</p>'+
      '<p>A Dona Lú cobra imposto no fim de cada onda: quanto mais peça na rua, maior a conta.</p></div>'+
      '<div class="panel"><h3>DEFESAS QUE EXISTEM</h3><p>'+
      Object.keys(ENEMY).length+' criaturas catalogáveis, seis chefes com fases, e '+MACH_ORDER.length+' engenhocas. Nenhuma resposta serve pra tudo.</p>'+
      '<p><b>Voa</b> cai com Holofote, Ventilador, Canhão de Lata, Estilingue ou Bujão. <b>Cava</b> pede bujão atrás. <b>Invisível</b> pede luz. <b>Espelho</b> devolve três torradas e cansa: a quarta entra.</p>'+
      '<p><b>Pescador e Baleia-filhote</b> agora são alvos (tiro funciona). Rádio e cachorro ainda redirecionam o Pescador; se ele chegar, cobra pedágio. Ventilador ainda espanta a Baleia.</p></div>'+
      '<div class="panel"><h3>CLIMA E LUGAR</h3><p>CHUVA apaga o fogo do pneu. NÉVOA encurta a torrada. VENTANIA empurra projétil e bicho. CALOR deixa piranha mais rápida. CINZA atrasa a recarga.</p>'+
      '<p>A luz do holofote muda o combate inteiro no Farol. A maré sobe no Cemitério e o espaço útil encolhe visualmente.</p></div>'+
      '<div class="panel"><h3>O ZÉ</h3><p>Entre ondas ele oferece três coisas: desbloqueio, upgrade visível na peça ou sucata. A escolha pausa o jogo.</p>'+
      '<p>Ele também fala besteira e, se você insistir com o mouse nele, uma verdade.</p></div></div>'+
      '<div class="space"></div>'+btn('VOLTAR','back','','small'));
  }

  // ---------- LOJA DO ZÉ ----------
  function shop(){
    const offers=Game.offers||[];
    const desc={unlock:o=>'DESBLOQUEAR: '+MACH[o.k].nome.toUpperCase(),up:o=>'ENFIAR '+UPG[o.k][(G.up[o.k]||0)].toUpperCase()+' NA '+MACH[o.k].nome.toUpperCase(),
      repair:()=>'RECONSTRUIR UMA ESTRUTURA',heal:()=>'CURAR TODAS AS PEÇAS',
      sucataVelha:()=>'CONVERTER '+ECONOMIA.sucataVelhaCusto+' SUCATA EM 1 SUCATA VELHA'};
    const sub={unlock:o=>MACH[o.k].desc,up:()=>'Upgrade permanente. Fica visível na peça.',
      repair:()=>'Volta torta, mas volta.',heal:()=>'Conserta tudo e prepara a próxima onda.',
      sucataVelha:()=>'Sucata velha é moeda de meta: compra melhorias entre partidas.'};
    shopEl.innerHTML='<div class="scr"><div class="scr-inner">'+
      '<div class="logo" style="font-size:clamp(26px,5vw,54px)">O ZÉ TROUXE<br><em>UMAS COISAS</em></div>'+
      '<p class="muted">Onda '+(G.survived||0)+' aguentada. Escolhe uma e volta pro corredor. Não tem tempo pra duas — tirando o tempo que você quiser.</p>'+
      '<div class="offers">'+offers.map((o,i)=>'<div class="offer"><div class="kind">'+(o.kind==='up'?'MELHORIA':o.kind==='unlock'?'PEÇA NOVA':o.kind==='repair'?'REBOQUE':o.kind==='heal'?'GRAXA':o.kind==='sucataVelha'?'CONVERTER':'RECURSO')+'</div>'+
        '<h4>'+desc[o.kind](o)+'</h4><p>'+sub[o.kind](o)+'</p>'+
        (o.kind==='up'?'<p class="gold">nível '+(((G.up[o.k||'']||0))+1)+'/3</p>':'')+
        '<div class="price">'+btn('ESCOLHER','offer',i,'small primary')+'</div></div>').join('')+'</div>'+
      '<div class="hr"></div>'+
      '<p class="muted">BANCA DO ZÉ — compra com a sucata do corredor. Pode levar quantas quiser.</p>'+
      '<div class="row">'+(Game.shopItems||[]).map(it=>'<button class="btn tiny" data-act="buyitem" data-arg="'+it.id+'" title="'+it.desc+'" '+(G.scrap>=it.cost?'':'disabled')+'>'+
        it.nome+' · '+it.cost+'</button>').join('')+'</div>'+
      '<p class="muted" style="margin-top:6px;font-size:12px">'+(Game.shopItems||[]).map(it=>'<b>'+it.nome+':</b> '+it.desc).join(' · ')+'</p>'+
      '<p class="muted" style="margin-top:8px">Sucata: <b class="gold">'+G.scrap+'</b> · estruturas de pé: <b>'+structuresAlive()+'/'+STRUCTURES+'</b> · peças: '+G.machines.length+' · imposto do próximo round: <b>'+impostoDoRound(G.machines.length,G.survived)+'</b></p>'+
      '<div class="bottomline">"+ reconstruir uma parede" pode salvar a partida. "Um ímã" também. O Zé não dá garantia.</div>'+
      '</div></div>';
    shopEl.classList.remove('hidden');scr.classList.add('hidden');top.classList.add('hidden');
  }

  // ---------- FIM ----------
  function end(summary){
    Snd.pauseDuck(true);
    hide();
    const lost=(summary.lost||[]);
    let title,text;
    const who=(summary.mapName||'A VILA');
    if(summary.win){
      title=summary.mode==='endless'?'A NOITE CANSou':'A VILA AGUENTOU';
      text=lost.length?'Perdemos '+list(lost)+'. O mar continuou podre, do jeito que ele gosta. '+who+' continua de pé, do jeito que dá.'
        :'Nada caiu hoje. '+who+' continua de pé. O mar continuou podre. Amanhã tem mais bicho.';
    }else if(summary.mode==='endless'){
      title='A NOITE GANHOU';
      text='Chegou na onda '+(summary.survived+1)+'. O Zé foi. O chapéu ficou. A gente continua.';
    }else{
      title='PERDEMOS O ZÉ';
      text=(lost.length?'Perdemos '+list(lost)+'. ':'')+'O mar levou o resto. A gente era ruim, mas era daqui.';
    }
    const next=summary.mode==='campaign'&&summary.win&&summary.mapIndex!==MAPS.length-1;
    setScreen('<div class="endTitle">'+title+'</div><div class="endText">'+text+'</div>'+
      (summary.win?'<div class="stars" style="font-size:26px">'+'★'.repeat(summary.stars)+'☆'.repeat(3-summary.stars)+'</div>':'')+
      '<div class="panel" style="max-width:560px;margin:12px auto"><div class="kv">'+
      'BICHOS MORTOS: <b>'+summary.kills+'</b> · TEMPO: <b>'+Math.round(summary.time)+'s</b> · ONDAS: <b>'+summary.survived+'</b><br>'+
      'SUCATA VELHA GANHA: <b class="gold">+'+summary.meta+'</b> · TOTAL: '+SaveDB.slot.oldScrap+'<br>'+
      'CADERNO: '+Object.keys(SaveDB.slot.mateiB||{}).length+'/'+ENEMY_ORDER.length+' bichos · '+Object.keys(SaveDB.slot.seenM||{}).length+'/18 peças · ESTRUTURAS: '+structuresAlive()+'/'+STRUCTURES+
      '</div></div>'+
      '<div class="menu">'+
      (next?btn('PRÓXIMO MAPA','nextmap','','primary'):'')+
      btn('DE NOVO','retry','',summary.win?'':'primary')+
      btn('MAPA','maps','')+btn('ÁRVORE','tree','','small')+btn('TÍTULO','title','','small')+
      '</div>');
  }
  function list(a){return a.length<=1?a.join(''):a.slice(0,-1).join(', ')+' e '+a[a.length-1];}

  function epilogue(){
    Snd.pauseDuck(true);
    hide();
    setScreen('<div class="logo" style="font-size:clamp(30px,6vw,64px)">O QUE FAZER<br><em>COM A MARÉ</em></div>'+
      '<div class="epilogue"><p>A origem da podridão não era um monstro. Era o mar respondendo. A fábrica foi só o começo da conversa. A Voz do Rádio está na frequência há vinte anos e não é gravação.</p>'+
      '<p class="ze">Não tem um jeito certo. Tem o que sobra pra cada um.</p></div>'+
      '<div class="offers" style="grid-template-columns:repeat(3,1fr)">'+ENDINGS.map(e=>
        '<div class="offer"><div class="kind">DECISÃO FINAL</div><h4>'+e.titulo+'</h4><p>'+e.escolha+'</p><div class="price">'+
        btn('ESCOLHER','ending',e.id,'small primary')+'</div></div>').join('')+'</div>'+
      '<p class="muted">As três decisões ficam salvas no seu caderno. Nenhuma dá um final limpo.</p>');
  }
  function ending(e,allThree){
    Snd.setTrack('cemiterio');Snd.setIntensity(1);
    hide();
    setScreen('<div class="logo" style="font-size:clamp(26px,5vw,52px)"><em>'+e.titulo+'</em></div>'+
      '<div class="endText">'+e.txt+'</div>'+
      '<div class="epilogue">'+
        '<p class="ze">ZÉ: '+e.ze+'</p>'+
        '<p><b>DONA LÚ:</b> '+e.lu+'</p>'+
        '<p><b>TOQUINHO:</b> '+e.toq+'</p>'+
        '<p><b>A VOZ:</b> '+e.voz+'</p></div>'+
      '<p class="gold">'+(allThree?'Você viu os três fins. Nenhum deles devolve o irmão do Zé.':'O mar não pede desculpa. Você também não precisa.')+'</p>'+
      '<div class="menu">'+btn('TÍTULO','title','','primary')+btn('ÁRVORE','tree','')+btn('VER BICHOS','codex','','small')+'</div>');
  }

  // ---------- HUD ----------
  /**
   * Barra de cartas: uma linha, largura calculada.
   *
   * A ADR 010 mandava quebrar em duas linhas quando não coubesse. Na prática
   * o ramo era inalcançável: com no máximo 19 cartas e `avail ≈ 1120`, a
   * conta dava `cols ≈ 35` — maior que qualquer baralho possível, então a
   * quebra nunca executava (código morto descrito como regra). A ADR 012
   * registra a volta à linha única.
   */
  function cardLayout(){
    const list=availableMachines();
    const x0=136, gap=2, h=58;
    const avail=W-x0-24;
    const w=Math.min(48,Math.floor(avail/list.length)-gap);
    return list.map((k,i)=>({k,x:x0+i*(w+gap),y:6,w,h}));
  }
  function cardAt(x,y){
    if(y>6+58+8)return null;
    const hit=cardLayout().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
    return hit?hit.k:null;
  }
  /**
   * Escala de fonte das opções.
   *
   * O CSS cuida do DOM (`--fs`), mas o HUD é desenhado em canvas e tinha
   * tamanhos fixos: quem aumentava a fonte nas opções via o HUD do mesmo
   * tamanho. Aqui o canvas acompanha a mesma escala.
   */
  function fmono(px: number, negrito = false): string {
    return (negrito ? 'bold ' : '') + Math.round(px * (SaveDB.options.font || 1.15)) + 'px monospace';
  }
  function drawHUD(g){
    const p=g.map;
    const painelH=Math.round(64*(SaveDB.options.font||1.15));
    // recurso
    ctx.fillStyle='rgba(8,12,10,.62)';rr(10,6,116,painelH,4);ctx.fill();
    ctx.fillStyle='#c0503a';rr(20,18,20,12,2);ctx.fill();ctx.fillStyle='#9aa8a0';ctx.fillRect(20,18,20,3);
    ctx.fillStyle='#f0e4bd';ctx.font=fmono(26,true);ctx.fillText(fmt(g.scrap),46,Math.round(32*(SaveDB.options.font||1.15)));
    ctx.fillStyle='#9aa08a';ctx.font=fmono(13);ctx.fillText(p.resShort,46,Math.round(44*(SaveDB.options.font||1.15)));
    ctx.fillStyle='#7a806a';ctx.font=fmono(12);ctx.fillText('VELHA: '+SaveDB.slot.oldScrap,46,Math.round(56*(SaveDB.options.font||1.15)));
    ctx.fillStyle='#c8b070';ctx.font=fmono(12);ctx.fillText(g.mode==='endless'?'ONDA '+Math.min(g.waves.length,g.survived+1):'ONDA '+(g.survived+1),46,Math.round(65*(SaveDB.options.font||1.15)));
    // cartas
    cardLayout().forEach((r,i)=>{
      const m=MACH[r.k],cost=machCost(r.k),cool=g.cds&&g.cds[r.k]||0,up=(g.up&&g.up[r.k])||0;
      const can=g.scrap>=cost&&cool<=0&&g.selected!==r.k;
      const cb=!!SaveDB.options.cb;
      ctx.fillStyle=g.selected===r.k?'rgba(90,70,30,.92)':'rgba(14,18,16,.78)';rr(r.x,r.y,r.w,r.h,3);ctx.fill();
      // carta disponível vs indisponível: em modo daltonismo a indisponível
      // ganha tracejado, para a informação não depender só de matiz.
      if(cb&&!can){ctx.setLineDash([3,2]);}
      ctx.strokeStyle=g.selected===r.k?'#e8c84a':can?'#4a5242':'#333a30';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
      ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h-19);ctx.scale(.36,.36);ctx.globalAlpha=can||g.selected===r.k?1:.45;
      drawMachine({type:r.k,x:0,lane:0,t:g.t,hp:1,maxhp:1,anim:0,act:0,flash:0,_icon:true});ctx.restore();
      ctx.fillStyle=can||g.selected===r.k?'#e8d9a8':'#777c6c';ctx.font=fmono(13,true);ctx.fillText(String(r.k==='remover'?'—':cost),r.x+3,r.y+53);
      const short=m.nome.split(' ')[0].toUpperCase().slice(0,7);
      ctx.fillStyle='#a8aa94';ctx.font=fmono(9);ctx.fillText(short,r.x+3,r.y+9);
      if(up){for(let j=0;j<3;j++){ctx.fillStyle=j<up?'#e8c84a':'#39402f';ctx.fillRect(r.x+r.w-8+j*2.4,r.y+3,2,4);}}
      if(cool>0){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(r.x,r.y,r.w,r.h*(cool/m.cd));}
      // número do teclado que seleciona esta carta (em cima)
      ctx.fillStyle='#c8b070';ctx.font=fmono(9,true);ctx.textAlign='right';
      ctx.fillText(String(i+1),r.x+r.w-3,r.y+9);
      ctx.textAlign='left';
    });
    // descrição da peça sob o mouse (item sem descrição é item que ninguém entende)
    if(Game.mouse){const hov=cardLayout().find(r=>Game.mouse!.x>=r.x&&Game.mouse!.x<=r.x+r.w&&Game.mouse!.y>=r.y&&Game.mouse!.y<=r.y+r.h);
      if(hov)drawCardTip(hov);}
    if(g.savedT>0){ctx.fillStyle='#7fb3a6';ctx.font=fmono(10,true);ctx.fillText('SALVO',W-52,70);}
    // status do modo
    if(g.mode==='daily'&&g.dailyMods){ctx.fillStyle='#c8b070';ctx.font=fmono(9);ctx.fillText('DIÁRIO: '+g.dailyMods.map(d=>d.nome).join(' + '),138,72);}
    if(g.shields>0){ctx.fillStyle='#7fb3a6';ctx.font=fmono(10);ctx.fillText('TÁBUAS: '+g.shields,W-120,70);}
    if(g.boss&&!g.bossDeath){
      const b=g.boss;
      ctx.fillStyle='rgba(8,10,8,.72)';rr(W/2-180,3,360,22,3);ctx.fill();
      ctx.fillStyle='#e8d9a8';ctx.font=fmono(11);ctx.textAlign='center';
      ctx.fillText((BOSSES[b.b].nome)+' — FASE '+b.phase,W/2,13);
      ctx.fillStyle='#3a1a16';ctx.fillRect(W/2-170,18,340,4);ctx.fillStyle='#c84a30';ctx.fillRect(W/2-170,18,340*clamp(b.hp/b.maxhp,0,1),4);
      ctx.textAlign='left';
    }
  }
  /** Quebra uma linha de texto no número de caracteres da caixa. */
  function wrap(text: string, max: number): string[]{
    const out: string[]=[];let line='';
    for(const word of String(text).split(' ')){
      if((line+' '+word).trim().length>max&&line){out.push(line);line=word;}
      else line=(line+' '+word).trim();
    }
    if(line)out.push(line);
    return out;
  }
  /** Ficha da peça: nome, número e o que ela faz (e com quem combina). */
  function drawCardTip(r: {k: string;x: number;y: number;w: number;h: number}){
    const m=MACH[r.k],w=300,h=Math.round(108*(SaveDB.options.font||1.15));
    const x=clamp(r.x-40,8,W-w-8),y=72,f=(SaveDB.options.font||1.15);
    ctx.fillStyle='rgba(8,12,10,.95)';rr(x,y,w,h,4);ctx.fill();
    ctx.strokeStyle='#5a6248';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#e8d9a8';ctx.font=fmono(13,true);ctx.fillText(m.nome,x+9,y+Math.round(17*f));
    ctx.fillStyle='#9aa08a';ctx.font=fmono(10);
    ctx.fillText('custo '+machCost(r.k)+' · vida '+m.hp+' · recarga '+m.cd+'s',x+9,y+Math.round(31*f));
    ctx.fillStyle='#d8d0b0';ctx.font=fmono(10);
    wrap(m.desc,46).slice(0,3).forEach((l,i)=>ctx.fillText(l,x+9,y+Math.round((47+i*12)*f)));
    ctx.fillStyle='#b8a060';ctx.font=fmono(9);
    wrap(m.sin,54).slice(0,2).forEach((l,i)=>ctx.fillText(l,x+9,y+Math.round((88+i*11)*f)));
  }
  function drawScene(g){
    // intro de chefe
    const intro=Game.bossIntro;
    if(intro){
      const t=intro.t/intro.dur;
      ctx.fillStyle='rgba(2,3,4,.85)';ctx.fillRect(0,0,W,H);
      ctx.fillStyle=`rgba(120,20,10,${.12+Math.sin(g.t*8)*.04})`;ctx.fillRect(0,H/2-90,W,180);
      ctx.save();ctx.translate(W/2,plantY(1)+30);ctx.scale(.9+Math.min(1,t)*.3,.9+Math.min(1,t)*.3);
      const fake={boss:true,b:intro.b,type:intro.b,lane:1,x:W/2,anim:g.t,phase:3,hp:1,maxhp:1,rise:0,inflate:false,act:1,flash:0,revealed:1};
      try{drawBoss(fake);}catch{}
      ctx.restore();
      ctx.textAlign='center';ctx.fillStyle='#e8d9a8';ctx.font='bold '+Math.round(30*(SaveDB.options.font||1.15))+'px Impact,sans-serif';
      ctx.fillText(BOSSES[intro.b].nome,W/2,90);
      ctx.fillStyle='#b06a4a';ctx.font=fmono(11);ctx.fillText(BOSSES[intro.b].desc,W/2,112);
      ctx.fillStyle='#8a8a70';ctx.font=fmono(9);ctx.fillText(BOSSES[intro.b].hint||'',W/2,130);
      ctx.textAlign='left';
    }
    // aviso de escuro e chefe
    if(g.dark&&g.darkT>0){ctx.fillStyle='rgba(200,230,220,.5)';ctx.font=fmono(10);ctx.fillText('A LUZ NÃO ESTÁ AQUI. HOLOFOTE AINDA ACENDE.',20,H-16);}
    if(g.mode==='boss'&&g.boss){ctx.fillStyle='#8a8f7a';ctx.font=fmono(9);ctx.fillText('MODO CHEFE · '+g.map.nome,W-190,H-16);}
  }

  // ---------- topo ----------
  function updateTopbar(g){
    if(!g||Game.screen==='title'){top.classList.add('hidden');return;}
    top.classList.remove('hidden');
    const tr=TRACKS[g.map.track]||TRACKS.barra;
    must('trackName').textContent=(g.map.nome||'')+' · '+tr.nome;
    const lamp=$('radioLamp');if(lamp)lamp.textContent=Snd.muted?'MUDO':'AM';
  }

  // ---------- ações ----------
  function backTo(){
    if(Game.screen==='pause'){pause();return;}
    if(Game.screen==='play'||Game.screen==='shop')return;
    title();
  }
  function bind(){
    document.addEventListener('click',ev=>{
      const el=(ev.target as HTMLElement|null)?.closest('[data-act]');if(!el)return;
      const act=el.getAttribute('data-act'),arg=el.getAttribute('data-arg');
      SFX.ui();
      switch(act){
        case 'pause':Game.pause();break;
        case 'resume':Game.resume();break;
        case 'toggleMute':Game.toggleMute();break;
        case 'title':Game.quitToTitle();title();break;
        case 'maps':maps();break;
        case 'continue':Game.continueCampaign();break;
        case 'slot':SaveDB.setSlot(Number(arg));title();break;
        case 'slots':slots();break;
        case 'newslot':if(arg===null)break;SaveDB.resetSlot(Number(arg));toast('story','SLOT APAGADO. O ZÉ NÃO PERGUNTOU NADA.');slots();break;
        case 'deckpick':{
          const k=String(arg);
          if(deckSel.includes(k))deckSel=deckSel.filter(x=>x!==k);
          else if(deckSel.length<7)deckSel.push(k);
          else {toast('story','SETE. JÁ SETE. TIRA UMA.');break;}
          drawDeck(api.deckMapa);
          break;
        }
        case 'deckendless':case 'deckboss':{
          // a escolha de deck vale pra Noite Infinita e pro Modo Chefe também
          api.deckModo=String(arg)==='deckendless'?'endless':'boss';
          UI.deckScreen(clamp(SaveDB.slot.campaign,0,5));
          break;
        }
        case 'deckgo':{
          const i=Number(arg);
          if(deckSel.length!==7){toast('story','SETE PEÇAS. NEM MAIS, NEM MENOS.');break;}
          SaveDB.setDeck(i,deckSel);
          if(api.deckModo==='endless')Game.startFromOpts({kind:'endless',level:0,map:i});
          else if(api.deckModo==='boss')Game.startFromOpts({kind:'boss',map:i});
          else Game.startFromOpts({kind:'campaign',map:i});
          break;
        }
        case 'decksave':{
          const i=Number(arg);
          if(deckSel.length!==7){toast('story','SETE PEÇAS. AÍ SIM EU GUARDO.');break;}
          SaveDB.setDeck(i,deckSel);
          toast('ach','DECK GUARDADO. O ZÉ ANOTOU NUM PAPEL.');
          drawDeck(i);
          break;
        }
        case 'deck':api.deckModo='campaign';UI.deckScreen(Number(arg));break;
        case 'map':Game.startFromOpts({kind:'campaign',map:Number(arg)});break;
        case 'resetmapa':{
          const i=Number(arg);
          const nome=MAPS[i]?MAPS[i].nome:'ESSE MAPA';
          if(confirm('APAGAR o progresso de '+nome+'? Estrelas e melhor tempo voltam a zero e o mapa precisa ser jogado de novo. Sucata velha, árvore e bestiário ficam.')){
            SaveDB.resetMapa(i);
            toast('story','PROGRESSO DE '+nome+' APAGADO. O ZÉ NÃO VIU NADA.');
            maps();
          }
          break;
        }
        case 'nextmap':Game.startCampaign(clamp(G.mapIndex+1,0,MAPS.length-1));break;
        case 'endlessmenu':endlessMenu();break;
        case 'endless':Game.startFromOpts({kind:'endless',level:Number(arg),map:clamp(SaveDB.slot.campaign,0,5)});break;
        case 'bossmenu':bossMenu();break;
        case 'boss':Game.startFromOpts({kind:'boss',map:Number(arg)});break;
        case 'dailymenu':dailyMenu();break;
        case 'daily':Game.startFromOpts({kind:'daily'});break;
        case 'sandbox':Game.startFromOpts({kind:'sandbox'});break;
        case 'options':Game.paused=true;options();break;
        case 'back':backTo();break;
        case 'codex':Game.paused=true;codex();break;
        case 'codextab':codex(arg??undefined);break;
        case 'tree':Game.paused=true;tree();break;
        case 'buynode':Game.buyNode(arg);break;
        case 'help':Game.paused=true;help();break;
        case 'retry':retry();break;
        case 'save':SaveDB.save();toast('ach','SALVO. NÃO QUE VIRE COSTUME.');break;
        case 'export':{const raw=localStorage.getItem(KEY)||''; if(navigator.clipboard) navigator.clipboard.writeText(raw).then(()=>toast('ach','SAVE COPIADO. COLE ONDE QUISER.')).catch(()=>{prompt('COPIE O SAVE:',raw);}); else prompt('COPIE O SAVE:',raw); break;}
        case 'import':{const txt=prompt('COLE O SAVE (JSON) AQUI:'); if(txt){try{JSON.parse(txt); localStorage.setItem(KEY,txt); toast('ach','SAVE IMPORTADO. RECARREGANDO...'); setTimeout(()=>location.reload(),600);}catch{toast('story','SAVE INVÁLIDO. NADA MUDOU.');}} break;}
        case 'offer':Game.chooseOffer(Number(arg));break;
        case 'buyitem':Game.buyShopItem(arg);break;
        case 'ending':Game.finishEnding(arg);break;
      }
    });
    must('radioLamp').addEventListener('click',()=>Game.radioClick());
    document.addEventListener('change',ev=>{
      const el=ev.target as HTMLElement|null;if(!el||!el.getAttribute)return;
      const act=el.getAttribute('data-act');
      if(act==='opt'){
        const k=el.getAttribute('data-arg');
        let v: string|number=(el as HTMLSelectElement).value;
        if(k==='shake'||k==='cb'||k==='font')v=Number(v);
        Game.option(k,v);options();
      }
      if(act==='muteopt'){Snd.init();const o=SaveDB.options;o.mute=Number((el as HTMLInputElement).value);SaveDB.opt('mute',o.mute);Snd.applyVolumes();options();}
    });
    document.addEventListener('input',ev=>{
      const el=ev.target as HTMLElement|null;if(!el||!el.getAttribute||el.getAttribute('data-act')!=='vol')return;
      const k=el.getAttribute('data-arg');Game.option(k,Number((el as HTMLInputElement).value));
      const opt=el.closest('.opt');const lab=opt?opt.querySelector('.sub'):null;if(lab)lab.textContent=Math.round(Number((el as HTMLInputElement).value)*100)+'%';
    });
  }
  function retry(){
    if(!G){Game.quitToTitle();return;}
    const mode=G.mode;
    if(mode==='boss')Game.startFromOpts({kind:'boss',map:G.mapIndex});
    else if(mode==='endless')Game.startFromOpts({kind:'endless',level:G.endlessDiff||0,map:G.mapIndex});
    else if(mode==='sandbox')Game.startFromOpts({kind:'sandbox'});
    else if(mode==='daily')Game.startFromOpts({kind:'daily'});
    else Game.startFromOpts({kind:'campaign',map:G.mapIndex});
  }
  bind();

  const api={title,deckScreen,deckMapa:0,deckModo:'campaign',maps,slots,pause,options,codex,tree,help,shop,end,epilogue,ending,
    hideOverlays:hide,updateTopbar,toast,cardAt,drawHUD,drawScene};
  return api;
})();
// nextPhase usa isso quando entra na fase de chefe
export function openBossIntro(){
  Game.bossIntro={b:G.map.boss,t:0,dur:2.6,total:BOSSES[G.map.boss]};
  Snd.setIntensity(4);(SFX as {alert?:()=>void}).alert?.();
}

