import 'server-only';
import { Query } from 'node-appwrite';
import { countSession, listSession, optionalText, text, type Document, type Loaded } from './read';

const SCOPE = 'notificacoes';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsView = {
  items: Loaded<NotificationItem>;
  /** Contagem exata de não lidas; `null` quando não foi possível contar. */
  unread: number | null;
};

function mapNotification(document: Document): NotificationItem {
  return {
    id: text(document.$id),
    type: text(document.type),
    title: text(document.title),
    body: text(document.body),
    readAt: optionalText(document.readAt),
    createdAt: text(document.createdAt) || text((document as { $createdAt?: unknown }).$createdAt),
  };
}

/**
 * Notificações da própria usuária — leitura de proprietário
 * (docs/database.md §Permissões). Não há ação de "marcar como lida" aqui: a
 * escrita é da function de ownership, que ainda não existe, e um botão que não
 * grava nada seria mentira.
 */
/** Só a contagem — usada pelo cromo do shell, sem carregar a lista. */
export async function loadUnreadCount(secret: string, userId: string): Promise<number | null> {
  return countSession(secret, SCOPE, 'notifications', [
    Query.equal('userId', userId),
    Query.isNull('readAt'),
  ]);
}

export async function loadNotifications(
  secret: string,
  userId: string,
  limit = 50,
): Promise<NotificationsView> {
  const [items, unread] = await Promise.all([
    listSession(secret, SCOPE, 'notifications', mapNotification, {
      queries: [Query.equal('userId', userId), Query.orderDesc('$createdAt')],
      limit,
      paged: true,
    }),
    countSession(secret, SCOPE, 'notifications', [
      Query.equal('userId', userId),
      Query.isNull('readAt'),
    ]),
  ]);
  return { items, unread };
}
