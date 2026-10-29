import {
  BadgeDollarSign,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Gift,
  Medal,
  PlaySquare,
  Scale,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { RegulationPublication } from '@/features/workspace/services/regulation';
import styles from '../styles/regulation.module.css';

const dailyScores = [
  {
    platform: 'Instagram',
    icon: Camera,
    format: 'Reels ou vídeo no Feed',
    points: '10 pontos',
    rule: 'Por publicação aprovada no feed.',
  },
  {
    platform: 'Instagram',
    icon: Camera,
    format: 'Foto ou carrossel',
    points: '10 pontos',
    rule: 'Por publicação aprovada no feed.',
  },
  {
    platform: 'Instagram',
    icon: Camera,
    format: 'Stories',
    points: '1 ponto',
    rule: 'Teto de 10 pontos por dia.',
  },
  {
    platform: 'TikTok',
    icon: PlaySquare,
    format: 'Postagem colaborativa',
    points: '15 pontos',
    rule: 'Máximo de 2 posts por dia. A collab com a NUY deve ser aceita.',
  },
  {
    platform: 'Shopee',
    icon: ShoppingBag,
    format: 'Shopee Vídeo',
    points: '20 pontos',
    rule: 'Máximo de 2 vídeos por dia, com link do produto NUY.',
  },
];

const performanceScores = [
  ['Venda convertida', '20 pontos', 'Venda aprovada com cupom ou link exclusivo.'],
  ['Live de demonstração', '50 pontos', 'Mínimo de 30 minutos no Instagram, TikTok ou Shopee.'],
  ['Consistência semanal', '20 pontos', 'Bônus ao atingir 2 posts na semana.'],
  ['Super consistência', '70 pontos', 'Bônus ao atingir 5 posts na semana.'],
  ['Post viralizado', '150 pontos', 'Ao atingir a meta de visualizações do mês.'],
] as const;

const prizes = [
  {
    place: '1º',
    label: 'Primeiro lugar',
    reward: '3 Kits Premium NUY',
    detail: 'Cada kit: 2 Aromatizantes, 2 Sabonetes e 1 Limpador.',
  },
  {
    place: '2º',
    label: 'Segundo lugar',
    reward: '1 Kit Premium NUY',
    detail: '2 Aromatizantes, 2 Sabonetes e 1 Limpador.',
  },
  {
    place: '3º',
    label: 'Terceiro lugar',
    reward: '1 Kit Intermediário NUY',
    detail: '1 Aromatizante, 1 Sabonete e 1 Limpador.',
  },
  {
    place: '4º',
    label: 'Quarto lugar',
    reward: '1 Kit Básico NUY',
    detail: '1 Aromatizante e 1 Sabonete.',
  },
  {
    place: '5º',
    label: 'Quinto lugar',
    reward: '1 Produto NUY',
    detail: '1 Aromatizante ou 1 Sabonete.',
  },
] as const;

function PendingField({ children }: { children: React.ReactNode }) {
  return <span className={styles.pendingField}>{children}</span>;
}

function PublicationValue({ value, fallback }: { value: string | null; fallback: string }) {
  return value ? <strong>{value}</strong> : <PendingField>{fallback}</PendingField>;
}

function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.legalSection} id={`secao-${number}`}>
      <div className={styles.legalHeading}>
        <span>{number.padStart(2, '0')}</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.legalBody}>{children}</div>
    </section>
  );
}

