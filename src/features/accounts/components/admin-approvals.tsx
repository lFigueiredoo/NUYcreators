import Link from 'next/link';
import { CheckCircle2, Clock3, ExternalLink, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import { ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState, UnavailableState } from '@/features/workspace/components/ui/state';
import { stampIn } from '@/features/admin/components/format';
import type { ReviewedAccountStatus, CreatorApplication } from '../domain/approval';
import type { ApprovalListResult } from '../services/admin';
import { ApprovalReviewForm } from './approval-review-form';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from './approvals.module.css';

const statuses: Array<{ value: ReviewedAccountStatus; label: string }> = [
  { value: 'pending_review', label: 'Aguardando análise' },
  { value: 'active', label: 'Aprovadas' },
  { value: 'rejected', label: 'Recusadas' },
];
const statusLabels = {
  pending_review: { label: 'Aguardando análise', Icon: Clock3, className: styles.pending },
  active: { label: 'Aprovada', Icon: CheckCircle2, className: styles.approved },
  rejected: { label: 'Recusada', Icon: XCircle, className: styles.rejected },
};

function safeSocialUrl(raw: string) {
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function AdminApprovals({
  result,
  status,
  outcome,
}: {
  result: ApprovalListResult;
  status: ReviewedAccountStatus;
  outcome?: 'approved' | 'rejected';
}) {
  return (
    <div className={styles.page}>
      <ScreenHeader
        kicker="Administração"
        title="Aprovar contas"
        intro="Confira os dados de quem quer participar da comunidade e decida sobre a liberação do acesso."
      />
      {outcome ? (
        <div className={styles.success} role="status">
          <ShieldCheck size={19} aria-hidden="true" />
          <p>
            {outcome === 'approved'
              ? 'Conta aprovada. A creator já pode acessar o painel com o perfil completo.'
              : 'Cadastro recusado. O motivo está disponível para a pessoa ao acessar a conta.'}
          </p>
        </div>
      ) : null}
      <nav className={styles.tabs} aria-label="Filtrar cadastros por decisão">
        {statuses.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/aprovacoes?status=${entry.value}`}
            className={status === entry.value ? styles.tabActive : styles.tab}
            aria-current={status === entry.value ? 'page' : undefined}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      {!result.ok ? (
        <UnavailableState what="as solicitações de cadastro" detail={result.message} />
      ) : (
        <>
          {result.value.items.length ? (
            <div className={styles.applications}>
              {result.value.items.map((application) => (
                <ApplicationCard key={application.userId} application={application} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UserRound size={20} />}
              title={
                status === 'pending_review'
                  ? 'Nenhum cadastro aguardando análise nesta página.'
                  : status === 'active'
                    ? 'Nenhuma aprovação registrada nesta página.'
                    : 'Nenhuma recusa registrada nesta página.'
              }
              text={
                status === 'pending_review'
                  ? 'As novas solicitações aparecerão aqui para você conferir os dados e liberar o acesso.'
                  : 'As decisões registradas pela equipe ficam disponíveis nesta seção.'
              }
            />
          )}
          <div className={styles.pagination}>
            <p>
              {result.value.items.length}{' '}
              {result.value.items.length === 1 ? 'cadastro exibido' : 'cadastros exibidos'} nesta
              página.
            </p>
            {result.value.nextCursor ? (
              <Link
                href={`/admin/aprovacoes?${new URLSearchParams({ status, cursor: result.value.nextCursor })}`}
                className={`${appStyles.button} ${appStyles.buttonGhost}`}
              >
                Próxima página
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationCard({ application }: { application: CreatorApplication }) {
  const { profile } = application;
  const onboarded = Boolean(profile?.onboardingCompletedAt);
  const view =
    statusLabels[application.status as keyof typeof statusLabels] ?? statusLabels.pending_review;
  const { Icon } = view;
  return (
    <article
      className={styles.application}
      aria-label={`Cadastro de ${application.name || profile?.name || 'creator'}`}
    >
      <header className={styles.applicationHead}>
        <div className={styles.identity}>
          <h2>{profile?.name || application.name || 'Nome não informado'}</h2>
          <p>{application.email || 'E-mail não informado'}</p>
          <p className={styles.requested}>Solicitação em {stampIn(application.requestedAt)}</p>
        </div>
        <span className={`${styles.status} ${view.className}`}>
          <Icon size={15} aria-hidden="true" />
          {view.label}
        </span>
      </header>
      <div
        className={`${styles.applicationBody} ${application.status === 'active' ? styles.finalDecision : ''}`}
      >
        <div className={styles.details}>
          <dl className={styles.profile}>
            <div>
              <dt>Perfil</dt>
              <dd>{onboarded ? 'Preenchimento concluído' : 'Aguardando preenchimento'}</dd>
            </div>
            <div>
              <dt>Cidade</dt>
              <dd>
                {profile?.city
                  ? `${profile.city}${profile.state ? ` / ${profile.state}` : ''}`
                  : 'Não informada'}
              </dd>
            </div>
            <div>
              <dt>Nicho</dt>
              <dd>{profile?.niche || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Tipo de creator</dt>
              <dd>{profile?.creatorType || 'Não informado'}</dd>
            </div>
          </dl>
          <section className={styles.socials} aria-label="Redes declaradas pela pessoa">
            <h3>Redes declaradas</h3>
            {application.socials.length ? (
              <ul>
                {application.socials.map((social, index) => {
                  const href = safeSocialUrl(social.canonicalUrl);
                  return (
                    <li key={`${social.platform}-${index}`}>
                      <strong>{social.platform}</strong>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          Abrir perfil <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ) : (
                        <span>Link não disponível</span>
                      )}
                      <span>
                        {social.verificationStatus === 'verified'
                          ? 'Verificação registrada'
                          : 'Perfil declarado, não verificado'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Nenhuma rede social declarada.</p>
            )}
          </section>
          {application.reason ? (
            <div className={styles.reason}>
              <h3>Motivo da decisão</h3>
              <p>{application.reason}</p>
            </div>
          ) : null}
          {application.reviewedAt ? (
            <p className={styles.hint}>Decisão registrada em {stampIn(application.reviewedAt)}.</p>
          ) : null}
        </div>
        {application.status !== 'active' ? (
          <aside className={styles.review}>
            <h3>
              {application.status === 'rejected' ? 'Reavaliar cadastro' : 'Analisar solicitação'}
            </h3>
            <p>
              A aprovação libera a participação na comunidade. Ela não verifica automaticamente a
              titularidade das redes sociais.
            </p>
            <ApprovalReviewForm
              userId={application.userId}
              status={application.status}
              onboarded={onboarded}
            />
          </aside>
        ) : null}
      </div>
    </article>
  );
}
