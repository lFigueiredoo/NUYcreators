import 'server-only';

/**
 * Auditoria — superfície de servidor do adaptador.
 *
 * O único mapeamento não 1:1 da migração para TablesDB está documentado em
 * `./contract`, onde a implementação vive (pura, sem `server-only`, porque o
 * core operacional também grava auditoria dentro das Appwrite Functions).
 */
export {
  AUDIT_SNAPSHOTS_TABLE,
  SNAPSHOT_SIDES,
  composeAuditLog,
  snapshotRowId,
  splitAuditLog,
  type SnapshotSide,
} from './contract';
