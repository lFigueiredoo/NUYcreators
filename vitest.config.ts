import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * `server-only` é um marcador do Next: em Node puro ele lança. Nos testes de
 * unidade ele é resolvido para o módulo vazio — a fronteira continua cobrada
 * pelo `next build` (marcador real) e pelo portão de arquivos do /app.
 */
const serverOnly = fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url));
/** Mesmo `@/*` do tsconfig: sem isso o teste importaria o módulo por caminho relativo. */
const root = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: { alias: { 'server-only': serverOnly, '@': root } },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
