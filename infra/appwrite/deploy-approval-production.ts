/**
 * Production code rollout for the four approval entry points, with one narrowly
 * scoped alignment of the existing onboarding terms-version variable when needed.
 * Staging guards and provisioners remain unchanged. Default invocation only reads.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { builtinModules, createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Functions, Query, TablesDB } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { assertAppwriteEndpoint, PRODUCTION_PROTECTED_PROJECT_ID } from './safety';
import { markerMatches, MARKER_ID } from './identity';
import { executeRoles, functionDefinitions, functionScopes } from './schema';

// Security gates first, onboarding last. Never expand this from command-line data.
export const APPROVAL_PRODUCTION_FUNCTIONS = [
  'join-challenge',
  'submit-content',
  'redeem-reward',
  'complete-onboarding',
] as const;
type ApprovalFunctionId = (typeof APPROVAL_PRODUCTION_FUNCTIONS)[number];
export type ProductionDeploymentArgs = { projectId: string; commit: string; apply: boolean };
type FunctionPosture = Pick<
  Awaited<ReturnType<Functions['get']>>,
  | '$id'
  | 'enabled'
  | 'execute'
  | 'scopes'
  | 'runtime'
  | 'entrypoint'
  | 'commands'
  | 'schedule'
  | 'deploymentId'
>;
type Remote = {
  functions: Pick<
    Functions,
    | 'get'
    | 'getDeployment'
    | 'createDeployment'
    | 'updateFunctionDeployment'
    | 'listVariables'
    | 'updateVariable'
  >;
  markers: Pick<TablesDB, 'getRow'>;
  schema: Pick<TablesDB, 'getTable'>;
};
type Artifact = { functionId: ApprovalFunctionId; path: string; bytes: number; sha256: string };
type PackageResult = { artifacts: Artifact[]; dispose: () => Promise<void> };
type Progress = {
  phase: string;
  functionId?: ApprovalFunctionId;
  deploymentId?: string;
  previousDeploymentId?: string;
  sha256?: string;
};
export class ProductionDeploymentError extends Error {}

const TERMS_VARIABLE = 'NUY_TERMS_VERSION';
const AGE_VARIABLE = 'NUY_MINIMUM_AGE';
const ONBOARDING_ID = 'complete-onboarding';
type PolicyVariable = {
  id: string;
  key: string;
  value: string;
  secret: boolean;
  updatedAt: string;
  fingerprint: string;
};
type PolicySnapshot = {
  terms: PolicyVariable;
  age: PolicyVariable;
  requiresTermsAlignment: boolean;
};

/** Resolve the approved public version from the exact source commit, not the worktree. */
export function committedTermsVersion(repoRoot: string, commit: string) {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw new ProductionDeploymentError('Commit completo obrigatório para resolver a política.');
  const source = execFileSync('git', ['show', `${commit}:src/features/legal/versions.ts`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const matches = [
    ...source.matchAll(
      /^\s*export\s+const\s+CURRENT_TERMS_VERSION\s*=\s*(['"])([A-Za-z0-9._-]+)\1/gm,
    ),
  ];
  if (matches.length !== 1)
    throw new ProductionDeploymentError('Não foi possível resolver a versão aprovada no commit.');
  return matches[0][2];
}

async function readPolicyVariables(
  functions: Remote['functions'],
  expectedTerms: string,
  approvedAge: number,
): Promise<PolicySnapshot> {
  const result = await functions.listVariables({
    functionId: ONBOARDING_ID,
    queries: [Query.equal('key', [TERMS_VARIABLE, AGE_VARIABLE]), Query.limit(10)],
  });
  const read = (key: string): PolicyVariable => {
    const matches = result.variables.filter((row) => row.key === key);
    const row = matches[0];
    if (
      matches.length !== 1 ||
      !row ||
      row.resourceType !== 'function' ||
      row.resourceId !== ONBOARDING_ID ||
      typeof row.$id !== 'string' ||
      !row.$id ||
      typeof row.value !== 'string' ||
      !row.value.trim() ||
      typeof row.secret !== 'boolean' ||
      typeof row.$updatedAt !== 'string' ||
      !row.$updatedAt
    )
      throw new ProductionDeploymentError(
        `A variável existente ${key} precisa estar legível e no escopo exclusivo da Function.`,
      );
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          row.$id,
          row.key,
          row.value,
          row.secret,
          row.$updatedAt,
          row.resourceType,
          row.resourceId,
        ]),
      )
      .digest('hex');
    return {
      id: row.$id,
      key: row.key,
      value: row.value,
      secret: row.secret,
      updatedAt: row.$updatedAt,
      fingerprint,
    };
  };
  const terms = read(TERMS_VARIABLE);
  const age = read(AGE_VARIABLE);
  if (Number(age.value) !== approvedAge)
    throw new ProductionDeploymentError(
      'A política de idade da Function não corresponde à idade já aprovada no app; nenhuma variável de idade será alterada.',
    );
  return { terms, age, requiresTermsAlignment: terms.value !== expectedTerms };
}

function assertPoliciesUnchanged(previous: PolicySnapshot, current: PolicySnapshot) {
  if (
    previous.terms.fingerprint !== current.terms.fingerprint ||
    previous.age.fingerprint !== current.age.fingerprint
  )
    throw new ProductionDeploymentError(
      'As políticas da Function mudaram durante a publicação; alinhamento e ativação bloqueados.',
    );
}

export function parseProductionDeploymentArgs(argv: string[]): ProductionDeploymentArgs {
  const parsed: Partial<ProductionDeploymentArgs> = { apply: false };
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!['--project-id', '--commit', '--apply'].includes(arg) || seen.has(arg))
      throw new ProductionDeploymentError('Argumentos inválidos ou repetidos.');
    seen.add(arg);
    if (arg === '--apply') parsed.apply = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith('--'))
        throw new ProductionDeploymentError('Falta o valor de um argumento obrigatório.');
      if (arg === '--project-id') parsed.projectId = value;
      else parsed.commit = value;
    }
  }
  if (!parsed.projectId || !parsed.commit || !/^[a-f0-9]{40}$/.test(parsed.commit))
    throw new ProductionDeploymentError(
      'Exige --project-id explícito e --commit com SHA completo de 40 caracteres.',
    );
  return parsed as ProductionDeploymentArgs;
}

