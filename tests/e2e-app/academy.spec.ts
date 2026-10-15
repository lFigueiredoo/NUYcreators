import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { startStack, type StackHandle } from '../support/stack.mjs';

let stack: StackHandle;
const destination = 'artifacts/academy';

test.beforeAll(async () => {
  await mkdir(destination, { recursive: true });
  stack = await startStack({ academyTest: true });
});
test.afterAll(async () => {
  await stack?.close();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${stack.origin}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login')),
    page.getByRole('button', { name: /entrar/i }).click(),
  ]);
}

test('creator vê catálogo, detalhe, aula e controles privados em três tamanhos', async ({
  page,
}) => {
  await signIn(page, 'ana@nuy.test', 'senha-de-teste-123');
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${stack.origin}/app/academia`);
    await expect(
      page.getByRole('heading', { name: 'Aprender juntas transforma o que criamos.' }),
    ).toBeVisible();
    if (width < 780) {
      await page.getByRole('button', { name: 'Mais' }).click();
      await expect(page.getByRole('link', { name: 'Academia NUY' })).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      await expect(page.getByRole('link', { name: 'Academia NUY' })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /Presença com propósito/ })).toBeVisible();
    await expect(page.getByText('Rascunho interno')).toHaveCount(0);
    const catalogOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(catalogOverflow).toBe(false);
    if (width < 520) {
      const search = await page.getByRole('searchbox', { name: 'Buscar conteúdo' }).boundingBox();
      const firstCourse = await page.getByRole('link', { name: /Presença com propósito/ }).boundingBox();
      expect(search && search.y + search.height).toBeLessThan(height - 60);
      expect(firstCourse?.y).toBeLessThan(height);
    }
    await page.screenshot({
      path: `${destination}/creator-catalogo-${width}x${height}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: /Presença com propósito/ }).click();
    await expect(page.getByRole('heading', { name: 'Seu percurso' })).toBeVisible();
    await page.screenshot({
      path: `${destination}/creator-detalhe-${width}x${height}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: /A voz que é sua/ }).click();
    await expect(page.getByText('O vídeo desta aula estará disponível em breve.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Marcar como concluída' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Abrir PDF' })).toBeDisabled();
    await expect(page.getByText('Essa aula me ajudou a organizar minhas ideias.')).toBeVisible();
    await expect(page.getByText('Comentário aguardando aprovação.')).toHaveCount(0);
    await expect(page.getByText('Comentário com estado não reconhecido.')).toHaveCount(0);
    await expect(page.locator('video[src]')).toHaveCount(0);
    await page.screenshot({
      path: `${destination}/creator-aula-${width}x${height}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow).toBe(false);
  }
});

test('permissões: creator não abre Admin e visitante não abre Academia', async ({ page }) => {
  await page.goto(`${stack.origin}/app/academia`);
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, 'ana@nuy.test', 'senha-de-teste-123');
  await page.goto(`${stack.origin}/admin/academia`);
  await expect(page).toHaveURL(/\/app\?access=denied/);
  await page.goto(`${stack.origin}/admin/academia/comentarios`);
  await expect(page).toHaveURL(/\/app\?access=denied/);
  await page.goto(`${stack.origin}/admin/academia/novo`);
  await expect(page).toHaveURL(/\/app\?access=denied/);
  await page.goto(`${stack.origin}/admin/academia/categorias`);
  await expect(page).toHaveURL(/\/app\?access=denied/);
});

test('Admin cria e ordena categoria; Creator não alcança a gestão', async ({ page }) => {
  await signIn(page, 'academy-admin@nuy.test', 'senha-de-teste-academy');
  await page.goto(`${stack.origin}/admin/academia/categorias`);
  const create = page.getByRole('heading', { name: 'Nova categoria' }).locator('..');
  await create.getByRole('textbox', { name: 'Nome' }).fill('Categoria C1');
  await create.getByRole('textbox', { name: 'Slug' }).fill('categoria-c1');
  await create.getByRole('spinbutton', { name: 'Ordem' }).fill('80');
  await create.getByRole('button', { name: 'Criar categoria' }).click();
  await expect(create.getByRole('status')).toContainText('salva');
  await page.reload();
  const saved = page.getByRole('heading', { name: 'Categoria C1' }).locator('..');
  await expect(saved.getByText(/ordem 80/)).toBeVisible();
  await saved.getByRole('spinbutton', { name: 'Ordem' }).fill('7');
  await saved.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(saved.getByRole('status')).toContainText('salva');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Categoria C1' }).locator('..')
    .getByText(/ordem 7/)).toBeVisible();
});

