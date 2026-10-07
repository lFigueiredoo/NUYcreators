/**
 * Amostra de COR do hero renderizado (não do DOM).
 *
 * O julgamento de "sombra boa ou mancha" e de "superfície ou nada" precisa do
 * pixel pintado, não do `elementFromPoint`. O screenshot volta para dentro da
 * página como data URL e é lido num canvas — assim a leitura é a mesma que o
 * olho faz, só que em números.
 *
 * Uso: node scripts/polish-sample.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const b64 = (buffer) => buffer.toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(async () => {
  await document.fonts.ready;
  for (const img of Array.from(document.images)) {
    img.loading = 'eager';
    await img.decode().catch(() => {});
  }
});
await page.waitForTimeout(1600);

const stage = await page.locator('[class*=heroStage]').first().boundingBox();
const shot = await page.screenshot({
  clip: { x: stage.x - 60, y: stage.y - 20, width: stage.width + 120, height: stage.height + 230 },
});
const origin = { x: stage.x - 60, y: stage.y - 20 };

const rows = await page.evaluate(
  async ({ data, ox, oy }) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${data}`)).blob(),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const read = (pageX, pageY) => {
      const d = ctx.getImageData(Math.round(pageX - ox), Math.round(pageY - oy), 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    // Faixas horizontais na altura da base (o eixo onde a sombra vive).
    const band = {};
    for (const y of [644, 654, 664, 672, 680]) {
      band[y] = [];
      for (let x = 1020; x <= 1560; x += 30) band[y].push([x, read(x, y)]);
    }
    // Perfil vertical no centro da SOMBRA de cada frasco (não no centro do
    // `<img>`, que fica alguns px ao lado) — atravessando a base.
    const column = {};
    for (const [name, x] of [
      ['limpador', 1141],
      ['aromatizador', 1283],
      ['sabonete', 1453],
    ]) {
      column[name] = [];
      for (let y = 630; y <= 692; y += 4) column[name].push([y, read(x, y)]);
    }
    // Varredura longa: onde o plano/ halo começa e termina? Um degrau de cor
    // nesta linha (acima dos frascos) denuncia borda de caixa de luz.
    const scan = [];
    for (let x = 880; x <= 1740; x += 20) scan.push([x, read(x, 300)]);
    // Faixas abaixo das bases: é aqui que o poço de luz aparece sozinho, sem
    // frasco por cima. Um degrau entre duas linhas = borda visível.
    const pool = {};
    for (const y of [680, 700, 720, 740, 770]) {
      pool[y] = [];
      for (let x = 1000; x <= 1620; x += 40) pool[y].push([x, read(x, y)]);
    }
    return { band, column, scan, pool };
  },
  { data: b64(shot), ox: origin.x, oy: origin.y },
);

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
console.log('origem do crop:', origin);
for (const [y, samples] of Object.entries(rows.band)) {
  console.log(`\ny=${y}`);
  console.log(samples.map(([x, c]) => `${x}:${hex(c)}`).join('  '));
}
for (const [x, samples] of Object.entries(rows.column)) {
  console.log(`\nx=${x}`);
  console.log(samples.map(([y, c]) => `${y}:${hex(c)}`).join('  '));
}
for (const [y, samples] of Object.entries(rows.pool)) {
  console.log(`\ny=${y} (poço de luz)`);
  console.log(samples.map(([x, c]) => `${x}:${hex(c)}`).join(' '));
}

await browser.close();
