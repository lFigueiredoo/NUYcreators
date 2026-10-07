import Link from 'next/link';
import { Pill } from '@/features/workspace/components/ui/pill';
import { Block, ScreenHeader } from '@/features/workspace/components/ui/screen';
import { EmptyState } from '@/features/workspace/components/ui/state';
import { redemptionView } from '@/features/workspace/domain/status';
import type { CreatorDetail, CreatorSummary } from '@/features/workspace/core';
import type { AdminOutcome } from '../services/console';
import appStyles from '@/features/workspace/styles/app.module.css';
import styles from '../styles/admin.module.css';
import { PointsAdjustForm } from './admin-forms';
import { dayIn, stampIn } from './format';
import { Outcome, Table } from './shared';

/**
 * Diretório de creators.
 *
 * Nome, nível, pontos, participações e submissões — o que a equipe precisa para
 * responder um chamado. Nada de senha, token, sessão ou dado de outra conta: a
 * leitura é por papel, e o que a tela mostra é o mínimo que resolve o atendimento.
 */
export function CreatorsScreen({
  creators,
  search,
}: {
  creators: AdminOutcome<{ items: CreatorSummary[]; sampled: boolean }>;
  search: string;
}) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Administração"
        title="Creators"
        intro="Quem concluiu o onboarding. A busca olha nome, cidade e nicho; o que não aparece aqui é dado privado que a tela não tem por que mostrar."
      />

      <form className={styles.filters} method="get" action="/admin/creators">
        <div className={styles.filterField}>
          <label htmlFor="filtro-busca">Buscar</label>
          <input
            id="filtro-busca"
            name="busca"
            defaultValue={search}
            placeholder="nome, cidade ou nicho"
            maxLength={80}
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={`${appStyles.button} ${appStyles.buttonGhost}`}>
            Buscar
          </button>
          {search ? (
            <Link href="/admin/creators" className={styles.tableLink}>
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      <Outcome result={creators} what="a lista de creators">
        {(value) =>
          value.items.length === 0 ? (
            <EmptyState
              title={search ? 'Nenhuma creator com esta busca' : 'Nenhuma creator cadastrada'}
              text={
                search
                  ? 'Tente parte do nome, ou o nome da cidade.'
                  : 'Quando alguém concluir o onboarding, o perfil aparece aqui.'
              }
            />
          ) : (
            <Table
              caption="Creators cadastradas"
              head={
                <>
                  <th>Nome</th>
                  <th>Nível</th>
                  <th className={styles.tableNum}>Pontos disponíveis</th>
                  <th className={styles.tableNum}>Pontos de jornada</th>
                  <th className={styles.tableNum}>Participações</th>
                  <th className={styles.tableNum}>Envios</th>
                  <th>Cadastro</th>
                  <th />
                </>
              }
            >
              {value.items.map((creator) => (
                <tr key={creator.userId}>
                  <td className={styles.tableWide}>
                    <Link href={`/admin/creators/${creator.userId}`} className={styles.tableLink}>
                      {creator.name || creator.userId}
                    </Link>
                    {creator.city ? (
                      <span className={styles.tableMuted}>
                        {' '}
                        · {creator.city}
                        {creator.state ? `/${creator.state}` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td>{creator.levelName || <span className={styles.tableMuted}>—</span>}</td>
                  <td className={styles.tableNum}>{creator.availablePoints}</td>
                  <td className={styles.tableNum}>{creator.journeyPoints}</td>
                  <td className={styles.tableNum}>{creator.participations}</td>
                  <td className={styles.tableNum}>{creator.submissions}</td>
                  <td className={styles.tableNowrap}>{dayIn(creator.onboardingCompletedAt)}</td>
                  <td className={styles.tableNowrap}>
                    <Link href={`/admin/creators/${creator.userId}`} className={styles.tableLink}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Outcome>
      <Outcome result={creators} what="a lista de creators">
        {(value) =>
          value.sampled ? (
            <p className={styles.counter}>
              As contagens de participações e envios foram somadas até 1.000 linhas por tabela. Quem
              passou disso aparece com o número mínimo — a tela não arredonda para cima.
            </p>
          ) : (
            <p className={styles.counter}>
              Lista com as 100 creators de cadastro mais recente; a busca roda sobre ela.
            </p>
          )
        }
      </Outcome>
    </div>
  );
}

/** Ficha da creator: o que a equipe precisa para atender, e o ajuste de pontos. */
export function CreatorDetailScreen({
  creator,
}: {
  creator: AdminOutcome<{ item: CreatorDetail | null }>;
}) {
  return (
    <Outcome result={creator} what="a ficha da creator">
      {(value) =>
        !value.item ? (
          <EmptyState
            title="Creator não encontrada"
            text="O perfil pode ter sido removido. A lista continua valendo."
            action={
              <Link
                href="/admin/creators"
                className={`${appStyles.button} ${appStyles.buttonGhost}`}
              >
                Voltar para a lista
              </Link>
            }
          />
        ) : (
          <CreatorDetail creator={value.item} />
        )
      }
    </Outcome>
  );
}

function CreatorDetail({ creator }: { creator: CreatorDetail }) {
  return (
    <div className={styles.stack}>
      <ScreenHeader
        kicker="Creator"
        title={creator.name || creator.userId}
        intro={`${creator.levelName || 'Sem nível'} · cadastro em ${dayIn(creator.onboardingCompletedAt)}`}
        action={
          <Link
            href={`/admin/submissoes?criadora=${creator.userId}`}
            className={`${appStyles.button} ${appStyles.buttonGhost}`}
          >
            Ver envios
          </Link>
        }
      />

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Pontos disponíveis</p>
          <p className={styles.kpiValue}>{creator.availablePoints}</p>
          <p className={styles.kpiHint}>Saldo gastável em resgates</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Pontos de jornada</p>
          <p className={styles.kpiValue}>{creator.journeyPoints}</p>
          <p className={styles.kpiHint}>O que sustenta o nível</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Participações</p>
          <p className={styles.kpiValue}>{creator.participations}</p>
          <p className={styles.kpiHint}>Desafios em que entrou</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Envios</p>
          <p className={styles.kpiValue}>{creator.submissions}</p>
          <p className={styles.kpiHint}>Conteúdos enviados</p>
        </div>
      </div>

      <div className={styles.cols}>
        <div className={styles.stack}>
          <Block title="Ajuste de pontos">
            <PointsAdjustForm userId={creator.userId} balance={creator.availablePoints} />
          </Block>

          <Block title="Extrato recente">
            {creator.ledger.length ? (
              <Table
                caption="Lançamentos de pontos da creator"
                head={
                  <>
                    <th>Quando</th>
                    <th>Tipo</th>
                    <th className={styles.tableNum}>Pontos</th>
                    <th>Descrição</th>
                  </>
                }
              >
                {creator.ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className={styles.tableNowrap}>{stampIn(entry.createdAt)}</td>
                    <td>{entry.type}</td>
                    <td
                      className={`${styles.tableNum} ${
                        entry.amount < 0 ? styles.moneyDebit : styles.moneyCredit
                      }`}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </td>
                    <td>{entry.description || <span className={styles.tableMuted}>—</span>}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="Sem lançamentos"
                text="Nenhum ponto entrou ou saiu do extrato desta creator ainda."
              />
            )}
          </Block>
        </div>

        <div className={styles.stack}>
          <Block title="Cadastro">
            <dl className={styles.meta}>
              <div>
                <dt>Nicho</dt>
                <dd>{creator.niche || '—'}</dd>
              </div>
              <div>
                <dt>Tipo de creator</dt>
                <dd>{creator.creatorType || '—'}</dd>
              </div>
              <div>
                <dt>Cidade</dt>
                <dd>
                  {creator.city
                    ? `${creator.city}${creator.state ? `/${creator.state}` : ''}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Perfil público</dt>
                <dd>
                  {creator.publicProfile ? 'Nome exibido no ranking' : 'Fora de áreas públicas'}
                </dd>
              </div>
            </dl>
          </Block>

          <Block title="Redes declaradas">
            {creator.socials.length ? (
              <ul className={styles.timeline}>
                {creator.socials.map((social) => (
                  <li
                    key={`${social.platform}-${social.canonicalUrl}`}
                    className={styles.timelineItem}
                  >
                    <p className={styles.timelineHead}>{social.platform}</p>
                    <p className={styles.timelineMeta}>
                      {social.canonicalUrl || 'sem link declarado'} ·{' '}
                      {social.verificationStatus === 'verified' ? 'verificado' : 'não verificado'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.formHint}>
                Nenhuma rede declarada. O onboarding conclui sem exigir rede social.
              </p>
            )}
          </Block>

          <Block title="Resgates">
            {creator.redemptions.length ? (
              <Table
                caption="Resgates da creator"
                head={
                  <>
                    <th>Recompensa</th>
                    <th>Estado</th>
                    <th className={styles.tableNum}>Pontos</th>
                    <th>Quando</th>
                  </>
                }
              >
                {creator.redemptions.map((redemption) => (
                  <tr key={redemption.redemptionId}>
                    <td>{redemption.rewardName}</td>
                    <td>
                      <Pill view={redemptionView(redemption.status)} />
                    </td>
                    <td className={styles.tableNum}>{redemption.points}</td>
                    <td className={styles.tableNowrap}>{stampIn(redemption.requestedAt)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="Nenhum resgate"
                text="Esta creator ainda não trocou pontos por recompensa."
              />
            )}
          </Block>

          <Block title="Envios por estado">
            <p className={styles.formHint}>
              Cada envio abre com conteúdo, requisitos e a decisão pendente. A lista filtrada por
              esta creator está no botão acima.
            </p>
            <p className={styles.counter}>
              {creator.submissions} envio{creator.submissions === 1 ? '' : 's'} no total
            </p>
          </Block>
        </div>
      </div>
    </div>
  );
}
