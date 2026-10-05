import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// SBS genérico: ref (recorte do painel desktop) | impl (seção capturada).
// Uso: node scripts/compose-section-sbs.mjs <nome> <left> <top> <w> <h> <tagImpl>
// Ex.: como-funciona 0 565 866 185 it1
const [name, left, top, w, h] = process.argv.slice(2);
const REF = 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });

const refBuf = await sharp(REF)
  .extract({ left: +left, top: +top, width: +w, height: +h })
  .png()
  .toBuffer();
const refMeta = await sharp(refBuf).metadata();
const impl = `${OUT}/impl-secao-${name}-1920.png`;
const implMeta = await sharp(impl).metadata();
const refR = await sharp(refBuf).resize(820).png().toBuffer();
const implR = await sharp(impl).resize(820).png().toBuffer();
const refH = Math.round((820 / refMeta.width) * refMeta.height);
const implH = Math.round((820 / implMeta.width) * implMeta.height);
await sharp({
  create: { width: 1648, height: Math.max(refH, implH), channels: 3, background: '#1a1a1a' },
})
  .composite([
    { input: refR, left: 0, top: 0 },
    { input: implR, left: 828, top: 0 },
  ])
  .png()
  .toFile(`${OUT}/sbs-${name}.png`);
console.log(
  `sbs-${name}.png (ref ${refMeta.width}×${refMeta.height} | impl ${implMeta.width}×${implMeta.height})`,
);
