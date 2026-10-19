/** Read-only inventory of synthetic race fixtures left in C2 staging. */
import { Client, Query, TablesDB } from 'node-appwrite';
import { C2_ENDPOINT, C2_PROJECT_ID, verifyC2WriteTarget } from './c2-safety';

try {
  await verifyC2WriteTarget(process.env, 'test-academy');
  const db = new TablesDB(new Client().setEndpoint(C2_ENDPOINT).setProject(C2_PROJECT_ID)
    .setKey(process.env.APPWRITE_C2_ROWS_API_KEY!));
  const challenges = await db.listRows({ databaseId: 'nuy-creators', tableId: 'challenges',
    queries: [Query.limit(100)] });
  for (const challenge of challenges.rows.filter((row) => row.$id.startsWith('c2-race-'))) {
    const comments = await db.listRows({ databaseId: 'nuy-creators', tableId: 'community_comments',
      queries: [Query.equal('targetType', 'challenge'), Query.equal('targetId', challenge.$id),
        Query.limit(100)] });
    console.log(`C2_RACE_FIXTURE id=${challenge.$id} status=${challenge.status} version=${challenge.version} comments=${comments.total}`);
  }
  if (challenges.total > challenges.rows.length)
    throw new Error('C2: inventário de corrida paginado; resultado incompleto.');
} catch (error) {
  const code = (error as { code?: unknown }).code;
  console.error(error instanceof Error && error.message.startsWith('C2:') ? error.message
    : `C2: inventário de corrida falhou${typeof code === 'number' ? ` HTTP=${code}` : ''}.`);
  process.exitCode = 1;
}
