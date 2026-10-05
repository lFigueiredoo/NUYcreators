export const publicNavigation = [
  ['O projeto', '/#projeto'],
  ['Como funciona', '/#como-funciona'],
  ['Benefícios', '/#beneficios'],
  ['FAQ', '/#faq'],
] as const;

export function publicAccountLinks(authenticated: boolean) {
  return authenticated
    ? [{ label: 'Ir para meu painel', href: '/app', primary: true }]
    : [
        { label: 'Entrar', href: '/login', primary: false },
        { label: 'Fazer parte', href: '/cadastro', primary: true },
      ];
}
