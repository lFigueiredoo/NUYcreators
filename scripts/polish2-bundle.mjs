/**
 * Peso do bundle servido pela landing — cru e gzip.
 *
 * O `next build` desta versão não imprime mais a tabela de "First Load JS", então
 * a medida sai do disco: todos os `.js` e `.css` de `.next/static`, somados crus
 * e comprimidos com gzip -9. É a mesma régua antes e depois da rodada, e a
 * diferença entre as duas leituras é o delta que o brief pede (≤ +5 KB gzip).
 *
 * Uso: node scripts/polish2-bundle.mjs [rótulo]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const label = process.argv[2] ?? 'atual';
const root = '.next/static';

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(js|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = await walk(root);
let raw = 0;
let gzip = 0;
const porTipo = { js: { raw: 0, gzip: 0, n: 0 }, css: { raw: 0, gzip: 0, n: 0 } };

for (const file of files) {
  const buffer = await fs.readFile(file);
  const kind = file.endsWith('.css') ? 'css' : 'js';
  raw += buffer.length;
  gzip += zlib.gzipSync(buffer, { level: 9 }).length;
  porTipo[kind].raw += buffer.length;
  porTipo[kind].gzip += zlib.gzipSync(buffer, { level: 9 }).length;
  porTipo[kind].n += 1;
}

const kb = (n) => +(n / 1024).toFixed(1);
console.log(
  JSON.stringify(
    {
      rotulo: label,
      arquivos: files.length,
      total: { cruKB: kb(raw), gzipKB: kb(gzip) },
      js: { n: porTipo.js.n, cruKB: kb(porTipo.js.raw), gzipKB: kb(porTipo.js.gzip) },
      css: { n: porTipo.css.n, cruKB: kb(porTipo.css.raw), gzipKB: kb(porTipo.css.gzip) },
    },
    null,
    1,
  ),
);
