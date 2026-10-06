import Link from 'next/link';
import { ArrowRight, Bell, Info } from 'lucide-react';
import { longDate } from '../domain/format';
import { notificationType } from '../domain/status';
import type { NotificationsView } from '../services/notifications';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Notificações da própria usuária — os avisos que o backend registrou.
 *
 * Não existe "marcar como lida": quem grava `readAt` é o serviço de
 * notificações, ainda não implementado. O botão só apareceria quando ele
 * existisse; até lá a tela diz isso com todas as letras em vez de exibir um
 * controle que não grava nada.
 */
export function NotificationsScreen({ view }: { view: NotificationsView }) {
  const items = view.items.state === 'ok' ? view.items.items : [];
  const unavailable = view.items.state === 'unavailable';

  return (
    <>
      <ScreenHeader
        kicker="Notificações"
        title="Suas notificações"
        intro={
          view.unread && view.unread > 0
            ? `${view.unread} ${view.unread === 1 ? 'aviso não lido' : 'avisos não lidos'} de ${items.length} nesta central.`
            : 'Avisos sobre seus desafios, conteúdos, pontos e recompensas.'
        }
      />

      {unavailable ? (
        <UnavailableState what="suas notificações" />
      ) : (
        <>
          <div className={styles.note} role="status">
            <span className={styles.noteIcon} aria-hidden="true">
              <Info size={18} />
            </span>
            <div className={styles.noteBody}>
              <p className={styles.noteTitle}>Marcar como lida ainda não está disponível.</p>
              <p className={styles.noteText}>
                O registro de leitura é gravado pelo serviço de notificações, que ainda não entrou
                no ar. Os avisos abaixo são reais e continuam aqui — nada é apagado.
              </p>
            </div>
          </div>

          <Block title="Avisos">
            {items.length > 0 ? (
              <ul className={styles.notifList}>
                {items.map((item) => {
                  const category = notificationType(item.type);
                  const unread = !item.readAt;
                  return (
                    <li
                      key={item.id}
                      className={unread ? `${styles.notif} ${styles.notifUnread}` : styles.notif}
                    >
                      <div className={styles.notifMain}>
                        <div className={styles.notifTop}>
                          <Pill view={category} />
                          <span className={styles.notifDate}>{longDate(item.createdAt)}</span>
                          {unread ? <span className={styles.unreadTag}>Não lida</span> : null}
                        </div>
                        <h3 className={styles.itemTitle}>{item.title}</h3>
                        <p className={styles.itemText}>{item.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<Bell size={18} />}
                title="Nenhum aviso por aqui."
                text="Quando algo acontecer nos seus desafios, conteúdos ou pontos, a novidade aparece nesta central."
                action={
                  <Link
                    href="/app/desafios?aba=available"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Explorar desafios
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                }
              />
            )}
          </Block>
        </>
      )}
    </>
  );
}
