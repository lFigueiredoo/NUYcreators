import { MessageCircle, ShieldAlert } from 'lucide-react';
import type { AcademyComment, AcademyLoad } from '../domain';
import styles from '../academy.module.css';

/** Mesma conversa poderá ser usada por aula e desafio; a escrita segue fechada até a migração. */
export function CommunityComments({
  target,
  comments,
  viewerId,
}: {
  target: 'aula' | 'desafio';
  comments: AcademyLoad<AcademyComment>;
  viewerId: string;
}) {
  return (
    <section className={styles.panel} aria-label={`Comentários do ${target}`}>
      <div className={styles.sectionHead}>
        <div>
          <h2>Conversa da comunidade</h2>
          <p>Troque ideias sobre este {target} com outras creators.</p>
        </div>
        <MessageCircle size={23} aria-hidden="true" />
      </div>
      <div className={styles.thread}>
        {comments.state === 'ok' &&
        comments.items.some((comment) => comment.status === 'visible') ? (
          comments.items
            .filter((comment) => comment.status === 'visible')
            .map((comment) => (
              <article className={styles.comment} key={comment.id}>
                <strong>{comment.authorId === viewerId ? 'Você' : 'Creator NUY'}</strong>
                <p>{comment.body}</p>
                <small>{new Date(comment.createdAt).toLocaleDateString('pt-BR')}</small>
                <div className={styles.editorActions}>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    type="button"
                    disabled
                    title="Disponível após a ativação segura dos comentários"
                  >
                    Responder
                  </button>
                  {comment.authorId === viewerId ? (
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      type="button"
                      disabled
                      title="Disponível após a ativação segura dos comentários"
                    >
                      Editar ou excluir
                    </button>
                  ) : null}
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    type="button"
                    disabled
                    title="Disponível após a ativação segura dos comentários"
                  >
                    Denunciar
                  </button>
                </div>
              </article>
            ))
        ) : (
          <p className={styles.muted}>
            {comments.state === 'unavailable'
              ? 'Não foi possível carregar os comentários. Tente novamente mais tarde.'
              : comments.state === 'pending'
                ? 'As conversas estarão disponíveis em breve.'
                : 'Ainda não há comentários publicados.'}
          </p>
        )}
        <label className={styles.field} htmlFor={`comment-${target}`}>
          Seu comentário
          <textarea
            id={`comment-${target}`}
            className={styles.textarea}
            placeholder="Compartilhe uma dúvida ou descoberta"
            disabled
          />
        </label>
        <div className={styles.editorActions}>
          <button type="button" className={styles.button} disabled>
            Publicar comentário
          </button>
          <span className={styles.muted}>
            <ShieldAlert size={15} aria-hidden="true" /> Você poderá participar da conversa em
            breve.
          </span>
        </div>
      </div>
    </section>
  );
}
