import sharp from 'sharp';

// Extensões por linha das garrafas: REF (painel, região y0–395) e IMPL
// (screenshot 1920×~876, hero inteiro). Mesmas classes S/P/G.
const [file, y0s, y1s, x0s, x1s, steps] = process.argv.slice(2);
const y0 = y0s ? Number(y0s) : 100;
const y1 = y1s ? Number(y1s) : 395;
const x0 = x0s ? Number(x0s) : 380;
const x1 = x1s ? Number(x1s) : 866;
const step = steps ? Number(steps) : 1;
const { data, info } = await sharp(file).resize().raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const cls = (r, g, b) => {
  if (b > 130 && r > 80 && r < 200 && b - g > 55 && g < r) return 'P';
  if (r + g + b < 150 && Math.abs(b - r) < 18) return 'S';
  if (r > 165 && g > 110 && b < 120 && r - b > 70) return 'G';
  return '.';
};
const out = [];
for (let y = y0; y < y1; y += step || 1) {
  let P = 0,
    S = 0,
    G = 0,
    n = 0;
  for (let x = x0; x < x1; x += 1) {
    const c = cls(...px(x, y));
    n++;
    if (c === 'P') P++;
    if (c === 'S') S++;
    if (c === 'G') G++;
  }
  const pct = (v) => ((v / n) * 100) | 0;
  if (P > 2 || S > 3 || G > 3)
    out.push(
      `${y}\tP${String(pct(P)).padStart(2)}\tS${String(pct(S)).padStart(2)}\tG${String(pct(G)).padStart(2)}`,
    );
}
console.log(out.join('\n'));
