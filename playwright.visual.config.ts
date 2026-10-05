import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Separate port preserves the user's running development server.
// Uses the same disconnected production-server environment as existing E2E tests.
export default defineConfig({
  ...base,
  workers: 2,
  use: { ...base.use, baseURL: 'http://localhost:3100' },
  webServer: {
    ...base.webServer,
    command: 'npm run start -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
  },
});
