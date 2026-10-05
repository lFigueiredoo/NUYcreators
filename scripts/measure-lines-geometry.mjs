import { chromium } from '@playwright/test';

/**
 * Measure the real boxes in the two connector line sections so the SVG paths
 * can be authored against measured zones:
 *  - Como funciona: ol.steps + every li border/number/title paragraph box
 *  - Jornada: .journey li halo circles + labels
 * Usage: node scripts/measure-lines-geometry.mjs [base]
 */

const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
try {
  for (const [label, width, height] of [
    ['1920', 1920, 1040],
    ['1440', 1440, 900],
    ['1024', 1024, 768],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const rel = (el, ref) => {
        const b = el.getBoundingClientRect();
        const r = ref.getBoundingClientRect();
        return {
          x: +(b.left - r.left).toFixed(1),
          y: +(b.top - r.top).toFixed(1),
          w: +b.width.toFixed(1),
          h: +b.height.toFixed(1),
        };
      };
      const out = {};
      const steps = document.querySelector('ol[class*="steps"]');
      if (steps) {
        const sb = steps.getBoundingClientRect();
        out.steps = { w: +sb.width.toFixed(1), h: +sb.height.toFixed(1) };
        out.items = Array.from(steps.querySelectorAll(':scope > li')).map((li) => ({
          ...rel(li, steps),
          border: getComputedStyle(li).borderTopWidth,
          number: rel(li.querySelector('span[class*="stepNumber"]') ?? li, steps),
          title: rel(li.querySelector('h3') ?? li, steps),
          text: rel(li.querySelector('p') ?? li, steps),
        }));
      }
      const journey = document.querySelector('div[class*="levelJourney"]');
      if (journey) {
        const jb = journey.getBoundingClientRect();
        out.journey = { w: +jb.width.toFixed(1), h: +jb.height.toFixed(1) };
        out.levels = Array.from(journey.querySelectorAll('ol > li')).map((li) => {
          const halo = li.querySelector('span[class*="levelHalo"]') ?? li;
          const h3 = li.querySelector('h3');
          return {
            item: rel(li, journey),
            halo: rel(halo, journey),
            title: h3 ? rel(h3, journey) : null,
            h3Rect: h3
              ? (() => {
                  const b = h3.getBoundingClientRect();
                  const child = h3.firstElementChild;
                  const r = child ? child.getBoundingClientRect() : b;
                  return {
                    text: h3.textContent?.trim().slice(0, 20),
                    top: +(b.top - jb.top).toFixed(1),
                    bottom: +(b.bottom - jb.top).toFixed(1),
                    left: +(r.left - jb.left).toFixed(1),
                  };
                })()
              : null,
          };
        });
      }
      return out;
    });
    console.log(label, JSON.stringify(data));
    await page.close();
  }
} finally {
  await browser.close();
}
