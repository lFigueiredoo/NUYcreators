// Localiza estrelas/sparkles douradas na seção projeto (região 300-760 × 410-560)
// e nas experiências, com bbox de cada cluster.
import sharp from 'sharp';

const REF = 'artifacts/round6/review/reference-official.png';
const { data, info } = await sharp(REF).raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};

function scan(x0, y0, x1, y1, label) {
  const mask = [];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const [r, g, b] = px(x, y);
      const gold = r > 140 && g > 90 && r > b + 25 && b < 160 && Math.abs(g - r) < 70;
      mask.push(gold ? 1 : 0);
    }
  const W = x1 - x0;
  // connected components (4-neigh), flood em array
  const seen = new Uint8Array(mask.length);
  const comps = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    const q = [i];
    seen[i] = 1;
    let n = 0,
      sx = 0,
      sy = 0,
      minx = 1e9,
      maxx = -1,
      miny = 1e9,
      maxy = -1;
    while (q.length) {
      const k = q.pop();
      const x = x0 + (k % W),
        y = y0 + ((k / W) | 0);
      n++;
      sx += x;
      sy += y;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      for (const d of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        const xx = (k % W) + d[0],
          yy = ((k / W) | 0) + d[1];
        if (xx < 0 || yy < 0 || xx >= W || yy >= y1 - y0) continue;
        const kk = yy * W + xx;
        if (mask[kk] && !seen[kk]) {
          seen[kk] = 1;
          q.push(kk);
        }
      }
    }
    if (n >= 12) comps.push({ n, cx: (sx / n) | 0, cy: (sy / n) | 0, minx, maxx, miny, maxy });
  }
  comps.sort((a, b) => b.n - a.n);
  console.log(`\n=== ${label} (${x0}-${x1}, ${y0}-${y1}) ===`);
  for (const c of comps.slice(0, 10))
    console.log(
      `gold comp n=${c.n} centro=(${c.cx},${c.cy}) bbox x${c.minx}-${c.maxx} y${c.miny}-${c.maxy} · css w${((c.maxx - c.minx) * 2.217) | 0} h${((c.maxy - c.miny) * 2.217) | 0}`,
    );
}

scan(300, 410, 760, 560, 'projeto: estrela/texto dourado?');
scan(0, 396, 300, 470, 'projeto: canto sup-esq');
scan(700, 396, 866, 570, 'projeto: borda direita (bouquet)');
scan(892, 258, 1396, 300, 'experiencias topo: curvas/chips?');