export function assertProductionDeploymentTarget(
  env: Record<string, string | undefined>,
  args: ProductionDeploymentArgs,
  head: string,
) {
  assertAppwriteEndpoint(env.APPWRITE_ENDPOINT);
  if (
    args.projectId !== PRODUCTION_PROTECTED_PROJECT_ID ||
    env.APPWRITE_PROJECT_ID !== args.projectId ||
    env.APPWRITE_EXPECTED_PROJECT_ID !== args.projectId ||
    (env.APPWRITE_DATABASE_ID || 'nuy-creators') !== 'nuy-creators'
  )
    throw new ProductionDeploymentError(
      'Identidade de produção divergente; nenhuma escrita autorizada.',
    );
  if (!/^[a-f0-9]{40}$/.test(args.commit) || head !== args.commit)
    throw new ProductionDeploymentError(
      'HEAD deve corresponder exatamente ao commit completo informado.',
    );
  if (!env.APPWRITE_API_KEY || !env.APPWRITE_OPS_API_KEY)
    throw new ProductionDeploymentError(
      'Chaves existentes de publicação e operação são necessárias.',
    );
  const age = Number(env.NUY_MINIMUM_AGE);
  if (!Number.isInteger(age) || age < 18)
    throw new ProductionDeploymentError(
      'A idade mínima já aprovada no app deve estar configurada antes da publicação.',
    );
}

