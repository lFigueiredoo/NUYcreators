/**
 * Navegação da landing pública — REDESIGN CLEAN (Opção 1 / Moça Lovers).
 *
 * Pouca navegação: as âncoras apontam para as seções da própria landing.
 * `anchorFor` converte âncora relativa em absoluta (`/#faq`) quando o header é
 * montado fora da landing (termos, privacidade).
 */
export const landingNavigation = [
  ['O que é', '#o-que-e'],
  ['Como participar', '#como-participar'],
  ['FAQ', '#faq'],
] as const;

/** Rodapé: o mínimo — FAQ e as páginas legais. */
export const landingFooterLinks = [
  ['FAQ', '#faq'],
  ['Termos', '/termos'],
  ['Privacidade', '/privacidade'],
] as const;

export function landingAccountLinks(authenticated: boolean) {
  return authenticated
    ? [{ label: 'Meu painel', href: '/app', primary: true }]
    : [
        { label: 'ENTRAR', href: '/login', primary: false },
        { label: 'CRIAR CONTA', href: '/cadastro', primary: true },
      ];
}

/** Âncora relativa vira absoluta quando a página não é a própria landing. */
export function anchorFor(href: string, rootAnchors: boolean) {
  return rootAnchors && href.startsWith('#') ? `/${href}` : href;
}
