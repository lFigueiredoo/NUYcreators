'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { completeAcademyLessonAction } from '../services/actions';
import styles from '../academy.module.css';

export function LessonProgress({ lessonId, completed, enabled }: {
  lessonId: string; completed: boolean; enabled: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return <>
    <p>{done ? 'Aula concluída.' : 'Marque esta aula quando terminar.'}</p>
    <button className={styles.button} type="button" disabled={!enabled || done || pending}
      onClick={() => start(async () => {
        const result = await completeAcademyLessonAction(lessonId);
        setMessage(result.message);
        if (result.ok) { setDone(true); router.refresh(); }
      })}>
      {pending ? 'Registrando...' : done ? 'Concluída' : 'Marcar como concluída'}
    </button>
    {message ? <p className={styles.muted} role="status">{message}</p> : null}
  </>;
}
