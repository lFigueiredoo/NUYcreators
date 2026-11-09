/** Read-only C3 gate. No credentials, bucket creation, or upload. */
import { C2_ENDPOINT, C2_PROJECT_ID } from './c2-safety';

const paths = ['/health/version', '/health/anti-virus', '/health/storage', '/s3'] as const;

for (const path of paths) {
  try {
    const response = await fetch(`${C2_ENDPOINT}${path}`, {
      method: 'GET', headers: { 'X-Appwrite-Project': C2_PROJECT_ID },
      redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    const contentType = response.headers.get('content-type') ?? '';
    let detail = '';
    if (response.ok && path.startsWith('/health/') && contentType.includes('application/json')) {
      const json = await response.json() as { version?: string; status?: string };
      detail = json.version ?? json.status ?? '';
    }
    console.log(`C3_READ path=${path} http=${response.status} detail=${detail}`);
  } catch (error) {
    console.log(`C3_READ path=${path} error=${error instanceof Error ? error.name : 'unknown'}`);
  }
}
