/**
 * Quanto o plano de apoio levanta o creme, em Δ de 0..255, linha a linha.
 *
 * O creme da página é #F8F4EC (248/244/236). Branco por cima dele rende no
 * MÁXIMO +7/+11/+19 — ou seja, tudo o que este plano pode fazer vive numa
 * janela de 20 níveis, e a olho isso é indistinguível de nada. Daí a leitura
 * numérica: o script tira a captura em dpr 1, decodifica o PNG de volta DENTRO
 * da página (canvas) e imprime o Δ de cada linha em três colunas.
 *
 * As colunas são escolhidas por POSIÇÃO, não por chute: uma no vazio do plano
 * (25% da largura dele), uma sob o frasco do meio e uma do outro lado (75%).
 * A do vazio diz se o plano existe por si; a do meio, se a sombra coletiva
 * está comendo a face. A primeira versão deste script amostrava duas colunas a
 * 60px das pontas — exatamente dentro do degradê da máscara, onde tudo é
 * atenuado — e por isso não via plano nenhum.
 *
 * Uso: node scripts/polish3-perfil.mjs [base]
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'artifacts/polish-final-3';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await page.waitForTimeout(1500);

await fs.mkdir(OUT, { recursive: true });
const shot = `${OUT}/perfil.png`;
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 1440, height: 900 } });

// A geometria vem do DOM; o Δ vem do pixel. As duas coisas têm de bater.
const geo = await page.evaluate(() => {
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return {
      x: +b.x.toFixed(1),
      y: +b.y.toFixed(1),
      w: +b.width.toFixed(1),
      h: +b.height.toFixed(1),
      bottom: +b.bottom.toFixed(1),
    };
  };
  return {
    plano: r(document.querySelector('[class*=heroBase]')),
    grupo: r(document.querySelector('[class*=heroGroup]')),
    main: r(document.querySelector('[class*=heroItemMain] img')),
  };
});

const b64 = (await fs.readFile(shot)).toString('base64');
const perfil = await page.evaluate(
  async ({ b64, geo }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data, width } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const at = (x, y) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // Creme puro: acima do plano e à esquerda da luz do hero.
    const creme = at(60, Math.round(geo.grupo.y) - 60);

    const colunas = [
      /* Duas colunas BEM fora do plano. Se a aresta aparecer nelas, ela não é
         do plinto — é de outra camada do hero, e o ajuste seria no lugar
         errado. */
      { nome: 'fora esq', x: 150 },
      { nome: 'fora dir', x: 1380 },
      { nome: 'vazio esq', x: Math.round(geo.plano.x + geo.plano.w * 0.25) },
      { nome: 'sob frasco', x: Math.round(geo.main.x + geo.main.w * 0.5) },
      { nome: 'vazio dir', x: Math.round(geo.plano.x + geo.plano.w * 0.75) },
    ];

    const linhas = [];
    for (let y = Math.round(geo.plano.y) - 6; y <= Math.round(geo.plano.bottom) + 8; y += 1) {
      const linha = { y };
      for (const c of colunas) {
        const s = at(c.x, y);
        linha[c.nome] = [s[0] - creme[0], s[1] - creme[1], s[2] - creme[2]];
      }
      linhas.push(linha);
    }
    return { creme, colunas, linhas };
  },
  { b64, geo },
);

/*
 * Varredura HORIZONTAL na altura do lábio. O perfil vertical só olha três
 * colunas; se a aresta do plano escapasse da máscara e atravessasse a página,
 * as três continuariam limpas e o defeito passaria. Aqui a página é lida de
 * ponta a ponta, nas duas linhas em volta da aresta.
 */
const varredura = await page.evaluate(
  async ({ b64, geo }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data, width } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const at = (x, y) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const creme = at(60, Math.round(geo.grupo.y) - 60);
    const linhas = [Math.round(geo.plano.y) - 1, Math.round(geo.plano.y), Math.round(geo.plano.y) + 2];
    const amostras = [];
    for (let x = 40; x <= 1400; x += 20) {
      amostras.push({ x, d: linhas.map((y) => at(x, y).map((v, i) => v - creme[i])) });
    }
    return { linhas, amostras };
  },
  { b64, geo },
);

const fmt = (d) => `${String(d[0]).padStart(4)}/${String(d[1]).padStart(4)}/${String(d[2]).padStart(4)}`;
const larg = perfil.colunas.map((c) => Math.max(c.nome.length, 10) + 8);
console.log(`creme do fundo: rgb(${perfil.creme.join(', ')})`);
console.log(
  `plano  y=${geo.plano.y}..${geo.plano.bottom}  x=${geo.plano.x}..${+(geo.plano.x + geo.plano.w).toFixed(1)}` +
    `   grupo bottom=${geo.grupo.bottom}   pé do frasco do meio=${geo.main.bottom}`,
);
console.log(perfil.colunas.map((c) => `${c.nome}@x=${c.x}`).join('   ') + '   — Δ contra o creme');
for (const l of perfil.linhas) {
  const marca =
    l.y === Math.round(geo.plano.y)
      ? '  <<< lábio'
      : l.y === Math.round(geo.main.bottom)
        ? '  <<< pé do frasco'
        : l.y === Math.round(geo.plano.bottom)
          ? '  <<< fim do plano'
          : '';
  console.log(
    `y=${String(l.y).padStart(4)}  ` +
      perfil.colunas.map((c, i) => fmt(l[c.nome]).padEnd(larg[i])).join('') +
      marca,
  );
}

console.log(
  `\nVARREDURA HORIZONTAL — Δ nas linhas ${varredura.linhas.join(', ')} ` +
    `(plano de ${geo.plano.x} a ${+(geo.plano.x + geo.plano.w).toFixed(0)})`,
);
for (const a of varredura.amostras) {
  const dentro = a.x >= geo.plano.x && a.x <= geo.plano.x + geo.plano.w;
  const maior = Math.max(...a.d.flat().map(Math.abs));
  if (!dentro && maior > 2) {
    console.log(`  x=${String(a.x).padStart(4)}  FORA DO PLANO mas com Δ ${maior}  <<< vazamento`);
  } else if (dentro && a.x % 100 < 20) {
    console.log(`  x=${String(a.x).padStart(4)}  ${a.d.map(fmt).join('  ')}`);
  }
}
console.log(
  `  ${varredura.amostras.filter((a) => a.x < geo.plano.x || a.x > geo.plano.x + geo.plano.w).length} amostras fora do plano, ` +
    `maior Δ fora = ${Math.max(...varredura.amostras.filter((a) => a.x < geo.plano.x || a.x > geo.plano.x + geo.plano.w).flatMap((a) => a.d.flat().map(Math.abs)))}`,
);

await browser.close();
