/** Idempotent Academy seeds through the approved command layer, staging only. */
import { Client, Query, TablesDB, Teams } from 'node-appwrite';
import { seedInitialCategories } from '../../src/features/academy/services/operations';
import { confirmedRoles } from '../../src/lib/security/memberships';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

try {
  await verifyC2WriteTarget(process.env, 'seed-academy');
  const rowClient = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(process.env.APPWRITE_C2_ROWS_API_KEY!);
  const identityClient = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(process.env.APPWRITE_C2_IDENTITY_API_KEY!);
  const memberships = await new Teams(identityClient).listMemberships({
    teamId: 'nuy-admins', queries: [Query.limit(100)],
  });
  const roles = confirmedRoles(memberships.memberships, 'c2-admin-teste', 'nuy-admins');
  if (!roles.includes('admin')) throw new Error('C2: membership Admin não confirmada.');
  const result = await seedInitialCategories({
    tables: new TablesDB(rowClient), databaseId: 'nuy-creators',
    actor: { id: 'c2-admin-teste', manage: true, moderate: true },
  });
  console.log(`C2_CATEGORIES_SEEDED created=${result.created} total=${result.total}`);
} catch (error) {
  const code = (error as { code?: unknown })?.code;
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? error.message : `C2: seed interrompida${typeof code === 'number' ? ` (HTTP ${code})` : ''}.`);
  process.exitCode = 1;
}
