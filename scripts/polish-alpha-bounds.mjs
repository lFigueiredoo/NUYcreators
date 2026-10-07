/**
 * Onde a garrafa REALMENTE termina dentro do arquivo do packshot.
 *
 * Os PNGs de produto vêm com margem transparente em volta. A sombra desenhada
 * na caixa do `<img>` fica então alguns pixels ABAIXO da base visível, e lê
 * como mancha solta em vez de contato. Este script mede, por arquivo, a caixa
 * dos pixels com alpha — é o número que decide onde a sombra encosta.
 *
 * Uso: node scripts/polish-alpha-bounds.mjs
 */
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const FILES = [
  'aromatizador-flores-vibrantes-200ml.png',
  'sabonete-cereja-selvagem-500ml.png',
  'limpador-cha-branco-125ml.png',
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of FILES) {
  const url = `http://localhost:3000/brand/nuy-creators-clean/products/${file}`;
  const buffer = await fs.readFile(
    `public/brand/nuy-creators-clean/products/${file}`,
  );
  const out = await page.evaluate(
    async ({ data }) => {
      const bitmap = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${data}`)).blob(),
      );
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const { data: px, width, height } = ctx.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      );
      const alpha = (x, y) => px[(y * width + x) * 4 + 3];
      // Caixa útil em vários limiares: o resíduo de fundo que sobra nos
      // arquivos é opaco o bastante para vencer o limiar baixo, então só o
      // limiar alto (>=240) descreve a garrafa de verdade.
      const box = (min) => {
        let top = Infinity, bottom = -1, left = Infinity, right = -1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (alpha(x, y) < min) continue;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
        return bottom < 0 ? null : { top, bottom, left, right };
      };
      // Onde a BASE mora, em fração da largura do arquivo. É este par de
      // números que posiciona a sombra: a caixa do `<img>` quase nunca é
      // centrada na garrafa, e uma sombra centrada na caixa nasce deslocada.
      const baseRows = [];
      for (const frac of [0.99, 0.97, 0.94, 0.9, 0.85]) {
        const y = Math.round((height - 1) * frac);
        let min = Infinity, max = -1, weight = 0, centroid = 0;
        for (let x = 0; x < width; x += 1) {
          const a = alpha(x, y);
          if (a < 180) continue;
          if (x < min) min = x;
          if (x > max) max = x;
          weight += a;
          centroid += x * a;
        }
        baseRows.push(
          max < 0
            ? { frac, empty: true }
            : {
                frac,
                left: +((min / width) * 100).toFixed(1),
                right: +((max / width) * 100).toFixed(1),
                center: +(((centroid / weight) / width) * 100).toFixed(1),
              },
        );
      }
      // Perfil das últimas linhas: média e máxima do alpha por linha.
      const tail = [];
      for (let y = Math.max(0, height - 16); y < height; y += 1) {
        let sum = 0, max = 0;
        for (let x = 0; x < width; x += 1) {
          const a = alpha(x, y);
          sum += a;
          if (a > max) max = a;
        }
        tail.push({ y, avg: Math.round(sum / width), max });
      }
      // Alpha no centrório horizontal, linha a linha do rodapé.
      const center = Math.round(width / 2);
      const columnTail = [];
      for (let y = Math.max(0, height - 16); y < height; y += 1) {
        columnTail.push({ y, a: alpha(center, y) });
      }
      return { width, height, solid: box(240), faint: box(30), baseRows, tail, columnTail };
    },
    { data: buffer.toString('base64') },
  );
  const padBottom = out.height - 1 - out.solid.bottom;
  console.log(
    `${file}\n  bitmap ${out.width}×${out.height}` +
      `\n  garrafa (α≥240)  x ${out.solid.left}..${out.solid.right}  y ${out.solid.top}..${out.solid.bottom}` +
      `\n  resíduo (α≥30)   x ${out.faint.left}..${out.faint.right}  y ${out.faint.top}..${out.faint.bottom}` +
      `\n  margem inferior real: ${padBottom}px de ${out.height} (${((padBottom / out.height) * 100).toFixed(1)}%)`,
    `\n  base da garrafa (% da largura do arquivo): ` +
      out.baseRows
        .map((r) =>
          r.empty
            ? `${r.frac}:—`
            : `${r.frac}: ${r.left}..${r.right} (centro ${r.center})`,
        )
        .join('  '),
    `\n  rodapé (alpha médio/máx por linha): ` +
      out.tail.map((t) => `${t.y}:${t.avg}/${t.max}`).join(' '),
    `\n  coluna central: ` + out.columnTail.map((t) => `${t.y}:${t.a}`).join(' '),
    `\n  url ${url}`,
  );
}

await browser.close();
