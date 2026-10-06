import type { ReactNode } from 'react';
import { currentUser } from '@/lib/appwrite/server';
import { PublicHeader } from '@/features/public-landing/components/public-header';
import { PublicFooter } from '@/features/public-landing/components/public-footer';
import { landingFontVariables } from '@/features/public-landing/landing-fonts';
import styles from '@/features/public-landing/styles/landing.module.css';

/**
 * Chrome das páginas públicas fora da landing (termos, privacidade e os
 * redirecionamentos de desafios/recompensas/ranking).
 *
 * Usa o MESMO header e rodapé da landing — a identidade é uma só. Como estas
 * páginas não são a landing, as âncoras da navegação saem na forma absoluta
 * (`/#faq`): `rootAnchors` faz essa troca sem duplicar componente.
 *
 * Sem reveal aqui: o `<LandingReveal />` só existe na landing, então nenhuma
 * peça destas telas usa `data-pl-reveal` (ficaria invisível).
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const authenticated = Boolean(user);

  return (
    <div className={`pl-landing ${styles.landing} ${styles.publicShell} ${landingFontVariables}`}>
      <PublicHeader authenticated={authenticated} rootAnchors />
      <main id="main">{children}</main>
      <PublicFooter authenticated={authenticated} rootAnchors />
    </div>
  );
}
