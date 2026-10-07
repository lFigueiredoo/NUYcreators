import { defineConfig } from '@playwright/test';

/**
 * QA CONECTADO — o build de produção contra o Appwrite de STAGING.
 *
 * Diferente das duas suítes anteriores, aqui não há stub: a criadora entra com
 * sessão real, o Appwrite injeta o JWT nas execuções e as operações passam pelo
 * runtime das Functions publicadas. É a única suíte que prova o percurso da
 * TELA até a gravação — as outras provam o núcleo (unidade) e o runtime
 * (integração), cada uma no seu nível.
 *
 * Um worker só: o fluxo é uma jornada contínua (entrar → enviar → aprovar →
 * pontuar → resgatar) e as fixtures são cunhadas com um `runId` que a limpeza
 * usa como fronteira.
 */
export default defineConfig({
  testDir: './tests/e2e-staging',
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
});
