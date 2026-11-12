#!/usr/bin/env node
/**
 * shot.mjs — fotografia o jogo rodando de verdade.
 *
 * Abre o build single-file (`dist/index.html`) num Chrome headless, começa
 * uma partida, planta umas peças pelo próprio HUD (cliques de verdade no
 * canvas) e salva PNGs do campo. Serve para revisar arte sem abrir o jogo
 * na mão: é a mesma tela que o jogador vê.
 *
 * Uso:
 *   node tools/shot.mjs [--map 0] [--out /tmp/shot] [--seg 22]
 *                        [--plant boia,torradeira,geladeira] [--onda]
 *
 * Depende de um Chrome/Chromium no PATH (ou em $CHROME). Sem browser, ele
 * avisa e sai com código 2.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(raiz, 'dist', 'index.html');

/** Argumentos simples: --chave valor (booleano quando não tem valor). */
function args() {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2);
    const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
    out[k] = v;
  }
  return out;
}

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const c of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [c]).toString().trim();
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/**espera ms*/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Baralho da campanha no mapa 0 (mesma regra de economy.isMachUnlocked). */
function baralhoInicial() {
  const bal = JSON.parse(readFileSync(path.join(raiz, 'src/data/balance.json'), 'utf8'));
  const dentro = (u) => u.map <= 0;
  return bal.machOrder.filter((k) => bal.mach[k] && (bal.mach[k].unlock || (bal.mapUnlocks || []).some(dentro)));
}

/** Posição do centro da carta i no HUD (igual a `cardLayout` de ui.ts). */
function carta(i) {
  const x0 = 136, gap = 2, w = 48;
  return { x: x0 + i * (w + gap) + w / 2, y: 35 };
}

/** Centro do slot (coluna, lane) — mesma geometria de constants.ts. */
function slot(col, lane) {
  return { x: 170 + col * 152 + 76, y: 90 + lane * 126 + 100 };
}

async function main() {
  const a = args();
  const mapa = Number(a.map ?? 0);
  const seg = Number(a.seg ?? 22);
  const saida = String(a.out ?? '/tmp/opencode/mare-podre-shot');
  const querOnda = !!(a.onda || a.onda === undefined ? true : a.onda);
  const clipH = Number(a.cliph ?? 286);
  const plantar = String(a.plant ?? 'boia,torradeira,geladeira,holofote,bujao,ventilador,ima,radio')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chrome = chromePath();
  if (!chrome) {
    console.error('shot: nenhum Chrome/Chromium encontrado (defina $CHROME).');
    process.exit(2);
  }

  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--mute-audio',
      '--window-size=1280,846',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsBrowser = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on('exit', (c) => reject(new Error(`chrome saiu com ${c}`)));
    setTimeout(() => reject(new Error('timeout esperando o DevTools')), 15000);
  });

  // O endpoint do browser não fala Page/Runtime: precisa do target da página.
  const porta = new URL(wsBrowser).port;
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
  const pagina = alvos.find((t) => t.type === 'page');
  if (!pagina?.webSocketDebuggerUrl) throw new Error('nenhuma página aberta no Chrome');

  const sock = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    sock.onopen = r;
    sock.onerror = j;
  });
  let id = 0;
  const pendentes = new Map();
  sock.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendentes.has(msg.id)) {
      pendentes.get(msg.id)(msg);
      pendentes.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const meu = ++id;
      pendentes.set(meu, (msg) => resolve(msg.result ?? msg));
      sock.send(JSON.stringify({ id: meu, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 846,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `file://${build}?map=${mapa}` });
  await sleep(1200);

  /** Avalia JS na página e devolve o valor. */
  const avaliar = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r?.exceptionDetails) throw new Error(String(r.exceptionDetails.text));
    return r?.result?.value;
  };

  await avaliar('window.__pronto = !!document.getElementById("cv") && !!window.Game');
  await avaliar(`window.Game.startCampaign(${mapa})`);
  await sleep(700);

  const baralho = baralhoInicial();
  // planta as peças pedidas clicando carta → vaga (como o jogador faz)
  for (const [n, tipo] of plantar.entries()) {
    const idx = baralho.indexOf(tipo);
    if (idx < 0) continue;
    await avaliar(`(() => {
      const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
      const sx=r.width/1280, sy=r.height/846;
      const bate=(x,y)=>cv.dispatchEvent(new MouseEvent('mousedown',{clientX:r.left+x*sx,clientY:r.top+y*sy,button:0,bubbles:true}));
      const c=${JSON.stringify(carta(idx))}; bate(c.x,c.y);
      const s=${JSON.stringify(slot(n % 5, Math.floor(n / 5) % 6))}; bate(s.x,s.y);
      return true;
    })()`);
    await sleep(220);
  }

  const t0 = Date.now();
  while (Date.now() - t0 < seg * 1000) {
    await sleep(500);
  }

  const fotos = [];
  const tira = async (nome, clip) => {
    const params = { format: 'png' };
    if (clip) {
      // clip em coordenadas de página; `scale` dá o zoom (Chrome novo).
      params.clip = {
        x: Number(a.clipx ?? 0),
        y: clip,
        width: Number(a.clipw ?? 1280),
        height: Math.min(clipH, 846 - clip),
        scale: 2,
      };
    }
    const r = await send('Page.captureScreenshot', params);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${saida}-${nome}.png`, Buffer.from(r.data, 'base64'));
    fotos.push(`${saida}-${nome}.png`);
  };

  if (a.probe) {
    const [px, py, pw, ph] = String(a.probe).split(',').map(Number);
    const cores = await avaliar(`(() => {
      const cv=document.getElementById('cv');
      const off=document.createElement('canvas');
      off.width=cv.width; off.height=cv.height;
      const o=off.getContext('2d'); o.drawImage(cv,0,0);
      const d=o.getImageData(${px},${py},${pw},${ph}).data;
      const m={};
      for(let i=0;i<d.length;i+=4){
        const k=[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
        m[k]=(m[k]||0)+1;
      }
      return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([k,n])=>k+':'+Math.round(100*n/(${pw}*${ph}))+'%');
    })()`);
    console.log('PROBE(' + a.probe + ') ' + cores.join('  '));
  }

  if (a.probe) {
    const [px, py, pw, ph] = String(a.probe).split(',').map(Number);
    const cores = await avaliar(`(() => {
      const cv=document.getElementById('cv');
      const off=document.createElement('canvas');
      off.width=cv.width; off.height=cv.height;
      const o=off.getContext('2d'); o.drawImage(cv,0,0);
      const d=o.getImageData(${px},${py},${pw},${ph}).data;
      const m={};
      for(let i=0;i<d.length;i+=4){
        const k=[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
        m[k]=(m[k]||0)+1;
      }
      return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10)
        .map(([k,n])=>k+':'+Math.round(100*n/(${pw}*${ph}))+'%');
    })()`);
    console.log('PROBE(' + a.probe + ') ' + cores.join('  '));
  }

  if (a.eval) {
    await avaliar(String(a.eval));
    await sleep(400);
  }

  await tira('campo');
  if (a.zoom) await tira('zoom-baixo', 846 - clipH);
  if (querOnda) {
    // adianta o relógio da fase para a onda começar e os bichos aparecerem
    await avaliar('(() => { const g=window.G; if(g&&g.phaseT!==undefined) g.phaseT=999; return true; })()');
    await sleep(9000);
    await tira('onda');
  }

  sock.close();
  proc.kill();
  console.log(fotos.join('\n'));
}

main().catch((e) => {
  console.error('shot: ' + e.message);
  process.exit(1);
});
