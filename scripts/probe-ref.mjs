import sharp from 'sharp';

// Perfil de linha por painel: média de luminância por linha em uma faixa x —
// robusto a texto/grafismos; marcos onde a média cruza 120 (creme↔navy).
const src = process.argv[2];
const [x0, x1] = process.argv[3].split('-').map(Number);
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const lum = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return (data[i] + data[i + 1] + data[i + 2]) / 3;
};
let prev = null;
for (let y = 0; y < info.height; y++) {
  let sum = 0;
  for (let x = x0; x < x1; x += 2) sum += lum(x, y);
  const m = sum / Math.ceil((x1 - x0) / 2);
  const bucket = m > 120 ? 'CLARO' : 'escuro';
  if (bucket !== prev) {
    console.log(`y=${y} média=${m.toFixed(0)} → ${bucket}`);
    prev = bucket;
  }
}
