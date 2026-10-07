/**
 * `npm run infra:deploy -- <function-id> [...]` — publicação progressiva (Sprint 6C).
 *
 * Publica UMA function por vez, no vocabulário do manifesto: empacota o bundle
 * já construído (`scripts/build-functions.mjs`) junto de `package.json` e
 * `package-lock.json`, sobe o `tar.gz` para o Appwrite e **espera** o build
 * terminar. Só depois de `ready` a function é ativada.
 *
 * Publicar é publicar CÓDIGO. Quem pode executar, se o container está habilitado
 * e quais escopos a chave dinâmica recebe vêm do MANIFESTO e são escritos pelo
 * `infra:apply`; aqui só se CONFERE que o servidor devolve exatamente isso. Um
 * `execute` a mais depois do deploy é alteração de acesso que ninguém pediu, e
 * a publicação para.
 *
 * O que este script NÃO faz: criar ou alterar o container, escrever agenda, ou
 * imprimir credencial.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Functions } from 'node-appwrite';
// `InputFile` não sai do índice do pacote nesta versão do SDK: mora no subpath
// `node-appwrite/file` (conferido no campo `exports` do pacote).
import { InputFile } from 'node-appwrite/file';
import { assertDedicatedProject } from './safety';
import { IdentityError, verifyReadOnlyIdentity } from './identity';
import { executeRoles, functionDefinitions } from './schema';
import { sortedEqual } from './plan';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Arquivos do pacote. `src/main.js` é o bundle; os dois JSON deixam o `npm ci`
 * rodar. Os nomes são escritos com BARRA, nunca com `join`: no Windows o `join`
 * produz `src\main.js`, e o tar do GNU grava esse nome literalmente. O builder
 * do Appwrite é Linux, onde `\` é caractere comum de nome de arquivo — então o
 * tar extraía um arquivo chamado `src\main.js` e o entrypoint `src/main.js`
 * não existia: "Failed to load entrypoint, file src/main.js does not exist."
 * Medido nesta rodada listando o próprio pacote (`tar -tzf`).
 */
const SHIPPED = ['package.json', 'package-lock.json', 'src/main.js'];

const POLL_MS = 5000;
const TIMEOUT_MS = 8 * 60 * 1000;

export type DeploymentReport = {
  functionId: string;
  deploymentId: string;
  status: string;
  bytes: number;
  enabled: boolean;
  execute: string[];
};

function requested(argv: string[]): string[] {
  const ids = argv.filter((argument) => !argument.startsWith('-'));
  const known = new Set(functionDefinitions.map((definition) => definition.id));
  if (!ids.length)
    throw new IdentityError(
      `Informe as functions a publicar. Conhecidas: ${[...known].join(', ')}.`,
    );
  for (const id of ids)
    if (!known.has(id)) throw new IdentityError(`Function fora do manifesto: ${id}.`);
  return ids;
}

async function packageFunction(
  id: string,
  workdir: string,
): Promise<{ path: string; bytes: number }> {
  const dir = resolve(root, 'functions', id);
  for (const file of SHIPPED)
    if (!existsSync(join(dir, file)))
      throw new IdentityError(
        `Artefato ausente em functions/${id}: ${file}. Rode \`node scripts/build-functions.mjs\` antes de publicar.`,
      );
  const path = join(workdir, `${id}.tar.gz`);
  // O destino vai RELATIVO e com `cwd` no diretório da function: o tar do GNU,
  // no Windows, lê `C:` de um caminho absoluto como host remoto e falha com
  // "Cannot connect to C:" — medido nesta rodada. Relativo não tem dois-pontos e
  // funciona igual no GNU tar e no bsdtar. A raiz do pacote continua sendo o
  // diretório da function, então os arquivos ficam direto na raiz do tar, como o
  // Appwrite espera.
  const destination = relative(dir, path).split(sep).join('/');
  execFileSync('tar', ['-czf', destination, ...SHIPPED], { cwd: dir, stdio: 'pipe' });
  // O que o tar REALMENTE gravou, lido de volta do arquivo: nome de membro
  // errado só apareceria como "Failed to load entrypoint" depois do upload.
  const members = execFileSync('tar', ['-tzf', destination], { cwd: dir, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const missing = SHIPPED.filter((file) => !members.includes(file));
  if (missing.length)
    throw new IdentityError(
      `Pacote de ${id} não contém ${missing.join(', ')} (gravado: ${members.join(', ')}). ` +
        'O builder é Linux: nome de membro precisa de barra, não de barra invertida.',
    );
  return { path, bytes: statSync(path).size };
}

async function waitForBuild(
  functions: Functions,
  functionId: string,
  deploymentId: string,
): Promise<string> {
  const started = Date.now();
  for (;;) {
    const deployment = await functions.getDeployment({ functionId, deploymentId });
    if (deployment.status === 'ready') return deployment.status;
    if (deployment.status === 'failed') return deployment.status;
    if (Date.now() - started > TIMEOUT_MS) return `timeout:${deployment.status}`;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, POLL_MS));
  }
}

