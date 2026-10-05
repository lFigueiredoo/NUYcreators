// Blame-test: hides one hero layer at a time and measures pixel diff in the
// suspicious regions to find which asset paints each visible rectangle/ghost.
import { chromium } from 'playwright';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://localhost:3100/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const regions = {
  ctaBox: [40, 560, 660, 340],
  leftCol: [0, 460, 220, 620],
  envGhost: [700, 940, 760, 140],
};
const snap = async (name) => {
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  if (!name) return shot;
  const [l, t, w, h] = regions[name];
  return sharp(shot).extract({ left: l, top: t, width: w, height: h }).raw().toBuffer();
};

const base = {};
for (const name of Object.keys(regions)) base[name] = await snap(name);

const diff = async (name) => {
  const buf = await snap(name);
  const a = base[name],
    b = buf;
  let sum = 0;
  for (let i = 0; i < a.length; i += 24) sum += Math.abs(a[i] - b[i]);
  return sum;
};

const candidates = [
  ['violet-flower', 'img[src*="violet-flower"]'],
  ['edge-petals', 'img[src*="edge-petals"]'],
  ['left-foliage', 'img[src*="left-foliage"]'],
  ['ground-foliage', 'img[src*="ground-foliage"]'],
  ['environment', 'img[src*="environment"]'],
  ['bouquet-all', 'img[src*="bouquet"]'],
  ['white-bloom-all', 'img[src*="white-bloom"]'],
  ['packshot', 'img[src*="composition"]'],
];

const out = [];
for (const [label, sel] of candidates) {
  const count = await page.locator(sel).count();
  if (!count) {
    out.push([label, 'ABSENT']);
    continue;
  }
  await page.evaluate(
    (s) =>
      document.querySelectorAll(s).forEach((el) => {
        el.style.display = 'none';
      }),
    sel,
  );
  await page.waitForTimeout(120);
  const row = {};
  for (const name of Object.keys(regions)) row[name] = await diff(name);
  out.push([label, row]);
  await page.evaluate(
    (s) =>
      document.querySelectorAll(s).forEach((el) => {
        el.style.display = '';
      }),
    sel,
  );
  await page.waitForTimeout(60);
}
console.log('baseline regions:', Object.keys(regions).join(', '));
for (const [label, row] of out) console.log(label, JSON.stringify(row));
await browser.close();
