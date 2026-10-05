import sharp from 'sharp';

// Âncora definitiva das garrafas na referência: por coluna (y 130–350 do
// painel desktop), conta tinta LILÁS (garrafa roxa/violeta) e PRETA (gatilho
// do spray, r+g+b<95). Por linha (x 380–866), conta as mesmas classes para
// delimitar topo e base dos frascos.
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
for (let x = 300; x < 866; x += 2) {
  let purple = 0,
    black = 0;
  for (let y = 125; y < 360; y += 1) {
    const [r, g, b] = px(x, y);
    if (b > 130 && r > 80 && r < 200 && b - g > 55 && g < r) purple++;
    if (r + g + b < 95) black++;
  }
  cols.push({ x, purple, black });
}
const s = (arr, k) => {
  const max = Math.max(...arr.map((c) => c[k]));
  const on = arr.filter((c) => c[k] > Math.max(8, max * 0.28));
  return on.length ? `${on[0].x}–${on[on.length - 1].x} (pk ${max})` : '—';
};
console.log('COLUNAS   lilás:', s(cols, 'purple'));
console.log('COLUNAS   preto:', s(cols, 'black'));

const rowRange = (k) => {
  const rows = [];
  for (let y = 60; y < 395; y += 2) {
    let purple = 0,
      black = 0,
      n = 0;
    for (let x = 380; x < 866; x += 1) {
      const [r, g, b] = px(x, y);
      n++;
      if (b > 130 && r > 80 && r < 200 && b - g > 55 && g < r) purple++;
      if (r + g + b < 95) black++;
    }
    if (purple > 12) rowRange._p = rowRange._p ?? y;
    rows.push({ y, purple: (purple / n) * 100, black: (black / n) * 100 });
  }
  console.log(`linhas ${k}: primeiro/último y com presença`);
  return rows;
};
const rows = rowRange();
const pOn = rows.filter((r) => r.purple > 1.2);
const kOn = rows.filter((r) => r.black > 2);
if (pOn.length) console.log('lilás y:', pOn[0].y, '–', pOn[pOn.length - 1].y);
if (kOn.length) console.log('preto y:', kOn[0].y, '–', kOn[kOn.length - 1].y);
