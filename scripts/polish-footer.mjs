import { chromium } from '@playwright/test';
const OUT='artifacts/polish-final';
const browser = await chromium.launch();
for (const [w,h] of [[1920,1080],[390,844]]) {
  const page = await browser.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1 });
  await page.goto('http://localhost:3000',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  const foot = page.locator('footer').first();
  await foot.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const box = await foot.boundingBox();
  await page.screenshot({ path:`${OUT}/region-footer-${w}.png`, clip:{x:0,y:box.y-6,width:w,height:Math.min(box.height+12, 700)} });
  const colors = await page.evaluate(() => {
    const out=[];
    for (const el of Array.from(document.querySelectorAll('footer a'))) {
      out.push({ txt: el.textContent.trim().slice(0,24), color: getComputedStyle(el).color, cls: String(el.className).split('__').pop() });
    }
    const cp = document.querySelector('footer [class*=footerCopy], footer small');
    return { links: out.slice(0,8), copy: cp ? { txt: cp.textContent.trim().slice(0,40), color: getComputedStyle(cp).color } : null };
  });
  console.log(w, JSON.stringify(colors, null, 1));
  await page.close();
}
await browser.close();
