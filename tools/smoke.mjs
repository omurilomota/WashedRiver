/**
 * smoke.mjs — confere que o artefato single-file está de pé.
 *
 * Não substitui os testes: é a rede de segurança entre "build passou" e
 * "o jogo abre com duplo clique". Barato de rodar, falha cedo.
 *
 * Uso: node tools/smoke.mjs
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const INDEX = join(DIST, 'index.html');

const checks = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
  } catch (err) {
    checks.push({ name, ok: false, detail: err.message });
  }
}

await stat(INDEX).catch(() => {
  console.error('✗ dist/index.html não existe. Rode `npm run build` antes.');
  process.exit(1);
});

const html = await readFile(INDEX, 'utf8');

await check('o HTML tem o título do jogo', () => {
  assert(html.includes('MARÉ PODRE'), 'não encontrou "MARÉ PODRE" no título');
  return 'título presente';
});

await check('o canvas do jogo existe', () => {
  assert(/<canvas[^>]*id=["']cv["']/i.test(html), 'não encontrou <canvas id="cv">');
  return 'canvas presente';
});

await check('não há script externo (single-file de verdade)', () => {
  const external = html.match(/<script[^>]+src=["'][^"']+["']/gi) ?? [];
  assert(external.length === 0, `há ${external.length} script(s) externo(s): ${external.join(', ')}`);
  return 'zero script externo';
});

await check('não há CSS externo (single-file de verdade)', () => {
  const external = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [];
  assert(external.length === 0, `há ${external.length} link(s) de stylesheet externo(s)`);
  return 'zero stylesheet externo';
});

await check('o JS foi embutido no HTML', () => {
  const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  assert(inline.length > 0, 'nenhum <script> inline encontrado');
  const bytes = inline.reduce((n, m) => n + m.length, 0);
  assert(bytes > 1_000, `script inline com ${bytes} bytes parece curto demais`);
  return `${(bytes / 1024).toFixed(1)} KB em ${inline.length} bloco(s)`;
});

await check('o CSS foi embutido no HTML', () => {
  const inline = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [];
  assert(inline.length > 0, 'nenhum <style> inline encontrado');
  const bytes = inline.reduce((n, m) => n + m.length, 0);
  assert(bytes > 200, `style inline com ${bytes} bytes parece curto demais`);
  return `${(bytes / 1024).toFixed(1)} KB`;
});

await check('o idioma é pt-BR', () => {
  assert(/<html[^>]+lang=["']pt-BR["']/i.test(html), 'lang não é pt-BR');
  return 'lang="pt-BR"';
});

await check('o viewport está declarado', () => {
  assert(/name=["']viewport["']/i.test(html), 'sem meta viewport');
  return 'meta viewport presente';
});

await check('o script inline está balanceado', () => {
  const opens = (html.match(/<script\b[^>]*>/gi) ?? []).length;
  const closes = (html.match(/<\/script>/gi) ?? []).length;
  assert(opens === closes, `${opens} <script> para ${closes} </script>`);
  return `${opens} bloco(s) de script`;
});

await check('o HTML não tem placeholder do Vite', () => {
  assert(!html.includes('/@vite/client'), 'o dev server do Vite sobrou no build');
  assert(!/src=["']\/assets\//.test(html), 'há referência a /assets/ no HTML');
  return 'sem resto do dev server';
});

await check('o build não deixou sobras em dist/', async () => {
  const entries = await readdir(DIST);
  const stray = entries.filter((f) => !['index.html', 'icon.png', 'cover.png'].includes(f));
  assert(stray.length === 0, `arquivos inesperados: ${stray.join(', ')}`);
  return `${entries.length} arquivo(s)`;
});

for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

const failures = checks.filter((c) => !c.ok);
if (failures.length > 0) {
  console.error(`\n✗ smoke test falhou em ${failures.length} checagem(ns).`);
  process.exit(1);
}

console.log('\n✓ smoke test passou.');
