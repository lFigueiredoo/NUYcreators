import { expect, test } from '@playwright/test';

const widths = [320, 390, 768, 1024, 1440];

for (const width of widths) {
  test('a Editorial cabe em ' + width + 'px e conserva a leitura', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile' && width > 390, 'Cobertura no desktop.');
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const layout = await page.evaluate(() => {
      const clipped = [
        ...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p'),
      ]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            element.offsetHeight > 0 &&
            ((/^(hidden|clip)$/.test(style.overflowY) &&
              element.scrollHeight > element.clientHeight + 2) ||
              (/^(hidden|clip)$/.test(style.overflowX) &&
                element.scrollWidth > element.clientWidth + 2))
          );
        })
        .map((element) => element.textContent?.trim());
      return { clipped, overflow: document.documentElement.scrollWidth - innerWidth };
    });

    expect(layout.overflow).toBeLessThanOrEqual(0);
    expect(layout.clipped).toEqual([]);
  });
}

test('a primeira tela carrega os produtos e usa a tipografia definida', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const hero = page.locator('section[aria-labelledby="editorial-hero-title"]');
  const images = hero.locator('figure img');
  await expect(images).toHaveCount(4);

  const inspection = await hero.evaluate(async (section) => {
    const headline = section.querySelector('h1')!;
    const description = [...section.querySelectorAll('p')].find((element) =>
      element.textContent?.includes('Crie, compartilhe'),
    )!;
    const firstFont = (el: Element) =>
      getComputedStyle(el)
        .fontFamily.split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');
    const fonts = [
      headline,
      description,
      document.querySelector('#editorial-community-title')!,
    ].map((element) => {
      const family = firstFont(element);
      return {
        family,
        loaded: [...document.fonts].some(
          (font) => font.status === 'loaded' && font.family.replace(/^["']|["']$/g, '') === family,
        ),
      };
    });
    const sources = await Promise.all(
      [...section.querySelectorAll<HTMLImageElement>('figure img')].map(async (image) => {
        await image.decode();
        const box = image.getBoundingClientRect();
        const url = new URL(image.currentSrc, location.href);
        return {
          path: url.searchParams.get('url') ?? url.pathname,
          naturalWidth: image.naturalWidth,
          ratio: box.width / box.height,
          naturalRatio: image.naturalWidth / image.naturalHeight,
          loading: image.loading,
          priority: image.fetchPriority,
        };
      }),
    );
    return { fonts, sources };
  });

  expect(inspection.fonts.every((font) => /nunito/i.test(font.family))).toBe(true);
  expect(inspection.fonts.every((font) => font.loaded)).toBe(true);
  expect(inspection.sources.every((source) => source.loading !== 'lazy')).toBe(true);
  expect(inspection.sources.some((source) => source.priority === 'high')).toBe(true);
  for (const product of [
    'limpador-cha-branco-125ml',
    'aromatizador-flores-vibrantes-200ml',
    'sabonete-cereja-selvagem-500ml',
  ]) {
    const source = inspection.sources.find((entry) => entry.path.includes(product));
    expect(source, product).toBeDefined();
    expect(source!.naturalWidth).toBeGreaterThan(0);
    expect(source!.ratio, product).toBeCloseTo(source!.naturalRatio, 2);
  }
});

test('a comunidade não publica métricas nem dados operacionais', async ({ page }) => {
  await page.goto('/');
  const community = await page.locator('#comunidade').innerText();
  expect(community).not.toMatch(
    /\+?\s?\d[\d.,]*\s*(mil\s+)?(creators|pessoas|membros|seguidoras)/i,
  );
  const invitation = await page.locator('#cta-final').innerText();
  expect(invitation).not.toMatch(/\b(saldo|estoque|resgat\w*|histórico|catálogo)\b/i);
});
