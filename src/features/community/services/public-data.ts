import 'server-only';
import { Client, Databases, Query } from 'node-appwrite';
import { getEnvironment } from '@/lib/env/server';
import { z } from 'zod';
const levelSchema = z.object({
  $id: z.string(),
  name: z.string(),
  minPoints: z.number(),
  maxPoints: z.number().nullable(),
  order: z.number(),
});
export type CreatorLevel = z.infer<typeof levelSchema>;
export async function getPublicLevels(): Promise<{
  status: 'ready' | 'disconnected' | 'error';
  levels: CreatorLevel[];
}> {
  const env = getEnvironment();
  if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID)
    return { status: 'disconnected', levels: [] };
  try {
    const db = new Databases(
      new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID),
    );
    const response = await db.listDocuments({
      databaseId: env.APPWRITE_DATABASE_ID,
      collectionId: 'creator_levels',
      queries: [Query.equal('active', true), Query.orderAsc('order'), Query.limit(25)],
    });
    return { status: 'ready', levels: z.array(levelSchema).parse(response.documents) };
  } catch {
    return { status: 'error', levels: [] };
  }
}
