'use client';

import { useEffect } from 'react';

/**
 * Profundidade de rolagem — hero e desfecho.
 *
 * No HERO (`data-pl-depth`, sem valor) os três planos se separam ao longo dos
 * primeiros 500px de rolagem: o respiro do fundo anda 4px, a luz 5 e os frascos
 * 8, os frascos em sentido contrário. É a diferença entre os planos que dá a
 * sensação de cena. Passados os 500px a cena já saiu de quadro e não há mais o
 * que diferenciar — o progresso satura em 1 e nada mais se move.
 *
 * No CTA FINAL (`data-pl-depth="view"`) o progresso não é o da página, e sim o
 * da própria seção atravessando a janela: 0 quando ela encosta na base, 1
 * quando termina de sair por cima. A luz radial anda no máximo 8px nesse
 * percurso, com opacidade fixa — responde à seção, não pisca.
 *
 * Sem cursor tracking, sem inércia, e nada mexendo quando a pessoa para de
 * rolar: o valor só muda quando chega evento de rolagem. O componente escreve
 * `--pl-depth` nos nós; sem JavaScript a variável não existe e o CSS cai no 0.
 * O mesmo vale para movimento reduzido ou tela estreita — a media query desliga
 * antes de qualquer cálculo, e a página fica exatamente onde estaria sem isto.
 */
export function LandingDepth() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-pl-depth]:not([data-pl-depth="view"])');
    const views = Array.from(document.querySelectorAll<HTMLElement>('[data-pl-depth="view"]'));
    if (!hero && views.length === 0) return;

    const enabled = window.matchMedia(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    let frame = 0;

    const clear = () => {
      hero?.style.removeProperty('--pl-depth');
      for (const node of views) node.style.removeProperty('--pl-depth');
    };

    const apply = () => {
      frame = 0;
      if (!enabled.matches) {
        clear();
        return;
      }
      if (hero) {
        const progress = Math.min(1, Math.max(0, window.scrollY / 500));
        hero.style.setProperty('--pl-depth', progress.toFixed(3));
      }
      for (const node of views) {
        const { top, height } = node.getBoundingClientRect();
        const travel = window.innerHeight + height;
        const progress = Math.min(1, Math.max(0, (window.innerHeight - top) / travel));
        node.style.setProperty('--pl-depth', progress.toFixed(3));
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    enabled.addEventListener('change', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      enabled.removeEventListener('change', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
