import sharp from 'sharp';

for (const [file, label, x0, x1, y0, y1] of [
  ['artifacts/delivery/a15-secao-hero-1920.png', 'ATUAL 1920 (css px)', 0, 1919, 500, 820],
  [
    'C:/Users/rdeq1/Downloads/Mockup Editorial NUY Creators Regal.png',
    'REF (panel px)',
    40,
    320,
    265,
    325,
  ],
]) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const rows = [];
  for (let y = y0; y < y1; y++) {
    let c = 0;
    for (let x = x0; x < x1; x += 3) {
      const [r, g, b] = px(x, y);
      if (r > 205 && g > 185 && b > 150 && r - b > 30) c++;
    }
    if (c / ((x1 - x0) / 3) > 0.12) rows.push(y);
  }
  const bands = [];
  let s = -1;
  for (let y = y0; y < y1 + 1; y++) {
    const c = rows.includes(y);
    if (c && s < 0) s = y;
    if (!c && s >= 0) {
      if (y - s > 4) bands.push([s, y - 1]);
      s = -1;
    }
  }
  console.log(label, 'bandas creme:', JSON.stringify(bands));
  if (bands.length) {
    const yc = Math.round((bands[0][0] + bands[bands.length - 1][1]) / 2);
    const cols = [];
    let cs = -1;
    for (let x = x0; x < x1; x++) {
      const [r, g, b] = px(x, yc);
      const c = r > 200 && g > 180 && b > 150 && r - b > 25;
      if (c && cs < 0) cs = x;
      if (!c && cs >= 0) {
        if (x - cs > 8) cols.push([cs, x - 1]);
        cs = -1;
      }
    }
    console.log(`  pílulas em y=${yc}:`, JSON.stringify(cols));
  }
}
