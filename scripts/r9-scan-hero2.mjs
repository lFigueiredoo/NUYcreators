import sharp from 'sharp';

// R9 checkpoint A.2 — scan do prato do hero já em espaço 1920 (×1,875 da ref
// 1024×1536, banda 0-385). Janelas calibradas pela leitura visual do prato.
const SRC = 'artifacts/r9/reference-hero.png';
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const ch = info.channels;

function bands(x0, x1, y0, y1, test, minPerRow, gap) {
  const out = [];
  let s = -1,
    prev = -1;
  for (let y = y0; y < y1; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * ch;
      if (test(data[i], data[i + 1], data[i + 2])) c++;
    }
    if (c >= minPerRow) {
      if (s === -1) s = y;
      prev = y;
    } else if (s !== -1 && y - prev > (gap || 6)) {
      out.push([s, prev]);
      s = -1;
    }
  }
  if (s !== -1) out.push([s, prev]);
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
const gold = (r, g, b) => r > 120 && g > 85 && b < 120 && r > b + 30;
const fmt = (arr) => arr.map(([a, b]) => `[${a}-${b}] (h${b - a + 1})`).join(' ');
const fmtC = (arr) => arr.map(([a, b]) => `${a}-${b} (w${b - a + 1})`).join(' | ');

console.log('== header ==');
console.log('logo rows y25-100 x240-400:', fmt(bands(240, 400, 25, 100, lum(150), 3)));
console.log('logo cols y30-95:', fmtC(cols(230, 420, 30, 95, lum(150), 2)));
console.log('creators rows y80-110 x240-400:', fmt(bands(240, 400, 80, 110, lum(120), 2)));
console.log('nav cols y40-70 x600-1300:', fmtC(cols(600, 1300, 40, 70, lum(140), 2, 24)));
console.log('entrar+pill cols y25-80 x1400-1830:', fmtC(cols(1400, 1830, 25, 80, lum(140), 2, 20)));
console.log('pill rows y15-90 x1600-1780:', fmt(bands(1600, 1780, 15, 90, lum(170), 4)));

console.log('== copy ==');
console.log('kicker rows y150-195 x245-700:', fmt(bands(245, 700, 150, 195, gold, 4)));
console.log('kicker cols y158-185:', fmtC(cols(240, 720, 158, 185, gold, 1, 30)));
console.log('h1L1 rows y195-290 x245-760:', fmt(bands(245, 760, 195, 290, lum(150), 4)));
console.log('h1L1 cols y215-275:', fmtC(cols(235, 800, 215, 275, lum(140), 2, 40)));
console.log('h1L2 rows y280-385 x245-1010:', fmt(bands(245, 1010, 280, 385, lum(140), 4)));
console.log('h1L2 cols y300-370:', fmtC(cols(235, 1050, 300, 370, lum(130), 2, 40)));
console.log('body rows y380-470 x245-850:', fmt(bands(245, 850, 380, 470, lum(150), 4)));
console.log('body cols l1 y395-425:', fmtC(cols(235, 900, 395, 425, lum(140), 2, 40)));
console.log('body cols l2 y430-465:', fmtC(cols(235, 900, 430, 465, lum(140), 2, 40)));

console.log('== ctas ==');
console.log(
  'pills rows y470-580 x250-560 (primária, cream):',
  fmt(bands(250, 560, 470, 580, lum(180), 4)),
);
console.log('pills cols y500-555 x235-820:', fmtC(cols(235, 820, 500, 555, lum(160), 2, 16)));
console.log(
  'pill outline rows y470-580 x570-800:',
  fmt(bands(570, 800, 470, 580, lum(120), 3, 20)),
);

console.log('== assinatura ==');
console.log('rows y570-630 x245-580:', fmt(bands(245, 580, 570, 630, lum(130), 3)));
console.log('cols y585-615:', fmtC(cols(235, 620, 585, 615, lum(120), 2, 30)));

console.log('== chips ==');
console.log('rows y640-710 x240-1720:', fmt(bands(240, 1720, 640, 710, lum(130), 4)));
console.log('cols y655-700:', fmtC(cols(230, 1760, 655, 700, lum(110), 2, 22)));

console.log('== cena / arco ==');
// arco claro: colunas com média alta na faixa y120-360
const colsAvg = [];
for (let x = 1000; x < 1920; x += 4) {
  let sum = 0,
    n = 0;
  for (let y = 120; y < 360; y += 2) {
    const i = (y * W + x) * ch;
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    n++;
  }
  colsAvg.push([x, sum / n]);
}
// transições de regime escuro(<70)→claro(>95)
let reg = colsAvg[0][1] > 95 ? 'claro' : 'escuro';
let edges = [];
for (const [x, v] of colsAvg) {
  const now = v > 95 ? 'claro' : 'escuro';
  if (now !== reg) {
    edges.push(`${x}:${reg}→${now}`);
    reg = now;
  }
}
console.log(
  'arco edges (y120-360):',
  edges.join(' '),
  '| left edge sample v@1000:',
  colsAvg[0][1].toFixed(0),
);

// flores esquerda: colunas x0-260 com conteúdo claro por linha média y0-722
const leftCols = cols(0, 300, 0, 720, lum(110), 3, 30);
console.log('floral esquerda cols (luma>110, gap30):', fmtC(leftCols));
const topRightCols = cols(1500, 1920, 0, 200, lum(110), 3, 30);
console.log('floral topo-direita cols:', fmtC(topRightCols));

// cores de referência (amostras)
function px(x, y) {
  const i = (y * W + x) * ch;
  return `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
console.log('bg navy esq (420,330):', px(420, 330), '| bg topo esq (300,20):', px(300, 20));
console.log(
  'bg navy baixo copy (300,630):',
  px(300, 630),
  '| centro navy (820,640):',
  px(820, 640),
);
console.log(
  'kicker gold (300,170):',
  px(300, 170),
  '(330,170):',
  px(330, 170),
  '(360,171):',
  px(360, 171),
);
console.log('h1 L1 fill (300,250):', px(300, 250), '(420,250):', px(420, 250));
console.log(
  'h1 L2 fill (300,340):',
  px(300, 340),
  '(500,340):',
  px(500, 340),
  '(700,340):',
  px(700, 340),
);
console.log('body (300,410):', px(300, 410));
console.log('pill cream (330,520):', px(330, 520), '(420,525):', px(420, 525));
console.log('pill text navy (330,522):', px(310, 522));
console.log('pill gold border? (600,520):', px(600, 520), '(610,555):', px(610, 555));
console.log('pill CTA header (1680,50):', px(1680, 50), '(1700,60):', px(1700, 60));
console.log('chips text (330,682):', px(330, 682), 'icon (262,680):', px(262, 680));
console.log('arco glow (1390,200):', px(1390, 200), '(1390,300):', px(1390, 300));
