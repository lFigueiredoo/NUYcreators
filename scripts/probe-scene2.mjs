import sharp from 'sharp';

// Histograma por coluna da cena do hero (referência): roxo / preto / creme / quente.
const { data, info } = await sharp(
  'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png',
)
  .raw()
  .toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const rows = [];
for (let x = 200; x < 880; x += 8) {
  let black = 0,
    purple = 0,
    cream = 0,
    warm = 0,
    n = 0;
  for (let y = 140; y < 330; y += 2) {
    const [r, g, b] = px(x, y);
    n++;
    const l = (r + g + b) / 3;
    if (r > 195 && g > 170 && b > 150) cream++;
    if (b > 85 && b > g + 30 && r < 160 && r > 55) purple++;
    if (l < 26) black++;
    if (r > 150 && g > 100 && b < 120 && r - b > 50) warm++;
  }
  const s = (v) => String(((v / n) * 100) | 0).padStart(2);
  rows.push(`${x}:\tP${s(purple)}\tK${s(black)}\tC${s(cream)}\tW${s(warm)}`);
}
console.log(rows.join('\n'));
