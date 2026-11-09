import { expect, test } from '@playwright/test';

const creators = [
  '@thay_emilyane',
  '@jusouza_blog',
  '@ledianemartins',
  '@larissacamposs1',
  '@mariannemarie94',
  '@julianavilargh',
  '@bylaricavalcanti',
];

test('a Editorial mantém a composição aprovada em desktop e celular', async ({ page }) => {
  const mobile = test.info().project.name === 'mobile';
  await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const hero = page.locator('section[aria-labelledby="editorial-hero-title"]');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(/Bem vindos ao\s*NUY Creators/);
  await expect(hero.getByText('COMUNIDADE NUY CREATORS')).toBeVisible();
  await expect(hero.getByRole('link', { name: 'ACESSAR O NUY CREATORS' })).toHaveAttribute(
    'href',
    '/app',
  );
  const headline = (await hero.getByRole('heading', { level: 1 }).boundingBox())!;
  const products = (await hero.locator('figure').boundingBox())!;
  if (mobile) {
    expect(products.y).toBeGreaterThan(headline.y + headline.height);
  } else {
    expect(products.x).toBeGreaterThanOrEqual(headline.x + headline.width - 1);
    expect(products.y).toBeLessThan(headline.y + headline.height);
  }

  const community = page.locator('#comunidade');
  await expect(community.getByRole('heading', { level: 2 })).toHaveText(
    /Feito com quem\s*cuida da casa\./,
  );
  await expect(community.locator('figcaption')).toHaveText(creators);
  const carousel = community.getByRole('group', { name: 'Fotos das criadoras NUY' });
  const positions = await carousel.evaluate((track) => {
    const view = track.getBoundingClientRect();
    const slides = [...track.querySelectorAll('figure')].map((slide) =>
      slide.getBoundingClientRect(),
    );
    return {
      whole: slides.filter((slide) => slide.left >= view.left - 1 && slide.right <= view.right + 1)
        .length,
      nextPeek: (view.right - slides[1].left) / slides[1].width,
    };
  });
  expect(positions.whole).toBe(mobile ? 1 : 4);
  if (mobile) {
    expect(positions.nextPeek).toBeGreaterThan(0.08);
    expect(positions.nextPeek).toBeLessThan(0.23);
  }

  const about = page.locator('#o-que-e');
  await expect(about.getByRole('heading', { level: 3 })).toHaveText([
    'Crie conteúdo',
    'Ganhe reconhecimento',
    'Viva experiências NUY',
  ]);
  await expect(about.locator('figure img')).toHaveAttribute('src', /cena-casa\.webp/);

  const steps = page.locator('#como-participar');
  await expect(steps.locator('ol li h3')).toHaveText([
    'Crie sua conta',
    'Complete seu perfil',
    'Participe dos desafios',
    'Compartilhe seu conteúdo',
    'Ganhe pontos e recompensas',
  ]);
  const boxes = await steps.locator('ol li').evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect();
      return { x: Math.round(box.x), y: Math.round(box.y) };
    }),
  );
  expect(new Set(boxes.map((box) => box.x)).size).toBe(mobile ? 1 : 5);
  expect(new Set(boxes.map((box) => box.y)).size).toBe(mobile ? 5 : 1);

  const invitation = page.locator('#cta-final');
  await expect(invitation).toHaveCSS('background-color', 'rgb(8, 43, 85)');
  await expect(invitation.getByRole('link', { name: 'Quero fazer parte' })).toHaveAttribute(
    'href',
    '/cadastro',
  );
  expect(errors).toEqual([]);
});
