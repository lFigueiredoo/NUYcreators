'use client';

import { useEffect } from 'react';

/**
 * Reveal discreto da landing (Proposta C).
 *
 * Substitui o GSAP + Lenis cinematográfico do design anterior: nada de
 * parallax, órbita ou glow — só fade + translateY, uma vez por elemento.
 *
 * Sem JS o conteúdo continua visível: o estado escondido vive no CSS
 * (`[data-pl-reveal]`) e o `<noscript>` da landing o desfaz.
 */
export function LandingReveal() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-pl-reveal]'));

    if (!('IntersectionObserver' in window)) {
      for (const el of targets) el.setAttribute('data-pl-visible', '');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-pl-visible', '');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return null;
}
