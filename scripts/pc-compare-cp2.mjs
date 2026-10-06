/**
 * Proposta C · Checkpoint 2 — recortes da folha e composições lado a lado.
 *
 * A folha "Imagens a utilizar" é uma prancha de especificação (1122×1402), não
 * um mock da página: seus blocos são miniaturas. Esticar um recorte de 528 px
 * até 1920 seria comparar escalas diferentes com o bitmap borrado — então a
 * comparação acontece na escala DA PRANCHA:
 *
 *   1) o recorte da prancha em 1:1, ao lado da implementação reduzida até o
 *      card ter exatamente a largura do card da prancha (mesma escala real);
 *   2) a seção inteira da implementação em 1:1 (1920 CSS px), para inspeção
 *      de detalhe.
 *
 * As caixas são MEDIDAS varrendo o creme da prancha/captura — nunca estimadas
 * a olho. Nenhum bitmap é ampliado em nenhum passo.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'artifacts/proposta-c/checkpoint-2';
const CROPS = 'artifacts/proposta-c/crops';
const SHEET_ASSETS = 'artifacts/images/Imagem do ChatGPT 5 de out. de 2026, 16_36_04-7.png';
const CREAM = { r: 249, g: 245, b: 239, alpha: 1 };
const INK = '#0e2a44';
const RULE = '#c7a1b3';

await mkdir(CROPS, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Barra de título desenhada em SVG — rótulo da evidência, não conteúdo do site. */
function labelBar(width, height, left, right) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${CREAM.r},${CREAM.g},${CREAM.b}"/>
      <rect x="0" y="${height - 2}" width="${width}" height="2" fill="${RULE}"/>
      <text x="40" y="${height / 2 + 7}" font-family="Georgia, serif" font-size="26" fill="${INK}">${esc(left)}</text>
      <text x="${width - 40}" y="${height / 2 + 7}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#4a6076">${esc(right)}</text>
    </svg>`,
  );
}

const isPhoto = (data, info, x, y, thresh) => {
  const i = (y * info.width + x) * 3;
  const d = Math.abs(data[i] - 249) + Math.abs(data[i + 1] - 245) + Math.abs(data[i + 2] - 239);
  return d > thresh * 3;
};

/**
 * Maior trecho acima do limite, fundindo vãos menores que `maxGap`: na tira da
 * prancha os quatro retratos são separados por ~6px de creme — sem a fusão, o
 * "maior trecho" seria um retrato só.
 */
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

/**
 * Caixa justa da área de foto dentro de uma janela. `colGap` é o vão máximo
 * que ainda é atravessado na varredura de colunas: 15px na prancha (retratos
 * colados) e largo na captura (a grade da página respira 96px entre cards).
 */
async function findBand(file, win, { thresh = 22, minFrac = 0.6, colGap = 15 } = {}) {
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
  return {
    left: win.x0 + xA,
    top: y0,
    width: xB - xA,
    height: y1 - y0,
  };
}

/**
 * Largura dos cards numa faixa de retratos: colunas de foto separadas por
 * creme. É o que permite comparar card com card em vez de bloco com bloco.
 */
async function measureCards(file, band) {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const top = band.top + 4;
  const bottom = Math.min(info.height, band.top + band.height - 4);
  const cols = [];
  for (let x = band.left; x < band.left + band.width; x++) {
    let n = 0;
    for (let y = top; y < bottom; y++) if (isPhoto(data, info, x, y, 18)) n++;
    cols.push(n / (bottom - top) > 0.5);
  }
  const widths = [];
  let a = -1;
  for (let i = 0; i <= cols.length; i++) {
    const on = i < cols.length && cols[i];
    if (on && a < 0) a = i;
    if (!on && a >= 0) {
      if (i - a > 40) widths.push(i - a);
      a = -1;
    }
  }
  return {
    widths,
    mean: widths.reduce((s, w) => s + w, 0) / Math.max(1, widths.length),
  };
}

const meta = await sharp(SHEET_ASSETS).metadata();
const W = meta.width;
const H = meta.height;

// Janelas generosas em volta dos itens 3 e 5 da prancha (1122×1402).
const strip = await findBand(SHEET_ASSETS, { x0: 560, x1: W - 6, y0: 430, y1: 790 });
const banner = await findBand(SHEET_ASSETS, { x0: 560, x1: W - 6, y0: 810, y1: H - 240 });
console.log('tira de creators na prancha:', JSON.stringify(strip));
console.log('banner na prancha:', JSON.stringify(banner));

await sharp(SHEET_ASSETS).extract(strip).png().toFile(`${CROPS}/ref-creators-strip.png`);
await sharp(SHEET_ASSETS).extract(banner).png().toFile(`${CROPS}/ref-banner-desafio.png`);

// ------------------------------------------------- comparações por bloco (1920)
const BAR = 62;
const PAD = 40;
const implMeta = await sharp(`${OUT}/implementation-1920.png`).metadata();

// ---------------------------------------------------------------- 04 creators
{
  const refFile = `${CROPS}/ref-creators-strip.png`;
  const implFile = `${CROPS}/impl-04-creators-1920.png`;
  const refM = await sharp(refFile).metadata();
  const implM = await sharp(implFile).metadata();

  // A grade da implementação é medida na própria captura (retratos sobre creme).
  const grid = await findBand(
    implFile,
    { x0: 0, x1: implM.width, y0: Math.round(implM.height * 0.35), y1: implM.height },
    { minFrac: 0.6, colGap: 260 },
  );
  const refCards = await measureCards(refFile, { left: 0, top: 0, ...refM });
  const implCards = await measureCards(implFile, grid);
  const k = refCards.mean / implCards.mean;
  console.log(
    'escala creators:',
    JSON.stringify({
      cardsPrancha: refCards.widths,
      cardsImplementacao: implCards.widths,
      fator: +k.toFixed(3),
    }),
  );

  const implRow = await sharp(implFile)
    .extract(grid)
    .resize({ width: Math.round(grid.width * k), kernel: 'lanczos3' })
    .toBuffer();
  const implRowH = Math.round(grid.height * k);
  const rowH = Math.max(refM.height, implRowH);

  const section = await sharp(implFile).png().toBuffer();
  const totalH = BAR + rowH + BAR + implM.height;

  await sharp({ create: { width: implM.width, height: totalH, channels: 4, background: CREAM } })
    .composite([
      {
        input: labelBar(
          implM.width,
          BAR,
          `Referência — “3. Creators em destaque” · prancha, escala 1:1 (${refM.width} × ${refM.height})`,
          `Implementação abaixo na MESMA escala (${k.toFixed(2)}×) · card ${Math.round(refCards.mean)} px`,
        ),
        top: 0,
        left: 0,
      },
      { input: await sharp(refFile).png().toBuffer(), top: BAR, left: PAD },
      { input: implRow, top: BAR, left: PAD + refM.width + PAD },
      {
        input: labelBar(
          implM.width,
          BAR,
          'Implementação — seção 04 · 1920 CSS px, escala 1:1',
          `captura real, build de produção · página de ${implMeta.height}px`,
        ),
        top: BAR + rowH,
        left: 0,
      },
      { input: section, top: BAR + rowH + BAR, left: 0 },
    ])
    .png()
    .toFile(`${OUT}/comparison-04-creators-1920.png`);
  console.log('comparison-04-creators-1920.png', `${implM.width}x${totalH}`);
}

// ---------------------------------------------------------------- 05 desafio
{
  const refFile = `${CROPS}/ref-banner-desafio.png`;
  const implFile = `${CROPS}/impl-05-desafio-1920.png`;
  const refM = await sharp(refFile).metadata();
  const implM = await sharp(implFile).metadata();
  // A prancha é miniatura: normaliza pela largura do bloco (a altura difere
  // porque o banner da página é sangrado, e o box da prancha não).
  const k = refM.width / implM.width;

  const implScaled = await sharp(implFile)
    .resize({ width: refM.width, kernel: 'lanczos3' })
    .toBuffer();
  const implScaledH = Math.round(implM.height * k);
  const rowH = Math.max(refM.height, implScaledH);
  console.log(
    'escala desafio:',
    JSON.stringify({
      prancha: `${refM.width}x${refM.height}`,
      implementacao: `${implM.width}x${implM.height}`,
      fator: +k.toFixed(3),
    }),
  );

  const totalH = BAR + rowH + BAR + implM.height;

  await sharp({ create: { width: implM.width, height: totalH, channels: 4, background: CREAM } })
    .composite([
      {
        input: labelBar(
          implM.width,
          BAR,
          `Referência — “5. Banner desafio/recompensas” · prancha, escala 1:1 (${refM.width} × ${refM.height})`,
          `implementação na mesma largura (${k.toFixed(2)}×) · ${refM.width} px`,
        ),
        top: 0,
        left: 0,
      },
      { input: await sharp(refFile).png().toBuffer(), top: BAR, left: PAD },
      { input: implScaled, top: BAR, left: PAD + refM.width + PAD },
      {
        input: labelBar(
          implM.width,
          BAR,
          'Implementação — seção 05 · 1920 CSS px, escala 1:1',
          `copy oficial verbatim · página de ${implMeta.height}px`,
        ),
        top: BAR + rowH,
        left: 0,
      },
      { input: await sharp(implFile).png().toBuffer(), top: BAR + rowH + BAR, left: 0 },
    ])
    .png()
    .toFile(`${OUT}/comparison-05-desafio-1920.png`);
  console.log('comparison-05-desafio-1920.png', `${implM.width}x${totalH}`);
}

// ----------------------------------------------------------- 390: mock + seções
{
  const impl = sharp(`${OUT}/implementation-390.png`);
  const implM = await impl.metadata();
  // Recorte de creators + desafio a 390 CSS px (DPR2): y 1023 → 2468.
  const top = 1023 * 2;
  const height = Math.min(implM.height - top, (2468 - 1023) * 2);
  const implCrop = await impl.extract({ left: 0, top, width: 780, height }).toBuffer();

  const mock = await sharp(`${CROPS}/mock-mobile.png`)
    .resize({ width: 780, kernel: 'lanczos3' })
    .toBuffer();
  const mockM = await sharp(`${CROPS}/mock-mobile.png`).metadata();
  const mockH = Math.round((mockM.height / mockM.width) * 780);

  const pad = 36;
  const panelBar = 56;
  const totalH = panelBar + Math.max(mockH, height) + pad;
  const panelW = 780 * 2 + pad * 3;

  await sharp({ create: { width: panelW, height: totalH, channels: 4, background: CREAM } })
    .composite([
      {
        input: labelBar(
          panelW,
          panelBar,
          'Referência — mock mobile da prancha',
          'item 6 · comunidade em tela pequena',
        ),
        top: 0,
        left: 0,
      },
      { input: mock, top: panelBar + pad, left: pad },
      { input: implCrop, top: panelBar + pad, left: pad * 2 + 780 },
    ])
    .png()
    .toFile(`${OUT}/comparison-390.png`);
  console.log('comparison-390.png', `${panelW}x${totalH}`, `(mock ${mockH}, impl ${height})`);
}
