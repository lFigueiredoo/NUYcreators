import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/preflight.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 180000,
  },
});
