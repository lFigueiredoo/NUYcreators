/**
 * Assets da landing clean — a partir dos originais em artifacts/images/.
 *
 * Produtos: limpa o RGB sob alpha≈0 (o original traz cinza "fantasma" que
 * aparece em qualquer renderizador que ignore alpha) e corta no bbox real do
 * alpha, para a matemática de tamanho do CSS bater com os pixels nativos.
 *
 * Logo: o original é opaco sobre branco. Aplica chave de branco com
 * desmultiplicação (C = (P - (1-a)·W)/a) — o traço navy continua idêntico sobre
 * branco e passa a compor corretamente sobre o creme.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'artifacts/images';
const OUT_PRODUCTS = 'public/brand/nuy-creators-clean/products';
const OUT_LOGO = 'public/brand/nuy-creators-clean/logo';
fs.mkdirSync(OUT_PRODUCTS, { recursive: true });
fs.mkdirSync(OUT_LOGO, { recursive: true });

const PRODUCTS = [
  ['02_AROMATIZADOR_FLORES_VIBRANTES_200ML.png', 'aromatizador-flores-vibrantes-200ml.png'],
  ['03_SABONETE_CEREJA_SELVAGEM_500ML.png', 'sabonete-cereja-selvagem-500ml.png'],
  ['04_LIMPADOR_CHA_BRANCO_125ML.png', 'limpador-cha-branco-125ml.png'],
  ['05_LIMPADOR_VARIANTE_VERMELHO_125ML.png', 'limpador-variante-vermelho-125ml.png'],
  ['06_LIMPADOR_BRISA_FLORAL_125ML.png', 'limpador-brisa-floral-125ml.png'],
  ['07_SABONETE_FRESCOR_HERBAL_500ML.png', 'sabonete-frescor-herbal-500ml.png'],
  ['08_LIMPADOR_HERBAL_SELVAGEM_125ML.png', 'limpador-herbal-selvagem-125ml.png'],
];

function bbox(data, w, h, c, test) {
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      if (test(data, i)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const report = [];

for (const [src, out] of PRODUCTS) {
  const p = path.join(SRC, src);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let ghost = 0;
  for (let i = 0; i < data.length; i += c) {
    if (data[i + 3] < 8) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) ghost++;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 0;
    }
  }
  const box = bbox(data, w, h, c, (d, i) => d[i + 3] > 8);
  await sharp(data, { raw: { width: w, height: h, channels: c } })
    .extract({ left: box.minX, top: box.minY, width: box.w, height: box.h })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_PRODUCTS, out));
  report.push({ out, canvas: `${w}x${h}`, final: `${box.w}x${box.h}`, ghostPxFixed: ghost });
}

// ---------------------------------------------------------------- logo
{
  const p = path.join(SRC, '01_LOGO_NUY_CREATORS.png');
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  // 1. bbox do traço (o fundo é branco puro e opaco)
  const box = bbox(data, w, h, c, (d, i) => Math.min(d[i], d[i + 1], d[i + 2]) < 245);
  const cw = box.w,
    ch = box.h;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((y + box.minY) * w + (x + box.minX)) * c;
      const di = (y * cw + x) * 4;
      const r = data[si],
        g = data[si + 1],
        b = data[si + 2];
      // 2. cobertura estimada a partir do canal mais escuro (fundo = branco)
      const a = 1 - Math.min(r, g, b) / 255;
      if (a <= 0.004) {
        out[di] = 255;
        out[di + 1] = 255;
        out[di + 2] = 255;
        out[di + 3] = 0;
        continue;
      }
      // 3. desmultiplica: recupera a cor real do traço
      const un = (v) => Math.max(0, Math.min(255, Math.round((v - (1 - a) * 255) / a)));
      out[di] = un(r);
      out[di + 1] = un(g);
      out[di + 2] = un(b);
      out[di + 3] = Math.round(a * 255);
    }
  }
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_LOGO, 'nuy-creators-logo.png'));
  report.push({
    out: 'nuy-creators-logo.png',
    canvas: `${w}x${h}`,
    final: `${cw}x${ch}`,
    ghostPxFixed: 'white-keyed',
  });
}

console.table(report);
