'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './landing.module.css';

/** Mounted only on the landing. All GSAP styles/listeners are reverted on navigation. */
export function PublicMotion() {
  useEffect(() => {
    const root = document.querySelector(`.${styles.experience}`);
    if (!root) return;
    const animateHero = !root.querySelector('[data-static-artboard]');
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Touch keeps native scrolling; desktop Lenis shares GSAP's animation clock.
      const lenis = window.matchMedia('(pointer: fine)').matches
        ? new Lenis({ anchors: true, duration: 1, syncTouch: false })
        : undefined;
      const tick = (time: number) => lenis?.raf(time * 1000);
      lenis?.on('scroll', ScrollTrigger.update);
      if (lenis) gsap.ticker.add(tick);
      const context = gsap.context(() => {
        if (animateHero) {
          gsap.from('[data-hero-reveal]', {
            y: 20,
            opacity: 0,
            stagger: 0.12,
            duration: 1.1,
            ease: 'power3.out',
            clearProps: 'all',
          });
          gsap.from(`.${styles.hero} .${styles.productLayer}`, {
            opacity: 0,
            scale: 0.95,
            duration: 1.6,
            ease: 'power2.out',
          });
          gsap.from(`.${styles.hero} .${styles.referenceBouquet}`, {
            y: 10,
            opacity: 0,
            delay: 0.4,
            duration: 1.4,
          });
        }
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
          gsap.from(element, {
            y: 26,
            opacity: 0,
            duration: 0.85,
            ease: 'power2.out',
            clearProps: 'all',
            scrollTrigger: { trigger: element, start: 'top 92%', once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>('[data-image-reveal]').forEach((element) => {
          gsap.from(element, {
            clipPath: 'inset(8% 0 8% 0)',
            opacity: 0,
            duration: 1.2,
            ease: 'power2.out',
            clearProps: 'all',
            scrollTrigger: { trigger: element, start: 'top 92%', once: true },
          });
        });
        gsap.utils
          .toArray<SVGPathElement>(`.${styles.journeyLine} path, .${styles.mobileJourneyLine} path`)
          .forEach((path) => {
            const length = path.getTotalLength();
            gsap.fromTo(
              path,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                  trigger: `.${styles.levelSection}`,
                  start: 'top 85%',
                  end: 'bottom 65%',
                  scrub: 0.8,
                },
              },
            );
          });
        gsap.utils.toArray<SVGPathElement>(`.${styles.howLine} path`).forEach((path) => {
          const length = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: `.${styles.how}`,
                start: 'top 75%',
                end: 'center 42%',
                scrub: 0.8,
              },
            },
          );
        });
        if (animateHero && window.matchMedia('(min-width: 761px) and (pointer: fine)').matches) {
          gsap.to(`.${styles.hero} .${styles.productLayer}`, {
            y: 12,
            ease: 'none',
            scrollTrigger: {
              trigger: `.${styles.hero}`,
              start: 'top top',
              end: 'bottom top',
              scrub: 1.5,
            },
          });
          gsap.to(`.${styles.hero} .${styles.referenceBouquet}`, {
            y: -12,
            ease: 'none',
            scrollTrigger: {
              trigger: `.${styles.hero}`,
              start: 'top top',
              end: 'bottom top',
              scrub: 1.5,
            },
          });
        }
      }, root);
      const hero = animateHero ? root.querySelector<HTMLElement>(`.${styles.hero}`) : null;
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || !hero) return;
        const rect = hero.getBoundingClientRect();
        gsap.to(hero.querySelector(`.${styles.scene}`), {
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 5,
          duration: 1.3,
          overwrite: 'auto',
        });
      };
      const reset = () =>
        gsap.to(hero?.querySelector(`.${styles.scene}`) ?? [], { x: 0, duration: 0.8 });
      hero?.addEventListener('pointermove', move);
      hero?.addEventListener('pointerleave', reset);
      return () => {
        hero?.removeEventListener('pointermove', move);
        hero?.removeEventListener('pointerleave', reset);
        gsap.ticker.remove(tick);
        lenis?.off('scroll', ScrollTrigger.update);
        lenis?.destroy();
        const scene = hero?.querySelector(`.${styles.scene}`);
        if (scene) {
          gsap.killTweensOf(scene);
          gsap.set(scene, { clearProps: 'transform' });
        }
        context.revert();
      };
    });
    return () => mm.revert();
  }, []);
  return null;
}
