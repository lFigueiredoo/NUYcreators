'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MessageCircle, ShieldAlert } from 'lucide-react';
import type { AcademyComment, AcademyLoad } from '../domain';
import {
  editAcademyCommentAction, hideAcademyCommentAction, postAcademyCommentAction,
  reportAcademyCommentAction,
} from '../services/actions';
import styles from '../academy.module.css';

export function CommunityComments({ target, targetId, comments, viewerId }: {
  target: 'aula' | 'desafio'; targetId: string;
  comments: AcademyLoad<AcademyComment>; viewerId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const active = comments.state === 'ok';
  const targetType = target === 'aula' ? 'lesson' : 'challenge';
  function submit() {
    start(async () => {
      const result = editing
        ? await editAcademyCommentAction(editing, body)
        : await postAcademyCommentAction({ targetType, targetId, parentId: replyTo, body, idempotencyKey });
      setMessage(result.ok ? 'Comentário recebido. Aguardando aprovação.' : result.message);
      if (result.ok) { setBody(''); setReplyTo(null); setEditing(null);
        setIdempotencyKey(crypto.randomUUID()); router.refresh(); }
    });
  }
  return (
    <section className={styles.panel} aria-label={`Comentários do ${target}`}>
      <div className={styles.sectionHead}>
        <div><h2>Conversa da comunidade</h2>
          <p>Troque ideias sobre este {target} com outras creators.</p></div>
        <MessageCircle size={23} aria-hidden="true" />
      </div>
      <div className={styles.thread}>
        {active && comments.items.some((comment) => comment.status === 'visible') ?
          comments.items.filter((comment) => comment.status === 'visible').map((comment) => (
            <article className={styles.comment} key={comment.id}>
              <strong>{comment.authorId === viewerId ? 'Você' : 'Creator NUY'}</strong>
              <p>{comment.body}</p>
              <small>{new Date(comment.createdAt).toLocaleDateString('pt-BR')}</small>
              <div className={styles.editorActions}>
                <button className={`${styles.button} ${styles.buttonSecondary}`} type="button"
                  disabled={pending} onClick={() => { setReplyTo(comment.id); setEditing(null); setBody(''); }}>
                  Responder
                </button>
                {comment.authorId === viewerId ? <>
                  <button className={`${styles.button} ${styles.buttonSecondary}`} type="button"
                    disabled={pending} onClick={() => { setEditing(comment.id); setReplyTo(null); setBody(comment.body); }}>
                    Editar
                  </button>
                  <button className={`${styles.button} ${styles.buttonSecondary}`} type="button"
                    disabled={pending} onClick={() => start(async () => {
                      const result = await hideAcademyCommentAction(comment.id);
                      setMessage(result.message); if (result.ok) router.refresh();
                    })}>Ocultar</button>
                </> : <button className={`${styles.button} ${styles.buttonSecondary}`}
                  type="button" disabled={pending} onClick={() => start(async () => {
                    const result = await reportAcademyCommentAction({
                      commentId: comment.id, reason: 'Solicito revisão deste comentário.',
                    });
                    setMessage(result.ok ? 'Denúncia recebida pela equipe.' : result.message);
                  })}>Denunciar</button>}
              </div>
            </article>
          )) : <p className={styles.muted}>
            {comments.state === 'unavailable'
              ? 'Não foi possível carregar os comentários. Tente novamente mais tarde.'
              : comments.state === 'pending' ? 'As conversas estarão disponíveis em breve.'
                : 'Ainda não há comentários publicados.'}
          </p>}
        {replyTo || editing ? <p className={styles.muted}>
          {editing ? 'Editando seu comentário' : 'Respondendo ao comentário'}
          <button type="button" onClick={() => { setEditing(null); setReplyTo(null); setBody(''); }}>
            Cancelar
          </button></p> : null}
        <label className={styles.field} htmlFor={`comment-${target}`}>
          Seu comentário
          <textarea id={`comment-${target}`} className={styles.textarea}
            placeholder="Compartilhe uma dúvida ou descoberta" maxLength={4000}
            value={body} onChange={(event) => setBody(event.target.value)} disabled={!active || pending} />
        </label>
        <div className={styles.editorActions}>
          <button type="button" className={styles.button} disabled={!active || pending || body.trim().length < 2}
            onClick={submit}>{pending ? 'Enviando...' : editing ? 'Salvar edição' : 'Publicar comentário'}</button>
          <span className={styles.muted}><ShieldAlert size={15} aria-hidden="true" />
            {active ? 'Comentários passam por aprovação antes de aparecer.'
              : 'Você poderá participar da conversa em breve.'}</span>
        </div>
        {message ? <p className={styles.muted} role="status">{message}</p> : null}
      </div>
    </section>
  );
}
