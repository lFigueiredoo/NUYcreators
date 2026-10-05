import { chromium } from '@playwright/test';
// A3/A4 live geometry: hero copy stack at desktop + line composition of the body.
const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
for (const w of [1920, 1440]) {
  const page = await browser.newPage({
    viewport: { width: w, height: Math.round((w * 1040) / 1920) },
    reducedMotion: 'reduce',
  });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const art = document.querySelector('[data-hero-artboard]');
    const q = (sel) => art.querySelector(sel);
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        l: Math.round(b.left),
        t: Math.round(b.top),
        w: Math.round(b.width),
        h: Math.round(b.height),
      };
    };
    const copy = q('[class*=copy]');
    const kids = Array.from(copy.children);
    const [kicker, h1, body, actions, signature] = kids;
    const lines = body
      ? (() => {
          const r = document.createRange();
          r.selectNodeContents(body);
          return r.getClientRects().length;
        })()
      : 0;
    return {
      kicker: box(kicker),
      h1: box(h1),
      body: box(body),
      actions: box(actions),
      signature: box(signature),
      bodyLines: lines,
      gapKickerH1: kicker && h1 ? Math.round(h1.t - (kicker.t + kicker.h)) : null,
      gapH1Body: h1 && body ? Math.round(body.t - (h1.t + h1.h)) : null,
      gapBodyActions: body && actions ? Math.round(actions.t - (body.t + body.h)) : null,
      gapActionsSignature:
        actions && signature ? Math.round(signature.t - (actions.t + actions.h)) : null,
      primary: box(q('[class*=primaryButton]')),
      secondary: box(q('[class*=outlineButton]')),
      foot: box(q('[data-hero-benefits]')),
    };
  });
  console.log(w, JSON.stringify(m));
  if (w === 1920) {
    await page.screenshot({
      path: 'artifacts/delivery/a3-hero-1920.png',
      clip: { x: 0, y: 0, width: 1080, height: 1040 },
    });
  }
  await page.close();
}
await browser.close();
