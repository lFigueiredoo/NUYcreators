import { expect, test } from '@playwright/test';

/**
 * PROPOSTA C — "Entre Casa & Creators": composição por viewport.
 *
 * Cada regra abaixo espelha um item do brief de redesign: hero editorial com a
 * fotografia sangrando à direita, creators na régua com retratos em tamanho
 * nativo e o desafio como banner navy. Falha aqui = a página pública regrediu.
 *
 * A largura dos cards de creator é o caso mais afiado: o bitmap dos retratos é
 * 356×534 nativos, então nenhum card pode passar disso em DPR 1 — a sobra vira
 * respiro entre os cards, nunca upscale.
 */

const viewports = [
  { w: 1920, h: 1080 },
  { w: 1440, h: 1000 },
  { w: 390, h: 844 },
] as const;

const CREATOR_NATIVE_WIDTH = 356;

for (const { w, h } of viewports) {
  test(`proposta C compõe a landing em ${w}x${h}`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && w > 760,
      'Desktop sizes are covered by the chromium project.',
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    // 1) Hero: a manchete da Proposta C, em HTML real.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Rotinas reais\s*que deixam\s*a casa mais viva\./,
    );

    // 2) Header: lockup sempre; navegação solta e pills só onde cabem.
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'NUY Creators início' })).toBeVisible();
    if (w >= 1160) {
      for (const label of ['Início', 'Comunidade', 'Desafios', 'Recompensas', 'Conteúdos', 'FAQ'])
        await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Fazer parte', exact: true })).toBeVisible();
    } else {
      await header.getByRole('button', { name: 'Abrir menu' }).click();
      const panel = page.locator('#pl-mobile-nav');
      await expect(panel.getByRole('link', { name: 'Comunidade', exact: true })).toBeVisible();
      await expect(panel.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
      await expect(panel.getByRole('link', { name: 'Fazer parte', exact: true })).toBeVisible();
      await header.getByRole('button', { name: 'Fechar menu' }).click();
      await expect(page.locator('#pl-mobile-nav')).toHaveCount(0);
    }

    // 3) As seções existem na ordem do documento e nenhuma operacional voltou.
    expect(
      await page
        .locator('main section[id]')
        .evaluateAll((elements) => elements.map((element) => element.id)),
    ).toEqual([
      'comunidade',
      'desafios',
      'manifesto',
      'recompensas',
      'conteudos',
      'faq',
      'cta-final',
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    // 4) Creators: grade de quatro na régua (desktop) ou carrossel (empilhado).
    const grid = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('[class*=creators]')!;
      const grid = document.querySelector<HTMLElement>('[class*=creatorsGrid]')!;
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[class*=creatorCard]'));
      const style = getComputedStyle(grid);
      return {
        display: style.display,
        columns: style.gridTemplateColumns.split(' ').length,
        snap: style.scrollSnapType,
        overflowX: style.overflowX,
        scrollWidth: grid.scrollWidth,
        clientWidth: grid.clientWidth,
        cards: cards.map((card) => {
          const box = card.getBoundingClientRect();
          return { x: box.x, width: box.width, right: box.right, bottom: box.bottom };
        }),
        sectionPadding: parseFloat(getComputedStyle(section).paddingLeft),
        titleX: document.getElementById('pl-creators-title')!.getBoundingClientRect().x,
      };
    });
    expect(grid.cards).toHaveLength(4);
    if (w >= 900) {
      expect(grid.display).toBe('grid');
      expect(grid.columns).toBe(4);
      for (const card of grid.cards) {
        expect(
          card.width,
          `card de creator com ${card.width.toFixed(1)}px — o retrato nativo tem ${CREATOR_NATIVE_WIDTH}px`,
        ).toBeLessThanOrEqual(CREATOR_NATIVE_WIDTH + 1);
      }
      // A grade abre na régua editorial, alinhada ao título da seção.
      expect(Math.abs(grid.cards[0].x - grid.titleX)).toBeLessThanOrEqual(1);
      expect(grid.sectionPadding).toBeGreaterThan(0.03 * w);
      // A tira fecha na régua direita: sobra entre cards, nunca para fora.
      expect(w - grid.cards[3].right).toBeGreaterThanOrEqual(grid.sectionPadding - 1);
      // Todos os retratos têm a mesma altura (a grade não desalinha).
      expect(new Set(grid.cards.map((card) => Math.round(card.bottom))).size).toBe(1);
    } else {
      expect(grid.display).toBe('flex');
      expect(grid.overflowX).toBe('auto');
      expect(grid.snap).toContain('x');
      expect(grid.scrollWidth).toBeGreaterThan(grid.clientWidth);
      expect(grid.cards[0].x).toBeLessThanOrEqual(1);
      expect(grid.cards[1].x).toBeGreaterThan(grid.cards[0].right - 1);
    }

    // 5) Desafio: banner navy com a foto na direita (desktop) ou empilhado.
    const challenge = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('[class*=challenge]')!;
      const media = document.querySelector<HTMLElement>('[class*=challengeMedia]')!;
      const copy = document.querySelector<HTMLElement>('[class*=challengeCopy]')!;
      const mediaBox = media.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      return {
        background: getComputedStyle(section).backgroundColor,
        mediaPosition: getComputedStyle(media).position,
        media: { x: mediaBox.x, y: mediaBox.y, right: mediaBox.right, width: mediaBox.width },
        copy: { x: copyBox.x, y: copyBox.y, right: copyBox.right, bottom: copyBox.bottom },
        copyPaddingLeft: parseFloat(getComputedStyle(copy).paddingLeft),
        viewport: innerWidth,
      };
    });
    expect(challenge.background).toBe('rgb(14, 42, 68)');
    if (w >= 900) {
      expect(challenge.mediaPosition).toBe('absolute');
      // A foto sangra pela direita e encosta na borda.
      expect(challenge.media.x).toBeGreaterThan(w * 0.3);
      expect(Math.abs(challenge.media.right - w)).toBeLessThanOrEqual(1);
      // A copy fica na régua e só pisa na faixa do scrim que já é opaca
      // (os primeiros 26% da foto são 94% navy): nunca sobre a massa da imagem.
      expect(challenge.copy.x).toBeGreaterThanOrEqual(grid.sectionPadding - 1);
      expect((challenge.copy.right - challenge.media.x) / challenge.media.width).toBeLessThan(0.25);
    } else {
      expect(challenge.mediaPosition).toBe('relative');
      expect(Math.abs(challenge.media.width - w)).toBeLessThanOrEqual(1);
      expect(challenge.copy.y).toBeGreaterThan(challenge.media.y);
      // A copy empilhada sangra a caixa até a borda e recua pela régua no
      // padding: o que tem de ficar longe da borda é o texto, não o box.
      expect(challenge.copy.x + challenge.copyPaddingLeft).toBeGreaterThanOrEqual(16);
    }

    // 6) Comunidade (06): segundo bloco navy, editorial — copy na régua à
    //    esquerda, fotografia de casa real à direita preenchendo a composição
    //    (nada de bloco vazio) e quatro marcas em linha, sem card.
    const community = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('[class*=community]')!;
      const copyEl = document.querySelector<HTMLElement>('[class*=communityCopy]')!;
      const mediaEl = document.querySelector<HTMLElement>('[class*=communityMedia]')!;
      const cta = document.querySelector<HTMLAnchorElement>('[class*=communityCta]')!;
      const copy = copyEl.getBoundingClientRect();
      const media = mediaEl.getBoundingClientRect();
      const box = section.getBoundingClientRect();
      return {
        background: getComputedStyle(section).backgroundColor,
        padding: parseFloat(getComputedStyle(section).paddingLeft),
        section: { height: box.height, width: box.width },
        // O reveal deixa `transform: translateY(...)` enquanto o elemento não
        // entra na dobra — e este teste não rola a página. A régua vertical é
        // medida por offsetTop/offsetHeight, que ignoram transform.
        copyLayoutTop: copyEl.offsetTop,
        copyLayoutHeight: copyEl.offsetHeight,
        mediaLayoutTop: mediaEl.offsetTop,
        mediaLayoutHeight: mediaEl.offsetHeight,
        copy: { x: copy.x, right: copy.right, y: copy.y, bottom: copy.bottom },
        media: {
          x: media.x,
          right: media.right,
          y: media.y,
          bottom: media.bottom,
          width: media.width,
          height: media.height,
        },
        marks: document.querySelectorAll('[class*=communityMarks] > li').length,
        ctaHref: cta.getAttribute('href'),
        ctaText: cta.textContent!.replace(/\s+/g, ' ').trim(),
        headline: document
          .getElementById('pl-community-title')!
          .textContent!.replace(/\s+/g, ' ')
          .trim(),
      };
    });
    expect(community.background).toBe('rgb(14, 42, 68)');
    // O `<br>` do título não deixa espaço no textContent: a quebra é a régua.
    expect(community.headline).toMatch(/^Mais que limpeza,\s*uma casa que acolhe\.$/);
    // Copy verbatim do brief, sem número inventado de creators ou desafios.
    expect(await page.locator('[class*=communityBody]').innerText()).toBe(
      'Conteúdos, desafios, experiências e pessoas reais que tornam a rotina mais leve, bonita e significativa.',
    );
    expect(community.ctaHref).toBe('/cadastro');
    expect(community.ctaText).toBe('Fazer parte da comunidade');
    expect(community.marks).toBe(4);
    if (w >= 900) {
      // Copy na régua, foto na coluna da direita: uma não invade a outra.
      expect(community.copy.x).toBeGreaterThanOrEqual(community.padding - 1);
      expect(community.copy.right).toBeLessThanOrEqual(community.media.x);
      // A foto fecha na régua direita e ocupa a maior parte da composição.
      expect(Math.abs(w - community.padding - community.media.right)).toBeLessThanOrEqual(1);
      expect(community.media.width).toBeGreaterThan(0.45 * w);
      expect(community.media.height).toBeGreaterThan(0.6 * community.section.height);
      // Copy centrada na altura da foto: o bloco não sobra nem transborda.
      const copyCenter = community.copyLayoutTop + community.copyLayoutHeight / 2;
      const mediaCenter = community.mediaLayoutTop + community.mediaLayoutHeight / 2;
      expect(
        Math.abs(copyCenter - mediaCenter),
        `copy em ${community.copyLayoutTop}+${community.copyLayoutHeight / 2} vs foto em ${community.mediaLayoutTop}+${community.mediaLayoutHeight / 2}`,
      ).toBeLessThanOrEqual(2);
    } else {
      // Empilhado na ordem do brief: eyebrow, título, texto, CTA e a foto.
      expect(community.copyLayoutTop).toBeLessThan(community.mediaLayoutTop);
      expect(community.media.x).toBe(0);
      expect(Math.abs(community.media.width - w)).toBeLessThanOrEqual(1);
    }

    // 7) Recompensas (07): volta ao claro — três categorias com fotografia
    //    protagonista. O visitante está deslogado: nem saldo, nem estoque, nem
    //    preço em pontos, nem botão de resgate. Cada card só convida a entrar.
    const rewards = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('[class*=rewards]')!;
      const grid = document.querySelector<HTMLElement>('[class*=rewardsCards]')!;
      const copy = document.querySelector<HTMLElement>('[class*=rewardsCopy]')!;
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[class*=rewardCard]'));
      const gridBox = grid.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      return {
        background: getComputedStyle(section).backgroundColor,
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        padding: parseFloat(getComputedStyle(section).paddingLeft),
        grid: { x: gridBox.x, right: gridBox.right },
        copy: { x: copyBox.x, right: copyBox.right },
        cards: cards.map((card) => {
          const box = card.getBoundingClientRect();
          const image = card.querySelector<HTMLImageElement>('img')!;
          const imageBox = image.getBoundingClientRect();
          return {
            width: box.width,
            title: card.querySelector('[class*=rewardTitle]')!.textContent!.trim(),
            href: card.querySelector('a')!.getAttribute('href'),
            imageWidth: imageBox.width,
            imageHeight: imageBox.height,
            alt: image.getAttribute('alt') ?? '',
          };
        }),
      };
    });
    expect(rewards.background).toBe('rgb(253, 250, 245)');
    expect(rewards.cards.map((card) => card.title)).toEqual([
      'Produtos NUY',
      'Kits exclusivos',
      'Experiências especiais',
    ]);
    for (const card of rewards.cards) {
      expect(card.href).toBe('/cadastro');
      expect(card.imageWidth / card.imageHeight).toBeCloseTo(0.75, 2);
      // Os recortes têm 814px nativos: 352px é o teto do card em DPR 2.
      expect(card.imageWidth).toBeLessThanOrEqual(352 + 1);
      expect(card.alt.length).toBeGreaterThan(20);
    }
    if (w >= 900) {
      expect(rewards.columns).toBe(3);
      expect(rewards.copy.x).toBeGreaterThanOrEqual(rewards.padding - 1);
      expect(rewards.copy.right).toBeLessThanOrEqual(rewards.grid.x);
      // A grade fecha na régua direita, como o resto da página.
      expect(Math.abs(w - rewards.padding - rewards.grid.right)).toBeLessThanOrEqual(1);
    } else {
      expect(rewards.columns).toBe(1);
    }

    // 8) Âncora de navegação resolve para a própria seção — inclusive a que o
    //    header congelado aponta para a seção nova.
    if (w >= 1160) {
      for (const [label, id] of [
        ['Desafios', 'desafios'],
        ['Recompensas', 'recompensas'],
      ] as const) {
        await header.getByRole('link', { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        // A rolagem é suave: ler a posição na hora daria o topo ainda longe.
        await expect
          .poll(() =>
            page.evaluate((alvo) => {
              const box = document.getElementById(alvo)!.getBoundingClientRect();
              return box.top < innerHeight && box.bottom > 0;
            }, id),
          )
          .toBe(true);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // 9) Navegação real dos CTAs (e nada de âncora morta no caminho).
    //    O primeiro `primaryButton` é o do hero — o mesmo destino que a seção
    //    de conteúdos repete no fim da leitura.
    await page.locator('[class*=primaryButton]').first().click();
    await expect(page).toHaveURL(/\/cadastro$/);
    await page.goto('/');
    // Abaixo do breakpoint "Entrar" só existe dentro do painel do menu — o
    // link solto do header é desktop.
    if (w < 1160) await header.getByRole('button', { name: 'Abrir menu' }).click();
    const loginLink = header.getByRole('link', { name: 'Entrar', exact: true }).filter({
      visible: true,
    });
    await expect(loginLink.first()).toBeVisible();
    await loginLink.first().click();
    await expect(page).toHaveURL(/\/login$/);

    // 10) Conteúdos (08): três pilares de rotina real, sem catálogo e sem
    //     contagem. O convite é o mesmo `/cadastro` — a página não inventa
    //     conteúdo que ainda não existe.
    //     A navegação do item 9 termina em `/login`: voltar para a landing
    //     antes das seções finais.
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const contents = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#conteudos')!;
      const grid = document.querySelector<HTMLElement>('[class*=contentsGrid]')!;
      const gridBox = grid.getBoundingClientRect();
      return {
        background: getComputedStyle(section).backgroundColor,
        padding: parseFloat(getComputedStyle(section).paddingLeft),
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        gridRight: gridBox.right,
        items: Array.from(document.querySelectorAll<HTMLElement>('[class*=contentItem]')).map(
          (item) => ({
            title: item.querySelector('[class*=contentTitle]')!.textContent!.trim(),
            text: (item.querySelector('[class*=contentText]')!.textContent ?? '').trim(),
          }),
        ),
        ctaHref: document
          .querySelector<HTMLAnchorElement>('[class*=contentsActions] a')!
          .getAttribute('href'),
        ctaText: document
          .querySelector('[class*=contentsActions] a')!
          .textContent!.replace(/\s+/g, ' ')
          .trim(),
        note: document.querySelector('[class*=contentsNote]')!.textContent!.trim(),
      };
    });
    expect(contents.background).toBe('rgb(249, 245, 239)');
    expect(contents.items.map((item) => item.title)).toEqual([
      'Rotinas de casa',
      'Antes e depois',
      'Impressões honestas',
    ]);
    for (const item of contents.items)
      expect(item.text.length, `pilar "${item.title}" sem texto`).toBeGreaterThan(40);
    expect(contents.ctaHref).toBe('/cadastro');
    expect(contents.ctaText).toBe('Fazer parte da comunidade');
    expect(contents.note).toBe('Os primeiros conteúdos chegam com os creators da comunidade.');
    if (w >= 900) {
      expect(contents.columns).toBe(3);
      expect(Math.abs(w - contents.padding - contents.gridRight)).toBeLessThanOrEqual(1);
    } else {
      expect(contents.columns).toBe(1);
    }

    // 11) FAQ (09): disclosure nativo — `<details>` de verdade, fechado por
    //     padrão, com resposta real. Sem estado no cliente e sem promessa nova.
    const faq = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#faq')!;
      const items = Array.from(document.querySelectorAll<HTMLDetailsElement>('[class*=faqItem]'));
      const foot = document.querySelector<HTMLElement>('[class*=faqFoot]')!;
      return {
        background: getComputedStyle(section).backgroundColor,
        tags: items.map((item) => item.tagName),
        open: items.map((item) => item.open),
        questions: items.map((item) => item.querySelector('summary')!.textContent!.trim()),
        answers: items.map((item) => (item.querySelector('p')?.textContent ?? '').trim().length),
        foot: Array.from(foot.querySelectorAll('a')).map((link) => [
          (link.textContent ?? '').trim(),
          link.getAttribute('href'),
        ]),
      };
    });
    expect(faq.background).toBe('rgb(253, 250, 245)');
    expect(faq.tags).toEqual(Array(8).fill('DETAILS'));
    expect(faq.open).toEqual(Array(8).fill(false));
    expect(faq.questions[0]).toBe('O que é a NUY Creators?');
    expect(faq.questions).toContain('Posso sair quando quiser?');
    for (const [index, length] of faq.answers.entries())
      expect(length, `resposta ${index + 1} da FAQ vazia`).toBeGreaterThan(60);
    expect(faq.foot).toEqual([
      ['Fazer parte da comunidade', '/cadastro'],
      ['Já tenho uma conta', '/login'],
      ['Esqueci minha senha', '/recuperar-senha'],
    ]);

    // 12) CTA final (10): último bloco navy, convite + foto de casa real.
    const cta = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#cta-final')!;
      const media = document.querySelector<HTMLElement>('[class*=ctaFinalMedia]')!;
      const image = section.querySelector<HTMLImageElement>('img')!;
      const mediaBox = media.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      return {
        background: getComputedStyle(section).backgroundColor,
        padding: parseFloat(getComputedStyle(section).paddingLeft),
        title: document.getElementById('pl-cta-final-title')!.textContent!.trim(),
        body: document.querySelector('[class*=ctaFinalBody]')!.textContent!.trim(),
        actions: Array.from(section.querySelectorAll('a')).map((link) => [
          (link.textContent ?? '').trim(),
          link.getAttribute('href'),
        ]),
        media: { x: mediaBox.x, right: mediaBox.right, width: mediaBox.width },
        image: { width: imageBox.width, height: imageBox.height },
        alt: image.getAttribute('alt') ?? '',
        // A foto é 1448×1086 nativos: nunca pode ser exibida maior que isso.
        bitmap: { width: image.naturalWidth, height: image.naturalHeight },
      };
    });
    expect(cta.background).toBe('rgb(14, 42, 68)');
    expect(cta.title).toBe('Faça parte da NUY CREATORS.');
    expect(cta.body).toBe(
      'Entre para uma comunidade feita para quem transforma rotina em inspiração.',
    );
    expect(cta.actions).toEqual([
      ['Quero fazer parte', '/cadastro'],
      ['Já tenho uma conta', '/login'],
    ]);
    expect(cta.alt.length, 'a foto do CTA final precisa de alt real').toBeGreaterThan(40);
    // No desktop a foto entra inteira (4:3, o formato do arquivo); empilhada,
    // ela vira faixa sangrada em 16:11 com recorte — enquadramento, não deformação.
    expect(cta.image.width / cta.image.height).toBeCloseTo(w >= 900 ? 4 / 3 : 16 / 11, 2);
    // O arquivo servido nunca passa dos 1448px nativos da fonte.
    expect(cta.bitmap.width).toBeLessThanOrEqual(1448);
    if (w >= 900) {
      // A foto fica na metade direita da régua, inteira dentro da página.
      expect(cta.media.right).toBeLessThanOrEqual(w - cta.padding + 1);
      expect(cta.media.width).toBeGreaterThan(0.4 * w);
    } else {
      // Sangra a caixa e encosta nas duas bordas.
      expect(cta.media.x).toBe(0);
      expect(Math.abs(cta.media.width - w)).toBeLessThanOrEqual(1);
    }

    // 13) Rodapé (11): fecha a página, depois do `main`, com os destinos reais.
    const footer = await page.evaluate(() => {
      const node = document.querySelector<HTMLElement>('footer')!;
      const box = node.getBoundingClientRect();
      return {
        background: getComputedStyle(node).backgroundColor,
        lockup: Array.from(node.querySelectorAll('[class*=lockup] > *')).map((part) =>
          part.textContent!.trim(),
        ),
        top: box.top,
        last: node.nextElementSibling === null,
        afterMain: document.querySelector('main')!.nextElementSibling?.tagName,
      };
    });
    expect(footer.background).toBe('rgb(249, 245, 239)');
    expect(footer.lockup).toEqual(['NUY', 'CREATORS']);
    expect(footer.afterMain).toBe('FOOTER');
    expect(footer.last, 'nada pode vir depois do rodapé').toBe(true);

    expect(errors).toEqual([]);
  });
}

for (const { w, h } of viewports) {
  test(`evidência visual da landing em ${w}x${h}`, async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile' && w > 760,
      'Desktop sizes are covered by the chromium project.',
    );
    await page.setViewportSize({ width: w, height: h });
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    const prefix = `playwright-report/visual/proposta-c-${test.info().project.name}-${w}x${h}`;
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
  });
}
