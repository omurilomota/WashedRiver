/**
 * make-icon.mjs — gera public/icon.png (512×512) sem nenhum asset externo.
 *
 * Regra do projeto: nada de imagem baixada. A arte é desenhada por código,
 * inclusive a capa. Aqui é raster puro: buffer RGBA + encoder PNG escrito à
 * mão (zlib nativo para o IDAT).
 *
 * Uso: node tools/make-icon.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SIZE = 512;

// ---------- paleta (mesma do jogo: src/styles/main.css) ----------
const PAL = {
  tar: [0x0a, 0x0c, 0x0b],
  deep: [0x05, 0x08, 0x07],
  sky1: [0x2c, 0x3a, 0x36],
  sky2: [0x14, 0x1e, 0x1c],
  sea: [0x0d, 0x2a, 0x2e],
  seaDeep: [0x07, 0x18, 0x1d],
  acid: [0xa5, 0xb4, 0x5a],
  rust: [0xa4, 0x55, 0x2a],
  rust2: [0xd1, 0x71, 0x3a],
  bone: [0xd9, 0xcb, 0xa0],
  gold: [0xe8, 0xc8, 0x4a],
  foam: [0x8d, 0x90, 0x7c],
};

// ---------- buffer RGBA ----------
const buf = new Uint8Array(SIZE * SIZE * 4);

function blend(x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return;
  const i = (y * SIZE + x) * 4;
  const inv = 1 - a;
  buf[i] = Math.round(rgb[0] * a + buf[i] * inv);
  buf[i + 1] = Math.round(rgb[1] * a + buf[i + 1] * inv);
  buf[i + 2] = Math.round(rgb[2] * a + buf[i + 2] * inv);
  buf[i + 3] = Math.max(buf[i + 3], Math.round(a * 255));
}

function vGradient(y0, y1, c0, c1) {
  for (let y = Math.max(0, y0); y < Math.min(SIZE, y1); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const c = [0, 1, 2].map((i) => Math.round(c0[i] + (c1[i] - c0[i]) * t));
    for (let x = 0; x < SIZE; x++) blend(x, y, c, 1);
  }
}

function rect(x0, y0, w, h, rgb, a = 1) {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(SIZE, Math.ceil(y0 + h)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(SIZE, Math.ceil(x0 + w)); x++) {
      blend(x, y, rgb, a);
    }
  }
}

function ellipse(cx, cy, rx, ry, rgb, a = 1) {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        // borda suave (1px) pra não ficar serrilhado
        const edge = Math.min(1, (1 - Math.sqrt(d)) * Math.min(rx, ry));
        blend(x, y, rgb, a * Math.max(0, Math.min(1, edge + 0.5)));
      }
    }
  }
}

// ruído determinístico (textura de lodo, sem Math.random pra ficar estável)
function hash2(x, y) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- cena ----------

// céu: do lodo ao quase-preto
vGradient(0, 300, PAL.sky1, PAL.sky2);

// mar
vGradient(300, SIZE, PAL.sea, PAL.seaDeep);

// maré: faixas de espuma em perspective (mais largas embaixo)
for (let band = 0; band < 7; band++) {
  const t = band / 6;
  const baseY = 316 + t * 180;
  const amp = 4 + t * 9;
  const thick = 2 + t * 4;
  const rgb = band % 2 === 0 ? PAL.acid : PAL.foam;
  for (let x = 0; x < SIZE; x++) {
    const y = baseY + Math.sin(x / (46 + band * 9) + band * 1.7) * amp + Math.sin(x / 17 + band) * 1.6;
    rect(x, y, 1, thick, rgb, 0.16 + t * 0.2);
  }
}

// brilho do farol ao longe (esquerda) — a "luz que é isca"
const glowX = 96, glowY = 214;
for (let r = 96; r > 0; r -= 3) {
  ellipse(glowX, glowY, r, r, PAL.gold, 0.035 * (1 - r / 96) + 0.01);
}
ellipse(glowX, glowY, 9, 9, PAL.gold, 0.95);

// postes no horizonte (silhueta da vila)
for (const [px, ph] of [[368, 44], [404, 30], [436, 58], [462, 22]]) {
  rect(px, 262 - ph, 7, ph + 38, PAL.deep, 0.9);
  rect(px - 3, 262 - ph, 13, 5, PAL.deep, 0.9);
}

// ---------- a boia catadora (o símbolo do jogo) ----------
const cx = 256, cy = 352;

// sombra na água
ellipse(cx, cy + 62, 92, 15, PAL.deep, 0.5);

// corpo: lata amassada, com ferrugem
ellipse(cx, cy, 62, 66, PAL.rust, 1);
ellipse(cx - 14, cy - 16, 30, 34, PAL.rust2, 0.55);
ellipse(cx + 20, cy + 22, 22, 24, PAL.deep, 0.22);

// aro superior
ellipse(cx, cy - 52, 58, 16, PAL.bone, 0.9);
ellipse(cx, cy - 54, 44, 10, PAL.tar, 0.95);

// amassados
rect(cx - 46, cy - 6, 92, 5, PAL.deep, 0.25);
rect(cx - 40, cy + 22, 80, 4, PAL.deep, 0.18);

// luz da boia
ellipse(cx, cy - 78, 22, 22, PAL.gold, 0.28);
ellipse(cx, cy - 78, 9, 9, PAL.gold, 1);

// mastro
rect(cx - 3, cy - 74, 6, 24, PAL.deep, 0.85);

// sucata boiando em volta (o que a maré devolve)
const debris = [
  [70, 452, 26, 8], [150, 486, 34, 7], [372, 470, 30, 8], [432, 436, 22, 6],
  [112, 424, 18, 6], [330, 508, 24, 6], [46, 404, 20, 5],
];
for (const [dx, dy, dw, dh] of debris) {
  rect(dx, dy, dw, dh, PAL.tar, 0.85);
  rect(dx, dy, dw, 2, PAL.rust, 0.5);
}

// textura de lodo no céu
for (let y = 0; y < 300; y++) {
  for (let x = 0; x < SIZE; x += 1) {
    const n = hash2(x, y);
    if (n > 0.985) blend(x, y, PAL.bone, 0.05);
  }
}

// vinheta
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = (x - SIZE / 2) / (SIZE / 2);
    const dy = (y - SIZE / 2) / (SIZE / 2);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.72) {
      const k = Math.min(0.72, (d - 0.72) * 0.85);
      blend(x, y, PAL.deep, k);
    }
  }
}

// ---------- encoder PNG ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(join(ROOT, 'public'), { recursive: true });
const png = encodePng(SIZE, SIZE, buf);
await writeFile(join(ROOT, 'public', 'icon.png'), png);
console.log(`✓ public/icon.png — ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(1)} KB`);
