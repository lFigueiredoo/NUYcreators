import Link from 'next/link';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import { Tabs } from '@/features/workspace/components/ui/tabs';
import { catalogView, wallClockValue } from '@/features/workspace/domain/catalog';
import type { CatalogChallenge, CatalogChallengeDetail } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import {
  CatalogTransitionForm,
  ChallengeForm,
  type CatalogChoices,
  type ChallengeFormValues,
} from './admin-forms';
import { stampIn } from './format';
import { AuditList } from './overview-screen';
import { Outcome, StatusPill, Table } from './shared';

/** Filtro do catálogo. `live` é o "no ar" que `join` e `submit` aceitam. */
export const challengeTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'live', label: 'Publicados' },
  { id: 'draft', label: 'Rascunhos' },
  { id: 'closed', label: 'Encerrados' },
] as const;

export type ChallengeTab = (typeof challengeTabs)[number]['id'];

export function parseChallengeTab(value: string | string[] | undefined): ChallengeTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return challengeTabs.find((tab) => tab.id === raw)?.id ?? 'all';
}

export function ChallengesScreen({
  status,
  challenges,
}: {
  status: ChallengeTab;
  challenges: AdminOutcome<{ items: CatalogChallenge[] }>;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Desafios"
        intro="Rascunho fica visível só aqui. Publicado aparece para as creators dentro do período informado."
        action={
          <Link
            href="/admin/desafios/novo"
            className={`${appStyles.button} ${appStyles.buttonPrimary}`}
          >
            Novo desafio
          </Link>
        }
      />
      <Tabs
        items={challengeTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        current={status}
        href={(id) => (id === 'all' ? '/admin/desafios' : `/admin/desafios?estado=${id}`)}
        label="Estado do desafio"
      />
      <Outcome result={challenges} what="a lista de desafios">
        {(value) =>
          value.items.length === 0 ? (
            <EmptyState
              title={status === 'all' ? 'Nenhum desafio cadastrado' : 'Nenhum desafio neste estado'}
              text="Enquanto não houver desafio publicado, a área das creators mostra o vazio dela — nada é preenchido com exemplo."
              action={
                <Link
                  href="/admin/desafios/novo"
                  className={`${appStyles.button} ${appStyles.buttonPrimary}`}
                >
                  Criar o primeiro desafio
                </Link>
              }
            />
          ) : (
            <Table
              caption="Desafios do NUY Creators"
              head={
                <>
                  <th>Desafio</th>
                  <th>Estado</th>
                  <th>Janela</th>
                  <th className={styles.tableNum}>Pontos</th>
                  <th className={styles.tableNum}>Participantes</th>
                  <th>Campanha</th>
                  <th />
                </>
              }
            >
              {value.items.map((challenge) => (
                <tr key={challenge.challengeId}>
                  <td className={styles.tableWide}>
                    <Link
                      href={`/admin/desafios/${challenge.challengeId}`}
                      className={styles.tableLink}
                    >
                      {challenge.name}
                    </Link>
                    <span className={styles.tableMuted}> · /{challenge.slug}</span>
                  </td>
                  <td>
                    <StatusPill status={challenge.status} />
                  </td>
                  <td className={styles.tableNowrap}>
                    {stampIn(challenge.startsAt)}
                    <br />
                    <span className={styles.tableMuted}>até {stampIn(challenge.endsAt)}</span>
                  </td>
                  <td className={styles.tableNum}>{challenge.points}</td>
                  <td className={styles.tableNum}>
                    {challenge.participantCount}
                    {challenge.participantLimit !== null ? ` / ${challenge.participantLimit}` : ''}
                  </td>
                  <td>{challenge.campaignName || <span className={styles.tableMuted}>—</span>}</td>
                  <td className={styles.tableNowrap}>
                    <Link
                      href={`/admin/desafios/${challenge.challengeId}`}
                      className={styles.tableLink}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Outcome>
      <p className={styles.counter}>
        A lista mostra os 100 desafios com início mais recente. O catálogo inteiro é filtrável por
        estado nas abas acima.
      </p>
    </div>
  );
}

/** Detalhe e edição do desafio: onde a operação publica, encerra e corrige. */
export function ChallengeDetailScreen({
  challenge,
  choices,
  timeZone,
}: {
  challenge: AdminOutcome<{ item: CatalogChallengeDetail | null }>;
  choices: AdminOutcome<CatalogChoices>;
  timeZone: string;
}) {
  return (
    <Outcome result={challenge} what="o desafio">
      {(value) =>
        !value.item ? (
          <EmptyState
            title="Desafio não encontrado"
            text="Ele pode ter sido removido. A lista de desafios continua valendo."
            action={
              <Link
                href="/admin/desafios"
                className={`${appStyles.button} ${appStyles.buttonGhost}`}
              >
                Voltar para a lista
              </Link>
            }
          />
        ) : (
          <ChallengeDetail challenge={value.item} choices={choices} timeZone={timeZone} />
        )
      }
    </Outcome>
  );
}

function ChallengeDetail({
  challenge,
  choices,
  timeZone,
}: {
  challenge: CatalogChallengeDetail;
  choices: AdminOutcome<CatalogChoices>;
  timeZone: string;
}) {
  const view = catalogView(challenge.status);
  const values: ChallengeFormValues = {
    challengeId: challenge.challengeId,
    slug: challenge.slug,
    name: challenge.name,
    description: challenge.description,
    platform: challenge.platform,
    startsAt: wallClockValue(challenge.startsAt, timeZone),
    endsAt: wallClockValue(challenge.endsAt, timeZone),
    points: String(challenge.points),
    imageFileId: challenge.imageFileId,
    requiredLevelId: challenge.requiredLevelId,
    participantLimit: challenge.participantLimit === null ? '' : String(challenge.participantLimit),
    campaignId: challenge.campaignId,
    productId: challenge.productId,
    hashtags: challenge.hashtags,
    mentions: challenge.mentions,
    version: challenge.version,
    requirements: challenge.requirements.map((requirement) => ({
      type: requirement.type,
      required: requirement.required,
      configJson: requirement.configJson,
    })),
  };

  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Desafio"
        title={challenge.name}
        intro={
          <>
            <code>/{challenge.slug}</code> · versão {challenge.version} · {view.hint}
          </>
        }
        action={
          <div className={styles.actions}>
            <StatusPill status={challenge.status} />
            <Link
              href={`/app/desafios/${challenge.slug}`}
              className={`${appStyles.button} ${appStyles.buttonGhost}`}
            >
              Ver como creator
            </Link>
          </div>
        }
      />

      <div className={styles.cols}>
        <div className={styles.stack}>
          <Block title="Editar">
            <Outcome result={choices} what="os níveis, campanhas e produtos do catálogo">
              {(options) => <ChallengeForm values={values} choices={options} />}
            </Outcome>
          </Block>
        </div>

        <div className={styles.stack}>
          <Block title="Estado">
            <p className={styles.formHint}>
              {challenge.status === 'draft'
                ? 'Este desafio é rascunho: nenhuma creator o vê, e nenhuma vê os requisitos dele.'
                : 'Publicado ou encerrado, o desafio é lido pelas creators — e o link acima abre o que elas veem.'}
            </p>
            <CatalogTransitionForm
              kind="challenge"
              id={challenge.challengeId}
              status={challenge.status}
              version={challenge.version}
            />
          </Block>

          <Block title="Números">
            <dl className={styles.meta}>
              <div>
                <dt>Participantes</dt>
                <dd>
                  {challenge.participantCount}
                  {challenge.participantLimit !== null
                    ? ` de ${challenge.participantLimit}`
                    : ' (sem limite)'}
                </dd>
              </div>
              <div>
                <dt>Pontos por aprovação</dt>
                <dd>{challenge.points}</dd>
              </div>
              <div>
                <dt>Requisitos</dt>
                <dd>{challenge.requirements.length}</dd>
              </div>
              <div>
                <dt>Última alteração</dt>
                <dd>{stampIn(challenge.updatedAt)}</dd>
              </div>
            </dl>
          </Block>

          <Block title="Histórico">
            <AuditList items={challenge.history} />
          </Block>
        </div>
      </div>
    </div>
  );
}

/** Tela de criação: mesmo formulário, sem valor inicial e sem versão. */
export function NewChallengeScreen({ choices }: { choices: AdminOutcome<CatalogChoices> }) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Desafio"
        title="Novo desafio"
        intro="Salve como rascunho para revisar depois, ou publique de uma vez. Nada é inventado aqui: cada campo vira exatamente a coluna de mesmo nome."
      />
      <Block title="Dados do desafio">
        <Outcome result={choices} what="os níveis, campanhas e produtos do catálogo">
          {(options) => <ChallengeForm choices={options} />}
        </Outcome>
      </Block>
      <p className={styles.counter}>
        O formulário grava os campos que o schema já tem, e nada além deles. O identificador é a
        chave pública do desafio: depois de criado, ele não muda.
      </p>
    </div>
  );
}
