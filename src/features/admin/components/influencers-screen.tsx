'use client';

import Image from 'next/image';
import { useActionState, useRef } from 'react';
import { CircleCheck, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { influencerImageAction, type FormState } from '../services/actions';
import styles from '../styles/admin.module.css';

const EMPTY: FormState = { message: '' };

export function InfluencersScreen({
  influencers,
}: {
  influencers: readonly {
    handle: string;
    width: number;
    height: number;
    src: string;
    fileId?: string;
  }[];
}) {
  return (
    <div className={styles.admin}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Conteúdo público</p>
          <h1>Fotos das influencers</h1>
          <p className={styles.lede}>
            Troque as imagens que aparecem na faixa de influencers da página inicial.
          </p>
        </div>
      </header>
      <div className={styles.cardGrid}>
        {influencers.map((influencer) => (
          <InfluencerCard key={influencer.handle} influencer={influencer} />
        ))}
      </div>
    </div>
  );
}

function InfluencerCard({
  influencer,
}: {
  influencer: {
    handle: string;
    width: number;
    height: number;
    src: string;
    fileId?: string;
  };
}) {
  const [state, action, pending] = useActionState(influencerImageAction, EMPTY);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <article className={styles.card}>
      <div style={{ aspectRatio: `${influencer.width} / ${influencer.height}`, position: 'relative' }}>
        <Image src={influencer.src} alt={`Prévia de @${influencer.handle}`} fill sizes="320px" style={{ objectFit: 'cover' }} />
      </div>
      <div className={styles.cardBody}>
        <h2>@{influencer.handle}</h2>
        <form action={action}>
          <input type="hidden" name="handle" value={influencer.handle} />
          <input type="hidden" name="currentFileId" value={influencer.fileId ?? ''} />
          <input ref={inputRef} type="file" name="image" accept="image/jpeg,image/png,image/webp" hidden />
          <button type="button" className={styles.button} onClick={() => inputRef.current?.click()}>
            <Upload size={15} aria-hidden="true" /> Escolher nova foto
          </button>
          <button type="submit" name="remove" value="true" className={styles.buttonSecondary} disabled={!influencer.fileId || pending}>
            <Trash2 size={15} aria-hidden="true" /> Remover foto
          </button>
          <button type="submit" className={styles.button} disabled={pending}>
            {pending ? <LoaderCircle size={15} className={styles.spin} /> : <CircleCheck size={15} />}
            Salvar foto escolhida
          </button>
          {state.message && <p role={state.success ? 'status' : 'alert'}>{state.message}</p>}
        </form>
      </div>
    </article>
  );
}
