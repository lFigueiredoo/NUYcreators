import { expect, test } from '@playwright/test';

/**
 * QA global da landing clean (Opção 1): overflow, tipografia, imagem sem
 * upscale, texto nunca cortado e honestidade do conteúdo — agora com uma
 * estrutura de poucas seções, como o brief exige.
 */

// Comentário de desenvolvimento nunca pode chegar à página pública.
const devPhrases = [
  'Composição conceitual',
  'Arte conceitual',
  'referência visual, não fotografia',
  'categorias, não ofertas',
  'Inspiração visual',
  'não fotografia oficial',
];

const viewportWidths: Array<[number, 1920 | 1440 | 1366 | 1280 | 1024 | 768 | 430 | 390 | 375]> = [
  [1920, 1920],
  [1440, 1440],
  [1366, 1366],
  [1280, 1280],
  [1024, 1024],
  [768, 768],
  [430, 430],
  [390, 390],
  [375, 375],
];

for (const [width, widthName] of viewportWidths) {
  test(`landing clean mantém a régua e nenhum overflow em ${widthName}px`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && widthName > 760,
      'Desktop sizes are covered by the chromium project.',
    );
    await page.setViewportSize({ width: widthName, height: width === 375 ? 667 : 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    // 1) Sem overflow horizontal em nenhum break point publicado.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // 2) Nenhuma imagem de conteúdo acima dos pixels que o próprio arquivo tem
    //    (DPR 1). A medida honesta decodifica o currentSrc com
    //    createImageBitmap e compara com CSS × DPR.
    const upscaled = await page.evaluate(async () => {
      if (devicePixelRatio !== 1) return [];
      // Varre a página uma vez para toda seleção de srcset preguiçoso já ter
      // acontecido e reportar um currentSrc que valha auditar.
      for (const section of Array.from(document.querySelectorAll('main section'))) {
        section.scrollIntoView({ block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      scrollTo(0, 0);
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('main img'));
      const samples: Array<{ src: string; bitmap: number; shown: number }> = [];
      for (const img of images) {
        const shown = img.width || img.getBoundingClientRect().width;
        if (!img.currentSrc || shown < 40) continue;
        try {
          const response = await fetch(img.currentSrc);
          const bitmap = await createImageBitmap(await response.blob());
          samples.push({
            src: img.currentSrc.split('/').pop() ?? img.src,
            bitmap: bitmap.width,
            shown: Math.round(shown * devicePixelRatio),
          });
          bitmap.close();
        } catch {
          // Uma imagem preguiçosa cujos bytes ainda estão na rede resolve o
          // fetch de qualquer forma; falha aqui é de rede, não de fidelidade.
        }
      }
      return samples.filter((sample) => sample.bitmap + 2 < sample.shown);
    });
    expect(upscaled).toEqual([]);

    // 3) Nenhum bloco de texto é cortado pela própria caixa.
    const clipped = await page.evaluate(() => {
      const hides = (el: HTMLElement) => {
        const { overflow, overflowY } = getComputedStyle(el);
        return (
          /^(hidden|clip|auto|scroll)$/.test(overflow) ||
          /^(hidden|clip|auto|scroll)$/.test(overflowY)
        );
      };
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('main h1, main h2, main p, main li'),
      );
      return nodes
        .filter((el) => el.offsetHeight > 0 && el.scrollHeight > el.clientHeight + 2 && hides(el))
        .map(
          (el) =>
            `${el.tagName}.${Array.from(el.classList).join('.')}: ${el.textContent?.slice(0, 40)}`,
        );
    });
    expect(clipped).toEqual([]);

    // 4) Comentário de desenvolvimento nunca vai para produção.
    const visible = await page.evaluate((phrases) => {
      const text = (document.querySelector('main') ?? document.body).innerText;
      return phrases.filter((phrase) => text.toLowerCase().includes(phrase.toLowerCase()));
    }, devPhrases);
    expect(visible).toEqual([]);
  });
}

test('tipografia resolve para as fontes web carregadas, não fallbacks', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Budgets below are desktop measurements.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const [headlineFont, bodyFont, headlineLoaded, bodyLoaded] = await page.evaluate(() => {
    const first = (el: Element) =>
      getComputedStyle(el)
        .fontFamily.split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');
    const headline = first(document.getElementById('pl-hero-title')!);
    // O corpo do hero é o parágrafo da coluna — não o eyebrow.
    const bodyNode = Array.from(document.querySelectorAll<HTMLElement>('[class*=heroCopy] p')).find(
      (node) => (node.textContent ?? '').trim().length > 40,
    )!;
    const body = first(bodyNode);
    return [
      headline,
      body,
      document.fonts.check(`400 40px ${JSON.stringify(headline)}`),
      document.fonts.check(`400 16px ${JSON.stringify(body)}`),
    ];
  });

  // O next/font cunha famílias com hash; um nome de sistema aqui significa que
  // o @font-face nunca assumiu o hero.
  expect(headlineFont.toLowerCase()).not.toMatch(/^georgia$|^serif$|^times/);
  expect(bodyFont.toLowerCase()).not.toMatch(/^arial$|^helvetica$|^sans-serif$|^system-ui$/);
  expect(headlineLoaded, `serif display "${headlineFont}" não carregou`).toBe(true);
  expect(bodyLoaded, `fonte de interface "${bodyFont}" não carregou`).toBe(true);
});

