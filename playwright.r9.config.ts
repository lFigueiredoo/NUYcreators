import { defineConfig, devices } from '@playwright/test';

/**
 * R9 — config de gates sobre porta própria (3124): o dev server do usuário
 * fica em :3000 e não pode ser tocado. Mesma matriz de projetos/env
 * desconectado da config principal.
 */
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3124', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  expect: { timeout: 15000 },
  webServer: {
    command: 'npx next start -p 3124',
    url: 'http://localhost:3124',
    reuseExistingServer: false,
    env: {
      APPWRITE_ENDPOINT: '',
      APPWRITE_PROJECT_ID: '',
      APPWRITE_AUTH_API_KEY: '',
      APPWRITE_API_KEY: '',
      APPWRITE_REGISTRATION_ENABLED: 'false',
      APPWRITE_FUNCTIONS_ENABLED: 'false',
    },
  },
});
