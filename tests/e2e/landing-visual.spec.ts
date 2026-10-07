import { expect, test } from '@playwright/test';

/**
 * REDESIGN CLEAN (Opção 1 / Moça Lovers) — composição por viewport.
 *
 * Estrutura mínima: header pill flutuante, hero com packshots reais,
 * comunidade em pré-lançamento, o que é, como participar (navy), FAQ (navy),
 * CTA final claro e rodapé mínimo. Cada regra espelha o brief do redesign.
 */

const viewports = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 1000 },
  { w: 390, h: 844 },
] as const;

const CREAM = 'rgb(248, 244, 236)';
const WHITE = 'rgb(255, 255, 255)';
const NAVY = 'rgb(8, 43, 85)';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const { w, h } of viewports) {
  test(`landing clean compõe em ${w}x${h}`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && w > 760,
      'Desktop sizes are covered by the chromium project.',
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    // 1) Hero: copy verbatim do brief, em HTML real.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Bem-vinda à\s*NUY Creators/);

    // 2) Header pill flutuante: logo real + acessos.
    const header = page.locator('header');
    const pill = header.locator('[class*=headerPill]').first();
    await expect(pill).toBeVisible();
    await expect(header.getByRole('link', { name: 'NUY Creators início' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'CRIAR CONTA', exact: true })).toBeVisible();
    // As âncoras discretas só existem onde cabem.
    if (w >= 900) {
      for (const label of ['O que é', 'Como participar', 'FAQ'])
        await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible();
    } else {
      await header.getByRole('button', { name: 'Abrir menu' }).click();
      const panel = page.locator('#pl-mobile-nav');
      await expect(panel.getByRole('link', { name: 'Como participar', exact: true })).toBeVisible();
      await expect(panel.getByRole('link', { name: 'ENTRAR', exact: true })).toBeVisible();
      await header.getByRole('button', { name: 'Fechar menu' }).click();
      await expect(page.locator('#pl-mobile-nav')).toHaveCount(0);
    }

    // 3) Ordem das seções — e nenhum bloco operacional de volta.
    expect(
      await page
        .locator('main section[id]')
        .evaluateAll((elements) => elements.map((element) => element.id)),
    ).toEqual(['comunidade', 'o-que-e', 'como-participar', 'faq', 'cta-final']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // 4) Hero: três packshots reais da marca, sem upscale.
    //    A medida de nitidez é o bitmap SERVIDO, decodificado com
    //    `createImageBitmap`: `naturalWidth` mente sob `srcset` (vem dividido
    //    pela densidade do descritor `w`), e `currentSrc` passa pelo otimizador
    //    — o arquivo real vem no parâmetro `url`.
    const heroImages = await page.evaluate(async () => {
      const out = [];
      for (const img of Array.from(
        document.querySelectorAll<HTMLImageElement>('[class*=heroStage] img'),
      )) {
        const url = new URL(img.currentSrc, location.href);
        const file =
          url.pathname === '/_next/image'
            ? decodeURIComponent(url.searchParams.get('url') ?? '')
            : url.pathname;
        const bitmap = await createImageBitmap(await (await fetch(img.currentSrc)).blob());
        out.push({
          file,
          bitmap: { w: bitmap.width, h: bitmap.height },
          shown: { w: Math.round(img.width), h: Math.round(img.height) },
        });
        bitmap.close();
      }
      return out;
    });
    expect(heroImages).toHaveLength(3);
    for (const image of heroImages) {
      expect(image.file).toContain('/brand/nuy-creators-clean/products/');
      expect(image.bitmap.w + 2, `upscale em ${image.file}`).toBeGreaterThanOrEqual(image.shown.w);
      expect(image.bitmap.h + 2).toBeGreaterThanOrEqual(image.shown.h);
    }

    // 5) Comunidade: estado de pré-lançamento — nada inventado.
    const community = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#comunidade')!;
      return {
        cells: section.querySelectorAll('[class*=communityCell]').length,
        grid: section.querySelectorAll('[class*=creatorGrid]').length,
        note: section.querySelector('[class*=communityNote]')!.textContent!.trim(),
        text: section.innerText,
      };
    });
    // Pré-lançamento honesto: uma linha de estado, não caixas vazias fingindo
    // grade — quatro retângulos vazios leem como layout inacabado. A grade real
    // (`creatorGrid`) entra sozinha quando houver creators de verdade.
    expect(community.cells).toBe(0);
    expect(community.grid).toBe(0);
    expect(community.note).toContain('Em breve');
    expect(community.text).not.toMatch(/@[a-z0-9._-]+/i);

    // 6) O que é: fundo branco, três benefícios com ícone.
    const whatIs = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#o-que-e')!;
      return {
        background: getComputedStyle(section).backgroundColor,
        benefits: Array.from(section.querySelectorAll('[class*=benefitTitle]')).map((node) =>
          node.textContent!.trim(),
        ),
        icons: section.querySelectorAll('[class*=benefitItem] svg').length,
      };
    });
    expect(whatIs.background).toBe(WHITE);
    expect(whatIs.benefits).toEqual([
      'CRIE CONTEÚDO',
      'GANHE RECONHECIMENTO',
      'VIVA EXPERIÊNCIAS NUY',
    ]);
    expect(whatIs.icons).toBe(3);

    // 7) Como participar: navy, cinco passos.
    const howTo = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#como-participar')!;
      const steps = Array.from(section.querySelectorAll('[class*=stepCard]'));
      return {
        background: getComputedStyle(section).backgroundColor,
        titles: steps.map((step) => step.querySelector('[class*=stepTitle]')!.textContent!.trim()),
      };
    });
    expect(howTo.background).toBe(NAVY);
    expect(howTo.titles).toEqual([
      'Crie sua conta',
      'Complete seu perfil',
      'Participe dos desafios',
      'Compartilhe seu conteúdo',
      'Ganhe pontos e recompensas',
    ]);
    if (w >= 900) {
      expect(
        await page.evaluate(
          () =>
            getComputedStyle(document.querySelector('[class*=steps]')!).gridTemplateColumns.split(
              ' ',
            ).length,
        ),
      ).toBe(5);
    } else {
      expect(
        await page.evaluate(
          () => getComputedStyle(document.querySelector('[class*=steps]')!).overflowX,
        ),
      ).toBe('auto');
    }

    // 8) FAQ: navy, <details> nativos fechados, abrem pelo clique.
    const faq = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#faq')!;
      const items = Array.from(section.querySelectorAll<HTMLDetailsElement>('[class*=faqItem]'));
      return {
        background: getComputedStyle(section).backgroundColor,
        tags: items.map((item) => item.tagName),
        open: items.map((item) => item.open),
        questions: items.map((item) => item.querySelector('summary span')!.textContent!.trim()),
        answers: items.map((item) => item.querySelector('p')!.textContent!.trim().length),
      };
    });
    expect(faq.background).toBe(NAVY);
    expect(faq.tags).toEqual(Array(6).fill('DETAILS'));
    expect(faq.open).toEqual(Array(6).fill(false));
    expect(faq.questions[0]).toContain('Quem pode participar');
    for (const [index, length] of faq.answers.entries())
      expect(length, `resposta ${index + 1} da FAQ vazia`).toBeGreaterThan(40);
    const firstQuestion = page.locator('#faq details summary').first();
    await firstQuestion.click();
    expect(
      await page.evaluate(() => document.querySelector<HTMLDetailsElement>('#faq details')!.open),
    ).toBe(true);

    // O `next/image` é preguiçoso e no empilhado o CTA e o rodapé ficam muito
    // abaixo da dobra: sem forçar a carga, `currentSrc` chega vazio na medida.
    await page.evaluate(async () => {
      for (const img of Array.from(document.images)) {
        img.loading = 'eager';
        await img.decode().catch(() => {});
      }
    });

    // 9) CTA final claro com logo real e dois caminhos.
    const cta = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#cta-final')!;
      const logo = section.querySelector<HTMLImageElement>('img')!;
      return {
        background: getComputedStyle(section).backgroundColor,
        logoFile: decodeURIComponent(logo.currentSrc),
        actions: Array.from(section.querySelectorAll('a')).map((link) => [
          (link.textContent ?? '').trim(),
          link.getAttribute('href'),
        ]),
      };
    });
    expect(cta.background).toBe(CREAM);
    expect(cta.logoFile).toContain('/brand/nuy-creators-clean/logo/nuy-creators-logo.png');
    expect(cta.actions).toEqual([
      ['CRIAR MINHA CONTA', '/cadastro'],
      ['ENTRAR', '/login'],
    ]);

    // 10) Rodapé mínimo, logo real, links legais — nada de mega footer.
    const footer = await page.evaluate(() => {
      const node = document.querySelector<HTMLElement>('footer')!;
      const logo = node.querySelector<HTMLImageElement>('a[aria-label="NUY Creators início"] img');
      return {
        links: Array.from(node.querySelectorAll('nav a')).map((link) => [
          (link.textContent ?? '').trim(),
          link.getAttribute('href'),
        ]),
        logoFile: logo ? decodeURIComponent(logo.currentSrc) : null,
        last: node.nextElementSibling === null,
      };
    });
    expect(footer.logoFile).toContain('/brand/nuy-creators-clean/logo/nuy-creators-logo.png');
    expect(footer.links).toEqual([
      ['FAQ', '#faq'],
      ['Termos', '/termos'],
      ['Privacidade', '/privacidade'],
      ['Entrar', '/login'],
    ]);
    expect(footer.last, 'nada pode vir depois do rodapé').toBe(true);

    expect(errors).toEqual([]);
  });
}

for (const { w, h } of viewports) {
  test(`evidência visual da landing clean em ${w}x${h}`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && w > 760,
      'Desktop sizes are covered by the chromium project.',
    );
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of Array.from(document.images)) {
        img.loading = 'eager';
        await img.decode().catch(() => {});
      }
    });
    // O reveal é IntersectionObserver: sem varrer a página, o que está abaixo
    // da dobra nunca é pintado e a captura sairia em branco.
    await page.evaluate(async () => {
      const step = Math.round(innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 110));
      }
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    const prefix = `playwright-report/visual/landing-clean-${test.info().project.name}-${w}x${h}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
  });
}
