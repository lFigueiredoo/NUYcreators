// Precise v3: CSS module orphan audit.
// - defined: class tokens from comment-stripped CSS (comments hold urls/w3.org that pollute)
// - used: real member access via the alias that binds this module in a given file:
//   alias.token | alias['token'] | alias["token"]
// - composes: sources inside the module also count as used.
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

const root = process.cwd();
const cssFiles = [];
const srcFiles = [];

const collect = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) collect(p);
    else if (f.name.endsWith('.module.css')) cssFiles.push(p);
    else if (/\.(tsx|ts)$/.test(f.name)) srcFiles.push(p);
  }
};
collect(join(root, 'src'));

const srcTexts = new Map(srcFiles.map((p) => [p, readFileSync(p, 'utf8')]));
let total = 0;
for (const cssPath of cssFiles) {
  const base = cssPath.split(sep).pop();
  const raw = readFileSync(cssPath, 'utf8');
  const cssText = raw.replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments
  const defined = new Set();
  for (const m of cssText.matchAll(/\.([A-Za-z][\w-]*)/g)) defined.add(m[1]);

  // files importing this module + the alias bound there
  const uses = [];
  const importRe = new RegExp(`import\\s+(\\w+)\\s+from\\s+['"][^'"]*${base}['"]`, 'g');
  for (const [p, t] of srcTexts) {
    for (const m of t.matchAll(importRe)) uses.push({ file: p, alias: m[1] });
  }

  const used = new Set();
  for (const { file, alias } of uses) {
    const t = srcTexts.get(file);
    for (const m of t.matchAll(new RegExp(`${alias}\\.([A-Za-z][\\w-]*)`, 'g'))) used.add(m[1]);
    for (const m of t.matchAll(new RegExp(`${alias}\\[["']([^"']+)["']\\]`, 'g'))) used.add(m[1]);
  }
  // sibling classes referenced by composes: inside this module
  for (const c of raw.matchAll(/composes:\s*([^;}]+)/g))
    for (const n of c[1].split(/\s+/)) used.add(n.trim());

  const orphans = [...defined].filter((n) => !used.has(n));
  if (orphans.length) {
    total += orphans.length;
    console.log(`\n== ${cssPath.replace(root + sep, '')} (used via: ${uses.length} imports)`);
    console.log('  ' + orphans.join(', '));
  }
}
console.log(total === 0 ? '\nNo orphans.' : `\nTOTAL orphans: ${total}`);
