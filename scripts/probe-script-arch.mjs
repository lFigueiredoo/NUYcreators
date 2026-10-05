import sharp from 'sharp';

// Script manuscrito e arco da referência: colunas de tinta clara (traço do
// script) e de arco-lavanda (céu noturno) — delimita posição real dos dois.
const { data, info } = await sharp(
  'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png',
)
  .raw()
  .toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const cols = [];
for (let x = 560; x < 866; x += 2) {
  let ink = 0,
    arch = 0,
    n = 0;
  for (let y = 60; y < 200; y += 1) {
    const [r, g, b] = px(x, y);
    n++;
    if (r > 190 && g > 185 && b > 185) ink++;
    if (b > 135 && r > 95 && r < 210 && g > 85 && g < 170 && b > r) arch++;
  }
  cols.push({ x, ink, arch, n });
}
const s = (k, t) => {
  const on = cols.filter((c) => c[k] > t);
  return on.length
    ? `${on[0].x}–${on[on.length - 1].x} (max ${Math.max(...cols.map((c) => c[k]))})`
    : '—';
};
console.log('tinta do script (y60-200):', s('ink', 6));
console.log('arco-lavanda (y60-200):', s('arch', 25));
const rows = [];
for (let y = 40; y < 260; y += 2) {
  let ink = 0;
  for (let x = 700; x < 866; x += 1) {
    const [r, g, b] = px(x, y);
    if (r > 190 && g > 185 && b > 185) ink++;
  }
  if (ink > 10) rows.push(y);
}
console.log(
  'linhas com tinta (x700-866):',
  rows.length ? `${rows[0]}–${rows[rows.length - 1]}` : '—',
);
