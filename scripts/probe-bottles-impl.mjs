import sharp from 'sharp';

// Refinamento: SPRAY = preto neutro (|b−r|<18, soma<150) — o fundo navy é
// azulado (b−r ≈ 30–45), então passa. OURO = líquido/rótulo dourado.
const { data, info } = await sharp('artifacts/round6/impl-hero-it2-1920.png')
  .raw()
  .toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const cls = (r, g, b) => {
  if (b > 130 && r > 80 && r < 200 && b - g > 55 && g < r) return 'P';
  if (r + g + b < 150 && Math.abs(b - r) < 18) return 'S';
  if (r > 165 && g > 110 && b < 120 && r - b > 70) return 'G';
  return '.';
};
for (let x = 1100; x < 1920; x += 4) {
  let P = 0,
    S = 0,
    G = 0,
    n = 0;
  for (let y = 60; y < 876; y += 1) {
    const c = cls(...px(x, y));
    n++;
    if (c === 'P') P++;
    if (c === 'S') S++;
    if (c === 'G') G++;
  }
  const pct = (v) => ((v / n) * 100) | 0;
  if (P > 4 || S > 8 || G > 4) {
    console.log(
      `${x}\tP${String(pct(P)).padStart(2)}\tS${String(pct(S)).padStart(2)}\tG${String(pct(G)).padStart(2)}`,
    );
  }
}
