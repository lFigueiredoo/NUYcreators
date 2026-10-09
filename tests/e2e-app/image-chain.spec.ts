import { expect, test, type Locator, type Page } from '@playwright/test';
import { startStack, type StackHandle } from '../support/stack.mjs';

/**
 * A cadeia da imagem de catálogo, do servidor até a tela da creator.
 *
 * O que este arquivo prova, e por que aqui:
 *
 *  · a LINHA guarda um id e o servidor busca os BYTES com a chave de mídia — o
 *    navegador nunca fala com o Appwrite (o stub recusa quem não apresenta chave,
 *    então passar sessão no lugar dela apareceria como falha);
 *  · a creator vê a imagem no cartão do desafio, no detalhe e no cartão da
 *    recompensa;
 *  · sem imagem gravada, ou com o arquivo indisponível, ela vê a CAPA INSTITUCIONAL
 *    da NUY — caixa inteira, cartão inteiro, nunca ícone de imagem quebrada;
 *  · a rota não é oráculo de leitura do bucket: id que nenhuma linha referencia
 *    não é servido, mesmo existindo no bucket e mesmo com sessão válida.
 *
 * O que este arquivo NÃO prova (e não pode, sem as chaves reais): escolher um
 * arquivo no /admin, salvar, gravar a linha e ver o id persistido. Isso depende da
 * chave de operação e do envio real ao Storage — está no relatório como pendente.
 */
const ANA = { email: 'ana@nuy.test', password: 'senha-de-teste-123' };
const CAPA_DESAFIO = '/app/midia/zzcapa00001desafio';
const CAPA_RECOMPENSA = '/app/midia/zzcapa00002recompensa';
const CAPA_SEM_DONO = 'zzcapa00003semdono';

let stack: StackHandle;

test.beforeAll(async () => {
  stack = await startStack();
});

test.afterAll(async () => {
  await stack?.close();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${stack.origin}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
}

/**
 * Onde a mídia do cartão vive — a moldura compartilhada, não a variante.
 *
 * Os dois cartões usam o mesmo `CardMedia`; o que muda de um para o outro é só
 * a classe de variante (`.challengeMedia` no desafio, `.rewardMedia` na
 * vitrine). Mirar na variante amarrava o teste a um dos dois desenhos — a
 * moldura base é que é o contrato.
 */
function media(card: Locator) {
  return card.locator('[class*="cardMedia"]');
}

/**
 * A lista de desafios é por ABA, e a aba vem da participação real: a Ana tem
 * envio aprovado no Reels (Concluídos) e pendente no Carrossel (Em análise).
 * Ir pela aba padrão não acharia nenhum dos dois — e um `hasText` que não acha
 * nada passa por vacuidade se a assertiva for negativa.
 */
async function openChallengeList(page: Page, tab: 'available' | 'joined' | 'in_review' | 'done') {
  await page.goto(`${stack.origin}/app/desafios?aba=${tab}`, { waitUntil: 'domcontentloaded' });
}

/** A imagem só conta depois de decodificada: `naturalWidth` é o que prova bytes vivos. */
async function expectLoaded(image: Locator) {
  await expect
    .poll(async () => image.evaluate((node) => (node as HTMLImageElement).naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
}

test('o desafio com capa mostra a imagem, e o navegador nunca fala com o Appwrite', async ({
  page,
}) => {
  const appwriteHost = new URL(stack.stub.endpoint).host;
  const external: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(appwriteHost)) external.push(request.url());
  });

  await signIn(page, ANA.email, ANA.password);
  await openChallengeList(page, 'done');

  const card = page.locator('article', { hasText: 'Reels de verão NUY' }).first();
  const image = media(card).locator(`img[src="${CAPA_DESAFIO}"]`);
  await expect(image).toHaveCount(1);
  await expectLoaded(image);

  // Nenhuma requisição do navegador vai ao Appwrite — nem de imagem, nem de nada.
  expect(external).toEqual([]);

  // E o servidor buscou os bytes COM CHAVE: se tivesse usado a sessão da creator,
  // o stub teria recusado e a imagem não estaria carregada acima.
  const served = stack.stub.journal.filter(
    (entry) => entry.path.includes('/storage/buckets/') && entry.path.endsWith('/view'),
  );
  expect(served.length).toBeGreaterThan(0);
  expect(served.every((entry) => entry.admin)).toBe(true);
});

