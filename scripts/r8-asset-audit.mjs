import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SKIP = new Set([
  'node_modules',
  '.next',
  '.git',
  'test-results',
  'playwright-report',
  'coverage',
  'out',
  '.appwrite',
  'artifacts',
]);
const rows = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) await walk(p);
      continue;
    }
    if (!/\.(png|jpe?g|webp|avif|gif|tiff)$/i.test(e.name)) continue;
    try {
      const m = await sharp(p).metadata();
      const st = await stat(p);
      rows.push({
        path: path.relative('.', p).split(path.sep).join('/'),
        w: m.width,
        h: m.height,
        kb: Math.round(st.size / 1024),
        fmt: m.format,
      });
    } catch {
      /* unreadable */
    }
  }
}

await walk('.');
rows.sort((a, b) => b.w * b.h - a.w * a.h);
await writeFile('artifacts/r8/asset-inventory.json', JSON.stringify(rows, null, 2));
console.log('total images:', rows.length);
console.log('== LARGAS (>=400px no maior lado) ==');
for (const r of rows.filter((r) => Math.max(r.w, r.h) >= 400)) {
  console.log(`${r.w}x${r.h}  ${r.kb}kb  ${r.fmt}  ${r.path}`);
}
console.log('== DISTRIBUICAO por pasta ==');
const byDir = {};
for (const r of rows) {
  const d = r.path.split('/').slice(0, -1).join('/');
  byDir[d] = (byDir[d] || 0) + 1;
}
console.log(JSON.stringify(byDir, null, 1));