test('busca e categoria filtram o catálogo sem mostrar rascunhos', async ({ page }) => {
  await signIn(page, 'ana@nuy.test', 'senha-de-teste-123');
  await page.goto(`${stack.origin}/app/academia`);
  await page.getByRole('searchbox', { name: 'Buscar conteúdo' }).fill('comunidade');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('link', { name: /Comunidade que cresce junto/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Presença com propósito/ })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filtrar por categoria' }).selectOption('cat-criacao');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nenhum resultado para este filtro' }),
  ).toBeVisible();
  await expect(page.getByText('Rascunho interno')).toHaveCount(0);
});

test('Admin vê gestão e editor com prévia e ações de persistência', async ({ page }) => {
  await signIn(page, 'academy-admin@nuy.test', 'senha-de-teste-academy');
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${stack.origin}/admin/academia`);
    await expect(page.getByRole('heading', { name: 'Academia NUY', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Novo treinamento' })).toBeVisible();
    await page.screenshot({
      path: `${destination}/admin-lista-${width}x${height}.png`,
      fullPage: true,
    });
    await page.goto(`${stack.origin}/admin/academia/categorias`);
    await expect(page.getByRole('heading', { name: 'Categorias', level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${destination}/admin-categorias-${width}x${height}.png`,
      fullPage: true,
    });
    await page.goto(`${stack.origin}/admin/academia/comentarios`);
    await expect(page.getByRole('heading', { name: 'Comentários', level: 1 })).toBeVisible();
    await expect(page.getByText('Aula · A voz que é sua').first()).toBeVisible();
    await expect(page.getByText(/Ana Beatriz · Visível/)).toBeVisible();
    await expect(page.getByText('Status desconhecido', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Denúncias' })).toBeVisible();
    await expect(page.getByText('Verificar o contexto deste comentário.', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${destination}/admin-comentarios-${width}x${height}.png`,
      fullPage: true,
    });
    await page.goto(`${stack.origin}/admin/academia/progresso`);
    await expect(page.getByRole('heading', { name: 'Progresso', level: 1 })).toBeVisible();
    await page.screenshot({
      path: `${destination}/admin-progresso-${width}x${height}.png`,
      fullPage: true,
    });
    await page.goto(`${stack.origin}/admin/academia`);
    await page.getByRole('link', { name: /Presença com propósito/ }).click();
    await expect(page.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue(
      'Presença com propósito',
    );
    await expect(page.locator('[data-module-id="module-historia"]')).toBeVisible();
    await expect(page.locator('[data-lesson-id="lesson-voz"]')).toBeVisible();
    await expect(page.locator('[data-material-id="material-guia"]')).toBeVisible();
    await page.goto(`${stack.origin}/admin/academia`);
    await page.getByRole('link', { name: 'Novo treinamento' }).click();
    await page.getByRole('textbox', { name: 'Título' }).fill('Treinamento em revisão');
    await page.getByRole('combobox', { name: 'Categoria' }).selectOption('cat-criacao');
    await page.getByRole('button', { name: 'Adicionar módulo' }).click();
    await page.getByRole('button', { name: 'Adicionar aula' }).click();
    await expect(page.getByText('Treinamento em revisão').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled();
    await expect(page.getByText('Salve para confirmar as alterações no servidor.')).toBeVisible();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `${destination}/admin-editor-${width}x${height}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow).toBe(false);
  }
});

test('catálogo com mais de 100 registros mantém paginação e busca global', async ({ page }) => {
  stack.stub.dataset.tables.academy_courses.push(
    ...Array.from({ length: 105 }, (_, index) => {
      const number = index + 1;
      return {
        $id: `course-extra-${number}`,
        $permissions: ['read("user:viewer-ana")'],
        slug: `treinamento-${number}`,
        title: `Treinamento ${number}`,
        summary: 'Curso de teste de paginação.',
        searchText: `Treinamento ${number} Curso de teste de paginação.`,
        description: '',
        categoryId: 'cat-criacao',
        status: 'published',
        order: number + 10,
        version: 1,
      };
    }),
  );
  await signIn(page, 'ana@nuy.test', 'senha-de-teste-123');
  await page.goto(`${stack.origin}/app/academia?pagina=5`);
  await expect(page.getByRole('link', { name: /Treinamento 105/ })).toBeVisible();
  await expect(page.getByText('Página 5')).toBeVisible();
  await page.goto(`${stack.origin}/app/academia?busca=Treinamento+105`);
  await expect(page.getByRole('link', { name: /Treinamento 105/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Treinamento 104/ })).toHaveCount(0);
  const catalogQueries = stack.stub.journal
    .filter((entry) => entry.path.endsWith('/tables/academy_courses/rows'))
    .map((entry) => decodeURIComponent(entry.search));
  expect(catalogQueries.some((query) => query.includes('searchText'))).toBe(true);
});

