import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  expect: { timeout: 15000 },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    // Always use the controlled disconnected server, never a user's connected dev instance.
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
