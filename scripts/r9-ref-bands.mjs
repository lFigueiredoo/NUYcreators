import sharp from 'sharp';

// R9 — referência oficial NOVA (1024×1536, landing inteira em um artboard):
// 1) fronteira de seções por cor média de linha (navy↔creme);
// 2) o recorte do painel hero vai para /hero-band para os scans seguintes.
const SRC = 'c:/Users/rdeq1/Downloads/Landing page luxuosa NUY Creators com flores e produtos.png';
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const ch = info.channels;

// média da linha em duas janelas: centro (limpo de flores) e borda esquerda
const rows = [];
for (let y = 0; y < info.height; y++) {
  let sumCenter = 0,
    nC = 0,
    sumLeft = 0,
    nL = 0;
  for (let x = 180; x < 850; x += 4) {
    const i = (y * W + x) * ch;
    sumCenter += (data[i] + data[i + 1] + data[i + 2]) / 3;
    nC++;
  }
  for (let x = 2; x < 40; x += 2) {
    const i = (y * W + x) * ch;
    sumLeft += (data[i] + data[i + 1] + data[i + 2]) / 3;
    nL++;
  }
  rows.push({ y, center: sumCenter / nC, left: sumLeft / nL });
}
// imprimindo só transições (linha muda de régua <150 para >200 ou vice-versa)
let regime = rows[0].center > 180 ? 'claro' : 'escuro';
console.log('início:', regime, 'row0 center=', rows[0].center.toFixed(0));
for (const r of rows) {
  const now = r.center > 180 ? 'claro' : 'escuro';
  if (now !== regime) {
    console.log(
      `transição y=${r.y} centro=${r.center.toFixed(0)} esq=${r.left.toFixed(0)} ${regime}→${now}`,
    );
    regime = now;
  }
}
