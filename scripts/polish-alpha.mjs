import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000');
const out = await page.evaluate(async () => {
  const files = [
    ['limpador', '/brand/nuy-creators-clean/products/limpador-cha-branco-125ml.png'],
    ['aromatizador', '/brand/nuy-creators-clean/products/aromatizador-flores-vibrantes-200ml.png'],
    ['sabonete', '/brand/nuy-creators-clean/products/sabonete-cereja-selvagem-500ml.png'],
  ];
  const res = [];
  for (const [name, url] of files) {
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const at = (x, y) => {
      const d = ctx.getImageData(x, y, 1, 1).data;
      return `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(2)})`;
    };
    res.push({
      name, size: `${bmp.width}x${bmp.height}`,
      corners: {
        tl: at(1, 1), tr: at(bmp.width - 2, 1),
        bl: at(1, bmp.height - 2), br: at(bmp.width - 2, bmp.height - 2),
      },
      midLeft: at(1, Math.round(bmp.height / 2)),
      midTop: at(Math.round(bmp.width / 2), 1),
      aboveBase: at(Math.round(bmp.width / 2), bmp.height - 6),
      base: at(Math.round(bmp.width / 2), bmp.height - 1),
      quarterUp: at(Math.round(bmp.width / 2), Math.round(bmp.height * 0.75)),
    });
    bmp.close();
  }
  return res;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