test('Academia V2: Admin publica, Creator conclui e comenta, equipe aprova e responde', async ({ page, browser }) => {
  await signIn(page, 'academy-admin@nuy.test', 'senha-de-teste-academy');
  await page.goto(`${stack.origin}/admin/academia/novo`);
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Formação funcional V2');
  await page.getByRole('textbox', { name: 'Slug' }).fill('formacao-funcional-v2');
  await page.getByRole('textbox', { name: 'Resumo' }).fill('Um percurso completo de teste.');
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('cat-criacao');
  await page.getByRole('button', { name: 'Adicionar módulo' }).click();
  await page.getByRole('textbox', { name: 'Nome do módulo' }).fill('Módulo de estreia');
  await page.getByRole('button', { name: 'Adicionar aula' }).click();
  await page.getByRole('textbox', { name: 'Nome da aula 1' }).fill('Aula de estreia');
  await page.getByRole('textbox', { name: 'MP4 homologado da aula 1' }).fill('v2-video');
  await page.getByRole('button', { name: 'Adicionar material' }).click();
  await page.getByRole('textbox', { name: 'Título do material 1' }).fill('Guia PDF V2');
  await page.getByRole('textbox', { name: 'Arquivo ou URL do material 1' }).fill('v2-pdf');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page).toHaveURL(/\/admin\/academia\/(?!novo$)[^/]+$/);
  const courseId = page.url().split('/').at(-1)!;
  const lesson = stack.stub.dataset.tables.academy_lessons.find((row) => row.courseId === courseId)!;
  const material = stack.stub.dataset.tables.academy_materials.find((row) => row.courseId === courseId)!;
  expect(lesson?.title).toBe('Aula de estreia');
  expect(material?.lessonId).toBe(lesson.$id);
  // O teste local emula a verificação externa de codec, AV e Storage privado.
  for (const [fileId, kind, mimeType] of [
    ['v2-video', 'video', 'video/mp4'], ['v2-pdf', 'pdf', 'application/pdf'],
  ]) stack.stub.dataset.tables.academy_media.push({
    $id: `media-${fileId}`, $permissions: [], fileId, lessonId: lesson.$id,
    kind, status: 'ready', mimeType, sizeBytes: 1024, createdBy: 'academy-admin',
    createdAt: new Date().toISOString(),
  });
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Alteração salva e confirmada.' })).toBeVisible();
  expect(stack.stub.dataset.tables.academy_courses.find((row) => row.$id === courseId)?.status)
    .toBe('published');

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const creator = await context.newPage();
  try {
    await signIn(creator, 'ana@nuy.test', 'senha-de-teste-123');
    await creator.goto(`${stack.origin}/app/academia/formacao-funcional-v2/aulas/${lesson.$id}`);
    await expect(creator.getByRole('heading', { name: 'Aula de estreia' })).toBeVisible();
    await expect(creator.getByRole('button', { name: 'Abrir PDF' })).toBeDisabled();
    await creator.getByRole('button', { name: 'Marcar como concluída' }).click();
    await expect(creator.getByRole('button', { name: 'Concluída' })).toBeVisible();
    await creator.getByRole('textbox', { name: 'Seu comentário' }).fill('Aprendi com esta aula V2.');
    await creator.getByRole('button', { name: 'Publicar comentário' }).click();
    await expect(creator.getByRole('status').filter({ hasText: 'Aguardando aprovação.' })).toBeVisible();
    await expect(creator.getByText('Aprendi com esta aula V2.')).toHaveCount(0);
    await page.goto(`${stack.origin}/admin/academia/comentarios`);
    const thread = page.locator('article').filter({ hasText: 'Aprendi com esta aula V2.' });
    await expect(thread).toBeVisible();
    await thread.getByRole('button', { name: 'Aprovar' }).click();
    await expect(thread.getByText('Visível', { exact: false })).toBeVisible();
    await thread.getByRole('textbox', { name: 'Resposta da equipe' }).fill('Equipe NUY: obrigada por participar!');
    await thread.getByRole('button', { name: 'Responder como equipe' }).click();
    const reply = page.locator('article').filter({ hasText: 'Equipe NUY: obrigada por participar!' });
    await expect(reply).toBeVisible();
    await reply.getByRole('button', { name: 'Aprovar' }).click();
    await expect(reply.getByText('Visível', { exact: false })).toBeVisible();
    await creator.reload();
    await expect(creator.getByText('Aprendi com esta aula V2.')).toBeVisible();
    await expect(creator.getByText('Equipe NUY: obrigada por participar!')).toBeVisible();
    expect(stack.stub.dataset.tables.notifications.some((row) => row.type === 'academy_reply'
      && row.userId === 'viewer-ana')).toBe(true);
  } finally { await context.close(); }
});
