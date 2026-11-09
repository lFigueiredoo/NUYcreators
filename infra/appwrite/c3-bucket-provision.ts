/** C3.1: one guarded, empty staging bucket. Never use this for uploads. */
import { Client, Compression, Storage } from 'node-appwrite';
import { execSync } from 'node:child_process';
import { academyBucketProposal } from './academy-schema';
import { C2_ENDPOINT, C2_PROJECT_ID, C2_PROJECT_NAME } from './c2-safety';

export const c3BucketProposal = {
  endpoint: C2_ENDPOINT,
  projectId: C2_PROJECT_ID,
  projectName: C2_PROJECT_NAME,
  request: {
    bucketId: academyBucketProposal.id,
    name: 'NUY Academy Media',
    permissions: [] as string[],
    fileSecurity: true,
    enabled: false,
    // Temporary safety fuse for an empty bucket; C3.2 must measure host limits.
    maximumFileSize: 1,
    allowedFileExtensions: [...academyBucketProposal.allowedFileExtensions],
    compression: Compression.None,
    encryption: false,
    antivirus: false,
    transformations: false,
  },
} as const;

export const c3TargetUploadMaxBytes = 200 * 1024 * 1024;
export const C31_BUCKET_KEY_ENV = 'APPWRITE_C31_BUCKET_API_KEY';

export type C3BucketGate = {
  endpoint: string;
  projectId: string;
  projectName: string;
  version: string;
  globalLimitBytes: number | null;
  proxyLimitBytes: number | null;
  freeBytes: number | null;
  backupRestoreVerified: boolean;
  scannerCoversFullFile: boolean;
  explicitBucketApproval: boolean;
};

/** Prerequisites for enabling uploads in C3.2; independent of an empty disabled bucket. */
export function c3UploadBlockers(gate: C3BucketGate): string[] {
  const blockers: string[] = [];
  if (gate.endpoint !== C2_ENDPOINT || gate.projectId !== C2_PROJECT_ID ||
      gate.projectName !== C2_PROJECT_NAME || gate.version !== '2.2.0')
    blockers.push('staging_identity_unverified');
  if (gate.globalLimitBytes === null ||
      gate.globalLimitBytes < c3TargetUploadMaxBytes)
    blockers.push('global_limit_unverified');
  if (gate.proxyLimitBytes === null ||
      gate.proxyLimitBytes < c3TargetUploadMaxBytes)
    blockers.push('proxy_limit_unverified');
  if (gate.freeBytes === null ||
      gate.freeBytes < 2 * c3TargetUploadMaxBytes)
    blockers.push('capacity_unverified');
  if (!gate.backupRestoreVerified) blockers.push('backup_restore_unverified');
  if (!gate.scannerCoversFullFile) blockers.push('full_file_scan_unverified');
  if (!gate.explicitBucketApproval) blockers.push('bucket_approval_missing');
  return blockers;
}

/** An empty C3.1 bucket still requires a dedicated staging Storage credential. */
export function c31EmptyBucketBlockers(gate: {
  endpoint: string;
  projectId: string;
  projectName: string;
  version: string;
  dedicatedBucketCredential: boolean;
  explicitEmptyBucketApproval: boolean;
}): string[] {
  const blockers: string[] = [];
  if (gate.endpoint !== C2_ENDPOINT || gate.projectId !== C2_PROJECT_ID ||
      gate.projectName !== C2_PROJECT_NAME || gate.version !== '2.2.0')
    blockers.push('staging_identity_unverified');
  if (!gate.dedicatedBucketCredential) blockers.push('bucket_credential_missing');
  if (!gate.explicitEmptyBucketApproval) blockers.push('bucket_approval_missing');
  return blockers;
}

type BucketRead = {
  $id: string; name: string; $permissions: string[]; fileSecurity: boolean;
  enabled: boolean; maximumFileSize: number; allowedFileExtensions: string[];
  compression: string; encryption: boolean; antivirus: boolean;
  transformations: boolean;
};

function assertBucket(bucket: BucketRead) {
  const wanted = c3BucketProposal.request;
  const checks = {
    id: bucket.$id === wanted.bucketId,
    name: bucket.name === wanted.name,
    permissions: Array.isArray(bucket.$permissions) && bucket.$permissions.length === 0,
    fileSecurity: bucket.fileSecurity === true,
    enabled: bucket.enabled === false,
    maximumFileSize: bucket.maximumFileSize === 1,
    allowedFileExtensions: JSON.stringify([...bucket.allowedFileExtensions].sort()) ===
      JSON.stringify([...wanted.allowedFileExtensions].sort()),
    compression: bucket.compression === 'none',
    encryption: bucket.encryption === false,
    antivirus: bucket.antivirus === false,
    transformations: bucket.transformations === false,
  };
  const drift = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (drift.length) throw new Error(`C31_CONFLICT: bucket divergente (${drift.join(',')}); nenhuma atualização automática.`);
  return checks;
}

