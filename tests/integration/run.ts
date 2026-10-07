import { spawnSync } from 'node:child_process';
import { verifyProbeIdentity, IdentityError } from '../../infra/appwrite/identity';
try {
  const report = await verifyProbeIdentity(process.env);
  // A postura da chave SSR é medida e mostrada aqui, porque ela não bloqueia
  // probes — bloqueia o app em runtime. Silêncio aqui viraria surpresa depois.
  console.log(
    `Probes: marker ${report.marker}, chave de teste ${report.testKey}, chave SSR ${report.authKey}, sessions.write ${report.sessionsWrite}.`,
  );
  if (report.authKey !== 'accepted-with-read-denied' || report.sessionsWrite !== 'authorized')
    console.log(
      'AVISO: a chave SSR ainda não está no perfil mínimo — qualificação do app (verifyIntegrationIdentity) continua bloqueada até reduzi-la a sessions.write.',
    );
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
