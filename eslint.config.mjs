import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
    // Bundles gerados por `scripts/build-functions.mjs` (esbuild). O fonte é
    // `functions/<id>/main.ts`; o `src/main.js` é saída, e lintar saída de
    // bundler só produz ruído de import renomeado (`Query3`, `Role2`).
    'functions/*/src/**',
  ]),
]);
