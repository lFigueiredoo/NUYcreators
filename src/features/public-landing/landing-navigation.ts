/**
 * Navegação da landing pública (Proposta C).
 *
 * Constante PRÓPRIA da landing: `components/layout/public-navigation.ts`
 * alimentava o header antigo de `(public)/layout.tsx` e foi aposentado com o
 * fechamento da experiência pública (Sprint 4B) — as rotas de `(public)` agora
 * usam esta mesma navegação.
 *
 * Âncoras relativas (`#comunidade`) valem dentro da landing. Fora dela (as
 * páginas legais), `anchorFor(href, true)` devolve a forma absoluta
 * (`/#comunidade`) — mesma seção, navegação de outra rota.
 */
export const landingNavigation = [
  ['Início', '#topo'],
  ['Comunidade', '#comunidade'],
  ['Desafios', '#desafios'],
  ['Recompensas', '#recompensas'],
  ['Conteúdos', '#conteudos'],
  ['FAQ', '#faq'],
] as const;

/** Rodapé: as seções da página, na ordem do documento, e o acesso. */
export const landingFooterNavigation = [
  ['Comunidade', '#comunidade'],
  ['Desafios', '#desafios'],
  ['Recompensas', '#recompensas'],
  ['Conteúdos', '#conteudos'],
  ['FAQ', '#faq'],
] as const;

export function landingAccountLinks(authenticated: boolean) {
  return authenticated
    ? [{ label: 'Ir para meu painel', href: '/app', primary: true }]
    : [
        { label: 'Entrar', href: '/login', primary: false },
        { label: 'Fazer parte', href: '/cadastro', primary: true },
      ];
}

/** Âncora relativa vira absoluta quando a página não é a própria landing. */
export function anchorFor(href: string, rootAnchors: boolean) {
  return rootAnchors && href.startsWith('#') ? `/${href}` : href;
}
