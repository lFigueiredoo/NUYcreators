/**
 * Conferência das caixas de referência na prancha "Imagens a utilizar".
 *
 * findBand varre o creme e devolve a faixa de foto dentro de uma janela — mas
 * a prancha é um MOSAICO (item 4 tem quatro fotos coladas, item 6 tem mock +
 * cards). Janela errada devolve caixa clipada na borda. Então as caixas são
 * desenhadas de volta na prancha com rótulo e coordenadas, para conferência
 * visual antes de qualquer comparação sair daqui.
 */
import sharp from 'sharp';

const SHEET = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_36_04-7.png';
const OUT = 'artifacts/proposta-c/tmp/prancha-boxes.png';

const isPhoto = (data, info, x, y, thresh) => {
  const i = (y * info.width + x) * 3;
  const d = Math.abs(data[i] - 249) + Math.abs(data[i + 1] - 245) + Math.abs(data[i + 2] - 239);
  return d > thresh * 3;
};

function longestRun(flags, maxGap = 15) {
  const runs = [];
  let a = -1;
  for (let i = 0; i <= flags.length; i++) {
    const on = i < flags.length && flags[i];
    if (on && a < 0) a = i;
    if (!on && a >= 0) {
      runs.push([a, i]);
      a = -1;
    }
  }
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] <= maxGap) last[1] = r[1];
    else merged.push([r[0], r[1]]);
  }
  merged.sort((x, y) => y[1] - y[0] - (x[1] - x[0]));
  return merged[0] ?? [-1, -1];
}

async function findBand(file, win, { thresh = 22, minFrac = 0.55, colGap = 15 } = {}) {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = win.y0; y < win.y1; y++) {
    let n = 0;
    for (let x = win.x0; x < win.x1; x++) if (isPhoto(data, info, x, y, thresh)) n++;
    rows.push(n / (win.x1 - win.x0) > minFrac);
  }
  const [yA, yB] = longestRun(rows);
  const y0 = win.y0 + yA;
  const y1 = win.y0 + yB;
  const cols = [];
  for (let x = win.x0; x < win.x1; x++) {
    let n = 0;
    for (let y = y0 + 4; y < y1 - 4; y++) if (isPhoto(data, info, x, y, thresh)) n++;
    cols.push(n / Math.max(1, y1 - y0 - 8) > minFrac);
  }
  const [xA, xB] = longestRun(cols, colGap);
  return { left: win.x0 + xA, top: y0, width: xB - xA, height: y1 - y0 };
}

// Caixas da prancha — as mesmas que pc-compare-cp3.mjs publica. O detector só
// serve onde existe FAIXA de foto: item 6 e o card são creme sobre creme
// (~95% de calha clara) e só existem na régua de 100px.
const candidatas = {
  item2: { x0: 290, x1: 700, y0: 486, y1: 790 },
};
const explicitas = {
  item4: { left: 22, top: 780, width: 556, height: 358 },
  item6: { left: 284, top: 1145, width: 820, height: 252 },
  card: { left: 647, top: 1160, width: 120, height: 160 },
};

const meta = await sharp(SHEET).metadata();
const linhas = [];
const caixas = [];
for (const [nome, win] of Object.entries(candidatas)) {
  const box = await findBand(SHEET, win);
  const clipada = {
    esq: box.left <= win.x0,
    topo: box.top <= win.y0,
    dir: box.left + box.width >= win.x1 - 1,
    base: box.top + box.height >= win.y1 - 1,
  };
  caixas.push({ nome, box });
  linhas.push(`${nome}: ${JSON.stringify(box)} clipada=${JSON.stringify(clipada)}`);
}
for (const [nome, box] of Object.entries(explicitas)) {
  caixas.push({ nome, box });
  linhas.push(`${nome}: ${JSON.stringify(box)} (explicita)`);
}
console.log(linhas.join('\n'));

// Desenha as caixas de volta na prancha: borda + rótulo com as coordenadas.
const cores = ['#d4145a', '#0b7a3b', '#c2410c', '#6d28d9'];
const overlay = caixas
  .map(
    ({ nome, box }, i) => `
    <g>
      <rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}"
            fill="none" stroke="${cores[i]}" stroke-width="3"/>
      <rect x="${box.left}" y="${Math.max(0, box.top - 34)}" width="430" height="32" fill="${cores[i]}"/>
      <text x="${box.left + 8}" y="${Math.max(22, box.top - 12)}" font-family="Consolas, monospace"
            font-size="20" fill="#fff">${nome} ${box.left},${box.top} ${box.width}x${box.height}</text>
    </g>`,
  )
  .join('');

await sharp(SHEET)
  .composite([
    {
      input: Buffer.from(`<svg width="${meta.width}" height="${meta.height}">${overlay}</svg>`),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile(OUT);
console.log('sheet:', OUT, `${meta.width}x${meta.height}`);
