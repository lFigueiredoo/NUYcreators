import { defineConfig } from '@playwright/test';

/**
 * QA da área autenticada.
 *
 * Diferente da configuração pública (`playwright.config.ts`, servidor
 * desconectado), aqui o teste sobe a pilha inteira: stub de Appwrite + build de
 * produção + proxy HTTPS. É o único jeito de exercitar login real, cookie de
 * sessão real e as consultas escopadas por usuária — sem inventar dado.
 *
 * A pilha é levantada dentro do próprio teste (`tests/support/stack.mjs`)
 * porque o endereço é HTTPS com certificado local: o `webServer` do Playwright
 * não consegue checar prontidão nesse cenário.
 */
export default defineConfig({
  testDir: './tests/e2e-app',
  timeout: 120_000,
  expect: { timeout: 15_000 },
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
