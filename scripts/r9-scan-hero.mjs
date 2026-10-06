import sharp from 'sharp';

// R9 checkpoint A — tabela-alvo do HERO da nova referência (1024×1536,
// banda 0-385). Saída em coordenadas 1920 CSS (×1,875).
const SRC = 'c:/Users/rdeq1/Downloads/Landing page luxuosa NUY Creators com flores e produtos.png';
const S = 1.875;
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const ch = info.channels;

function bands(x0, x1, y0, y1, test, minPerRow) {
  const out = [];
  let s = -1;
  for (let y = y0; y < y1; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * ch;
      if (test(data[i], data[i + 1], data[i + 2])) c++;
    }
    if (c >= minPerRow) {
      if (s === -1) s = y;
    } else if (s !== -1) {
      out.push([s, y - 1]);
      s = -1;
    }
  }
  if (s !== -1) out.push([s, y1 - 1]);
  return out;
}
function cols(x0, x1, y0, y1, test, minPerCol, gap) {
  const out = [];
  let s = -1,
    prev = -1;
  for (let x = x0; x < x1; x++) {
    let c = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * W + x) * ch;
      if (test(data[i], data[i + 1], data[i + 2])) c++;
    }
    if (c >= minPerCol) {
      if (s === -1) s = x;
      prev = x;
    } else if (s !== -1 && x - prev > (gap || 8)) {
      out.push([s, prev]);
      s = -1;
    }
  }
  if (s !== -1) out.push([s, prev]);
  return out;
}
const lum = (t) => (r, g, b) => (r + g + b) / 3 > t;
const fmt = (arr) =>
  arr.map(([a, b]) => `[${Math.round(a * S)}-${Math.round((b + 1) * S)}]`).join(' ');
const fmtC = (arr) =>
  arr
    .map(
      ([a, b]) =>
        `${Math.round(a * S)}-${Math.round((b + 1) * S)} (w${Math.round((b - a + 1) * S)})`,
    )
    .join(' | ');

// janelas em mockup-px 1024 (banda hero 0-385)
console.log('== copy column ==');
console.log(
  'kicker rows (x14-45):',
  fmt(bands(14, 45, 20, 40, lum(120), 3)),
  'cols y24-33:',
  fmtC(cols(10, 60, 24, 33, lum(120), 1)),
);
console.log('h1L1 rows (x13-42):', fmt(bands(13, 42, 40, 65, lum(140), 3)));
console.log('h1L1 cols (y44-58):', fmtC(cols(10, 60, 44, 58, lum(140), 1)));
console.log('h1L2 rows (x13-60):', fmt(bands(13, 60, 58, 85, lum(130), 3)));
console.log('h1L2 cols (y62-80):', fmtC(cols(10, 90, 62, 80, lum(130), 1)));
console.log('body rows (x13-42):', fmt(bands(13, 42, 88, 118, lum(150), 3)));
console.log('body cols l1 (y94-103):', fmtC(cols(10, 50, 94, 103, lum(150), 1)));
console.log('body cols l2 (y105-113):', fmtC(cols(10, 50, 105, 113, lum(150), 1)));
console.log('ctas rows (x13-30 pill1):', fmt(bands(13, 30, 118, 148, lum(160), 3)));
console.log('ctas cols y126-140:', fmtC(cols(10, 45, 126, 140, lum(160), 1)));
console.log('assinatura rows (x13-32):', fmt(bands(13, 32, 148, 168, lum(120), 2)));
console.log('assinatura cols y156-164:', fmtC(cols(10, 40, 156, 164, lum(120), 1)));

console.log('== chips row ==');
console.log('chips rows (x13-100):', fmt(bands(13, 100, 172, 192, lum(120), 2)));
console.log('chips cols y178-190:', fmtC(cols(10, 100, 178, 190, lum(120), 1, 4)));

console.log('== header ==');
console.log('logo rows (x6-11):', fmt(bands(6, 11, 0, 22, lum(150), 2)));
console.log('logo cols y4-14:', fmtC(cols(5, 13, 4, 14, lum(150), 1)));
console.log('nav rows (x17-32):', fmt(bands(17, 32, 8, 20, lum(140), 2)));
console.log('nav cols y11-16:', fmtC(cols(15, 45, 11, 16, lum(140), 1)));
console.log('right side cols y11-16 (x80-102):', fmtC(cols(80, 102, 11, 16, lum(140), 1)));

console.log('== cena (produtos/flores/arco) — bordas do bloco claro ==');
const sceneCols = [];
for (let x = 40; x < 102; x++) {
  let sum = 0,
    n = 0;
  for (let y = 0; y < 385; y++) {
    const i = (y * W + x) * ch;
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    n++;
  }
  sceneCols.push(sum / n);
}
// reporta onde a média sobe acima de 60 (a cena é mais clara que o navy circundante à esquerda)
let first = null,
  last = null;
sceneCols.forEach((v, k) => {
  const x = k + 40;
  if (v > 60) {
    if (first === null) first = x;
    last = x;
  }
});
console.log(
  'cena: colunas >60 de média:',
  Math.round(first * S),
  'a',
  Math.round((last + 1) * S),
  '(w',
  Math.round((last - first + 1) * S),
  ')',
);