async function run() {
  const args = process.argv.slice(2);
  const verifyArgs = ['--verify', '--project-id', C2_PROJECT_ID];
  const applyArgs = ['--apply-empty-bucket', '--project-id', C2_PROJECT_ID,
    '--confirm', 'academy-media:6ad55be5003719f6b399'];
  const mode = JSON.stringify(args) === JSON.stringify(verifyArgs) ? 'verify' :
    JSON.stringify(args) === JSON.stringify(applyArgs) ? 'apply' : null;
  if (!mode) throw new Error('C31_BLOCKED: use apenas --verify ou a autorização exata para o bucket vazio no staging.');
  const key = process.env[C31_BUCKET_KEY_ENV];
  if (!key) throw new Error(`C31_BLOCKED: ${C31_BUCKET_KEY_ENV} ausente.`);

  const cliEnv = { ...process.env };
  delete cliEnv[C31_BUCKET_KEY_ENV];
  let projects: { projects?: { $id?: string; name?: string; endpoint?: string }[] };
  try {
    const raw = execSync('appwrite list-projects --json', {
      encoding: 'utf8', timeout: 20000, windowsHide: true, env: cliEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    projects = JSON.parse(raw.slice(raw.indexOf('{'))) as typeof projects;
  } catch {
    throw new Error('C31_BLOCKED: identidade via Console indisponível.');
  }
  const matches = projects.projects?.filter((project) => project.$id === C2_PROJECT_ID) ?? [];
  if (matches.length !== 1 || matches[0].name !== C2_PROJECT_NAME ||
    matches[0].endpoint !== C2_ENDPOINT)
    throw new Error('C31_BLOCKED: identidade de staging divergente.');

  const headers = { 'X-Appwrite-Project': C2_PROJECT_ID, 'X-Appwrite-Key': key };
  const [version, staging, production] = await Promise.all([
    fetch(`${C2_ENDPOINT}/health/version`, { headers, signal: AbortSignal.timeout(20000) }),
    fetch(`${C2_ENDPOINT}/storage/buckets`, { headers, signal: AbortSignal.timeout(20000) }),
    fetch(`${C2_ENDPOINT}/storage/buckets`, { headers: { ...headers,
      'X-Appwrite-Project': '6ac044af0008cbdda070' },
      signal: AbortSignal.timeout(20000) }),
  ]);
  const versionBody = version.ok ? await version.json() as { version?: string } : null;
  if (versionBody?.version !== '2.2.0' || !staging.ok ||
    ![401, 403].includes(production.status))
    throw new Error(`C31_BLOCKED: chave, versão ou isolamento não comprovados (staging=${staging.status}, protected=${production.status}).`);

  const storage = new Storage(new Client().setEndpoint(C2_ENDPOINT)
    .setProject(C2_PROJECT_ID).setKey(key));
  let bucket: BucketRead | null = null;
  try {
    bucket = await storage.getBucket({ bucketId: c3BucketProposal.request.bucketId }) as BucketRead;
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw new Error('C31_BLOCKED: leitura do bucket falhou.');
  }
  if (!bucket && mode === 'apply') {
    // This is the only remote write: the exact empty, disabled bucket in the exact staging project.
    try {
      bucket = await storage.createBucket({ ...c3BucketProposal.request,
        allowedFileExtensions: [...c3BucketProposal.request.allowedFileExtensions],
      }) as BucketRead;
    } catch {
      throw new Error('C31_BLOCKED: criação recusada; confira o estado remoto antes de qualquer nova tentativa.');
    }
    console.log('C31_CREATED bucket=academy-media project=6ad55be5003719f6b399');
  }
  if (!bucket) {
    console.log('C31_ABSENT bucket=academy-media project=6ad55be5003719f6b399');
    return;
  }
  assertBucket(bucket);
  const files = await storage.listFiles({ bucketId: c3BucketProposal.request.bucketId });
  if (files.total !== 0 || files.files.length !== 0)
    throw new Error('C31_CONFLICT: bucket contém arquivos; nenhuma alteração automática.');
  console.log('C31_VERIFIED bucket=academy-media project=6ad55be5003719f6b399 private=true fileSecurity=true enabled=false files=0');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('c3-bucket-provision.ts')) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'C31_BLOCKED: erro desconhecido.');
    process.exitCode = 1;
  });
}
