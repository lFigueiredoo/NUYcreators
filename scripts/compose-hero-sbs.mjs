import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Compara hero:REFERÊNCIA (painel desktop 0,0,866,395) | IMPLEMENTAÇÃO (arg tag).
const tag = process.argv[2] ?? 'it1';
const REF = 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const OUT = 'artifacts/round6';
mkdirSync(OUT, { recursive: true });

const ref = await sharp(REF)
  .extract({ left: 0, top: 0, width: 866, height: 395 })
  .resize(820, 374)
  .png()
  .toBuffer();
const impl = await sharp(`${OUT}/impl-hero-${tag}-1920.png`).resize(820, 374).png().toBuffer();
await sharp({ create: { width: 1648, height: 374, channels: 3, background: '#222' } })
  .composite([
    { input: ref, left: 0, top: 0 },
    { input: impl, left: 828, top: 0 },
  ])
  .png()
  .toFile(`${OUT}/sbs-hero-${tag}.png`);
console.log(`sbs-hero-${tag}.png`);
