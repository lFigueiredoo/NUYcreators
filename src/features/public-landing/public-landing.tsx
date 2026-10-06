/* Folha global do reveal — primeiro de propósito: as regras de componente
   vêm depois dela na folha e vencem qualquer empate de ordem. */
import './styles/landing-reveal.css';
import { LandingReveal } from './landing-reveal';
import { landingFontVariables } from './landing-fonts';
import { PublicHeader } from './components/public-header';
import { Hero } from './components/hero';
import { BenefitsStrip } from './components/benefits-strip';
import { Creators } from './components/creators';
import { Challenge } from './components/challenge';
import { Community } from './components/community';
import { Rewards } from './components/rewards';
import { Conteudos } from './components/conteudos';
import { Faq } from './components/faq';
import { CtaFinal } from './components/cta-final';
import { PublicFooter } from './components/public-footer';
import styles from './styles/landing.module.css';

/**
 * Landing pública — PROPOSTA C "Entre Casa & Creators".
 *
 * Sprint 4B: a página inteira, na ordem do documento — header, hero, faixa de
 * benefícios, creators, desafio, comunidade/manifesto, recompensas, conteúdos,
 * FAQ, CTA final e rodapé. As âncoras do header agora têm todas um destino
 * (`#conteudos`, `#faq`, `#cta-final` nasceram aqui).
 *
 * O `<noscript>` devolve a visibilidade dos elementos com [data-pl-reveal]:
 * o reveal é enfeite, nunca pré-requisito de leitura. O estado escondido vive
 * em styles/landing-reveal.css (folha global — seletor de atributo não passa
 * pela checagem de pureza do CSS Modules no dev), escopado pela classe
 * estável `pl-landing` da raiz.
 */
export function PublicLanding({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div id="topo" className={`pl-landing ${styles.landing} ${landingFontVariables}`}>
      <noscript>
        <style>{'[data-pl-reveal]{opacity:1 !important;transform:none !important}'}</style>
      </noscript>
      <LandingReveal />
      <PublicHeader authenticated={authenticated} />
      <main id="main">
        <Hero />
        <BenefitsStrip />
        <Creators />
        <Challenge />
        <Community />
        <Rewards />
        <Conteudos />
        <Faq />
        <CtaFinal authenticated={authenticated} />
      </main>
      <PublicFooter authenticated={authenticated} />
    </div>
  );
}
