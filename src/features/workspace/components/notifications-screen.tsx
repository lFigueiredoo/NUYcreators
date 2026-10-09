import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Coins,
  Gift,
  Info,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { longDate } from '../domain/format';
import { notificationLink, notificationType } from '../domain/status';
import type { NotificationsView } from '../services/notifications';
import { NotificationReadForm, NotificationsReadAllForm } from './core-forms';
import { Pill } from './ui/pill';
import { Block, ScreenHeader } from './ui/screen';
import { EmptyState, UnavailableState } from './ui/state';
import styles from '../styles/app.module.css';

/**
 * Um ícone por CATEGORIA de aviso — as mesmas quatro categorias que o chip já
 * nomeia (o mapa é `notificationType`, dono da tradução do evento) e os mesmos
 * ícones da navegação, para "Desafio" querer dizer a mesma coisa nos dois
 * lugares. A chave é o RÓTULO, não o tipo do evento: um evento novo cai no sino
 * genérico em vez de herdar por engano o ícone de outra categoria.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Desafio: Sparkles,
  Conteúdo: PenLine,
  Recompensa: Gift,
  Pontos: Coins,
};

const categoryIcon = (label: string): LucideIcon => CATEGORY_ICON[label] ?? Bell;

/**
 * Notificações da própria usuária — os avisos que o backend registrou.
 *
 * Quem grava `readAt` é o servidor, na linha da própria dona. Sem a chave de
 * operação configurada, a tela diz isso com todas as letras em vez de exibir um
 * controle que não grava nada.
 */
export function NotificationsScreen({
  view,
  readEnabled,
}: {
  view: NotificationsView;
  readEnabled: boolean;
}) {
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
        className={styles.enter}
        action={readEnabled ? <NotificationsReadAllForm unread={view.unread ?? 0} /> : undefined}
      />

      {unavailable ? (
        <UnavailableState what="suas notificações" />
      ) : (
        <>
          {readEnabled ? null : (
            <div className={`${styles.note} ${styles.enter} ${styles.i1}`} role="status">
              <span className={styles.noteIcon} aria-hidden="true">
                <Info size={18} />
              </span>
              <div className={styles.noteBody}>
                <p className={styles.noteTitle}>Marcar como lida ainda não está disponível.</p>
                <p className={styles.noteText}>
                  O registro de leitura é gravado pelo servidor e depende da operação configurada
                  neste ambiente. Os avisos abaixo são reais e continuam aqui — nada é apagado.
                </p>
              </div>
            </div>
          )}

          <Block title="Avisos" className={`${styles.enter} ${styles.i2}`}>
            {items.length > 0 ? (
              <ul className={styles.notifList}>
                {items.map((item) => {
                  const category = notificationType(item.type);
                  const destination = notificationLink(item);
                  const unread = !item.readAt;
                  return (
                    <li
                      key={item.id}
                      className={unread ? `${styles.notif} ${styles.notifUnread}` : styles.notif}
                    >
                      <div className={styles.notifMain}>
                        <div className={styles.notifTop}>
                          <Pill view={category} icon={categoryIcon(category.label)} />
                          <span className={styles.notifDate}>{longDate(item.createdAt)}</span>
                          {unread ? <span className={styles.unreadTag}>Não lida</span> : null}
                          {/* A ação da linha sobe para o cabeçalho: sozinha na
                              linha de baixo, um botão por aviso fazia da lista
                              uma parede de botões. */}
                          {readEnabled ? (
                            <div className={styles.notifAction}>
                              <NotificationReadForm notificationId={item.id} read={!unread} />
                            </div>
                          ) : null}
                        </div>
                        <h3 className={styles.itemTitle}>{item.title}</h3>
                        <p className={styles.itemText}>{item.body}</p>
                        {destination ? (
                          // Só texto: o SVG é `display:block` no reset global e a
                          // seta caía sozinha na linha de baixo. O verbo "Ver" já
                          // diz que é caminho, e é o que os outros links da área usam.
                          <Link href={destination.href} className={styles.blockLink}>
                            {destination.label}
                          </Link>
                        ) : null}
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
