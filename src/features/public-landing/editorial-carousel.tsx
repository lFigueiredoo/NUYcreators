'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
const delay = 4_500;
const options = {
  align: 'start' as const,
  slidesToScroll: 1,
  loop: true,
  dragFree: false,
  skipSnaps: false,
  duration: 70,
};

export function EditorialCarousel() {
  const [viewportRef, embla] = useEmblaCarousel(options);
  const viewport = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [reduced, setReduced] = useState(false);

  const setViewport = useCallback(
    (node: HTMLDivElement | null) => {
      viewport.current = node;
      viewportRef(node);
    },
    [viewportRef],
  );

  useEffect(() => {
    if (!embla || !viewport.current) return;

    const element = viewport.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state = {
      visible: false,
      pageVisible: document.visibilityState === 'visible',
      reduced: motion.matches,
      manualAnnouncement: false,
      interval: null as number | null,
    };

    const stopAutoplay = () => {
      if (state.interval !== null) window.clearInterval(state.interval);
      state.interval = null;
    };
    const canAutoplay = () =>
      state.visible && state.pageVisible && !state.reduced;
    const startAutoplay = () => {
      stopAutoplay();
      if (!canAutoplay()) return;
      state.interval = window.setInterval(() => {
        if (canAutoplay()) embla.scrollNext();
      }, delay);
    };

    const updatePosition = () => {
      setPosition(embla.selectedScrollSnap());
    };
    const onSelect = () => {
      updatePosition();
      if (state.manualAnnouncement) {
        const current = embla.selectedScrollSnap();
        setAnnouncement(
          `Mostrando @${creators[current].handle}, foto ${current + 1} de ${creators.length}.`,
        );
        state.manualAnnouncement = false;
      }
    };
    const onReInit = () => {
      updatePosition();
      startAutoplay();
    };
    const onVisibility = () => {
      state.pageVisible = document.visibilityState === 'visible';
      startAutoplay();
    };
    const onMotionChange = () => {
      state.reduced = motion.matches;
      setReduced(state.reduced);
      embla.reInit({
        ...options,
        duration: state.reduced ? 0 : options.duration,
        watchDrag: !state.reduced,
      });
      startAutoplay();
    };
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            ([entry]) => {
              state.visible = entry.isIntersecting || entry.intersectionRatio > 0;
              startAutoplay();
            },
            { threshold: 0, rootMargin: '0px' },
          )
        : null;

    state.visible = observer === null;
    observer?.observe(element);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotionChange);
    embla.on('select', onSelect);
    embla.on('reInit', onReInit);
    updatePosition();
    setReduced(motion.matches);
    if (motion.matches) {
      embla.reInit({ ...options, duration: 0, watchDrag: false });
    }

    return () => {
      stopAutoplay();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotionChange);
      embla.off('select', onSelect);
      embla.off('reInit', onReInit);
    };
  }, [embla]);

  function moveTo(index: number) {
    if (!embla) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnnouncement(
      `Mostrando @${creators[index].handle}, foto ${index + 1} de ${creators.length}.`,
    );
    embla.scrollTo(index, reducedMotion);
  }

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = embla?.selectedScrollSnap() ?? position;
    const nextIndex =
      event.key === 'ArrowLeft'
        ? (current - 1 + creators.length) % creators.length
        : event.key === 'ArrowRight'
          ? (current + 1) % creators.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? creators.length - 1
              : null;
    if (nextIndex === null) return;
    event.preventDefault();
    moveTo(nextIndex);
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
        <span className={styles.visuallyHidden}>
          {reduced
            ? 'O carrossel está parado porque o movimento reduzido está ativado.'
            : 'As fotos avançam automaticamente.'}
        </span>
        <div
          id={carouselId}
          className={styles.viewport}
          ref={setViewport}
          role="group"
          aria-label="Fotos das criadoras NUY"
          aria-live="off"
          tabIndex={0}
        >
          <div className={styles.track}>
            {creators.map(({ handle, width, height }, index) => (
              <figure
                key={handle}
                className={styles.person}
                role="group"
                aria-roledescription="slide"
                aria-label={`${handle}, ${index + 1} de ${creators.length}`}
              >
                <div className={styles.photoFrame}>
                  <Image
                    className={styles.photo}
                    src={`/brand/editorial/influenciadoras/${handle}.webp`}
                    width={width}
                    height={height}
                    sizes="(min-width: 1200px) 270px, (min-width: 768px) 30vw, (min-width: 480px) 45vw, 82vw"
                    alt={`Conteúdo de @${handle} com produtos NUY.`}
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                <figcaption className={styles.handle} translate="no">
                  @{handle}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className={styles.progress} aria-hidden="true">
          {creators.map(({ handle }, index) => (
            <span
              key={handle}
              className={styles.progressStep}
              data-current={position === index}
              data-index={index}
            />
          ))}
        </div>
        <span className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </section>
  );
}
