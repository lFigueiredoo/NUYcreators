import 'server-only';
import { databaseId, getTableRow, opsTables } from '@/lib/appwrite/data';
import {
  defaultInfluencers,
  INFLUENCERS_SETTING_KEY,
  type Influencer,
} from '../influencers';

export async function loadPublicInfluencers(): Promise<readonly Influencer[]> {
  if (!process.env.APPWRITE_OPS_API_KEY) return defaultInfluencers;
  try {
    const row = await getTableRow(opsTables(), {
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: INFLUENCERS_SETTING_KEY,
    });
    const stored = parseStored(row.valueJson);
    return defaultInfluencers.map((influencer) => {
      const fileId = stored.find((item) => item.handle === influencer.handle)?.fileId;
      return {
        ...influencer,
        fileId,
        src: fileId ? `/influenciadoras/${influencer.handle}` : influencer.src,
      };
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 404)
      console.warn('[influencers] configuração indisponível; usando imagens padrão.', error);
    return defaultInfluencers;
  }
}

function parseStored(value: unknown): Array<{ handle: string; fileId: string }> {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { handle: string; fileId: string } =>
        typeof item === 'object' &&
        item !== null &&
        'handle' in item &&
        'fileId' in item &&
        typeof item.handle === 'string' &&
        typeof item.fileId === 'string',
    );
  } catch {
    return [];
  }
}