test('a landing mantém o ritmo enxuto do redesign', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Budgets below are desktop measurements.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const heights = await page.evaluate(() => {
    const box = (selector: string) =>
      document.querySelector<HTMLElement>(selector)!.getBoundingClientRect().height;
    return {
      hero: box('[aria-labelledby="pl-hero-title"]'),
      community: box('#comunidade'),
      whatIs: box('#o-que-e'),
      howTo: box('#como-participar'),
      faq: box('#faq'),
      ctaFinal: box('#cta-final'),
      footer: box('footer'),
      page: document.documentElement.scrollHeight,
    };
  });

  // Poucas seções, grandes e simples: a página inteira é bem menor que a
  // landing editorial anterior.
  expect(heights.hero).toBeLessThanOrEqual(1100);
  expect(heights.community).toBeLessThanOrEqual(900);
  expect(heights.whatIs).toBeLessThanOrEqual(900);
  expect(heights.howTo).toBeLessThanOrEqual(800);
  expect(heights.faq).toBeLessThanOrEqual(900);
  expect(heights.ctaFinal).toBeLessThanOrEqual(800);
  expect(heights.footer).toBeLessThanOrEqual(240);
  expect(heights.page).toBeLessThan(5600);
});

test('a página pública não inventa números, datas, perfis nem métricas', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const audit = await page.evaluate(() => {
    const text = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.innerText ?? '';
    const community = text('#comunidade');
    const whatIs = text('#o-que-e');
    const howTo = text('#como-participar');
    const faq = text('#faq');
    const ctaFinal = text('#cta-final');
    const footer = text('footer');
    return {
      communityCountClaim: /\+?\s?\d[\d.,]*\s*(mil\s+)?(creators|pessoas|membros|seguidoras)/i.test(
        community,
      ),
      communityHandles: /@[a-z0-9._-]{2,}/i.test(community),
      whatIsDigits: /\d/.test(whatIs),
      faqDigits: /\d/.test(faq),
      ctaFinalDigits: /\d/.test(ctaFinal),
      ctaFinalAccountData: /\b(saldo|estoque|resgat\w*|histórico|catálogo)\b/i.test(ctaFinal),
      // O rodapé só pode ter dígito no ano do copyright.
      footerDigits: /\d/.test(footer.replace(/©\s*2026 NUY Creators/, '')),
    };
  });

  expect(audit.communityCountClaim, 'a página afirma uma contagem que não existe').toBe(false);
  expect(audit.communityHandles, 'a página exibe @ de perfil inexistente').toBe(false);
  expect(audit.whatIsDigits, '05 anuncia número que ninguém pode provar').toBe(false);
  expect(audit.faqDigits, 'a FAQ anuncia número que ninguém pode provar').toBe(false);
  expect(audit.ctaFinalDigits, 'o CTA final anuncia número que ninguém pode provar').toBe(false);
  expect(audit.ctaFinalAccountData, 'o CTA final expõe dado operacional de conta').toBe(false);
  expect(audit.footerDigits, 'o rodapé só pode ter dígito no ano').toBe(false);
  expect(
    await page.locator('footer a[href="/app"]').count(),
    'deslogado, o rodapé não oferece o painel',
  ).toBe(0);
});
