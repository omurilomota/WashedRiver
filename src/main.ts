/**
 * main.ts — o arranque.
 *
 * Aqui o jogo acorda: monta a tela, liga o loop e começa no título.
 * Toda a lógica está nos módulos — este arquivo só orquestra.
 */
import './styles/main.css';

// O módulo de gameplay pendura os métodos em `Game` (Game.startCampaign,
// Game.pause, ...). Importá-lo antes da UI garante que a UI encontre o
// que precisa quando o jogador clicar.
import './game/game';
import { G, Game } from './core/state';
import { UI } from './ui/ui';
// debug/screenshot: a UI não é global no jogo; este atalho é só pra ferramenta
(window as unknown as {__ui: typeof UI}).__ui = UI;
import { SaveDB } from './save/storage';

// O build é um arquivo só e roda direto no navegador: expor o estado no
// `window` mantém a depuração no console possível — e era assim no build
// anterior. `G` é getter porque a partida é substituída a cada run.
declare global {
  interface Window {
    Game: typeof Game;
    G: typeof G;
  }
}
window.Game = Game;
Object.defineProperty(window, 'G', { get: () => G, configurable: true });

// Opções salvas → aparência.
document.body.classList.toggle('cb', !!SaveDB.options.cb);
document.documentElement.style.setProperty('--fs', String(SaveDB.options.font || 1.15));
document.body.classList.toggle('lowshake', !SaveDB.options.shake);

SaveDB.ensureAll();

// O título é o ponto de entrada: o WebAudio só pode nascer depois de um
// gesto do usuário, e o clique no título é esse gesto.
Game.titleBackdrop();
UI.title();

// O loop vive no módulo de jogo; aqui só ligamos o primeiro quadro.
import { startLoop } from './game/loop';
startLoop();
