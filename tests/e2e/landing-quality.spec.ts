import { expect, test } from '@playwright/test';

/**
 * QA global da landing pública (Proposta C): dobra, tipografia, imagem, ritmo
 * e honestidade do conteúdo. Cada regra espelha um item de aceite do brief —
 * falha aqui significa que a experiência publicada regrediu.
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
  test(`landing mantém a régua, a densidade e nenhum overflow em ${widthName}px`, async ({
    page,
  }) => {
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
    //    (DPR 1). naturalWidth mente sob srcset — o Chromium o normaliza para o
    //    slot de `sizes`, não para o arquivo servido —, então a medida honesta
    //    decodifica o currentSrc com createImageBitmap e compara com CSS × DPR.
    //    A largura de layout (img.width) ignora inflação por transform; a regra
    //    estrita vale para DPR 1 (no projeto mobile a fiação já serve densidade
    //    suficiente a DPR 3).
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
      const samples: Array<{ src: string; bitmap: number; shown: number; sizes: string }> = [];
      for (const img of images) {
        const shown = img.width || img.getBoundingClientRect().width;
        if (!img.currentSrc || shown < 200) continue;
        try {
          const response = await fetch(img.currentSrc);
          const bitmap = await createImageBitmap(await response.blob());
          samples.push({
            src: img.currentSrc.split('/').pop() ?? img.src,
            bitmap: bitmap.width,
            shown: Math.round(shown * devicePixelRatio),
            sizes: img.sizes,
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

test('tipografia editorial resolve para as fontes web carregadas, não fallbacks', async ({
  page,
}) => {
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
    // O corpo do hero é o parágrafo longo da coluna — o eyebrow e a régua
    // decorativa são <p> curtos.
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

  // O next/font cunha famílias com hash para as duas faces declaradas; um nome
  // de sistema aqui significa que o @font-face nunca assumiu o hero.
  expect(headlineFont.toLowerCase()).not.toMatch(/^georgia$|^serif$|^times/);
  expect(bodyFont.toLowerCase()).not.toMatch(/^arial$|^helvetica$|^sans-serif$|^system-ui$/);
  expect(headlineLoaded, `serif display "${headlineFont}" não carregou`).toBe(true);
  expect(bodyLoaded, `fonte de interface "${bodyFont}" não carregou`).toBe(true);
});

test('as seções mantêm o ritmo editorial compacto', async ({ page }) => {
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
      creators: box('[class*=creators]'),
      challenge: box('[class*=challenge]'),
      community: box('[class*=community]'),
      rewards: box('[class*=rewards]'),
      contents: box('#conteudos'),
      faq: box('#faq'),
      ctaFinal: box('#cta-final'),
      footer: box('footer'),
      page: document.documentElement.scrollHeight,
      criadoresTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-creators-title')!).fontSize,
      ),
      desafioTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-challenge-title')!).fontSize,
      ),
      comunidadeTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-community-title')!).fontSize,
      ),
      recompensasTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-rewards-title')!).fontSize,
      ),
      conteudosTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-contents-title')!).fontSize,
      ),
      faqTitleSize: parseFloat(getComputedStyle(document.getElementById('pl-faq-title')!).fontSize),
      ctaFinalTitleSize: parseFloat(
        getComputedStyle(document.getElementById('pl-cta-final-title')!).fontSize,
      ),
    };
  });

  // Tetos = altura aferida na captura do checkpoint + folga, para o rodapé do
  // hero e o banner navy não inflarem a cada edição. O hero é medido na
  // própria seção: a coluna de copy é esticada pela grade e mediria a foto.
  expect(heights.hero).toBeLessThanOrEqual(1000);
  expect(heights.creators).toBeLessThanOrEqual(1150);
  expect(heights.challenge).toBeLessThanOrEqual(700);
  expect(heights.community).toBeLessThanOrEqual(800);
  expect(heights.rewards).toBeLessThanOrEqual(840);
  // As seções do fechamento público (08 a 11), medidas na captura do Sprint 4B
  // (artifacts/proposta-c/sprint-4b/medidas.json) com a mesma folga das outras.
  expect(heights.contents).toBeLessThanOrEqual(900);
  expect(heights.faq).toBeLessThanOrEqual(850);
  expect(heights.ctaFinal).toBeLessThanOrEqual(900);
  expect(heights.footer).toBeLessThanOrEqual(300);
  // A página inteira fechada: 6914px medidos em 1920 na captura do Sprint 4B.
  // O teto existe para nenhuma seção inflar de novo sem que alguém veja.
  expect(heights.page).toBeLessThan(7200);
  // A hierarquia dos títulos é editorial: o h2 das seções não disputa com o h1.
  for (const size of [
    heights.criadoresTitleSize,
    heights.desafioTitleSize,
    heights.comunidadeTitleSize,
    heights.recompensasTitleSize,
    heights.conteudosTitleSize,
    heights.faqTitleSize,
    heights.ctaFinalTitleSize,
  ]) {
    expect(size).toBeGreaterThan(28);
    expect(size).toBeLessThan(60);
  }
});

test('a página pública não inventa números, datas nem perfis', async ({ page }) => {
  test.skip(
    test.info().project.name === 'mobile',
    'Auditoria de conteúdo é a mesma em qualquer DPR.',
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  // Os blocos 04 e 05 são de pré-lançamento: não existe creator público no
  // backend nem desafio publicado, então a página não pode afirmar contagem,
  // prazo, pontos ou participantes — nem batizar pessoas geradas.
  const audit = await page.evaluate(() => {
    const text = (selector: string) =>
      document.querySelector<HTMLElement>(selector)?.innerText ?? '';
    const creators = text('[class*=creators]');
    const challenge = text('[class*=challenge]');
    const community = text('[class*=community]');
    const rewards = text('[class*=rewards]');
    const contents = text('#conteudos');
    const faq = text('#faq');
    const ctaFinal = text('#cta-final');
    const footer = text('footer');
    return {
      creatorsCountClaim: /\+?\s?\d[\d.,]*\s*(mil\s+)?(creators|pessoas|membros|seguidoras)/i.test(
        creators,
      ),
      creatorsHandles: /@[a-z0-9._-]{2,}/i.test(creators),
      challengeDates:
        /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b\d{1,2} de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i.test(
          challenge,
        ),
      challengeMetrics: /\b(pontos|participantes|prazo|encerra|ranking)\b/i.test(challenge),
      noteInView: /em preparação/i.test(challenge),
      creatorsNote: /imagens de campanha/i.test(creators),
      // 06 e 07 são institucionais: nenhum número (contagem de creators, de
      // desafios ou de recompensas) e nenhum dado que só existe para quem entrou.
      communityDigits: /\d/.test(community),
      rewardsDigits: /\d/.test(rewards),
      rewardsOperational: /\b(saldo|estoque|resgat\w*|pontos|histórico|catálogo)\b/i.test(rewards),
      // 08 a 11 fecham a página pública sob a mesma regra: nenhuma contagem de
      // conteúdo que ainda não existe e nenhum dado de conta.
      contentsDigits: /\d/.test(contents),
      contentsOperational: /\b(saldo|estoque|resgat\w*|pontos|histórico|catálogo|painel)\b/i.test(
        contents,
      ),
      faqDigits: /\d/.test(faq),
      ctaFinalDigits: /\d/.test(ctaFinal),
      ctaFinalAccountData: /\b(saldo|estoque|resgat\w*|pontos|histórico|catálogo)\b/i.test(
        ctaFinal,
      ),
      // O rodapé só pode ter dígito no ano do copyright.
      footerDigits: /\d/.test(footer.replace(/©\s*2026 NUY Creators/, '')),
    };
  });

  expect(audit.creatorsCountClaim, 'a página afirma uma contagem que não existe').toBe(false);
  expect(audit.creatorsHandles, 'a página exibe @ de perfil inexistente').toBe(false);
  expect(audit.challengeDates, 'o banner anuncia data de desafio').toBe(false);
  expect(audit.challengeMetrics, 'o banner anuncia pontos/prazo/participantes').toBe(false);
  expect(audit.noteInView, 'o estado de pré-lançamento precisa estar declarado').toBe(true);
  expect(audit.creatorsNote, 'a origem das imagens precisa estar declarada').toBe(true);
  expect(audit.communityDigits, 'a seção 06 anuncia número que ninguém pode provar').toBe(false);
  expect(audit.rewardsDigits, 'a seção 07 anuncia número que ninguém pode provar').toBe(false);
  expect(audit.rewardsOperational, 'a seção 07 expõe dado operacional de conta').toBe(false);
  expect(audit.contentsDigits, 'a seção 08 anuncia número que ninguém pode provar').toBe(false);
  expect(audit.contentsOperational, 'a seção 08 expõe dado operacional de conta').toBe(false);
  expect(audit.faqDigits, 'a FAQ anuncia número que ninguém pode provar').toBe(false);
  expect(audit.ctaFinalDigits, 'o CTA final anuncia número que ninguém pode provar').toBe(false);
  expect(audit.ctaFinalAccountData, 'o CTA final expõe dado operacional de conta').toBe(false);
  expect(audit.footerDigits, 'o rodapé só pode ter dígito no ano do copyright').toBe(false);
  expect(
    await page.locator('[class*=footerNav] a[href="/app"]').count(),
    'deslogado, o rodapé não oferece o painel',
  ).toBe(0);

  // Todo texto do site é HTML real: os títulos existem como nós de texto.
  await expect(page.locator('#pl-creators-title')).toHaveText(/Pessoas reais, casas reais/);
  await expect(page.locator('#pl-challenge-title')).toHaveText(
    /Casa perfumada,\s*rotina mais feliz\./,
  );
  await expect(page.locator('#pl-community-title')).toHaveText(
    /Mais que limpeza,\s*uma casa que acolhe\./,
  );
  await expect(page.locator('#pl-rewards-title')).toHaveText('Recompensas que fazem sentido.');
  await expect(page.locator('#pl-contents-title')).toHaveText(
    /Conteúdos que nascem\s*da rotina real\./,
  );
  await expect(page.locator('#pl-faq-title')).toHaveText(/Conversas\s*que esclarecem\./);
  await expect(page.locator('#pl-cta-final-title')).toHaveText('Faça parte da NUY CREATORS.');
});
