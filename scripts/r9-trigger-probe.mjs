import sharp from 'sharp';

// R9 round 8b — medir o TRIGGER preto do frasco spray com rigor: trigger é
// o elemento de contraste máximo (lum<60), neto nas duas artes. Reporta
// runs escuras por linha em janelas estreitas para não pegar rótulo.

const load = async (f) => {
  const img = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * img.info.width + x) * img.info.channels;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };
  return { img, px };
};
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const trigger = ({ px }, name, yLines, x0, x1) => {
  for (const y of yLines) {
    let start = null;
    const runs = [];
    for (let x = x0; x < x1; x++) {
      const dark = lum(px(x, y)) < 60;
      if (dark && start === null) start = x;
      if (!dark && start !== null) {
        runs.push([start, x - 1]);
        start = null;
      }
    }
    if (start !== null) runs.push([start, x1 - 1]);
    const kept = runs.filter(([a, b]) => b - a > 6);
    if (kept) console.log(`${name} y${y}:`, JSON.stringify(kept));
  }
};

const ref = await load('artifacts/r9/reference-hero.png');
const v3 = await load('artifacts/r9/checkpoint-a/v3-hero-1920.png');
console.log('=== trigger ref (janela x1150-1500) ===');
trigger(ref, 'ref', [140, 170, 200, 230, 260], 1150, 1500);
console.log('=== trigger v3 (janela x1200-1550) ===');
trigger(v3, 'v3', [140, 170, 200, 230, 260], 1200, 1550);
console.log('=== corpo do frasco creme (rótulo navy) ref y600-640 x1100-1550 ===');
for (const y of [600, 620, 640]) {
  let start = null;
  const runs = [];
  for (let x = 1100; x < 1550; x++) {
    const dark = lum(ref.px(x, y)) < 80;
    if (dark && start === null) start = x;
    if (!dark && start !== null) {
      runs.push([start, x - 1]);
      start = null;
    }
  }
  if (start !== null) runs.push([start, 1549]);
  console.log(`ref y${y}:`, JSON.stringify(runs.filter(([a, b]) => b - a > 20)));
}
for (const y of [600, 620, 640]) {
  let start = null;
  const runs = [];
  for (let x = 1100; x < 1550; x++) {
    const dark = lum(v3.px(x, y)) < 80;
    if (dark && start === null) start = x;
    if (!dark && start !== null) {
      runs.push([start, x - 1]);
      start = null;
    }
  }
  if (start !== null) runs.push([start, 1549]);
  console.log(`v3 y${y}:`, JSON.stringify(runs.filter(([a, b]) => b - a > 20)));
}
