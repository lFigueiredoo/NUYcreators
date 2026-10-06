import sharp from 'sharp';

// R8 — varreduras cirúrgicas finais da referência @1920:
// pill2 (borda), chips (faixa, separadores, ícones), headline l2 (caps).
const { data, info } = await sharp('artifacts/r8/reference/source-mockup.png')
  .extract({ left: 0, top: 0, width: 864, height: 410 })
  .resize({ width: 1920, kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });
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

function cols(x0, x1, y0, y1, test, minPerCol) {
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
    } else if (s !== -1 && x - prev > 12) {
      out.push([s, prev]);
      s = -1;
    }
  }
  if (s !== -1) out.push([s, prev]);
  return out;
}

const lum = (t) => (r, g, b) => (r + g + b) / 3 > t;

// pill2 — borda fina pouco luminosa
console.log('pill2 border rows:', JSON.stringify(bands(600, 750, 580, 720, lum(105), 120)));
console.log('pill2 border cols:', JSON.stringify(cols(560, 800, 600, 700, lum(105), 2)));

// chips — faixa por chip (icone+texto) e separadores
console.log('chip1 rows:', JSON.stringify(bands(200, 430, 740, 845, lum(120), 3)));
console.log('chip1 cols:', JSON.stringify(cols(195, 470, 770, 825, lum(120), 3)));
console.log('chip2 cols:', JSON.stringify(cols(470, 830, 770, 825, lum(120), 3)));
console.log('chip3 cols:', JSON.stringify(cols(830, 1180, 770, 825, lum(120), 3)));
console.log('chip4 cols:', JSON.stringify(cols(1180, 1580, 770, 825, lum(120), 3)));
console.log('sep1 (430-520):', JSON.stringify(bands(430, 520, 760, 830, lum(110), 8)));
console.log('sep2 (795-900):', JSON.stringify(bands(795, 900, 760, 830, lum(110), 8)));
console.log('sep3 (1140-1200):', JSON.stringify(bands(1140, 1200, 760, 830, lum(110), 8)));

// headline l2 — caps em janela limpa
console.log('h1l2 rows x200-1040:', JSON.stringify(bands(200, 1040, 320, 460, lum(115), 8)));
console.log('h1l1 rows x200-760:', JSON.stringify(bands(200, 760, 225, 330, lum(130), 6)));
