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

    const reveal = (el: Element) => el.setAttribute('data-pl-visible', '');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      },
      // Um bloco só se apresenta quando já entrou de verdade na tela: 12% de
      // folga na base e 12% de área visível — o equivalente aos ~15–20% do
      // brief, sem o risco de um elemento mais alto que a viewport nunca
      // alcançar a razão e ficar escondido para sempre.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    for (const el of targets) observer.observe(el);

    // O que vive nos últimos 12% da página nunca cruza essa folga: o rodapé
    // encerra o documento e não há rolagem que o leve para mais cima. Ao
    // chegar no fim, o que sobrou aparece — sem isso, os botões da última
    // dobra ficariam invisíveis para sempre.
    let frame = 0;
    const checkEnd = () => {
      frame = 0;
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY < doc.scrollHeight - 2) return;
      for (const el of targets) {
        if (el.hasAttribute('data-pl-visible')) continue;
        reveal(el);
        observer.unobserve(el);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(checkEnd);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    checkEnd();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
