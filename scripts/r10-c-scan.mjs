/**
 * R10 · Checkpoint A — medição da referência OPÇÃO C.
 * Fonte: artifacts/r10/reference-c.png (342×1536 = página de 1024×4600 @0.334).
 * Imprime âncoras em % da largura da página (342) e da altura da banda,
 * que é a base usada no CSS novo (public-landing-v3).
 */
import sharp from 'sharp';

const REF = 'artifacts/r10/reference-c.png';
const HERO_TOP = 32; // abaixo da barra de chrome do mockup
const HERO_BOTTOM = 312;

const { data, info } = await sharp(REF).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const C = info.channels;
const P = (x, y) => [
  data[(y * W + x) * C],
  data[(y * W + x + 0) * C + 1],
  data[(y * W + x) * C + 2],
];
const lum = (x, y) => {
  const [r, g, b] = P(x, y);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
const isGold = (x, y) => {
  const [r, g, b] = P(x, y);
  return r > 120 && r - b > 35 && g > 90;
};
const isCream = (x, y) => {
  const [r, g, b] = P(x, y);
  return r > 200 && g > 180 && b > 150;
};

const pct = (v, base = W) => `${((v / base) * 100).toFixed(2)}%`;
const out = {};

// ---- bandas verticais (média de brilho por linha em x 8..334)
const bands = [];
for (let y = 0; y < info.height; y++) {
  let s = 0;
  for (let x = 8; x <= 334; x++) s += lum(x, y);
  bands.push(s / 327);
}
const kind = (y) => (bands[y] > 190 ? 'CREME' : bands[y] < 95 ? 'NAVY' : 'MEDIO');
const transitions = [];
for (let y = 1; y < bands.length; y++) {
  if (kind(y) !== kind(y - 1) && (kind(y) === 'CREME' || kind(y - 1) === 'CREME')) {
    if (transitions.length === 0 || y - transitions[transitions.length - 1] > 3)
      transitions.push(y);
  }
}
out.bandas = transitions.map((y) => `${y} (${pct(y, info.height)} da altura)`);

// ---- hero: altura e âncoras internas
const H = HERO_BOTTOM - HERO_TOP;
out.hero = {
  topo: HERO_TOP,
  base: HERO_BOTTOM,
  altura: H,
  alturaSobreLargura: +(H / W).toFixed(4),
};

const scanRows = (x0, x1, y0, y1, test) => {
  const rows = [];
  for (let y = y0; y <= y1; y++) {
    let n = 0;
    let first = -1;
    let last = -1;
    for (let x = x0; x <= x1; x++) {
      if (test(x, y)) {
        n++;
        if (first < 0) first = x;
        last = x;
      }
    }
    if (n > 0) rows.push({ y, n, first, last });
  }
  return rows;
};

const groupRows = (rows, gap = 3) => {
  const groups = [];
  let cur = null;
  for (const r of rows) {
    if (!cur || r.y - cur.last > gap) {
      cur = { first: r.y, last: r.y, minX: r.first, maxX: r.last };
      groups.push(cur);
    } else {
      cur.last = r.y;
      cur.minX = Math.min(cur.minX, r.first);
      cur.maxX = Math.max(cur.maxX, r.last);
    }
  }
  return groups;
};

const light = (x, y) => lum(x, y) > 130;
const gold = (x, y) => isGold(x, y);
const dark = (x, y) => lum(x, y) < 120;

out.heroCopy = groupRows(scanRows(10, 200, HERO_TOP + 60, HERO_BOTTOM - 5, light)).map((g) => ({
  'y (mockup)': `${g.first}-${g.last}`,
  'y/hero': `${pct(g.first - HERO_TOP, H)}-${pct(g.last - HERO_TOP, H)}`,
  x: `${g.minX}-${g.maxX}`,
  'x/largura': `${pct(g.minX)}-${pct(g.maxX)}`,
}));

out.heroKicker = groupRows(scanRows(10, 200, HERO_TOP + 80, HERO_TOP + 110, gold)).map((g) => ({
  y: g.first,
  'y/hero': pct(g.first - HERO_TOP, H),
  x: `${g.minX}-${g.maxX}`,
}));

// header: logo (claro), nav, pill (creme)
out.header = {
  logo: groupRows(scanRows(10, 90, 34, 82, light)).map((g) => ({
    y: `${g.first}-${g.last}`,
    x: `${g.minX}-${g.maxX}`,
    'largura%': pct(g.maxX - g.minX + 1),
  })),
  pill: groupRows(scanRows(240, 340, 34, 82, isCream)).map((g) => ({
    y: `${g.first}-${g.last}`,
    x: `${g.minX}-${g.maxX}`,
    'altura%largura': pct(g.last - g.first + 1),
  })),
  nav: groupRows(scanRows(100, 240, 50, 66, light), 5).map((g) => ({
    x: `${g.minX}-${g.maxX}`,
    'x/largura': `${pct(g.minX)}-${pct(g.maxX)}`,
  })),
};

// chips: linhas + separadores finos
const chipRows = scanRows(20, 330, 283, 308, light);
out.chips = {
  rows: `${chipRows[0]?.y}-${chipRows[chipRows.length - 1]?.y}`,
  'y/hero': `${pct(chipRows[0].y - HERO_TOP, H)}-${pct(chipRows[chipRows.length - 1].y - HERO_TOP, H)}`,
  extensaoX: `${pct(Math.min(...chipRows.map((r) => r.first)))}-${pct(Math.max(...chipRows.map((r) => r.last)))}`,
};
const sepCols = [];
for (let x = 20; x <= 330; x++) {
  let n = 0;
  for (let y = 284; y <= 306; y++) if (lum(x, y) > 105) n++;
  if (n >= 14) sepCols.push(x);
}
out.chips.separadoresX = sepCols.map((x) => `${x} (${pct(x)})`);

// projeto (01)
out.projeto = {
  banda: '313-411 (barra creme)',
  alturaSobreLargura: +((411 - 313) / W).toFixed(4),
  kicker: groupRows(scanRows(20, 130, 314, 340, gold)).map((g) => ({
    y: `${g.first}-${g.last}`,
    x: `${g.minX}-${g.maxX}`,
  })),
  headline: groupRows(scanRows(14, 175, 330, 400, dark)).map((g) => ({
    y: `${g.first}-${g.last}`,
    x: `${g.minX}-${g.maxX}`,
    'x/largura': `${pct(g.minX)}-${pct(g.maxX)}`,
  })),
  colunaDireita: groupRows(scanRows(180, 315, 330, 411, dark), 2).map((g) => ({
    y: `${g.first}-${g.last}`,
    x: `${g.minX}-${g.maxX}`,
    'x/largura': `${pct(g.minX)}-${pct(g.maxX)}`,
  })),
};

// cena: extensão dos pixels não-navy na metade direita do hero
const sceneCols = [];
for (let x = 150; x < W; x++) {
  let n = 0;
  for (let y = HERO_TOP + 40; y < HERO_BOTTOM; y++) {
    const [r, g, b] = P(x, y);
    if (lum(x, y) > 70 || r - b > 12) n++;
  }
  if (n > 12) sceneCols.push(x);
}
out.cena = {
  inicioX: `${sceneCols[0]} (${pct(sceneCols[0])})`,
  fimX: `${sceneCols[sceneCols.length - 1]} (${pct(sceneCols[sceneCols.length - 1])})`,
};

console.log(JSON.stringify(out, null, 1));
