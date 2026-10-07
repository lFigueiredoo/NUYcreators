import 'server-only';

/**
 * Transações do TablesDB — superfície de servidor do adaptador.
 *
 * A implementação e o contrato medido vivem em `./contract`, que é puro (sem
 * `server-only`) porque o core operacional também é empacotado nas Appwrite
 * Functions. Este arquivo mantém o marcador de servidor no caminho do app.
 */
export {
  BOUND_VIOLATED,
  CONFLICT,
  TRANSACTION_TTL_SECONDS,
  commitTransaction,
  decrementColumn,
  discardTransaction,
  incrementColumn,
  isAbsent,
  isConflict,
  openTransaction,
  refusal,
  rollbackTransaction,
  sanitize,
  type Refusal,
  type Transactions,
} from './contract';
