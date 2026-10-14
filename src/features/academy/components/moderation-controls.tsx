'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { moderateAcademyCommentAction, replyAsAcademyStaffAction } from '../services/actions';
import type { AcademyModerationComment } from '../domain';
import styles from '../academy.module.css';

export function AcademyModerationControls({ comment, enabled }: {
  comment: AcademyModerationComment; enabled: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [reply, setReply] = useState('');
  const [message, setMessage] = useState('');
  const [replyKey, setReplyKey] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  function moderate(to: 'visible' | 'hidden' | 'rejected') {
    if (comment.status === 'unknown') return;
    start(async () => {
      const result = await moderateAcademyCommentAction({
        commentId: comment.id, expectedStatus: comment.status, to, reason,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }
  return <div className={styles.stack}>
    <div className={styles.editorActions}>
      {comment.status === 'pending' || comment.status === 'hidden' ? <>
        <button className={styles.button} type="button" disabled={!enabled || pending}
          onClick={() => moderate('visible')}>Aprovar</button>
        <button className={`${styles.button} ${styles.buttonSecondary}`} type="button"
          disabled={!enabled || pending} onClick={() => moderate('rejected')}>Rejeitar</button>
      </> : null}
      {comment.status === 'visible' ? <button className={`${styles.button} ${styles.buttonSecondary}`}
        type="button" disabled={!enabled || pending} onClick={() => moderate('hidden')}>
        Ocultar
      </button> : null}
    </div>
    {(comment.status === 'pending' || comment.status === 'visible' || comment.status === 'hidden') ? <>
      <label className={styles.field}>Motivo da moderação
        <input className={styles.input} maxLength={1000} value={reason}
          onChange={(event) => setReason(event.target.value)} disabled={!enabled || pending} />
      </label>
      {comment.status === 'visible' && comment.targetType !== 'unknown' ? <>
        <label className={styles.field}>Resposta da equipe
          <textarea className={styles.textarea} maxLength={4000} value={reply}
            onChange={(event) => setReply(event.target.value)} disabled={!enabled || pending} />
        </label>
        <button className={styles.button} type="button"
          disabled={!enabled || pending || reply.trim().length < 2}
          onClick={() => start(async () => {
            const result = await replyAsAcademyStaffAction(comment.targetType as 'lesson' | 'challenge',
              comment.targetId, comment.id, reply, replyKey);
            setMessage(result.ok ? 'Resposta enviada para aprovação.' : result.message);
            if (result.ok) { setReply(''); setReplyKey(crypto.randomUUID()); router.refresh(); }
          })}>Responder como equipe</button>
      </> : null}
    </> : null}
    {message ? <p className={styles.muted} role="status">{message}</p> : null}
  </div>;
}
