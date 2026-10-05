'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import art from './hero-artboard.module.css';
import styles from './landing.module.css';

/** Animation-only enhancement. CSS/HTML remain the approved frame without JS. */
export function HeroMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-visual-hero]');
    if (!root) return;
    root.dataset.heroMotionPhase = 'static';
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        desktop: '(min-width: 761px) and (pointer: fine)',
      },
      (mediaContext) => {
        if (!mediaContext.conditions?.motion) return;
        const desktop = Boolean(mediaContext.conditions.desktop);
        const product = root.querySelector<HTMLElement>('[data-hero-packshot]');
        const headline = root.querySelector<HTMLElement>('[data-hero-headline]');
        const header = root.querySelector<HTMLElement>('header');
        const copy = root.querySelector<HTMLElement>(`.${styles.heroCopy}`);
        const paragraphs = copy?.querySelectorAll('p');
        const actions = root.querySelectorAll('[data-hero-actions] a');
        const benefits = root.querySelectorAll('[data-hero-benefits] > span');
        const glows = root.querySelectorAll('[data-hero-glow-pulse]');
        const particles = [...root.querySelectorAll(`.${styles.particles} i`)].slice(0, 4);
        const energy = root.querySelector<HTMLElement>('[data-hero-orbit-energy]');
        const orbit = root.querySelector<SVGPathElement>('#hero-orbit-main');
        const background = root.querySelector(`.${art.backgroundFlowers}`);
        const midground = root.querySelector(`.${styles.referenceBouquet}`);
        const foreground = root.querySelectorAll(
          `.${art.foregroundFlowers}, .${art.cornerFlowers}`,
        );
        const state = { x: 0, y: 0, scroll: 0 };
        let entered = false;
        let ambientReady = false;
        let refreshOrbit = () => {};
        const flowerLayers = [
          { elements: background ? [background as HTMLElement] : [], weight: 0.15, scroll: -4 },
          { elements: midground ? [midground as HTMLElement] : [], weight: 0.3, scroll: -8 },
          { elements: [...foreground] as HTMLElement[], weight: 0.45, scroll: -12 },
        ];
        let ambient: gsap.core.Timeline;
        let startAmbient: gsap.core.Tween | undefined;
        let cursorX: ReturnType<typeof gsap.quickTo> | undefined;
        let cursorY: ReturnType<typeof gsap.quickTo> | undefined;
        const productX = product ? gsap.quickSetter(product, 'x', 'px') : undefined;
        const productY = product ? gsap.quickSetter(product, 'y', 'px') : undefined;
        const renderDepth = () => {
          if (!entered) return;
          productX?.(state.x);
          productY?.(state.y + state.scroll * 5);
          for (const layer of flowerLayers) {
            const x = state.x * layer.weight;
            const y = state.y * layer.weight + state.scroll * layer.scroll;
            for (const element of layer.elements) {
              // Independent translate preserves the approved CSS rotation exactly.
              if (Math.abs(x) + Math.abs(y) < 0.001) element.style.removeProperty('translate');
              else element.style.translate = `${x}px ${y}px`;
            }
          }
        };
        root.dataset.heroMotionPhase = 'entering';
        const context = gsap.context(() => {
          ambient = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
          ambient.to(
            glows,
            {
              opacity: desktop ? 0.1 : 0.025,
              duration: 8,
              ease: 'sine.inOut',
              force3D: false,
            },
            0,
          );
          if (desktop) {
            ambient.to(
              particles,
              {
                y: (index: number) => -10 - index * 3,
                x: (index: number) => (index % 2 ? 4 : -3),
                duration: 8,
                ease: 'sine.inOut',
                force3D: false,
              },
              0,
            );
          }
          if (energy && orbit) {
            const length = orbit.getTotalLength();
            const pathPoints = Array.from({ length: 65 }, (_, index) =>
              orbit.getPointAtLength((length * index) / 64),
            );
            let points: { x: number; y: number }[] = [];
            refreshOrbit = () => {
              const scene = root
                .querySelector<HTMLElement>(`.${styles.scene}`)!
                .getBoundingClientRect();
              const matrix = orbit.getScreenCTM()!;
              points = pathPoints.map((p) => {
                const point = new DOMPoint(p.x, p.y).matrixTransform(matrix);
                return { x: point.x - scene.left - 10, y: point.y - scene.top - 10 };
              });
            };
            refreshOrbit();
            const markerX = gsap.quickSetter(energy, 'x', 'px'),
              markerY = gsap.quickSetter(energy, 'y', 'px');
            const driver = { progress: 0 };
            ambient.to(
              driver,
              {
                progress: 1,
                duration: 8,
                ease: 'none',
                onUpdate: () => {
                  const position = driver.progress * 64,
                    index = Math.min(63, Math.floor(position)),
                    mix = position - index;
                  markerX(points[index].x + (points[index + 1].x - points[index].x) * mix);
                  markerY(points[index].y + (points[index + 1].y - points[index].y) * mix);
                },
              },
              0,
            );
            ambient.fromTo(
              energy,
              { opacity: 0 },
              {
                opacity: desktop ? 0.35 : 0.15,
                duration: 8,
                ease: 'sine.inOut',
                immediateRender: false,
                force3D: false,
              },
              0,
            );
          }
          const entry = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete: () => {
              entered = true;
              gsap.set(headline, { clearProps: 'transform' });
              // Explicit resting window, after cleanup and before ambient motion.
              root.dataset.heroMotionPhase = 'rest';
              startAmbient = gsap.delayedCall(3, () => {
                ambientReady = true;
                if (!document.hidden && root.getBoundingClientRect().bottom > 0) {
                  context.add(() => {
                    gsap.set(glows, { willChange: 'opacity' });
                    gsap.set(energy, { willChange: 'transform,opacity' });
                    if (desktop) gsap.set(particles, { willChange: 'transform' });
                  });
                  root.dataset.heroMotionPhase = 'ambient';
                  ambient.play();
                }
              });
            },
          });
          entry.from(
            header,
            { opacity: 0, y: -5, duration: 0.55, clearProps: 'opacity,transform' },
            0,
          );
          entry.from(
            paragraphs?.[0] ?? [],
            { opacity: 0, duration: 0.65, clearProps: 'opacity' },
            0.12,
          );
          entry.from(
            headline,
            { clipPath: 'inset(0 0 100% 0)', duration: 1.05, clearProps: 'clipPath' },
            0.16,
          );
          entry.from(
            paragraphs?.[1] ?? [],
            { opacity: 0, duration: 0.7, clearProps: 'opacity' },
            0.38,
          );
          entry.from(
            actions,
            { opacity: 0, y: 5, duration: 0.6, stagger: 0.07, clearProps: 'opacity,transform' },
            0.55,
          );
          entry.from(
            product,
            { opacity: 0, scale: 0.96, y: 20, duration: 1.3, clearProps: 'opacity,transform' },
            0.04,
          );
          entry.from(
            paragraphs?.[2] ?? [],
            { opacity: 0, duration: 0.55, clearProps: 'opacity' },
            0.75,
          );
          entry.from(
            benefits,
            { opacity: 0, y: 4, duration: 0.45, stagger: 0.06, clearProps: 'opacity,transform' },
            0.82,
          );
          if (desktop) {
            cursorX = gsap.quickTo(state, 'x', {
              duration: 0.9,
              ease: 'power2.out',
              onUpdate: renderDepth,
            });
            cursorY = gsap.quickTo(state, 'y', {
              duration: 0.9,
              ease: 'power2.out',
              onUpdate: renderDepth,
            });
            const scroll = gsap.timeline({
              scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 1.2 },
            });
            scroll.to(state, { scroll: 1, ease: 'none', onUpdate: renderDepth }, 0);
            scroll.to(headline, { y: -6, ease: 'none' }, 0);
          }
        }, root);
        // Cache geometry only on resize, never read layout on pointermove.
        let rect = root.getBoundingClientRect();
        let documentTop = rect.top + window.scrollY;
        const resize = () => {
          rect = root.getBoundingClientRect();
          documentTop = rect.top + window.scrollY;
          refreshOrbit();
        };
        const move = (event: PointerEvent) => {
          if (!desktop || !entered || event.pointerType !== 'mouse') return;
          cursorX?.(
            Math.max(-6, Math.min(6, ((event.clientX - rect.left) / rect.width - 0.5) * 12)),
          );
          cursorY?.(
            Math.max(
              -5,
              Math.min(
                5,
                ((event.clientY + window.scrollY - documentTop) / rect.height - 0.5) * 10,
              ),
            ),
          );
        };
        const leave = () => {
          cursorX?.(0);
          cursorY?.(0);
        };
        const visibility = () => {
          if (document.hidden) {
            ambient.pause(0);
            if (entered) root.dataset.heroMotionPhase = 'rest';
            leave();
          } else if (entered && ambientReady) {
            ambient.play();
            root.dataset.heroMotionPhase = 'ambient';
          }
        };
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) ambient.pause();
          else if (entered && ambientReady && !document.hidden) {
            root.dataset.heroMotionPhase = 'ambient';
            ambient.resume();
          }
        });
        observer.observe(root);
        if (desktop) {
          root.addEventListener('pointermove', move);
          root.addEventListener('pointerleave', leave);
        }
        window.addEventListener('resize', resize, { passive: true });
        document.addEventListener('visibilitychange', visibility);
        return () => {
          observer.disconnect();
          root.removeEventListener('pointermove', move);
          root.removeEventListener('pointerleave', leave);
          window.removeEventListener('resize', resize);
          document.removeEventListener('visibilitychange', visibility);
          startAmbient?.kill();
          cursorX?.tween.kill();
          cursorY?.tween.kill();
          context.revert();
          for (const layer of flowerLayers)
            for (const element of layer.elements) element.style.removeProperty('translate');
          root.dataset.heroMotionPhase = 'static';
        };
      },
    );
    return () => {
      media.revert();
      delete root.dataset.heroMotionPhase;
    };
  }, []);
  return null;
}
