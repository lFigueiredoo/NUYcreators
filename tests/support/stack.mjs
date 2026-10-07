/**
 * Pilha de teste: stub de Appwrite + `next start` + proxy HTTPS.
 *
 * O produto exige `APP_URL` HTTPS em produção conectada e confere a origem dos
 * server actions contra ela, então a captura autenticada precisa de HTTPS de
 * ponta a ponta. O proxy mantém `Host`/`Origin` coerentes com `APP_URL` — o
 * Next continua rodando em HTTP na porta interna, como em qualquer deploy
 * atrás de um terminador TLS.
 *
 * Uso: `node tests/support/stack.mjs` (lê PORT/APP_PORT/STUB_PORT do ambiente).
 */
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCertificate } from './certs.mjs';
import { startStub } from './appwrite-stub/server.mjs';

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

const PROXY_PORT = Number(process.env.PORT ?? 3126);
const APP_PORT = Number(process.env.APP_PORT ?? 3127);
const STUB_PORT = Number(process.env.STUB_PORT ?? 3210);
export const TEST_ORIGIN = `https://localhost:${PROXY_PORT}`;

/** Encaminha a requisição preservando Host/Origin e o corpo, sem bufferizar. */
function proxy(request, response, targetPort) {
  const forwarded = httpRequest(
    {
      host: '127.0.0.1',
      port: targetPort,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': request.headers.host ?? `localhost:${PROXY_PORT}`,
      },
    },
    (upstream) => {
      response.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(response);
    },
  );
  forwarded.on('error', () => {
    // Um stream cortado no meio (navegação abortada, dev server reiniciando) não
    // pode receber 502 depois que o cabeçalho já saiu: só derruba a resposta.
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.writeHead(502, { 'content-type': 'text/plain' });
    response.end('upstream indisponível');
  });
  request.pipe(forwarded);
}

/** Espera a porta responder abaixo de 5xx — usado também pela pilha conectada. */
export async function waitFor(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return true;
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Proxy HTTPS na porta pedida, encaminhando para a porta interna do Next.
 *
 * Exportado porque o QA CONECTADO (`tests/e2e-staging/`) precisa do mesmo
 * terminador TLS: o produto exige `APP_URL` HTTPS e confere a origem das server
 * actions, e o proxy mantém `Host`/`Origin` coerentes com a origem pública.
 */
export async function startProxy({ proxyPort, appPort }) {
  const server = createHttpsServer(readCertificate(), (request, response) =>
    proxy(request, response, appPort),
  );
  await new Promise((resolve) => server.listen(proxyPort, resolve));
  return { close: () => new Promise((resolve) => server.close(resolve)) };
}

export async function startStack({ startApp = true } = {}) {
  const stub = await startStub({ port: STUB_PORT });

  let app = null;
  if (startApp) {
    app = spawn(process.execPath, [NEXT_CLI, 'start', '-p', String(APP_PORT), '-H', '127.0.0.1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(APP_PORT),
        APP_URL: TEST_ORIGIN,
        APPWRITE_ENDPOINT: stub.endpoint,
        APPWRITE_PROJECT_ID: 'nuy-stub',
        APPWRITE_EXPECTED_PROJECT_ID: 'nuy-stub',
        APPWRITE_AUTH_API_KEY: 'stub-auth-key',
        // Vazio DE PROPÓSITO: o QA da área autenticada mede o estado sem chave
        // de operação (telas dizem o estado real em vez de gravar). Definida
        // como string vazia, ela tem precedência sobre o `.env.local` de quem
        // roda — sem isto, ter a chave no ambiente mudaria o que o teste mede.
        APPWRITE_OPS_API_KEY: '',
        APPWRITE_FUNCTIONS_ENABLED: 'false',
        APPWRITE_TRANSACTIONS_VERIFIED: 'false',
        APPWRITE_REGISTRATION_ENABLED: 'false',
        AUTH_RATE_LIMIT_VERIFIED: 'true',
        // Certificado self-signed do stub: só o servidor de teste o vê.
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
      },
    });
    app.stdout.on('data', (chunk) => process.stdout.write(`[app] ${chunk}`));
    app.stderr.on('data', (chunk) => process.stderr.write(`[app] ${chunk}`));
    const ready = await waitFor(`http://127.0.0.1:${APP_PORT}/login`);
    if (!ready) throw new Error('A aplicação não subiu a tempo.');
  }

  const proxyServer = await startProxy({ proxyPort: PROXY_PORT, appPort: APP_PORT });

  return {
    stub,
    app,
    origin: TEST_ORIGIN,
    close: async () => {
      await proxyServer.close();
      if (app) app.kill();
      await stub.close();
    },
  };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('tests/support/stack.mjs');
if (isDirectRun) {
  const stack = await startStack();
  console.log(`[stack] aplicação autenticada em ${stack.origin}`);
  console.log(`[stack] stub: ${stack.stub.endpoint}`);
  process.on('SIGINT', async () => {
    await stack.close();
    process.exit(0);
  });
}
