/**
 * Quais classes do globals.css não são referenciadas em lugar nenhum?
 *
 * Fronteira de palavra, não substring: `hero` precisa casar com class="hero",
 * mas não com `heroImage` nem `hero-lifestyle.webp` — que foi como a primeira
 * varredura acusou falsos positivos.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/styles/globals.css', 'utf8');
const classes = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(m[1]);

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|\.next|artifacts/.test(e.name)) walk(p);
    } else if (/\.(tsx|ts|mjs|js)$/.test(e.name)) files.push(p);
  }
})('src');

const sources = files.map((f) => ({ f, txt: readFileSync(f, 'utf8') }));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const used = new Map();
for (const c of classes) {
  const re = new RegExp(`(^|[^a-zA-Z0-9_-])${escapeRe(c)}([^a-zA-Z0-9_-]|$)`, 'm');
  for (const { f, txt } of sources) {
    if (re.test(txt)) {
      used.set(c, f);
      break;
    }
  }
}

const orfas = [...classes].filter((c) => !used.has(c)).sort();
console.log(`classes no globals.css: ${classes.size}`);
console.log(`órfãs: ${orfas.length}\n`);
console.log(orfas.join(' '));

// Quem consome cada classe viva que também existe no HEAD de arquivos de auth —
// sinal de que outra rodada pode estar usando.
const authClasses = [
  'auth-editorial',
  'auth-flower',
  'auth-layout',
  'auth-panel',
  'back-link',
  'text-link',
];
console.log('\nclasses de auth (não tocar):');
for (const c of authClasses)
  console.log(` ${c.padEnd(16)} → ${used.get(c) ?? 'SEM USO no src/ atual'}`);
