/**
 * Pilha CONECTADA: o build de produção falando com o Appwrite de STAGING.
 *
 * É o que o QA conectado (`tests/e2e-staging/`) sobe para exercitar o caminho
 * real do produto — login por sessão, leitura escopada por usuária e escrita
 * mediada pelo runtime das Functions. Diferente da pilha de stub
 * (`tests/support/stack.mjs`), aqui nada é simulado; por isso o processo da
 * aplicação recebe só o que ele usa:
 *
 *  - endpoint, projeto, banco, equipe e a chave SSR (`APPWRITE_AUTH_API_KEY`,
 *    já presente no `.env.local` de quem roda) + `APPWRITE_FUNCTIONS_ENABLED`;
 *  - a chave de OPERAÇÃO entra VAZIA de propósito: definida como string vazia,
 *    ela tem precedência sobre qualquer `.env.local` e o QA mede o caminho da
 *    SESSÃO, não o da chave;
 *  - `APPWRITE_TEST_API_KEY` e `APPWRITE_API_KEY` também entram vazias: quem
 *    cria e apaga fixture é o processo do Playwright, nunca o da aplicação.
 *
 * O proxy HTTPS existe pelo mesmo motivo da pilha de stub: o produto exige
 * `APP_URL` HTTPS em produção conectada e confere a origem das server actions.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProxy, waitFor } from './stack.mjs';

/** CLI do Next direto no Node: sem shell, `kill()` derruba o processo de verdade. */
const NEXT_CLI = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
);

const PROXY_PORT = Number(process.env.STAGING_PROXY_PORT ?? 3131);
const APP_PORT = Number(process.env.STAGING_APP_PORT ?? 3132);
export const STAGING_ORIGIN = `https://localhost:${PROXY_PORT}`;

const REQUIRED = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_EXPECTED_PROJECT_ID',
  'APPWRITE_AUTH_API_KEY',
];

/** Variável de ambiente de staging, sem valor padrão: nome ausente é erro claro. */
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`QA conectado exige ${name} no ambiente — não há fallback.`);
  return value;
}

/**
 * Sobe `next start` conectado ao staging e o proxy HTTPS na frente.
 *
 * Devolve o terminador TLS junto com o processo: `close()` derruba os dois, e o
 * chamador não precisa saber que a aplicação roda em HTTP por baixo.
 */
export async function startConnectedStack() {
  for (const name of REQUIRED) required(name);

  const app = spawn(
    process.execPath,
    [NEXT_CLI, 'start', '-p', String(APP_PORT), '-H', '127.0.0.1'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_ENV: 'production',
        PORT: String(APP_PORT),
        APP_URL: STAGING_ORIGIN,
        APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
        APPWRITE_EXPECTED_PROJECT_ID: process.env.APPWRITE_EXPECTED_PROJECT_ID,
        APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID ?? 'nuy-creators',
        APPWRITE_ADMIN_TEAM_ID: process.env.APPWRITE_ADMIN_TEAM_ID ?? 'nuy-admins',
        APPWRITE_AUTH_API_KEY: process.env.APPWRITE_AUTH_API_KEY,
        // Operação por FUNCTION, com a sessão: é o caminho que este QA mede.
        APPWRITE_FUNCTIONS_ENABLED: 'true',
        APPWRITE_TRANSACTIONS_VERIFIED: 'true',
        AUTH_RATE_LIMIT_VERIFIED: 'true',
        APPWRITE_REGISTRATION_ENABLED: 'false',
        // Vazias DE PROPÓSITO (ver o cabeçalho): definidas, têm precedência sobre
        // o `.env.local` e não deixam a chave de operação nem a de teste entrarem
        // no processo da aplicação.
        APPWRITE_OPS_API_KEY: '',
        APPWRITE_API_KEY: '',
        APPWRITE_TEST_API_KEY: '',
      },
    },
  );
  app.stdout.on('data', (chunk) => process.stdout.write(`[staging-app] ${chunk}`));
  app.stderr.on('data', (chunk) => process.stderr.write(`[staging-app] ${chunk}`));

  const ready = await waitFor(`http://127.0.0.1:${APP_PORT}/login`, 120);
  if (!ready) {
    app.kill();
    throw new Error('A aplicação conectada não subiu a tempo.');
  }

  const proxyServer = await startProxy({ proxyPort: PROXY_PORT, appPort: APP_PORT });

  return {
    app,
    origin: STAGING_ORIGIN,
    close: async () => {
      await proxyServer.close();
      app.kill();
    },
  };
}
