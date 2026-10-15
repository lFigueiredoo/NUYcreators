'use client';

import { useState, useTransition } from 'react';
import type { AcademyCategory } from '../domain';
import { saveAcademyCategoryAction } from '../services/actions';
import styles from '../academy.module.css';

export function AcademyCategoryForm({ category, enabled }: {
  category?: AcademyCategory; enabled: boolean;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [order, setOrder] = useState(category?.order ?? 0);
  const [active, setActive] = useState(category?.active ?? true);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveAcademyCategoryAction({ id: category?.id, name, slug,
        description, order, active });
      setMessage(result.message);
    });
  };
  return <form className={styles.stack} onSubmit={submit}>
    <label className={styles.field}>Nome
      <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)}
        maxLength={255} required disabled={!enabled || pending} />
    </label>
    <label className={styles.field}>Slug
      <input className={styles.input} value={slug} onChange={(event) => setSlug(event.target.value)}
        maxLength={80} required disabled={!enabled || pending || Boolean(category)} />
    </label>
    <label className={styles.field}>Descrição
      <textarea className={styles.textarea} value={description}
        onChange={(event) => setDescription(event.target.value)} maxLength={1000}
        disabled={!enabled || pending} />
    </label>
    <label className={styles.field}>Ordem
      <input className={styles.input} type="number" min={0} max={100000} value={order}
        onChange={(event) => setOrder(Number(event.target.value))} required
        disabled={!enabled || pending} />
    </label>
    {category ? <label className={styles.field}>
      <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)}
        disabled={!enabled || pending} /> Ativa
    </label> : null}
    <button type="submit" className={styles.button} disabled={!enabled || pending}>
      {pending ? 'Salvando…' : category ? 'Salvar alterações' : 'Criar categoria'}
    </button>
    {message ? <p role="status" className={styles.muted}>{message}</p> : null}
  </form>;
}
