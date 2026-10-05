// R7 — asset-level alpha ramps. End of the rectangular seam: crops with a "baked"
// background get per-edge feathering (smoothstep) in the alpha channel itself;
// edges that continue off-screen/onto a boundary stay "cut" (alpha = 1).
// Sources: existing webp files (jornada/faq) and precise crops of the official reference.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'public/brand/reference';
mkdirSync(OUT, { recursive: true });
mkdirSync('artifacts/round7/assets/previews', { recursive: true });

const REF = 'artifacts/round6/review/reference-official.png';

// edge spec: 'cut' (edge = boundary/viewport, keep alpha 1 at limit) | number (feather px)
const jobs = [
  {
    name: 'journey-bouquet-tr',
    src: `${OUT}/journey-bouquet-tr.webp`,
    edges: { top: 'cut', bottom: 64, left: 44, right: 60 },
  },
  {
    name: 'journey-orchid-l',
    src: `${OUT}/journey-orchid-l.webp`,
    edges: { top: 42, bottom: 46, left: 'cut', right: 42 },
  },
  {
    name: 'faq-bloom-corner',
    src: `${OUT}/faq-bloom-corner.webp`,
    edges: { top: 54, left: 'cut', bottom: 'cut', right: 60 },
  },
  {
    name: 'project-floral-l', // new: bottom-left flower of the project (over cream)
    crop: { left: 0, top: 498, width: 62, height: 66 },
    edges: { top: 28, right: 30, left: 'cut', bottom: 'cut' },
    scale: 4,
  },
  {
    name: 'como-floral-r', // new: blossom entering through the right edge of "como"
    crop: { left: 790, top: 578, width: 76, height: 84 },
    edges: { top: 34, bottom: 36, left: 44, right: 'cut' },
    scale: 4,
  },
  {
    name: 'para-quem-floral', // new: spray of petals at the border of "como" -> top-left corner of "para quem"
    crop: { left: 0, top: 734, width: 52, height: 52 },
    edges: { top: 22, right: 22, bottom: 20, left: 'cut' },
    scale: 4,
  },
  {
    name: 'beneficios-floral', // new: bottom-left cluster of the benefits (cut at the bottom of the mockup)
    crop: { left: 0, top: 944, width: 96, height: 78 },
    edges: { top: 30, right: 40, left: 'cut', bottom: 'cut' },
    scale: 4,
  },
];

const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

for (const job of jobs) {
  const { name } = job;
  const base = job.crop
    ? await sharp(REF)
        .extract(job.crop)
        .resize(job.crop.width * (job.scale ?? 4), job.crop.height * (job.scale ?? 4), {
          kernel: 'lanczos3',
        })
        .png()
        .toBuffer()
    : await sharp(job.src).png().toBuffer();
  const { data, info } = await sharp(base)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height,
    C = info.channels;
  const f = {
    top: job.edges.top === 'cut' ? Infinity : (job.edges.top ?? 0),
    bottom: job.edges.bottom === 'cut' ? Infinity : (job.edges.bottom ?? 0),
    left: job.edges.left === 'cut' ? Infinity : (job.edges.left ?? 0),
    right: job.edges.right === 'cut' ? Infinity : (job.edges.right ?? 0),
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 1;
      if (f.left < Infinity) a = Math.min(a, smooth((x + 0.5) / f.left));
      if (f.right < Infinity) a = Math.min(a, smooth((W - 0.5 - x) / f.right));
      if (f.top < Infinity) a = Math.min(a, smooth((y + 0.5) / f.top));
      if (f.bottom < Infinity) a = Math.min(a, smooth((H - 0.5 - y) / f.bottom));
      if (a < 1) data[(y * W + x) * C + 3] = Math.round(data[(y * W + x) * C + 3] * a);
    }
  }
  const file = job.crop ? `${OUT}/${name}.webp` : `${OUT}/${name}-feathered.webp`;
  await sharp(data, { raw: { width: W, height: H, channels: C } })
    .webp({ quality: 90, alphaQuality: 90 })
    .toFile(file);
  // preview on checkerboard to verify the ramp
  const pvW = Math.round(W / 3),
    pvH = Math.round(H / 3);
  const pv = await sharp(file).resize(pvW, pvH, { fit: 'inside' }).png().toBuffer();
  await sharp({
    create: { width: pvW + 2, height: pvH + 2, channels: 3, background: '#7a7fa0' },
  })
    .composite([{ input: pv, left: 1, top: 1 }])
    .png()
    .toFile(`artifacts/round7/assets/previews/${name}.png`);
  console.log(`${name}: ${W}x${H} -> ${file}`);
}
console.log('feather ok');
