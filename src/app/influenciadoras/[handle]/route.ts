import { NextResponse } from 'next/server';
import { getTableRow, databaseId, opsTables } from '@/lib/appwrite/data';
import { mediaConfigured, readMediaFile } from '@/lib/appwrite/media';
import { MEDIA_ID_PATTERN } from '@/features/workspace/domain/media';
import {
  defaultInfluencers,
  INFLUENCERS_SETTING_KEY,
} from '@/features/public-landing/influencers';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  if (!defaultInfluencers.some((influencer) => influencer.handle === handle))
    return new NextResponse(null, { status: 404 });
  if (!mediaConfigured() || !process.env.APPWRITE_OPS_API_KEY)
    return new NextResponse(null, { status: 404 });

  const tables = opsTables();
  let fileId = '';
  try {
    const row = await getTableRow(tables, {
      databaseId: databaseId(),
      tableId: 'platform_settings',
      rowId: INFLUENCERS_SETTING_KEY,
    });
    let stored: unknown = [];
    if (typeof row.valueJson === 'string') {
      try {
        stored = JSON.parse(row.valueJson);
      } catch {
        stored = [];
      }
    }
    const item = Array.isArray(stored)
      ? stored.find((entry) => entry?.handle === handle)
      : null;
    fileId = typeof item?.fileId === 'string' ? item.fileId : '';
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
  }
  if (!MEDIA_ID_PATTERN.test(fileId)) return new NextResponse(null, { status: 404 });
  const file = await readMediaFile(fileId);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.bytes, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
