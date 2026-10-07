import { roleAllows, type AdminRole } from './permissions';
type Membership = { userId: string; teamId: string; confirm: boolean; roles: string[] };
/**
 * Apuração estrita por identidade: só vale para listagens em que a API devolve
 * `userId` (chave de API/admin). Nunca relaxar — uma listagem de sessão devolve
 * TODAS as memberships do time com identidade redigida (medido), então filtrar
 * pelo time sem exigir a identidade daria admin a quem não tem.
 */
export function confirmedRoles(
  memberships: Membership[],
  userId: string,
  teamId: string,
): AdminRole[] {
  return [
    ...new Set(
      memberships
        .filter(
          (membership) =>
            membership.userId === userId && membership.teamId === teamId && membership.confirm,
        )
        .flatMap((membership) =>
          membership.roles.filter((role): role is AdminRole =>
            ['admin', 'moderator', 'fulfillment'].includes(role),
          ),
        ),
    ),
  ];
}
/**
 * Apuração por sessão (o app não guarda chave de API para ler papéis). Medido no
 * staging: com um client de SESSÃO, `listMemberships` devolve as memberships do
 * time com `userId`/`userEmail` REDIGIDOS (string vazia) e honra
 * `Query.equal('userId', …)` no servidor — com dois membros no time, pedir o id
 * do outro devolve a linha do outro. Como a identidade não vem na resposta, a
 * única atribuição confiável é: a listagem FOI filtrada por identidade, logo
 * devolve no máximo a própria membership. Este é o contrato que a checagem
 * abaixo cobra — qualquer linha com identidade divergente, qualquer segunda
 * linha do time (filtro não aplicado) ou qualquer membership não confirmada
 * resulta em nenhum papel.
 */
export function ownTeamRoles(
  memberships: Membership[],
  userId: string,
  teamId: string,
): AdminRole[] {
  const scoped = memberships.filter((membership) => membership.teamId === teamId);
  if (!scoped.length || scoped.length > 1) return [];
  if (scoped.some((membership) => membership.userId && membership.userId !== userId)) return [];
  if (!scoped[0].confirm) return [];
  return [
    ...new Set(
      scoped[0].roles.filter((role): role is AdminRole =>
        ['admin', 'moderator', 'fulfillment'].includes(role),
      ),
    ),
  ];
}
export function hasCapability(roles: AdminRole[], capability: string) {
  return roles.some((role) => roleAllows(role, capability));
}