const equal = (a: readonly string[], b: readonly string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function assertApprovalFunctionPosture(value: FunctionPosture, id: ApprovalFunctionId) {
  const manifest = functionDefinitions.find((item) => item.id === id);
  if (
    !manifest ||
    value.$id !== id ||
    !value.enabled ||
    !equal(value.execute, executeRoles(manifest.audience)) ||
    !equal(value.scopes, functionScopes(manifest)) ||
    value.runtime !== 'node-22' ||
    value.entrypoint !== 'src/main.js' ||
    value.commands !== 'npm ci' ||
    (value.schedule || '') !== (manifest.schedule || '') ||
    !value.deploymentId
  )
    throw new ProductionDeploymentError(
      `Postura divergente na Function permitida ${id}; publicação bloqueada.`,
    );
}

async function readiness(remote: Remote, projectId: string) {
  const [marker, table] = await Promise.all([
    remote.markers.getRow({
      databaseId: 'nuy-creators',
      tableId: 'platform_settings',
      rowId: MARKER_ID,
    }),
    remote.schema.getTable({ databaseId: 'nuy-creators', tableId: 'platform_settings' }),
  ]);
  if (
    !markerMatches(marker as unknown as Record<string, unknown>, projectId) ||
    table.$id !== 'platform_settings' ||
    table.rowSecurity !== true ||
    table.$permissions.length !== 0
  )
    throw new ProductionDeploymentError(
      'Marker privado ou segurança da tabela divergente; publicação bloqueada.',
    );
  const current = [];
  for (const id of APPROVAL_PRODUCTION_FUNCTIONS) {
    const fn = await remote.functions.get({ functionId: id });
    assertApprovalFunctionPosture(fn, id);
    const deployment = await remote.functions.getDeployment({
      functionId: id,
      deploymentId: fn.deploymentId,
    });
    if (deployment.status !== 'ready' || deployment.$id !== fn.deploymentId)
      throw new ProductionDeploymentError(`Deployment atual não está pronto em ${id}.`);
    current.push({ functionId: id, previousDeploymentId: fn.deploymentId });
  }
  return current;
}

function localHead(repoRoot: string) {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** Builds exclusively archived committed files, even in a dirty user worktree. */
export async function packageApprovalCommit(
  repoRoot: string,
  commit: string,
): Promise<PackageResult> {
  const tempParent = await realpath(tmpdir());
  const workdir = await realpath(await mkdtemp(join(tempParent, 'nuy-approval-deploy-')));
  const offset = relative(tempParent, workdir);
  if (
    !offset ||
    isAbsolute(offset) ||
    offset.startsWith(`..${sep}`) ||
    offset === '..' ||
    !basename(workdir).startsWith('nuy-approval-deploy-')
  )
    throw new ProductionDeploymentError('Diretório temporário não passou na validação.');
  const dispose = () => rm(workdir, { recursive: true, force: true });
  try {
    const source = join(workdir, 'source');
    await mkdir(source);
    const archive = execFileSync('git', ['archive', '--format=tar', commit], {
      cwd: repoRoot,
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    execFileSync('tar', ['-xf', '-', '-C', source], {
      input: archive,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const require = createRequire(import.meta.url);
    const esbuildPath = require.resolve('esbuild', {
      paths: [join(repoRoot, 'functions', 'complete-onboarding'), repoRoot],
    });
    const compiler = require(esbuildPath) as typeof import('esbuild');
    const artifacts: Artifact[] = [];
    for (const id of APPROVAL_PRODUCTION_FUNCTIONS) {
      const input = join(source, 'functions', id);
      const output = join(workdir, 'packages', id);
      await mkdir(join(output, 'src'), { recursive: true });
      const pkg = JSON.parse(await readFile(join(input, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      const result = await compiler.build({
        absWorkingDir: input,
        entryPoints: [join(input, 'main.ts')],
        outfile: join(output, 'src', 'main.js'),
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node22',
        packages: 'external',
        metafile: true,
        logLevel: 'silent',
      });
      const allowed = new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`),
      ]);
      for (const file of Object.values(result.metafile!.outputs))
        for (const imported of file.imports) {
          const name = imported.path.startsWith('@')
            ? imported.path.split('/').slice(0, 2).join('/')
            : imported.path.split('/')[0];
          if (imported.external && !allowed.has(imported.path) && !allowed.has(name))
            throw new ProductionDeploymentError(
              `Dependência externa não declarada no pacote de ${id}.`,
            );
        }
      await copyFile(join(input, 'package.json'), join(output, 'package.json'));
      await copyFile(join(input, 'package-lock.json'), join(output, 'package-lock.json'));
      const path = join(workdir, `${id}.tar.gz`);
      const destination = relative(output, path).split(sep).join('/');
      const shipped = ['package.json', 'package-lock.json', 'src/main.js'];
      execFileSync('tar', ['-czf', destination, ...shipped], { cwd: output, stdio: 'pipe' });
      const members = execFileSync('tar', ['-tzf', destination], {
        cwd: output,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .trim()
        .split(/\r?\n/);
      if (!equal(members, shipped))
        throw new ProductionDeploymentError(`Conteúdo inesperado no pacote de ${id}.`);
      const bytes = await readFile(path);
      artifacts.push({
        functionId: id,
        path,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
    return { artifacts, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}

async function waitReady(
  functions: Remote['functions'],
  functionId: ApprovalFunctionId,
  deploymentId: string,
  pause: (ms: number) => Promise<void>,
) {
  const started = Date.now();
  for (;;) {
    const deployment = await functions.getDeployment({ functionId, deploymentId });
    if (deployment.status === 'ready') return;
    if (deployment.status === 'failed' || Date.now() - started > 8 * 60 * 1000)
      throw new ProductionDeploymentError(
        `Build não ficou pronto para ${functionId}; nenhum rollback automático foi executado.`,
      );
    await pause(5000);
  }
}

type RunOptions = {
  repoRoot?: string;
  remote?: Remote;
  head?: () => string;
  packageCommit?: (repoRoot: string, commit: string) => Promise<PackageResult>;
  pause?: (ms: number) => Promise<void>;
  onProgress?: (event: Progress) => void;
  resolveTermsVersion?: (repoRoot: string, commit: string) => string;
};

export async function deployApprovalProduction(
  env: Record<string, string | undefined>,
  args: ProductionDeploymentArgs,
  options: RunOptions = {},
) {
  const repoRoot = options.repoRoot || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const head = options.head || (() => localHead(repoRoot));
  assertProductionDeploymentTarget(env, args, head());
  const client = (key: string) =>
    new Client().setEndpoint(env.APPWRITE_ENDPOINT!).setProject(args.projectId).setKey(key);
  const remote = options.remote || {
    functions: new Functions(client(env.APPWRITE_API_KEY!)),
    markers: new TablesDB(client(env.APPWRITE_OPS_API_KEY!)),
    schema: new TablesDB(client(env.APPWRITE_API_KEY!)),
  };
  const previous = await readiness(remote, args.projectId);
  const expectedTerms = (options.resolveTermsVersion || committedTermsVersion)(
    repoRoot,
    args.commit,
  );
  const approvedAge = Number(env.NUY_MINIMUM_AGE);
  const policies = await readPolicyVariables(remote.functions, expectedTerms, approvedAge);
  if (!args.apply)
    return {
      mode: 'plan' as const,
      commit: args.commit,
      previous,
      requiresTermsAlignment: policies.requiresTermsAlignment,
      minimumAgeMatchesApproved: true,
      changed: false,
    };
  assertProductionDeploymentTarget(env, args, head());
  const packages = await (options.packageCommit || packageApprovalCommit)(repoRoot, args.commit);
  const uploaded: { functionId: ApprovalFunctionId; deploymentId: string }[] = [];
  const pause =
    options.pause || ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  try {
    if (
      !equal(
        packages.artifacts.map((item) => item.functionId),
        APPROVAL_PRODUCTION_FUNCTIONS,
      )
    )
      throw new ProductionDeploymentError(
        'Pacotes não correspondem à allowlist fixa de aprovação.',
      );
    assertProductionDeploymentTarget(env, args, head());
    assertPoliciesUnchanged(
      policies,
      await readPolicyVariables(remote.functions, expectedTerms, approvedAge),
    );
    for (const id of APPROVAL_PRODUCTION_FUNCTIONS) {
      const artifact = packages.artifacts.find((item) => item.functionId === id)!;
      const deployed = await remote.functions.createDeployment({
        functionId: id,
        code: InputFile.fromPath(artifact.path, `${id}.tar.gz`),
        activate: false,
      });
      uploaded.push({ functionId: id, deploymentId: deployed.$id });
      options.onProgress?.({
        phase: 'uploaded_inactive',
        functionId: id,
        deploymentId: deployed.$id,
        sha256: artifact.sha256,
      });
    }
    for (const item of uploaded)
      await waitReady(remote.functions, item.functionId, item.deploymentId, pause);
    const checked = await readiness(remote, args.projectId);
    if (
      previous.some(
        (item, index) => item.previousDeploymentId !== checked[index].previousDeploymentId,
      )
    )
      throw new ProductionDeploymentError(
        'Deployment ativo mudou durante o build; ativação bloqueada.',
      );
    assertProductionDeploymentTarget(env, args, head());
    let checkedPolicies = await readPolicyVariables(remote.functions, expectedTerms, approvedAge);
    assertPoliciesUnchanged(policies, checkedPolicies);
    if (policies.requiresTermsAlignment) {
      // Only this existing, function-scoped public-policy version may change.
      // Keep the existing key, ID and secrecy; never create or modify other variables.
      await remote.functions.updateVariable({
        functionId: ONBOARDING_ID,
        variableId: policies.terms.id,
        key: TERMS_VARIABLE,
        value: expectedTerms,
        secret: policies.terms.secret,
      });
      checkedPolicies = await readPolicyVariables(remote.functions, expectedTerms, approvedAge);
      if (
        checkedPolicies.requiresTermsAlignment ||
        checkedPolicies.terms.id !== policies.terms.id ||
        checkedPolicies.terms.secret !== policies.terms.secret ||
        checkedPolicies.age.fingerprint !== policies.age.fingerprint
      )
        throw new ProductionDeploymentError(
          'Alinhamento da versão não confirmado ou política concorrente detectada; ativação bloqueada.',
        );
      options.onProgress?.({ phase: 'existing_terms_policy_aligned', functionId: ONBOARDING_ID });
    }
    for (const item of uploaded) {
      assertProductionDeploymentTarget(env, args, head());
      assertPoliciesUnchanged(
        checkedPolicies,
        await readPolicyVariables(remote.functions, expectedTerms, approvedAge),
      );
      // Recheck immediately before each activation; do not overwrite another rollout.
      const current = await remote.functions.get({ functionId: item.functionId });
      assertApprovalFunctionPosture(current, item.functionId);
      const prior = previous.find((value) => value.functionId === item.functionId)!;
      if (current.deploymentId !== prior.previousDeploymentId)
        throw new ProductionDeploymentError(
          'Deployment ativo mudou antes da ativação; pare para revisar a publicação parcial.',
        );
      await remote.functions.updateFunctionDeployment(item);
      const active = await remote.functions.get({ functionId: item.functionId });
      assertApprovalFunctionPosture(active, item.functionId);
      if (active.deploymentId !== item.deploymentId)
        throw new ProductionDeploymentError(
          'Ativação não confirmada; pare para revisar a publicação parcial.',
        );
      options.onProgress?.({
        phase: 'activated',
        ...item,
        previousDeploymentId: prior.previousDeploymentId,
      });
    }
    return {
      mode: 'applied' as const,
      commit: args.commit,
      previous,
      deployments: uploaded,
      termsAligned: policies.requiresTermsAlignment,
      changed: true,
    };
  } finally {
    await packages.dispose();
  }
}

const direct = process.argv[1]
  ?.replace(/\\/g, '/')
  .endsWith('/infra/appwrite/deploy-approval-production.ts');
if (direct) {
  try {
    const result = await deployApprovalProduction(
      process.env,
      parseProductionDeploymentArgs(process.argv.slice(2)),
      {
        onProgress: (event) => console.log(JSON.stringify(event)),
      },
    );
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ProductionDeploymentError) console.error(error.message);
    else {
      const code = (error as { code?: unknown })?.code;
      const type = (error as { type?: unknown })?.type;
      console.error(
        JSON.stringify({
          error: 'production_code_deploy_failed',
          code: typeof code === 'number' ? code : 0,
          type: typeof type === 'string' ? type : 'local_or_network',
        }),
      );
    }
    process.exitCode = 1;
  }
}
