'use client';

import Image from 'next/image';
import { type KeyboardEvent, useState } from 'react';
import styles from './styles/editorial-carousel.module.css';

const creators = [
  { handle: 'thay_emilyane', width: 345, height: 504 },
  { handle: 'jusouza_blog', width: 348, height: 500 },
  { handle: 'ledianemartins', width: 349, height: 503 },
  { handle: 'larissacamposs1', width: 349, height: 504 },
  { handle: 'mariannemarie94', width: 347, height: 505 },
  { handle: 'julianavilargh', width: 346, height: 496 },
  { handle: 'bylaricavalcanti', width: 345, height: 502 },
] as const;

const carouselId = 'editorial-creator-track';

export function EditorialCarousel() {
  const [announcement, setAnnouncement] = useState('');

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = creators.findIndex(({ handle }) =>
      announcement.includes(`@${handle}`),
    );
    const index =
      event.key === 'ArrowRight'
        ? (current + 1 + creators.length) % creators.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + creators.length) % creators.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? creators.length - 1
              : -1;
    if (index < 0) return;
    event.preventDefault();
    setAnnouncement(
      `Mostrando @${creators[index].handle}, foto ${index + 1} de ${creators.length}.`,
    );
  }

  return (
    <section
      id="comunidade"
      className={styles.community}
      aria-labelledby="editorial-community-title"
      aria-roledescription="carrossel"
      tabIndex={-1}
      onKeyDown={handleKey}
    >
      <div className={styles.shell}>
        <header className={styles.heading}>
          <h2 id="editorial-community-title" className={styles.title}>
            Feito com quem
            <br /> cuida da casa.
          </h2>
          <p className={styles.subtitle}>
            Conheça as influenciadoras que compartilham suas rotinas com a{' '}
            <span translate="no">NUY</span>.
          </p>
        </header>
        <p className={styles.visuallyHidden}>
          As fotos das influenciadoras passam continuamente.
        </p>
        <div
          id={carouselId}
          className={styles.viewport}
          role="group"
          aria-label="Fotos das criadoras NUY"
          tabIndex={0}
          onKeyDown={handleKey}
        >
          <div className={styles.track}>
            {[...creators, ...creators].map(({ handle, width, height }, index) => {
              const duplicate = index >= creators.length;
              return (
                <figure
                  key={`${handle}-${duplicate ? 'duplicate' : 'original'}`}
                  className={styles.person}
                  role={duplicate ? undefined : 'group'}
                  aria-roledescription={duplicate ? undefined : 'slide'}
                  aria-label={
                    duplicate ? undefined : `${handle}, ${index + 1} de ${creators.length}`
                  }
                  aria-hidden={duplicate}
                >
                  <div className={styles.photoFrame}>
                    <Image
                      className={styles.photo}
                      src={`/brand/editorial/influenciadoras/${handle}.webp`}
                      width={width}
                      height={height}
                      sizes="(min-width: 1200px) 270px, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 82vw"
                      alt={duplicate ? '' : `Conteúdo de @${handle} com produtos NUY.`}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      draggable={false}
                    />
                  </div>
                  <figcaption className={styles.handle} translate="no">
                    @{handle}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
        <span className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </section>
  );
}
