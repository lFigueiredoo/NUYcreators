import { Query } from 'node-appwrite';
import {
  createTableRow,
  getTableRow,
  isAbsent,
  listTableRows,
  updateTableRow,
  type Row,
} from '../../../lib/appwrite/data/contract';
import { done, failure, type CoreContext, type CoreResult } from './context';
import { rowId } from './ids';

/**
 * Notificações — leitura da própria dona e o comando de marcar como lida.
 *
 * A escrita é de servidor porque a linha nasce com `read(user:<id>)` e nada
 * mais (medido em staging: sessão não cria linha e só altera o que tem
 * `update`). Quem manda no "lida" é a dona da notificação: a linha é conferida
 * contra a identidade da sessão ANTES de gravar, e notificação de outra pessoa
 * responde como inexistente — "não é sua" e "não existe" não são recados
 * diferentes para quem não é o dono.
 */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function setNotificationRead(
  ctx: CoreContext,
  input: { notificationId: string; read: boolean },
): Promise<CoreResult<{ notificationId: string; readAt: string | null }>> {
  if (!ctx.actor.userId) return failure('unauthenticated');
  const notificationId = (input.notificationId ?? '').trim();
  if (!notificationId || notificationId.length > 36) return failure('invalid');

  let row: Row;
  try {
    row = await getTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'notifications',
      rowId: notificationId,
    });
  } catch (error) {
    if (isAbsent(error)) return failure('not_found');
    throw error;
  }
  if (text(row.userId) !== ctx.actor.userId) return failure('not_found');

  const readAt = input.read ? ctx.now.toISOString() : null;
  await updateTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'notifications',
    rowId: notificationId,
    // Desmarcar precisa voltar a coluna para nulo: a contagem de não lidas usa
    // `isNull(readAt)`, então string vazia contaria como lida.
    data: { readAt },
  });
  return done({ notificationId, readAt });
}

/**
 * Marca todas as não lidas como lidas — o mesmo comando, aplicado à lista da
 * própria usuária. Devolve quantas linhas mudaram de estado.
 */
export async function markAllNotificationsRead(
  ctx: CoreContext,
): Promise<CoreResult<{ updated: number }>> {
  if (!ctx.actor.userId) return failure('unauthenticated');
  const pending = await listTableRows(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'notifications',
    queries: [Query.equal('userId', ctx.actor.userId), Query.isNull('readAt'), Query.limit(500)],
  });
  let updated = 0;
  for (const row of pending.rows) {
    await updateTableRow(ctx.tables, {
      databaseId: ctx.databaseId,
      tableId: 'notifications',
      rowId: String(row.$id),
      data: { readAt: ctx.now.toISOString() },
    });
    updated += 1;
  }
  return done({ updated });
}

/**
 * Entrega uma notificação da usuária.
 *
 * `[eventKey, userId]` é única: reprocessar o mesmo evento não cria segunda
 * notificação. Usada pelo consumidor de outbox.
 */
export async function deliverNotification(
  ctx: CoreContext,
  input: {
    userId: string;
    eventKey: string;
    type: string;
    title: string;
    body: string;
    referenceId?: string | null;
  },
): Promise<string> {
  const id = notificationId(input.userId, input.eventKey);
  const existing = await getTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'notifications',
    rowId: id,
  }).catch((error: unknown) => {
    if (isAbsent(error)) return null;
    throw error;
  });
  if (existing) return id;
  await createTableRow(ctx.tables, {
    databaseId: ctx.databaseId,
    tableId: 'notifications',
    rowId: id,
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 255),
      body: input.body.slice(0, 2000),
      referenceId: input.referenceId ?? '',
      eventKey: input.eventKey,
    },
    permissions: [`read("user:${input.userId}")`],
  });
  return id;
}

function notificationId(userId: string, eventKey: string): string {
  // Id determinístico: o mesmo evento para a mesma pessoa é a mesma linha.
  return rowId('notify', userId, eventKey);
}
