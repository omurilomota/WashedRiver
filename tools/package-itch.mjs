/**
 * package-itch.mjs — empacota o build single-file para o itch.io.
 *
 * Sem dependência externa: o ZIP é escrito à mão (deflate via zlib nativo).
 * O resultado vai para release/ e é anexado à release do GitHub pela CI.
 *
 * Uso: npm run package:itch
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const OUT_DIR = join(ROOT, 'release');
const VERSION = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version;

// ---------- CRC32 (necessário para o formato ZIP) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- data/hora do DOS ----------
function dosStamp(date = new Date()) {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const day = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time, day };
}

// ---------- escritor ZIP ----------
function zip(entries, date = new Date()) {
  const { time, day } = dosStamp(date);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const compressed = deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versão necessária
    local.writeUInt16LE(0x0800, 6); // flag: nome em UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // feito por: UNIX, versão 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comentário
    central.writeUInt16LE(0, 34); // disco
    central.writeUInt16LE(0, 36); // attrs internos
    central.writeUInt32LE(0o644 << 16, 38); // attrs externos
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

// ---------- main ----------
async function main() {
  const indexPath = join(DIST, 'index.html');
  let html;
  try {
    html = await readFile(indexPath);
  } catch {
    console.error('✗ dist/index.html não existe. Rode `npm run build` antes.');
    process.exit(1);
  }

  const entries = [{ name: 'index.html', data: html }];

  // A capa é útil dentro do zip (o itch deixa você apontar pra lá), mas o jogo
  // não depende dela. Se não existir, o pacote sai só com o index.html.
  for (const candidate of ['icon.png', 'cover.png']) {
    try {
      const data = await readFile(join(DIST, candidate));
      entries.push({ name: candidate, data });
      break;
    } catch {
      /* sem capa — tudo bem */
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `mare-podre-${VERSION}.zip`);
  const buf = zip(entries);
  await writeFile(out, buf);

  const kib = (buf.length / 1024).toFixed(1);
  console.log(`✓ ${basename(out)} — ${kib} KB (${entries.map((e) => e.name).join(', ')})`);
  console.log('  itch.io: Game → Upload → este zip. Windows/Mac/Linux como plataformas.');
}

await main();
