import 'server-only';
import { Client, TablesDB } from 'node-appwrite';
import { getEnvironment } from '@/lib/env/server';

/**
 * Fábrica única de acesso a tabelas.
 *
 * A persistência do NUY Creators é TablesDB (tabela/linha), não mais
 * document/coleção. Este adaptador é o ÚNICO lugar do app que constrói o cliente
 * TablesDB e conhece o nome das tabelas: workspace e domínio seguem lendo
 * objetos de negócio. Trocar o SDK de novo é uma mudança local aqui.
 *
 * O cliente é sempre construído do ambiente (endpoint + projeto) e recebe ou o
 * segredo da sessão da própria usuária ou uma chave de servidor. Nenhuma chave
 * entra em código de cliente, log ou resposta.
 */
function baseClient() {
  const env = getEnvironment();
  if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID)
    throw new Error('Appwrite ainda não configurado.');
  return new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID);
}

/** Tabelas com a sessão da usuária: permissão de linha é cobrada pelo Appwrite. */
export function sessionTables(secret: string): TablesDB {
  return new TablesDB(baseClient().setSession(secret));
}

/** Tabelas com chave de servidor: só onde a operação exige privilégio de admin. */
export function keyTables(key: string): TablesDB {
  return new TablesDB(baseClient().setKey(key));
}

/**
 * Tabelas com a chave de OPERAÇÃO.
 *
 * Medido (scripts/diag-write-path.mjs): a sessão da usuária leva 401
 * `user_unauthorized` em `createRow` mesmo em tabela com `rowSecurity` e
 * permissão própria — por desenho, toda escrita passa pelo servidor. Esta chave
 * é o caminho dessa escrita: `rows.read` + `rows.write`, distinta das outras três
 * (o guard de `infra/appwrite/identity.ts` cobra isso). Ausente, a operação fica
 * desligada e as telas continuam em modo leitura — nunca caímos na chave de
 * provisionamento.
 */
export function opsTables(): TablesDB {
  const key = process.env.APPWRITE_OPS_API_KEY;
  if (!key) throw new Error('Operação ainda não configurada.');
  return keyTables(key);
}

export function operationsConfigured() {
  return Boolean(process.env.APPWRITE_OPS_API_KEY && getEnvironment().APPWRITE_PROJECT_ID);
}

export function tablesFrom(client: Client): TablesDB {
  return new TablesDB(client);
}

export function databaseId(): string {
  return getEnvironment().APPWRITE_DATABASE_ID;
}