test('o detalhe do desafio mostra a mesma capa, sem estourar a largura', async ({ page }) => {
  await signIn(page, ANA.email, ANA.password);
  await page.goto(`${stack.origin}/app/desafios/reels-de-verao-nuy`, {
    waitUntil: 'domcontentloaded',
  });

  const hero = page.locator(`img[src="${CAPA_DESAFIO}"]`).first();
  await expect(hero).toHaveCount(1);
  await expectLoaded(hero);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await hero.boundingBox();
    expect(box, `sem caixa em ${width}`).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeGreaterThan(0);
  }
});

test('a recompensa com capa mostra a imagem', async ({ page }) => {
  await signIn(page, ANA.email, ANA.password);
  await page.goto(`${stack.origin}/app/recompensas`, { waitUntil: 'domcontentloaded' });

  const card = page.locator('article', { hasText: 'Kit NUY Skincare' }).first();
  const image = media(card).locator(`img[src="${CAPA_RECOMPENSA}"]`);
  await expect(image).toHaveCount(1);
  await expectLoaded(image);
});

test('sem imagem gravada, a caixa mostra a capa institucional — e nenhum img quebrado', async ({
  page,
}) => {
  await signIn(page, ANA.email, ANA.password);
  await openChallengeList(page, 'in_review');

  const card = page.locator('article', { hasText: 'Carrossel de rotina' }).first();
  await expect(card).toBeVisible();
  await expect(media(card).locator('img')).toHaveCount(0);
  // A capa da marca no lugar do vazio: a linha não tem imagem e a caixa não fica
  // em branco nem com ícone de imagem quebrada.
  await expect(media(card).getByText('NUY Creators')).toBeVisible();
  // E o cartão segue inteiro: título e ação continuam legíveis e clicáveis.
  await expect(card.getByRole('heading', { name: 'Carrossel de rotina' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Ver envio' })).toBeVisible();
});

test('arquivo indisponível cai no MESMO desenho: capa institucional, não ícone quebrado', async ({
  page,
}) => {
  await signIn(page, ANA.email, ANA.password);
  // A linha aponta para um id; o arquivo é que não vem. É o caso real de arquivo
  // removido do bucket com a linha ainda apontando para ele.
  await page.route('**/app/midia/**', (route) => route.fulfill({ status: 404, body: '' }));
  await openChallengeList(page, 'done');

  const card = page.locator('article', { hasText: 'Reels de verão NUY' }).first();
  await expect(card).toBeVisible();
  await expect(media(card).locator('img')).toHaveCount(0);
  // O MESMO desenho do caso anterior — a falha de entrega troca a foto pela capa
  // da marca, e o resto do cartão não sente.
  await expect(media(card).getByText('NUY Creators')).toBeVisible();
  await expect(card.getByRole('heading', { name: 'Reels de verão NUY' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Ver desafio' })).toBeVisible();
});

test('a rota recusa id que o catálogo não referencia, mesmo existindo no bucket', async ({
  page,
}) => {
  await signIn(page, ANA.email, ANA.password);

  const semDono = await page.request.get(`${stack.origin}/app/midia/${CAPA_SEM_DONO}`);
  expect(semDono.status()).toBe(404);

  // O mesmo bucket, a mesma chave, a mesma sessão: o que muda é haver linha
  // apontando para o arquivo.
  const referenciado = await page.request.get(`${stack.origin}${CAPA_DESAFIO}`);
  expect(referenciado.status()).toBe(200);
  expect(referenciado.headers()['content-type']).toContain('image/png');
  expect((await referenciado.body()).byteLength).toBeGreaterThan(0);
  expect(referenciado.headers()['cache-control']).toContain('private');
});

test('a rota recusa quem não tem sessão, e id fora do padrão nem chega à consulta', async ({
  request,
}) => {
  const semSessao = await request.get(`${stack.origin}${CAPA_DESAFIO}`);
  expect([401, 404]).toContain(semSessao.status());

  const invalido = await request.get(`${stack.origin}/app/midia/nao-e-um-id-de-arquivo`);
  expect(invalido.status()).toBe(404);
  const consultou = stack.stub.journal.filter((entry) => entry.search.includes('nao-e-um-id'));
  expect(consultou).toEqual([]);
});
