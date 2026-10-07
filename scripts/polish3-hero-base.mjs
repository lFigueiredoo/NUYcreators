/**
 * Onde cada frasco do hero REALMENTE encosta no chão — em pixels de tela.
 *
 * A base visível de um packshot não é o pé da caixa do `<img>`: o arquivo tem
 * margem transparente. E o frasco ainda é escalado por `--pl-rest-scale` em
 * torno de `transform-origin: bottom center`, então a caixa não descreve o
 * frasco. Este script cruza as duas coisas:
 *
 *   1. lê o alpha de cada PNG e acha a ÚLTIMA linha com tinta (limiar 240,
 *      o mesmo do `polish-alpha-bounds.mjs`);
 *   2. mede o `<img>` na tela e converte essa linha para y de tela.
 *
 * O número que interessa é a coluna `base` — é onde a sombra de contato tem de
 * morar, e é ele que diz se os três estão no mesmo plano ou em três degraus.
 *
 * Uso: node scripts/polish3-hero-base.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const ARCHIVE = 'public/brand/nuy-creators-clean/products';
const OUT = 'artifacts/polish-final-3';

/** Última linha com tinta e a faixa horizontal dela, em fração do arquivo. */
async function medirAlpha(page, file) {
  const data = (await fs.readFile(`${ARCHIVE}/${file}`)).toString('base64');
  return page.evaluate(async (b64) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${b64}`)).blob(),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data: px, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const alpha = (x, y) => px[(y * width + x) * 4 + 3];

    let last = -1;
    for (let y = height - 1; y >= 0 && last < 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        if (alpha(x, y) >= 240) {
          last = y;
          break;
        }
      }
    }
    // Nas últimas 6 linhas de tinta, a faixa x ocupada — é a largura do "pé".
    let left = Infinity;
    let right = -1;
    for (let y = last; y > last - 6 && y >= 0; y -= 1) {
      for (let x = 0; x < width; x += 1) {
        if (alpha(x, y) < 240) continue;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    return {
      width,
      height,
      lastInkRow: last,
      padBottom: height - 1 - last,
      footLeft: left / width,
      footRight: right / width,
    };
  }, data);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await page.waitForTimeout(1200);

const alvos = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[class*=heroItem]')).map((li) => {
    const img = li.querySelector('img');
    const r = img.getBoundingClientRect();
    // `next/image` reescreve o `src` para `/_next/image?url=…`; o nome do
    // arquivo original só existe dentro do parâmetro `url`.
    const src = img.getAttribute('src') ?? '';
    const real = src.includes('url=') ? decodeURIComponent(src.split('url=')[1].split('&')[0]) : src;
    return {
      classe: li.className.match(/heroItem[A-Za-z]+/)?.[0] ?? '?',
      arquivo: real.split('/').pop() ?? '?',
      natural: [img.naturalWidth, img.naturalHeight],
      naturalCss: [img.clientWidth, img.clientHeight],
      transformItem: getComputedStyle(li).transform,
      marginBottom: getComputedStyle(li).marginBottom,
      rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      itemRect: (() => {
        const q = li.getBoundingClientRect();
        return { y: +q.y.toFixed(1), h: +q.height.toFixed(1), bottom: +q.bottom.toFixed(1) };
      })(),
      restScale: getComputedStyle(li).getPropertyValue('--pl-rest-scale').trim() || '1',
      zIndex: getComputedStyle(li).zIndex,
    };
  }),
);

const linhas = [];
for (const alvo of alvos) {
  const alpha = await medirAlpha(page, alvo.arquivo);
  // A última linha de tinta fica `padBottom` px acima do pé do ARQUIVO. O
  // arquivo é desenhado no tamanho renderizado do `<img>` (não no bitmap
  // servido, que pode vir em outra resolução), e o `--pl-rest-scale` encolhe o
  // frasco em torno da base — que, por ser a origem, não anda.
  const desenho = alvo.rect.h / alpha.height;
  const padNaTela = alpha.padBottom * desenho * Number(alvo.restScale);
  const base = alvo.rect.y + alvo.rect.h - padNaTela;
  linhas.push({
    frasco: alvo.classe,
    zIndex: alvo.zIndex,
    css: `${alvo.rect.w}×${alvo.rect.h}`,
    imagem: `${alvo.natural[0]}×${alvo.natural[1]}`,
    arquivo: `${alpha.width}×${alpha.height}`,
    transform: alvo.transformItem,
    margem: alvo.marginBottom,
    imgTopo: +alvo.rect.y.toFixed(1),
    imgPe: +(alvo.rect.y + alvo.rect.h).toFixed(1),
    itemPe: alvo.itemRect.bottom,
    padNaTela: +padNaTela.toFixed(2),
    base: +base.toFixed(1),
    centroX: +(alvo.rect.x + alvo.rect.w / 2).toFixed(1),
    peEsq: +(alvo.rect.x + alvo.rect.w * alpha.footLeft).toFixed(1),
    peDir: +(alvo.rect.x + alvo.rect.w * alpha.footRight).toFixed(1),
  });
}

const chao = await page.evaluate(() => {
  const b = document.querySelector('[class*=heroBase]');
  const r = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  return { y: +r.y.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1), w: +r.width.toFixed(1), bottom: +(r.bottom).toFixed(1), top: cs.top };
});

const grupo = await page.evaluate(() => {
  const g = document.querySelector('[class*=heroGroup]');
  const r = g.getBoundingClientRect();
  return { y: +r.y.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1), w: +r.width.toFixed(1) };
});

console.log(JSON.stringify({ frascos: linhas, chao, grupo }, null, 1));

/*
 * Segunda pergunta: o chão ESCURECE onde o frasco encosta?
 *
 * A base diz onde a sombra tem de morar; isto diz se ela está lá. O creme é
 * 248/244/236, então a leitura é em Δ negativo contra ele — quanto mais fundo,
 * mais forte o contato. Três colunas por frasco (borda esquerda, centro,
 * borda direita do pé), porque uma sombra descentrada aparece como um lado
 * fundo e o outro raso.
 */
await fs.mkdir(OUT, { recursive: true });
const shot = `${OUT}/base.png`;
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 1440, height: 900 } });

const sombras = await page.evaluate(
  async ({ b64, linhas }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data, width } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const dpr = bitmap.width / 1440;
    const at = (x, y) => {
      const i = (Math.round(y * dpr) * width + Math.round(x * dpr)) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const creme = at(60, 700); // creme puro, abaixo de tudo, à esquerda

    return linhas.map((l) => {
      const largura = l.peDir - l.peEsq;
      const cols = [
        { nome: 'esq', x: l.peEsq + largura * 0.15 },
        { nome: 'meio', x: l.peEsq + largura * 0.5 },
        { nome: 'dir', x: l.peEsq + largura * 0.85 },
      ];
      const rows = [];
      for (let y = Math.round(l.base) - 1; y <= Math.round(l.base) + 14; y += 1) {
        const linha = { y, d: cols.map((c) => at(c.x, y).map((v, i) => v - creme[i])) };
        rows.push(linha);
      }
      return { frasco: l.frasco, cols: cols.map((c) => ({ nome: c.nome, x: Math.round(c.x) })), rows };
    });
  },
  { b64: (await fs.readFile(shot)).toString('base64'), linhas },
);

console.log('\nSOMBRA DE CONTATO — Δ contra o creme, por linha (quanto mais negativo, mais fundo)');
for (const s of sombras) {
  console.log(`\n${s.frasco}   ${s.cols.map((c) => `${c.nome}@x=${c.x}`).join('  ')}`);
  for (const r of s.rows) {
    const d = r.d.map((v) => `-${Math.abs(v[0])}`.padStart(5) + `/${v[2]}`.padStart(4));
    console.log(`  y=${r.y}  ${d.join('  ')}`);
  }
}

await browser.close();
