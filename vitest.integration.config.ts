import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Mesmo motivo do config de unidade: `server-only` lança fora do Next. A
 * fronteira de servidor é cobrada no `next build`, não aqui.
 */
const serverOnly = fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url));
/** Mesmo `@/*` do tsconfig, para o teste medir o código do app como ele é. */
const root = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: { alias: { 'server-only': serverOnly, '@': root } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/preflight.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 180000,
  },
});
