import 'server-only';
import { databaseId, getTableRow, opsTables } from '@/lib/appwrite/data';
import {
  defaultInfluencers,
  INFLUENCERS_SETTING_KEY,
  type Influencer,
} from '@/features/public-landing/influencers';

type StoredInfluencer = { handle: string; fileId: string };

export async function loadInfluencersForAdmin(): Promise<Influencer[]> {
  const stored = await readStoredInfluencers();
  return defaultInfluencers.map((influencer) => {
    const fileId = stored.find((item) => item.handle === influencer.handle)?.fileId;
    return { ...influencer, fileId, src: fileId ? `/influenciadoras/${influencer.handle}` : influencer.src };
  });
}

export async function saveInfluencerImage(handle: string, fileId: string) {
  const current = await readStoredInfluencers();
  const next = [
    ...current.filter((item) => item.handle !== handle),
    { handle, fileId },
  ];
  await writeStoredInfluencers(next);
}

export async function removeInfluencerImage(handle: string) {
  const current = await readStoredInfluencers();
  await writeStoredInfluencers(current.filter((item) => item.handle !== handle));
}

async function readStoredInfluencers(): Promise<StoredInfluencer[]> {
  if (!process.env.APPWRITE_OPS_API_KEY) return [];
  const tables = opsTables();
  try {
    const row = await getTableRow(tables, {
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: INFLUENCERS_SETTING_KEY,
    });
    return parseStored(row.valueJson);
  } catch (error) {
    if ((error as { code?: number }).code === 404) return [];
    throw error;
  }
}

async function writeStoredInfluencers(value: StoredInfluencer[]) {
  const tables = opsTables();
  const data = {
    key: INFLUENCERS_SETTING_KEY,
    valueJson: JSON.stringify(value),
    public: true,
  };
  try {
    await tables.updateRow({
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: INFLUENCERS_SETTING_KEY,
      data,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
    await tables.createRow({
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: INFLUENCERS_SETTING_KEY,
      data,
    });
  }
}

function parseStored(value: unknown): StoredInfluencer[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredInfluencer =>
        typeof item === 'object' &&
        item !== null &&
        'handle' in item &&
        'fileId' in item &&
        typeof item.handle === 'string' &&
        typeof item.fileId === 'string' &&
        defaultInfluencers.some((influencer) => influencer.handle === item.handle),
    );
  } catch {
    return [];
  }
}
