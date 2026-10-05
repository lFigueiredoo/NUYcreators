import sharp from 'sharp';
// A2: scan ink columns of the wordmark asset and of the rendered header crop,
// so submark alignment matches INK edges (not the PNG's transparent padding).
const png = await sharp('public/brand/reference/nuy-wordmark-hi.png')
  .raw()
  .toBuffer({ resolveWithObject: true });
{
  const { data, info } = png;
  const ch = info.channels;
  const colInk = new Array(info.width).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * ch + (ch === 4 ? 3 : 0)] / 255;
      const lum =
        ch === 4
          ? 1
          : (data[(y * info.width + x) * ch] +
              data[(y * info.width + x) * ch + 1] +
              data[(y * info.width + x) * ch + 2]) /
            765;
      colInk[x] += a * lum;
    }
  }
  const first = colInk.findIndex((v) => v > 2.5);
  const last = colInk.reduce((acc, v, i) => (v > 2.5 ? i : acc), 0);
  console.log(
    `asset ${info.width}x${info.height} ch=${ch} ink-1.5x: first=${first} (${((first / info.width) * 100).toFixed(2)}%) last=${last} (${((last / info.width) * 100).toFixed(2)}%)`,
  );
  // rows too, for the vertical tightness check
  const rowInk = new Array(info.height).fill(0);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * ch + (ch === 4 ? 3 : 0)] / 255;
      rowInk[y] += a;
    }
  const rFirst = rowInk.findIndex((v) => v > 1);
  const rLast = rowInk.reduce((acc, v, i) => (v > 1 ? i : acc), 0);
  console.log(
    `rows: first=${rFirst} (${((rFirst / info.height) * 100).toFixed(1)}%) last=${rLast} (${((rLast / info.height) * 100).toFixed(1)}%)`,
  );
}
// Rendered header: find the lettering ink left edge and the submark's first glyph edge.
const crop = sharp('artifacts/delivery/a2-baseline-header-1920.png');
const meta = await crop.metadata();
const buf = await crop.raw().toBuffer();
// lettering occupies rows ~? we scan two horizontal bands: logo band (top ~50%)
// and submark band; print the first ink column of each band over a dark bg so
// ink = bright pixels (sum of RGB).
const band = (name, y0, y1, thresh) => {
  let firstCol = -1;
  for (let x = 0; x < meta.width; x++) {
    let sum = 0;
    for (let y = y0; y < y1; y++) {
      const i = (y * meta.width + x) * meta.channels;
      sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 765;
    }
    if (sum > (y1 - y0) * thresh) {
      firstCol = x;
      break;
    }
  }
  console.log(`${name}: first ink col at x=${firstCol}`);
};
for (const th of [0.4, 0.25, 0.12]) band(`logo th=${th}`, 34, 100 - 27, th);
for (const th of [0.3, 0.15]) band(`sub th=${th}`, 116, 127, th);
