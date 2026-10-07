import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'node-appwrite';

/**
 * A regressão do defeito encontrado no staging pelo Sprint 8.
 *
 * `complete-onboarding` montava o cliente de tabelas com o endpoint INJETADO cru.
 * Nesta instalação esse valor vem em `http://`, o servidor responde 301 para
 * https e o `fetch` segue o 301 **trocando o método por GET** — comportamento da
 * especificação, não do SDK. O efeito era assimétrico e por isso invisível:
 *
 *  - `getRow` (GET) respondia 404 direitinho, então o caminho parecia vivo;
 *  - `createRow` (POST) virava LISTAGEM, com HTTP 200, e o SDK entendia sucesso;
 *  - a function devolvia `{"saved":true}` **sem ter gravado linha nenhuma**.
 *
 * Medido contra o staging: `profiles`, `users` e `social_accounts` seguiam em 0
 * depois de uma execução `completed`/200. As outras oito functions nunca tiveram
 * o defeito porque passam por `hosted()`, que já resolvia o endpoint; esta é a
 * única que monta o cliente por conta própria — e a única que não tinha teste de
 * runtime.
 *
 * O que se afirma aqui é a REGRA, não o defeito: o endpoint usado para falar com o
 * Appwrite é o RESOLVIDO, não o injetado. É o teste que faltava.
 */

const body = {
  name: 'Pessoa',
  phone: '11999999999',
  city: 'São Paulo',
  state: 'SP',
  birthDate: '2000-01-01',
  niche: 'casa',
  creatorType: 'ugc',
  instagram: '',
  tiktok: '',
  youtube: '',
  terms: 'on',
};

/** Endpoint interno em http:// — é assim que o runtime o injeta nesta instalação. */
const INJECTED = 'http://appwrite-interno:8080/v1';

const probe = vi.hoisted(() => ({ calls: [] as string[], ok: true }));

/** Importa o handler LIMPO: a resolução do endpoint é memoizada por módulo. */
async function run() {
  vi.resetModules();
  probe.calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      probe.calls.push(String(url));
      return { ok: probe.ok };
    }),
  );
  vi.stubEnv('APPWRITE_FUNCTION_API_ENDPOINT', INJECTED);
  vi.stubEnv('APPWRITE_FUNCTION_PROJECT_ID', 'isolated-test');
  vi.stubEnv('NUY_TERMS_VERSION', 'test-v1');
  vi.stubEnv('NUY_MINIMUM_AGE', '18');

  const handler = (await import('../../functions/complete-onboarding/main')).default;
  const endpoints: string[] = [];
  const capture = (client: Client) => {
    endpoints.push(client.config.endpoint);
    return {} as never;
  };
  await handler(
    {
      req: {
        headers: { 'x-appwrite-user-jwt': 'test-jwt', 'x-appwrite-key': 'test-key' },
        bodyJson: body,
      },
      res: { json: (data: unknown, status?: number) => ({ data, status }) },
      error: vi.fn(),
    } as never,
    {
      account: (client: Client) => {
        capture(client);
        return { get: async () => ({ $id: 'trusted-user', emailVerification: true }) } as never;
      },
      tables: (client: Client) => {
        capture(client);
        return {
          getRow: async ({ tableId }: { tableId: string }) =>
            tableId === 'users'
              ? { authUserId: 'trusted-user', status: 'active' }
              : { userId: 'trusted-user' },
          createRow: async () => ({}),
          updateRow: async () => ({}),
          deleteRow: async () => ({}),
        } as never;
      },
    } as never,
  );
  return endpoints;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('fala com o Appwrite pelo endpoint RESOLVIDO, nunca pelo injetado em http', async () => {
  const endpoints = await run();

  // A sonda foi feita no host do próprio runtime, por https.
  expect(probe.calls).toEqual(['https://appwrite-interno:8080/v1/health/version']);
  expect(endpoints.length).toBeGreaterThan(0);
  // Nenhum cliente pode ter ficado no http:// injetado: é ele que transformava
  // escrita em leitura silenciosa.
  for (const endpoint of endpoints) expect(endpoint).toBe('https://appwrite-interno:8080/v1');
});

it('mantém o endpoint injetado quando o https não atende — sem inventar TLS', async () => {
  probe.ok = false;
  try {
    const endpoints = await run();
    for (const endpoint of endpoints) expect(endpoint).toBe(INJECTED);
  } finally {
    probe.ok = true;
  }
});