export function RegulationScreen({ publication }: { publication: RegulationPublication }) {
  return (
    <div className={styles.regulation}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.statusRow}>
            <span className={styles.eyebrow}>Programa NUY Creators</span>
            <span className={styles.draftBadge}>Minuta não vigente</span>
          </div>
          <h1>Regulamento do programa</h1>
          <p className={styles.heroLead}>
            Conheça a proposta de pontuação, ranking e recompensas do NUY Creators. A mecânica
            somente entrará em vigor após o preenchimento dos dados oficiais, a validação jurídica e
            a publicação da versão definitiva.
          </p>
          <nav className={styles.jumpNav} aria-label="Atalhos do regulamento">
            <a href="#pontuacao">Pontuação</a>
            <a href="#premiacao">Premiação</a>
            <a href="#regulamento-completo">Texto completo</a>
          </nav>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <span className={styles.heroRing}>
            <Trophy size={36} />
          </span>
          <strong>TOP 5</strong>
          <small>Proposta de premiação</small>
        </div>
      </header>

      <section className={styles.quickSection} aria-labelledby="como-funciona">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}>
            <Zap size={18} />
          </span>
          <div>
            <p>Resumo rápido</p>
            <h2 id="como-funciona">Como funciona</h2>
          </div>
        </div>
        <div className={styles.quickGrid}>
          <article className={styles.quickCard}>
            <CalendarDays size={21} aria-hidden="true" />
            <h3>Ciclos mensais</h3>
            <p>
              Cada mês abre uma nova apuração do ranking sem apagar o histórico ou os pontos de
              jornada.
            </p>
          </article>
          <article className={styles.quickCard}>
            <Sparkles size={21} aria-hidden="true" />
            <h3>Pontue todos os dias</h3>
            <p>
              Feed, Stories, collabs, lives e Shopee Vídeo poderão gerar pontos quando a regra
              correspondente estiver ativa no painel.
            </p>
          </article>
          <article className={styles.quickCard}>
            <BadgeDollarSign size={21} aria-hidden="true" />
            <h3>Comissões separadas</h3>
            <p>
              Quando houver afiliação, as comissões seguirão condições comerciais próprias e não
              serão tratadas como prêmios.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.contentSection} id="pontuacao" aria-labelledby="titulo-pontuacao">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}>
            <Medal size={18} />
          </span>
          <div>
            <p>Atividades e limites</p>
            <h2 id="titulo-pontuacao">Tabela de pontuação</h2>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>Tarefas diárias propostas</h3>
              <p>Atividades que dependerão de ativação e divulgação no painel.</p>
            </div>
            <span className={styles.resetPill}>
              <Clock3 size={14} aria-hidden="true" /> Limites renovados às 00h
            </span>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th>Plataforma</th>
                  <th>Formato ou ação</th>
                  <th>Pontuação</th>
                  <th>Limite diário e regras</th>
                </tr>
              </thead>
              <tbody>
                {dailyScores.map((item) => {
                  const Icon = item.icon;
                  return (
                    <tr key={`${item.platform}-${item.format}`}>
                      <td>
                        <span className={styles.platform}>
                          <Icon size={16} aria-hidden="true" /> {item.platform}
                        </span>
                      </td>
                      <td>{item.format}</td>
                      <td>
                        <strong className={styles.points}>{item.points}</strong>
                      </td>
                      <td>{item.rule}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.tableNote}>
            Mantenha o perfil público e marque os perfis ou links oficiais da NUY nas publicações.
          </p>
        </div>

        <div className={styles.performanceGrid}>
          {performanceScores.map(([title, points, detail]) => (
            <article className={styles.performanceCard} key={title}>
              <span>{points}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
          <article className={`${styles.performanceCard} ${styles.campaignCard}`}>
            <span>Pontos extras</span>
            <h3>Desafios de campanha</h3>
            <p>Lançamentos e ações temáticas terão regras e bônus próprios divulgados no painel.</p>
          </article>
        </div>
      </section>

      <section className={styles.contentSection} id="premiacao" aria-labelledby="titulo-premiacao">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}>
            <Gift size={18} />
          </span>
          <div>
            <p>Ranking mensal</p>
            <h2 id="titulo-premiacao">Proposta de premiação do Top 5</h2>
          </div>
        </div>
        <div className={styles.prizeGrid}>
          {prizes.map((prize, index) => (
            <article
              className={
                index === 0 ? `${styles.prizeCard} ${styles.prizeWinner}` : styles.prizeCard
              }
              key={prize.place}
            >
              <div className={styles.placeRow}>
                <span className={styles.place}>{prize.place}</span>
                <span>{prize.label}</span>
              </div>
              <strong>Premiação em produtos</strong>
              <h3>{prize.reward}</h3>
              <p>{prize.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <article className={styles.legalDocument} id="regulamento-completo">
        <header className={styles.legalIntro}>
          <span className={styles.legalIcon}>
            <Scale size={22} />
          </span>
          <div>
            <p>Documento integral</p>
            <h2>Regulamento completo do programa “NUY Creators”</h2>
            <p className={styles.legalLead}>
              Leia todas as condições de participação, pontuação, premiação, auditoria e proteção de
              dados.
            </p>
          </div>
        </header>

        <aside className={styles.pendingNotice}>
          <Scale size={18} aria-hidden="true" />
          <p>
            <strong>Minuta sem vigência.</strong> Este documento não abre campanha, não promete
            pontos, comissões ou prêmios e não substitui o Regulamento definitivo. Os campos
            destacados precisam ser preenchidos e o texto deve passar por validação jurídica antes
            da publicação.
          </p>
        </aside>

        <LegalSection number="1" title="Dados da empresa promotora">
          <p>
            <strong>1.1.</strong>{' '}
            <PublicationValue
              value={publication.promoterLegalName}
              fallback="Razão Social da NUY"
            />
            , nome fantasia{' '}
            <PublicationValue
              value={publication.promoterTradeName}
              fallback="Nome de fantasia da NUY"
            />
            , com sede em{' '}
            <PublicationValue
              value={publication.promoterAddress}
              fallback="Endereço completo da sede"
            />
            , inscrita no CNPJ/MF sob o nº{' '}
            <PublicationValue value={publication.promoterCnpj} fallback="00.000.000/0001-00" />,
            denominada adiante apenas como Promotora ou NUY.
          </p>
        </LegalSection>

        <LegalSection number="2" title="Modalidade e período">
          <p>
            <strong>2.1. Modalidade:</strong> concurso de incentivo à criação de conteúdo,
            engajamento orgânico e conversão em vendas.
          </p>
          <p>
            <strong>2.2. Área de execução:</strong> todo o território nacional.
          </p>
          <p>
            <strong>2.3. Plataformas válidas:</strong> Instagram, TikTok e Shopee, incluindo Shopee
            Vídeo e Live.
          </p>
          <p>
            <strong>2.4. Período de participação:</strong> início em{' '}
            <PublicationValue value={publication.participationStartsAt} fallback="Data de início" />{' '}
            e término em{' '}
            <PublicationValue
              value={publication.participationEndsAt}
              fallback="Data de término ou prazo indeterminado"
            />
            .
          </p>
          <p>
            <strong>2.5. Autorização:</strong>{' '}
            <PublicationValue
              value={publication.authorizationCertificate}
              fallback="Certificado de autorização, quando exigível"
            />
            . A campanha não será aberta antes da conclusão da análise jurídica e das autorizações
            aplicáveis.
          </p>
        </LegalSection>

        <LegalSection number="3" title="Quem pode participar">
          <p>
            <strong>3.1.</strong> A promoção é válida para pessoas físicas maiores de 18 anos,
            portadoras de CPF válido, residentes no Brasil e com perfil público e ativo no
            Instagram, TikTok e/ou Shopee.
          </p>
          <p>
            <strong>3.2.</strong> Estão impedidos de participar os sócios, diretores e funcionários
            diretos da marca NUY.
          </p>
        </LegalSection>

        <LegalSection number="4" title="Mecânica promocional e pontuação">
          <p>
            <strong>4.1. Ciclos mensais:</strong> a dinâmica ocorre em ciclos mensais. No dia 1º de
            cada mês, às 00h00, inicia-se uma nova apuração do ranking. O histórico e os pontos de
            jornada não são apagados.
          </p>
          <p>
            <strong>4.2. Acompanhamento:</strong> quando a mecânica estiver vigente, os pontos
            elegíveis serão acompanhados no portal e poderão ser submetidos à auditoria da equipe.
          </p>
          <h3>4.3. Tarefas diárias</h3>
          <ul>
            <li>
              <strong>Instagram Reels ou vídeo no Feed:</strong> 10 pontos por post aprovado.
            </li>
            <li>
              <strong>Instagram Foto ou Carrossel:</strong> 10 pontos por post aprovado.
            </li>
            <li>
              <strong>Instagram Stories:</strong> 1 ponto por story, limitado a 10 pontos por dia.
            </li>
            <li>
              <strong>TikTok colaborativo:</strong> 15 pontos por post, limitado a 2 posts por dia e
              sujeito à collab com o perfil oficial da NUY.
            </li>
            <li>
              <strong>Shopee Vídeo:</strong> 20 pontos por vídeo, limitado a 2 vídeos por dia e com
              vínculo do produto NUY.
            </li>
          </ul>
          <h3>4.4. Performance e vendas</h3>
          <ul>
            <li>
              <strong>Venda convertida:</strong> 20 pontos por venda aprovada com cupom ou link
              exclusivo.
            </li>
            <li>
              <strong>Live de demonstração:</strong> 50 pontos por transmissão de pelo menos 30
              minutos.
            </li>
            <li>
              <strong>Consistência semanal:</strong> 20 pontos de bônus por 2 posts na semana.
            </li>
            <li>
              <strong>Super consistência:</strong> 70 pontos de bônus por 5 posts na semana.
            </li>
            <li>
              <strong>Post viralizado:</strong> 150 pontos ao atingir{' '}
              <PublicationValue
                value={publication.viralViewsGoal}
                fallback="meta mensal de visualizações"
              />
              .
            </li>
          </ul>
          <h3>4.5. Desafios de campanhas temáticas</h3>
          <p>
            A NUY poderá lançar campanhas de produto, datas comemorativas e missões de engajamento
            com prazos, mecânicas e pontuações próprias divulgadas no painel. Conteúdos enviados
            fora do prazo não serão pontuados.
          </p>
          <h3>4.6. Identificação publicitária</h3>
          <p>
            Conteúdo criado em razão de pagamento, comissão, envio de produto, bonificação ou outro
            benefício deverá identificar de forma clara e imediata seu caráter publicitário, com
            aviso compatível com o formato e a plataforma. Relatos de experiência devem ser
            verdadeiros e não podem atribuir ao produto características não comprovadas.
          </p>
        </LegalSection>

        <LegalSection number="5" title="Premiação mensal — Top 5">
          <p>
            <strong>5.1.</strong> A proposta de premiação em produtos para os cinco creators com
            maior pontuação, sujeita ao Regulamento definitivo e às autorizações aplicáveis, é:
          </p>
          <ol>
            <li>
              <strong>1º lugar:</strong> 3 Kits Premium NUY.
            </li>
            <li>
              <strong>2º lugar:</strong> 1 Kit Premium NUY.
            </li>
            <li>
              <strong>3º lugar:</strong> 1 Kit Intermediário NUY.
            </li>
            <li>
              <strong>4º lugar:</strong> 1 Kit Básico NUY.
            </li>
            <li>
              <strong>5º lugar:</strong> 1 Produto NUY.
            </li>
          </ol>
          <p>
            <strong>5.2. Desempate:</strong> maior número de vendas convertidas; depois, maior
            pontuação em desafios de campanha; por fim, primeiro material validado no ciclo.
          </p>
        </LegalSection>

        <LegalSection number="6" title="Entrega dos prêmios">
          <p>
            <strong>6.1.</strong> A forma de apuração, homologação, comunicação e entrega será
            informada no Regulamento definitivo antes do início da campanha.
          </p>
          <p>
            <strong>6.2.</strong> Se confirmados, os kits físicos serão enviados sem custo de frete
            ao endereço validado para a entrega.
          </p>
          <p>
            <strong>6.3.</strong> Os prêmios são pessoais e intransferíveis.
          </p>
        </LegalSection>

        <LegalSection number="7" title="Proteção de dados — LGPD">
          <p>
            <strong>7.1.</strong> Os dados necessários à inscrição, auditoria, comunicação e
            eventual entrega de produtos serão tratados conforme a Política de Privacidade, as bases
            legais aplicáveis e a Lei nº 13.709/2018. Dados adicionais somente serão solicitados
            quando necessários e com informação clara sobre a finalidade.
          </p>
          <p>
            <strong>7.2.</strong> O participante poderá solicitar o exercício de seus direitos e o
            cancelamento do cadastro. As consequências sobre uma participação em andamento deverão
            respeitar a legislação, o Regulamento vigente e direitos já adquiridos.
          </p>
        </LegalSection>

        <LegalSection number="8" title="Direitos de imagem e autorais">
          <p>
            <strong>8.1.</strong> O participante mantém a autoria e os direitos sobre o conteúdo que
            cria. O envio autoriza o armazenamento, a análise e a exibição necessária no portal para
            administrar a participação.
          </p>
          <p>
            <strong>8.2.</strong> Repostagem, impulsionamento, adaptação ou uso publicitário externo
            dependerá de autorização específica que informe finalidade, modalidades, território e
            prazo, preservados os direitos morais da autora.
          </p>
        </LegalSection>

        <LegalSection number="9" title="Auditoria, desclassificação e condutas proibidas">
          <p>
            <strong>9.1.</strong> A NUY poderá auditar publicações e transações financeiras
            relacionadas aos cupons e links.
          </p>
          <p>
            <strong>9.2.</strong> Poderá ser desclassificado, com cancelamento dos pontos, quem:
          </p>
          <ul>
            <li>
              Utilizar bots, fazendas de cliques, automações ou comprar engajamento, seguidores ou
              visualizações.
            </li>
            <li>Praticar autocompra fraudulenta ou agir de má-fé para forçar pontos de vendas.</li>
            <li>
              Publicar conteúdos genéricos ou duplicados sem contexto com o produto apenas para
              atingir limites diários.
            </li>
            <li>
              Usar linguagem ofensiva, preconceituosa ou inadequada, ou associar a NUY a
              concorrentes diretos no mesmo conteúdo.
            </li>
          </ul>
        </LegalSection>

        <LegalSection number="10" title="Disposições gerais">
          <p>
            <strong>10.1.</strong> A NUY não se responsabiliza por instabilidades nas plataformas
            sociais que dificultem a comprovação da postagem dentro do prazo.
          </p>
          <p>
            <strong>10.2.</strong> A participação em uma campanha aberta implicará a aceitação da
            versão definitiva deste Regulamento e das regras específicas apresentadas antes da
            inscrição. Esta minuta não produz esse efeito.
          </p>
          <p>
            <strong>10.3.</strong> Dúvidas, comprovações e suporte deverão ser encaminhados para{' '}
            <PublicationValue
              value={publication.supportEmail}
              fallback="e-mail oficial de suporte"
            />
            .
          </p>
        </LegalSection>

        <footer className={styles.legalFooter}>
          <CheckCircle2 size={18} aria-hidden="true" />
          <p>
            Versão de trabalho sem vigência, preparada para preenchimento dos campos institucionais,
            definição da mecânica operacional e revisão jurídica final.
          </p>
        </footer>
      </article>

      <aside className={styles.communityNote}>
        <Users size={21} aria-hidden="true" />
        <div>
          <strong>Transparência para toda a comunidade</strong>
          <p>
            O ranking, as aprovações de conteúdo e os pontos podem ser auditados pela equipe NUY
            durante todo o ciclo.
          </p>
        </div>
      </aside>
    </div>
  );
}
