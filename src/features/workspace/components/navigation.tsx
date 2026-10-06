import {
  Bell,
  Coins,
  Gift,
  Home,
  PenLine,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type NavEntry = { label: string; href: string; icon: LucideIcon };

/** Navegação principal do produto (sidebar no desktop). */
export const primaryNav: NavEntry[] = [
  { label: 'Início', href: '/app', icon: Home },
  { label: 'Desafios', href: '/app/desafios', icon: Sparkles },
  { label: 'Meus conteúdos', href: '/app/conteudos', icon: PenLine },
  { label: 'Pontos', href: '/app/pontos', icon: Coins },
  { label: 'Recompensas', href: '/app/recompensas', icon: Gift },
  { label: 'Ranking', href: '/app/ranking', icon: Trophy },
];

/** Navegação secundária — utilitários da conta. */
export const secondaryNav: NavEntry[] = [
  { label: 'Notificações', href: '/app/notificacoes', icon: Bell },
  { label: 'Meu perfil', href: '/app/perfil', icon: UserRound },
];

/** Barra inferior do mobile: os cinco destinos do dia a dia. */
export const bottomNav: NavEntry[] = [
  { label: 'Início', href: '/app', icon: Home },
  { label: 'Desafios', href: '/app/desafios', icon: Sparkles },
  { label: 'Conteúdos', href: '/app/conteudos', icon: PenLine },
  { label: 'Pontos', href: '/app/pontos', icon: Coins },
  { label: 'Perfil', href: '/app/perfil', icon: UserRound },
];

/** `/app` só fica ativo nele mesmo; o resto ativa também nas telas internas. */
export function isCurrent(pathname: string, href: string) {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Rótulo da seção atual, exibido na topbar. No mobile a sidebar não existe e
 * esta linha é a única orientação de contexto — no desktop ela substitui a
 * saudação repetida (a saudação é o título do Início).
 */
export function sectionLabel(pathname: string) {
  const matches = [...primaryNav, ...secondaryNav]
    .filter((entry) => isCurrent(pathname, entry.href))
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.label ?? 'Início';
}
