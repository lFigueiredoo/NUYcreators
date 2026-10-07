import './styles/landing-reveal.css';
import { LandingReveal } from './landing-reveal';
import { LandingDepth } from './landing-depth';
import { landingFontVariables } from './landing-fonts';
import { PublicHeader } from './components/public-header';
import { Hero } from './components/hero';
import { Community } from './components/community';
import { WhatIs } from './components/what-is';
import { HowToParticipate } from './components/how-to-participate';
import { Faq } from './components/faq';
import { CtaFinal } from './components/cta-final';
import { PublicFooter } from './components/public-footer';
import styles from './styles/landing.module.css';

/**
 * Landing pública — REDESIGN CLEAN (Opção 1 / referência "Moça Lovers").
 *
 * Oito blocos, um por ideia: header pill, hero com packshots reais, comunidade
 * em pré-lançamento, o que é, como participar (navy), FAQ (navy), CTA final e
 * rodapé mínimo. Nenhum card SaaS, nenhum ornamento, quase nenhuma animação —
 * só o reveal discreto de fade/translateY herdado do `landing-reveal.css`
 * (desfeito por `<noscript>`).
 */
export function PublicLanding({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div id="topo" className={`pl-landing ${styles.landing} ${landingFontVariables}`}>
      <noscript>
        <style>{'[data-pl-reveal]{opacity:1 !important;transform:none !important}'}</style>
      </noscript>
      <LandingReveal />
      <LandingDepth />
      <PublicHeader authenticated={authenticated} />
      <main id="main">
        <Hero />
        <Community />
        <WhatIs />
        <HowToParticipate />
        <Faq />
        <CtaFinal authenticated={authenticated} />
      </main>
      <PublicFooter authenticated={authenticated} reveal />
    </div>
  );
}
