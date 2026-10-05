// Finds the vertical extent of the cream "01 O projeto" card in the reference
// mockup by sampling a column that avoids florals (x=520 inside the card).
import sharp from 'sharp';
const img = sharp('artifacts/round6/review/reference-official.png');
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const isCream = ([r, g, b]) => r > 180 && g > 160; // cream ~#f8f0e6; navy ~#040f26
let runs = [];
let cur = null;
for (let y = 340; y < 680; y++) {
  const c = isCream(px(520, y));
  if (c && !cur) cur = { start: y };
  if (!c && cur) {
    cur.end = y;
    runs.push(cur);
    cur = null;
  }
}
if (cur) runs.push({ ...cur, end: 679 });
console.log('runs of cream rows (x=520):', JSON.stringify(runs.filter((r) => r.end - r.start > 5)));
// CSS conversion: desktop panel img×2.217
for (const r of runs.filter((r) => r.end - r.start > 5))
  console.log(
    `img y${r.start}-${r.end} (h${r.end - r.start}) -> css ${((r.end - r.start) * 2.217) | 0}px @1920`,
  );
