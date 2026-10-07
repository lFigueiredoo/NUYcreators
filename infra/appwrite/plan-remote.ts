/**
 * `npm run infra:plan:remote` — plano contra o projeto vivo (Sprint 6A).
 *
 * Complementa o `infra:plan`, que continua offline, sem credenciais e sem
 * requisições: aquele mostra o manifesto, este mostra o que o projeto vivo tem
 * de diferente dele. Este arquivo só lê — nada é criado, alterado ou apagado, e
 * nenhuma credencial, corpo de resposta ou cabeçalho é impresso.
 *
 * Sai com código 1 quando o plano não está limpo (divergência de segurança,
 * divergência imutável ou escopo faltante), para que o apply nunca seja
 * encadeado por engano.
 */
import { Client, Functions, Storage, TablesDB, Teams } from 'node-appwrite';
import { parseEnvironment } from '../../src/lib/env/schema';
import { assertDedicatedProject } from './safety';
import { verifyReadOnlyIdentity, IdentityError } from './identity';
import { buildPlan, formatPlan, summarize } from './plan';

export async function runRemotePlan(env: NodeJS.ProcessEnv) {
  assertDedicatedProject(env); // Antes de qualquer requisição.
  const identity = await verifyReadOnlyIdentity(env);
  const parsed = parseEnvironment(env);
  if (!parsed.APPWRITE_ENDPOINT || !parsed.APPWRITE_PROJECT_ID || !env.APPWRITE_API_KEY)
    throw new IdentityError(
      'Configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY no ambiente seguro.',
    );
  const client = new Client()
    .setEndpoint(parsed.APPWRITE_ENDPOINT)
    .setProject(parsed.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  const plan = await buildPlan(
    {
      db: new TablesDB(client),
      storage: new Storage(client),
      teams: new Teams(client),
      functions: new Functions(client),
    },
    parsed.APPWRITE_DATABASE_ID,
    identity,
  );
  // Estado da identidade, sem endpoint, projeto ou chave.
  console.log(`Identidade local: ${identity.marker}\n`);
  console.log(formatPlan(plan));
  return { identity, plan, summary: summarize(plan) };
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('infra/appwrite/plan-remote.ts');
if (isDirectRun) {
  try {
    const { summary } = await runRemotePlan(process.env);
    if (summary.blocked || summary.securityDrift || summary.immutableDrift) {
      console.error(
        '\nPlano não limpo: apply bloqueado enquanto houver divergência de segurança, divergência imutável ou escopo faltante.',
      );
      process.exitCode = 1;
    } else {
      console.log('\nPlano limpo: nenhuma divergência de segurança ou de schema imutável.');
    }
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    if (typeof code === 'number') {
      // Erro do SDK: pode carregar corpo e cabeçalhos. Só o identificador sai.
      const type = (error as { type?: unknown })?.type;
      console.error(
        `Plano remoto interrompido [HTTP ${code}${typeof type === 'string' ? ` ${type}` : ''}]. Nenhuma credencial/response foi registrada.`,
      );
    } else {
      // Erro dos nossos guardas: escrito para o operador ler e já sanitizado.
      console.error((error as Error)?.message ?? 'Plano remoto interrompido.');
    }
    process.exitCode = 1;
  }
}
