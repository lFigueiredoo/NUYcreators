/** Read-only, complete ACL inventory. Run separately from any challenge transition. */
import { Permission, Query, Role, type TablesDB } from 'node-appwrite';

type Reader = Pick<TablesDB, 'getTable' | 'listRows'>;

export type ChallengeCommentAclInventory = {
  complete: true;
  ready: boolean;
  rowSecurity: boolean;
  tablePermissions: string[];
  totalRows: number;
  challengeRows: number;
  lessonRows: number;
  otherTargetRows: number;
  byStatus: Record<string, number>;
  replies: number;
  ownerOnly: number;
  noDirectRead: number;
  excessivePermissions: number;
  missingAuthor: number;
};

/**
 * Uses an operations/read key and returns aggregate counts only; never logs body,
 * author, or row ID. Writers must be frozen for the final C2 certification.
 */
export async function inventoryChallengeCommentAcls(
  reader: Reader, databaseId: string,
): Promise<ChallengeCommentAclInventory> {
  const table = await reader.getTable({ databaseId, tableId: 'community_comments' });
  const result: ChallengeCommentAclInventory = {
    complete: true,
    ready: false,
    rowSecurity: table.rowSecurity === true,
    tablePermissions: [...table.$permissions],
    totalRows: 0,
    challengeRows: 0,
    lessonRows: 0,
    otherTargetRows: 0,
    byStatus: Object.create(null) as Record<string, number>,
    replies: 0,
    ownerOnly: 0,
    noDirectRead: 0,
    excessivePermissions: 0,
    missingAuthor: 0,
  };
  let cursor: string | undefined;
  let expectedTotal: number | undefined;
  const seenIds = new Set<string>();
  for (;;) {
    const page = await reader.listRows({
      databaseId, tableId: 'community_comments',
      queries: [Query.orderAsc('$id'), Query.limit(100),
        ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    if (expectedTotal === undefined) expectedTotal = page.total;
    if (page.total !== expectedTotal)
      throw new Error('Inventário de ACL instável: total mudou durante a paginação.');
    for (const row of page.rows) {
      if (!row.$id || seenIds.has(row.$id))
        throw new Error('Inventário de ACL com ID ausente ou repetido.');
      seenIds.add(row.$id);
      result.totalRows++;
      if (row.targetType === 'lesson') { result.lessonRows++; continue; }
      if (row.targetType !== 'challenge') { result.otherTargetRows++; continue; }
      result.challengeRows++;
      const status = typeof row.status === 'string' ? row.status : 'unknown';
      result.byStatus[status] = (result.byStatus[status] ?? 0) + 1;
      if (row.parentId) result.replies++;
      const author = typeof row.authorId === 'string' ? row.authorId : '';
      if (!author) result.missingAuthor++;
      const permissions = row.$permissions;
      if (!Array.isArray(permissions)) { result.excessivePermissions++; continue; }
      if (permissions.length === 0) { result.noDirectRead++; continue; }
      if (author && permissions.length === 1 &&
          permissions[0] === Permission.read(Role.user(author))) result.ownerOnly++;
      else result.excessivePermissions++;
    }
    if (page.rows.length < 100) break;
    const next = String(page.rows.at(-1)?.$id ?? '');
    if (!next || next === cursor) throw new Error('Inventário de ACL sem avanço do cursor.');
    cursor = next;
  }
  if (result.totalRows !== expectedTotal)
    throw new Error('Inventário de ACL incompleto: linhas paginadas não batem com total.');
  result.ready = result.rowSecurity && result.tablePermissions.length === 0 &&
    result.excessivePermissions === 0 && result.missingAuthor === 0 &&
    result.otherTargetRows === 0;
  return result;
}
