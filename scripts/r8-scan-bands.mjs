import sharp from 'sharp';

// R8 — varredura de bandas para o hero V2 vs a referência (ambos em 1920).
// Localiza bandas de linhas de texto/botões/chips por luminância em janelas
// fixas e mede extents X dentro de cada banda (glifo-run). Método idêntico
// nos dois lados para eliminar viés de brilho.
// Uso: node scripts/r8-scan-bands.mjs  -> JSON no stdout

const ref = await sharp('artifacts/r8/reference/source-mockup.png')
  .extract({ left: 0, top: 0, width: 864, height: 410 })
  .resize({ width: 1920, kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });
const v2 = await sharp('artifacts/r8/checkpoint-a/v2-hero-1920.png')
  .raw()
  .toBuffer({ resolveWithObject: true });

const REGIONS = [
  // [nome, x0, x1, y0, y1, minPix] — y0/y1 diferentes por lado, ver abaixo
  { key: 'kicker', x0: 200, x1: 900 },
  { key: 'h1l1', x0: 200, x1: 800 },
  { key: 'h1l2', x0: 200, x1: 1150 },
  { key: 'desc', x0: 200, x1: 900 },
  { key: 'pill1', x0: 195, x1: 580, bright: true },
  { key: 'pill2', x0: 580, x1: 800, bright: true },
  { key: 'chips', x0: 200, x1: 1650 },
];
const WINDOWS = {
  ref: {
    kicker: [180, 225],
    h1l1: [225, 335],
    h1l2: [330, 445],
    desc: [440, 585],
    pill1: [570, 700],
    pill2: [570, 700],
    chips: [750, 845],
  },
  v2: {
    kicker: [185, 230],
    h1l1: [225, 335],
    h1l2: [320, 445],
    desc: [455, 550],
    pill1: [550, 675],
    pill2: [550, 675],
    chips: [790, 850],
  },
};

function scan(img, winKey) {
  const { data, info } = img;
  const W = info.width;
  const ch = info.channels;
  const out = {};
  for (const r of REGIONS) {
    const [y0, y1] = WINDOWS[winKey][r.key];
    const rows = [];
    for (let y = y0; y < Math.min(y1, info.height); y++) {
      let c = 0;
      for (let x = r.x0; x < r.x1; x++) {
        const i = (y * W + x) * ch;
        const R = data[i],
          G = data[i + 1],
          B = data[i + 2];
        if (r.bright) {
          if (R > 185 && G > 175 && B > 140) c++;
        } else {
          const lum = (R + G + B) / 3;
          if (lum > 130) c++;
        }
      }
      rows.push(c);
    }
    // bandas contíguas com contagem >= 4
    const bands = [];
    let s = -1;
    for (let k = 0; k < rows.length; k++) {
      if (rows[k] >= 4 && s === -1) s = k;
      if (rows[k] < 4 && s !== -1) {
        bands.push([y0 + s, y0 + k - 1]);
        s = -1;
      }
    }
    if (s !== -1) bands.push([y0 + s, y0 + rows.length - 1]);
    // extents X por banda (colunas com >=3 px acesos na banda)
    const withX = bands.map(([a, b]) => {
      let left = -1,
        right = -1,
        peak = 0;
      for (let x = r.x0; x < r.x1; x++) {
        let c = 0;
        for (let y = a; y <= b; y++) {
          const i = (y * W + x) * ch;
          const R = data[i],
            G = data[i + 1],
            B = data[i + 2];
          const lum = (R + G + B) / 3;
          if (r.bright ? R > 185 && G > 175 && B > 140 : lum > 130) c++;
        }
        peak = Math.max(peak, c);
        if (c >= 3) {
          if (left === -1) left = x;
          right = x;
        }
      }
      return {
        y: [a, b],
        h: b - a + 1,
        x: left === -1 ? null : [left, right, right - left + 1],
        peak,
      };
    });
    out[r.key] = withX;
  }
  return out;
}

const result = {
  ref: scan(ref, 'ref'),
  v2: scan(v2, 'v2'),
  note: 'extents [esq, dir, largura]; h = altura da banda',
};
console.log(JSON.stringify(result, null, 2));
