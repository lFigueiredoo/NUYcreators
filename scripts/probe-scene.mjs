import sharp from 'sharp';

// Classifica colunas da cena do hero da referência: massa escura (garrafas),
// roxo (bottle MIST), claro (flores/creme) — para ancorar o packshot.
const file = process.argv[2] ?? 'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png';
const y0 = Number(process.argv[3] ?? 130);
const y1 = Number(process.argv[4] ?? 330);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const maxW = 900;
for (let x = 300; x < Math.min(maxW, info.width); x += 1) {
  let dark = 0,
    purple = 0,
    cream = 0,
    n = 0;
  for (let y = y0; y < y1; y += 2) {
    const [r, g, b] = px(x, y);
    n++;
    if (r > 195 && g > 170 && b > 150) cream++;
    if (b > 90 && b > g + 25 && r > 60 && r < 150) purple++;
    if (r + g + b < 160) dark++;
  }
  const pct = (v) => ((v / n) * 100) | 0;
  const d = pct(dark),
    p = pct(purple),
    c = pct(cream);
  const tag = c > 30 ? 'FLORES' : p > 18 ? 'ROXO' : d > 22 ? 'ESC-URO' : '';
  if (tag) console.log(`${x}\t${d}\t${p}\t${c}\t${tag}`);
}
