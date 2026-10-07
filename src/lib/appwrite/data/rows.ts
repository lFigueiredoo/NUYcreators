import 'server-only';

/**
 * Leitura/escrita de linhas — superfície de servidor do adaptador.
 *
 * A implementação vive em `./contract`, que é puro (sem `server-only`) porque o
 * core operacional também é empacotado nas Appwrite Functions. Este arquivo
 * existe para manter o marcador de servidor no caminho do app e para que
 * `src/lib/appwrite/data` continue sendo o único import do domínio.
 */
export {
  countTableRows,
  createTableRow,
  getTableRow,
  listTableRows,
  normalizeRow,
  updateTableRow,
  type Row,
  type Tables,
} from './contract';
