import {
  BookOpen,
  MessagesSquare,
  BarChart3,
  Gift,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Destinos da administração.
 *
 * A lista é FONTE ÚNICA de menu, rótulo, ícone e capacidade exigida — a mesma
 * que o shell usa para decidir o que aparece e a que cada rota se prende com
 * `requireStaff`. Uma segunda lista só para esconder itens do menu divergiria
 * da primeira no primeiro rename.
 *
 * `capability` aqui é conveniência de navegação. Quem barra de verdade é o
 * `requireStaff(capability)` no servidor de cada rota, e a Function reapurando o
 * papel: esconder o link nunca foi barreira, e não é tratado como uma.
 */
export type AdminDestination =
  | 'overview'
  | 'challenges'
  | 'academy'
  | 'academy-comments'
  | 'submissions'
  | 'creators'
  | 'rewards'
  | 'campaigns'
  | 'reports';

export type AdminNavEntry = {
  id: AdminDestination;
  label: string;
  href: string;
  icon: LucideIcon;
  capability: string;
};

export const adminNavEntries: AdminNavEntry[] = [
  {
    id: 'overview',
    label: 'Visão geral',
    href: '/admin',
    icon: LayoutDashboard,
    capability: 'view-audit',
  },
  {
    id: 'challenges',
    label: 'Desafios',
    href: '/admin/desafios',
    icon: Sparkles,
    capability: 'manage-catalog',
  },
  {
    id: 'academy',
    label: 'Academia NUY',
    href: '/admin/academia',
    icon: BookOpen,
    capability: 'manage-catalog',
  },
  {
    id: 'academy-comments',
    label: 'Comentários',
    href: '/admin/academia/comentarios',
    icon: MessagesSquare,
    capability: 'moderate',
  },
  {
    id: 'submissions',
    label: 'Submissões',
    href: '/admin/submissoes',
    icon: Inbox,
    capability: 'moderate',
  },
  {
    id: 'creators',
    label: 'Creators',
    href: '/admin/creators',
    icon: Users,
    capability: 'view-audit',
  },
  {
    id: 'rewards',
    label: 'Recompensas',
    href: '/admin/recompensas',
    icon: Gift,
    capability: 'manage-catalog',
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    href: '/admin/campanhas',
    icon: Megaphone,
    capability: 'manage-catalog',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    href: '/admin/relatorios',
    icon: BarChart3,
    capability: 'view-audit',
  },
];

/** `/admin` só fica ativo nele mesmo; o resto ativa também nas telas internas. */
export function adminCurrent(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Rótulo da seção atual, para a topbar. */
export function adminSectionLabel(pathname: string) {
  const matches = adminNavEntries
    .filter((entry) => adminCurrent(pathname, entry.href))
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.label ?? 'Visão geral';
}

/** Rótulo do papel, para a topbar: o que a pessoa pode fazer NESTA área. */
export function roleLabel(roles: readonly string[]) {
  if (roles.includes('admin')) return 'Administração';
  if (roles.includes('moderator')) return 'Moderação';
  if (roles.includes('fulfillment')) return 'Entrega';
  return 'Sem papel';
}