export async function deployFunctions(env: NodeJS.ProcessEnv, ids: string[]) {
  assertDedicatedProject(env);
  const identity = await verifyReadOnlyIdentity(env);
  if (identity.marker !== 'verified')
    throw new IdentityError('Publicação exige marker remoto válido.');
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT!)
    .setProject(env.APPWRITE_PROJECT_ID!)
    .setKey(env.APPWRITE_API_KEY!);
  const functions = new Functions(client);
  const workdir = await mkdtemp(join(tmpdir(), 'nuy-deploy-'));
  const reports: DeploymentReport[] = [];
  try {
    for (const id of ids) {
      console.log(`\n== ${id} ==`);
      const pkg = await packageFunction(id, workdir);
      console.log(`pacote: ${pkg.bytes} bytes`);
      const deployment = await functions.createDeployment({
        functionId: id,
        code: InputFile.fromPath(pkg.path, `${id}.tar.gz`),
        // Ativação automática: o build acabou de passar; sem isso o container
        // continuaria servindo o deployment anterior (ou nenhum).
        activate: true,
      });
      console.log(`deployment: ${deployment.$id}  status inicial: ${deployment.status}`);
      const status = await waitForBuild(functions, id, deployment.$id);
      const current = await functions.get({ functionId: id });
      const report: DeploymentReport = {
        functionId: id,
        deploymentId: deployment.$id,
        status,
        bytes: pkg.bytes,
        enabled: current.enabled,
        execute: current.execute,
      };
      reports.push(report);
      console.log(
        `status: ${status}  ativo: ${current.deploymentId === deployment.$id}  ` +
          `enabled: ${current.enabled}  execute: [${current.execute.join(', ')}]  runtime: ${current.runtime}`,
      );
      // O deploy publica CÓDIGO; a postura de acesso é do manifesto. Se o
      // servidor devolver algo diferente do declarado, é alteração de acesso
      // que ninguém pediu — e a publicação para aqui.
      const definition = functionDefinitions.find((item) => item.id === id)!;
      const execute = executeRoles(definition.audience);
      const enabled = definition.audience !== 'closed';
      if (current.enabled !== enabled || !sortedEqual(current.execute, execute))
        throw new IdentityError(
          `Postura de acesso divergente em ${id} após o deploy: ` +
            `enabled=${current.enabled}, execute=[${current.execute.join(', ')}]. ` +
            `Esperado: enabled=${enabled}, execute=[${execute.join(', ')}].`,
        );
      if (status !== 'ready')
        throw new IdentityError(`Build não ficou pronto para ${id}: ${status}.`);
    }
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
  return { identity, reports };
}

const isDirectRun = process.argv[1]
  ?.replace(/\\/g, '/')
  .endsWith('infra/appwrite/deploy-functions.ts');
if (isDirectRun) {
  try {
    const { reports } = await deployFunctions(process.env, requested(process.argv.slice(2)));
    console.log(
      `\nPublicadas ${reports.length} function(s): ${reports.map((r) => r.functionId).join(', ')}`,
    );
  } catch (error) {
    if (error instanceof IdentityError) console.error(error.message);
    else {
      const code = (error as { code?: unknown })?.code;
      const type = (error as { type?: unknown })?.type;
      console.error(
        `Publicação interrompida${typeof code === 'number' ? ` (HTTP ${code}${typeof type === 'string' ? ` ${type}` : ''})` : ''}. Nenhuma credencial/response foi registrada.`,
      );
    }
    process.exitCode = 1;
  }
}
