import { spawnSync } from 'node:child_process';
import { verifyIntegrationIdentity, IdentityError } from '../../infra/appwrite/identity';
try {
  await verifyIntegrationIdentity(process.env);
  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.integration.config.ts'],
    { stdio: 'inherit', env: process.env },
  );
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(
    `INTEGRATION BLOCKED — ${error instanceof IdentityError ? error.message : 'Verifique Project ID esperado e ambiente seguro; nenhuma credencial será exibida.'}`,
  );
  process.exitCode = 1;
}
