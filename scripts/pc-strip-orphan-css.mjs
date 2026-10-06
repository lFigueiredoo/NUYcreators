/**
 * Remove do globals.css as regras que só existem para o design reprovado.
 *
 * Regra de decisão: uma regra só sai se TODAS as classes de TODOS os seus
 * seletores estiverem no conjunto abaixo. Um seletor compartilhado
 * (`.hero, .site-header`) mantém a regra viva — o CSS que auth e `(public)`
 * consomem não é tocado.
 *
 * As classes `auth-*` e `back-link` estão mortas no worktree mas VIVAS no HEAD
 * de `(auth)/layout.tsx`, que outra rodada tem aberto: ficam como estão.
 *
 * Dry-run por padrão. `--write` aplica.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/** Classes órfãs do design antigo da landing (varredura + conferência manual). */
const CONDENADAS = new Set([
  'carousel-controls',
  'challenge-empty',
  'challenge-section',
  'challenge-watermark',
  'cream-section',
  'cta-flower',
  'experience-art',
  'experience-panel',
  'experiences-carousel',
  'faq-list',
  'faq-section',
  'final-cta',
  'floral-back',
  'floral-front',
  'hero',
  'hero-art',
  'hero-art-note',
  'hero-bottom',
  'hero-buttons',
  'hero-copy',
  'hero-description',
  'hero-glow',
  'hero-orbit',
  'hero-product',
  'hero-signature',
  'how-section',
  'lead',
  'levels-list',
  'light-dot',
  'light-one',
  'light-two',
  'manifesto-bottom',
  'manifesto-grid',
  'mood-1',
  'mood-2',
  'orbit-line',
  'orbit-two',
  'ranking-section',
  'reward-types',
  'rewards-section',
  'section-heading',
  'section-kicker',
  'section-pad',
  'steps',
  'subtle-link',
]);

const PATH = 'src/styles/globals.css';
const write = process.argv.includes('--write');
const src = readFileSync(PATH, 'utf8');
const lines = src.split('\n');
const lineOf = (offset) => src.slice(0, offset).split('\n').length;

const classesOf = (sel) => [...sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const splitSelectors = (prelude) =>
  prelude
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const isCondemned = (prelude) =>
  splitSelectors(prelude).every((sel) => {
    const cs = classesOf(sel);
    return cs.length > 0 && cs.every((c) => CONDENADAS.has(c));
  });

/** Casa a chave de abertura em `openIdx` com o `}` correspondente. */
function matchBrace(s, openIdx) {
  let d = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '{') d++;
    else if (s[i] === '}') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

const removidos = [];
const mantidos = [];

/** Processa o corpo de um bloco; devolve o corpo filtrado (ou null se esvaziou). */
function processBody(body, bodyOffset, indent) {
  let out = '';
  let i = 0;
  while (i < body.length) {
    const open = body.indexOf('{', i);
    const semi = body.indexOf(';', i);
    if (open === -1) {
      out += body.slice(i);
      break;
    }
    if (semi !== -1 && semi < open) {
      out += body.slice(i, semi + 1);
      i = semi + 1;
      continue;
    }
    const prelude = body.slice(i, open).trim();
    const close = matchBrace(body, open);
    if (close === -1) {
      out += body.slice(i);
      break;
    }
    const inner = body.slice(open + 1, close);
    const at = prelude.match(/^@([\w-]+)/)?.[1];

    if (at && /^(media|supports|container|layer)$/.test(at)) {
      const filtered = processBody(inner, bodyOffset + open + 1, indent + '  ');
      if (filtered === null || filtered.trim() === '') {
        removidos.push({
          line: lineOf(bodyOffset + i),
          sel: prelude + ' { … }',
          nota: 'átomo vazio',
        });
        i = close + 1;
        continue;
      }
      out += `${prelude} {${filtered}}`;
      i = close + 1;
      continue;
    }

    if (at) {
      out += body.slice(i, close + 1);
      i = close + 1;
      continue;
    }

    if (isCondemned(prelude)) {
      removidos.push({ line: lineOf(bodyOffset + i), sel: prelude.replace(/\s+/g, ' ') });
      // engole o espaço em branco seguinte para não deixar linha vazia dupla
      let j = close + 1;
      while (j < body.length && /\s/.test(body[j])) j++;
      i = j;
      continue;
    }

    mantidos.push(prelude.replace(/\s+/g, ' '));
    out += body.slice(i, close + 1);
    i = close + 1;
  }
  return out;
}

const novo = processBody(src, 0, '');

console.log(`linhas: ${lines.length} → ${novo.split('\n').length}`);
console.log(`\nREMOVIDAS (${removidos.length}):`);
for (const r of removidos)
  console.log(`  ${String(r.line).padStart(5)}  ${r.sel}${r.nota ? `  (${r.nota})` : ''}`);

// Animations que ficaram sem dono
const anims = new Set([...src.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
const usadas = new Set([...novo.matchAll(/animation(?:-name)?:\s*([\w-]+)/g)].map((m) => m[1]));
const animOrfas = [...anims].filter((a) => !usadas.has(a));
console.log(`\n@keyframes sem uso: ${animOrfas.length ? animOrfas.join(' ') : 'nenhuma'}`);

if (write) {
  writeFileSync(PATH, novo);
  console.log('\nescrito.');
} else {
  console.log('\n(dry-run — rode com --write para aplicar)');
}
