/** C2 synthetic accounts and real Admin membership, staging project only. */
import { appendFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client, Query, Teams, Users } from 'node-appwrite';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

const configPath = fileURLToPath(new URL('../../.env.c2.local', import.meta.url));
const apply = process.argv.includes('--apply');
const profiles = [
  { id: 'c2-admin-teste', email: 'c2-admin@example.invalid', name: 'ADMIN_TESTE',
    envName: 'APPWRITE_C2_ADMIN_PASSWORD' },
  { id: 'c2-creator-a', email: 'c2-creator-a@example.invalid', name: 'CREATOR_TESTE_A',
    envName: 'APPWRITE_C2_CREATOR_A_PASSWORD' },
  { id: 'c2-creator-b', email: 'c2-creator-b@example.invalid', name: 'CREATOR_TESTE_B',
    envName: 'APPWRITE_C2_CREATOR_B_PASSWORD' },
] as const;
function codeOf(error: unknown) { return (error as { code?: unknown })?.code; }
async function optional<T>(read: () => Promise<T>): Promise<T | null> {
  try { return await read(); }
  catch (error) { if (codeOf(error) === 404) return null; throw error; }
}

try {
  await verifyC2WriteTarget(process.env, 'provision-identities');
  const client = new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(process.env.APPWRITE_C2_IDENTITY_API_KEY!);
  const users = new Users(client);
  const teams = new Teams(client);
  const teamId = 'nuy-admins';
  const existingTeam = await optional(() => teams.get({ teamId }));
  if (!existingTeam) {
    console.log(`C2_PLAN CREATE team ${teamId}`);
    if (apply) await teams.create({ teamId, name: 'NUY C2 Admins' });
  } else if (existingTeam.name !== 'NUY C2 Admins') {
    throw new Error('C2: equipe existente com nome divergente.');
  }
  for (const profile of profiles) {
    const found = await optional(() => users.get({ userId: profile.id }));
    if (found && (found.email !== profile.email || found.name !== profile.name))
      throw new Error(`C2: conta divergente ${profile.id}.`);
    if (!found) {
      console.log(`C2_PLAN CREATE user ${profile.id}`);
      if (!apply) continue;
      let password = process.env[profile.envName];
      if (!password) {
        if (readFileSync(configPath, 'utf8').includes(`${profile.envName}=`))
          throw new Error(`C2: senha ${profile.id} já registrada mas não carregada.`);
        password = randomBytes(24).toString('hex');
        appendFileSync(configPath, `${profile.envName}=${password}\n`);
      }
      await users.create({ userId: profile.id, email: profile.email,
        password, name: profile.name });
    }
  }
  if (apply) {
    const memberships = await teams.listMemberships({ teamId,
      queries: [Query.limit(100)] });
    const admin = memberships.memberships.filter((item) => item.userId === profiles[0].id);
    if (!admin.length) {
      console.log(`C2_PLAN CREATE membership ${profiles[0].id}`);
      await teams.createMembership({ teamId, userId: profiles[0].id, roles: ['admin'] });
    } else if (admin.length !== 1 || !admin[0].confirm ||
      JSON.stringify(admin[0].roles) !== JSON.stringify(['admin']))
      throw new Error('C2: membership Admin divergente.');
    const checked = await teams.listMemberships({ teamId, queries: [Query.limit(100)] });
    const expected = checked.memberships.filter((item) => item.userId === profiles[0].id &&
      item.confirm && item.roles.includes('admin'));
    const creatorMembership = checked.memberships.some((item) =>
      item.userId === profiles[1].id || item.userId === profiles[2].id);
    if (expected.length !== 1 || creatorMembership)
      throw new Error('C2: isolamento de membership não comprovado.');
    console.log('C2_IDENTITIES_VERIFIED users=3 admins=1 creators_admin=0');
  } else console.log('C2_IDENTITIES_PLAN_COMPLETE');
} catch (error) {
  const code = codeOf(error);
  console.error(error instanceof Error && error.message.startsWith('C2:')
    ? error.message
    : `C2: identidades interrompidas${typeof code === 'number' ? ` (HTTP ${code})` : ''}.`);
  process.exitCode = 1;
}
