/**
 * R10 · Checkpoint A — separadores finos da faixa de chips.
 * A varredura principal (limiar lum>105, ≥14 linhas) não achou nenhum.
 * Aqui o limiar cai para lum>78/88 e a contagem mínima para 8, e o resultado
 * é confrontado com as colunas ocupadas pelos rótulos (mesmo y-band), para
 * saber se o separador existe e se fica centrado entre os rótulos.
 */
import sharp from 'sharp';

const REF = 'artifacts/r10/reference-c.png';
const Y0 = 283;
const Y1 = 308;

const { data, info } = await sharp(REF).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const C = info.channels;
const lum = (x, y) => {
  const i = (y * W + x) * C;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};
const pct = (v) => `${((v / W) * 100).toFixed(2)}%`;

const columns = (minLum, minRows) => {
  const cols = [];
  for (let x = 8; x < W; x++) {
    let n = 0;
    for (let y = Y0; y <= Y1; y++) if (lum(x, y) > minLum) n++;
    if (n >= minRows) cols.push({ x, n });
  }
  return cols;
};

const group = (cols, gap = 2) => {
  const out = [];
  let cur = null;
  for (const c of cols) {
    if (!cur || c.x - cur.last > gap) {
      cur = { first: c.x, last: c.x, max: c.n };
      out.push(cur);
    } else {
      cur.last = c.x;
      cur.max = Math.max(cur.max, c.n);
    }
  }
  return out;
};

// perfil de brilho coluna a coluna, para achar as colunas "vazias" entre rótulos
const profile = [];
for (let x = 8; x < W; x++) {
  let peak = 0;
  for (let y = Y0; y <= Y1; y++) peak = Math.max(peak, lum(x, y));
  profile.push({ x, peak });
}

// colunas com pico alto = traço (texto ou separador); baixo = vazio
const strokes = group(
  profile.filter((p) => p.peak > 120),
  3,
).map((g) => ({ x: `${g.first}-${g.last}`, 'x%': `${pct(g.first)}-${pct(g.last)}` }));

// entre cada par de blocos de traço, o valor máximo do "vale"
const valleys = [];
for (let i = 1; i < strokes.length; i++) {
  const a = Number(strokes[i - 1].x.split('-')[1]);
  const b = Number(strokes[i].x.split('-')[0]);
  let best = { x: -1, peak: 0 };
  for (let x = a; x <= b; x++) {
    const p = profile.find((q) => q.x === x);
    if (p && p.peak > best.peak) best = { x, peak: Math.round(p.peak) };
  }
  valleys.push({
    entre: `${a}-${b}`,
    x: best.x,
    'x%': pct(best.x),
    pico: best.peak,
    larguraVale: b - a,
  });
}

console.log(
  JSON.stringify(
    {
      bandaLida: `${Y0}-${Y1}`,
      limiar78: group(columns(78, 8)).map((g) => ({
        x: `${g.first}-${g.last}`,
        'x%': `${pct(g.first)}-${pct(g.last)}`,
        linhas: g.max,
      })),
      limiar88: group(columns(88, 8)).map((g) => ({
        x: `${g.first}-${g.last}`,
        'x%': `${pct(g.first)}-${pct(g.last)}`,
        linhas: g.max,
      })),
      blocosDeTraco: strokes,
      vales: valleys,
    },
    null,
    1,
  ),
);
