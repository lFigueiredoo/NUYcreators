import Image from 'next/image';
import Link from 'next/link';
import { landingNavigation } from './landing-navigation';
import styles from './editorial-sections.module.css';

const benefits = [
  {
    title: 'Crie conteúdo',
    description: (
      <>
        Compartilhe sua rotina e experiências com a <span translate="no">NUY</span>.
      </>
    ),
  },
  {
    title: 'Ganhe reconhecimento',
    description: 'Participe dos desafios e evolua na comunidade.',
  },
  {
    title: (
      <>
        Viva experiências <span translate="no">NUY</span>
      </>
    ),
    description: 'Tenha acesso a recompensas, novidades e ações especiais.',
  },
];

const steps = [
  ['Crie sua conta', 'Comece seu cadastro na plataforma.'],
  ['Complete seu perfil', 'Preencha seus dados e envie para análise.'],
  [
    'Participe dos desafios',
    <>
      Após a aprovação, explore as propostas da <span translate="no">NUY</span>.
    </>,
  ],
  ['Compartilhe seu conteúdo', 'Siga as orientações de cada desafio.'],
  ['Ganhe pontos e recompensas', 'Acompanhe os critérios e as oportunidades disponíveis.'],
] as const;

const questions = [
  {
    question: (
      <>
        Quem pode participar da comunidade <span translate="no">NUY Creators</span>?
      </>
    ),
    answer: (
      <>
        Clientes <span translate="no">NUY</span>, criadores de conteúdo e pessoas que gostam de
        casa, limpeza, perfumação e rotina. As condições completas de participação estão nos{' '}
        <Link href="/termos" prefetch={false}>
          termos da comunidade
        </Link>
        .
      </>
    ),
  },
  {
    question: 'Como funciona o cadastro?',
    answer:
      'Você cria sua conta, completa o perfil e envia o cadastro para análise. Após a aprovação, passa a ter acesso à área da comunidade, onde ficam os desafios e as oportunidades.',
  },
  {
    question: 'Como funcionam os desafios?',
    answer: (
      <>
        São convites criativos publicados pela <span translate="no">NUY</span>. Cada desafio traz
        suas próprias orientações e critérios de participação, sempre anunciados antes de começar.
      </>
    ),
  },
  {
    question: 'Como recebo meus pontos?',
    answer: (
      <>
        Participando dos desafios e enviando conteúdos que atendam aos requisitos publicados. Os
        pontos são concedidos após a aprovação pela equipe <span translate="no">NUY</span>.
      </>
    ),
  },
  {
    question: 'Como funcionam as recompensas?',
    answer:
      'Os pontos podem ser trocados por produtos, kits e experiências, conforme disponibilidade e regras de cada oportunidade. Participar não garante uma recompensa específica.',
  },
  {
    question: 'Posso enviar qualquer tipo de conteúdo?',
    answer:
      'Conteúdos precisam combinar com o território da marca — casa, limpeza, perfumação e bem-estar no lar — e cumprir as diretrizes de cada desafio.',
  },
];

const exploreLinks = [
  landingNavigation[0],
  ['Comunidade', '#comunidade'],
  ...landingNavigation.slice(1),
] as const;
const informationLinks = [
  ['Entrar', '/login'],
  ['Termos', '/termos'],
  ['Privacidade', '/privacidade'],
] as const;

export function EditorialSections() {
  return (
    <>
      <section
        id="o-que-e"
        className={`${styles.about} ${styles.anchor}`}
        aria-labelledby="editorial-about-title"
        tabIndex={-1}
      >
        <div className={`${styles.shell} ${styles.aboutGrid}`}>
          <header className={styles.aboutCopy}>
            <h2 id="editorial-about-title" className={styles.title}>
              <span>Muito mais que conteúdo.</span> <span>É uma comunidade que inspira.</span>
            </h2>
            <p className={styles.copy}>
              O <span translate="no">NUY Creators</span> conecta pessoas que gostam de compartilhar
              rotinas, dicas e experiências para deixar a casa mais limpa, perfumada e acolhedora.
            </p>
          </header>
          <figure className={styles.homeFigure}>
            <Image
              className={styles.homePhoto}
              src="/brand/editorial/ambientes/cena-casa.webp"
              alt="Sala com sofá de linho creme, almofada azul-marinho, mesa de pedra e luz natural."
              width={1100}
              height={1375}
              sizes="(max-width: 350px) calc(100vw - 36px), (max-width: 464px) calc(100vw - 44px), (max-width: 620px) 420px, (max-width: 1200px) 41vw, 491px"
              loading="lazy"
            />
          </figure>
          <ul className={styles.benefits} role="list">
            {benefits.map(({ title, description }, index) => (
              <li key={index} className={styles.benefit}>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="como-participar"
        className={`${styles.participate} ${styles.anchor}`}
        aria-labelledby="editorial-participate-title"
        tabIndex={-1}
      >
        <div className={styles.shell}>
          <header className={styles.participateHeading}>
            <h2 id="editorial-participate-title" className={styles.title}>
              Como participar
            </h2>
            <p className={styles.copy}>
              Comece sua jornada na comunidade <span translate="no">NUY Creators</span>.
            </p>
          </header>
          <ol className={styles.steps} role="list">
            {steps.map(([title, description], index) => (
              <li key={title} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
          <div className={styles.participateAction}>
            <Link className={styles.cta} href="/cadastro" prefetch={false}>
              Começar meu cadastro
            </Link>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className={`${styles.faq} ${styles.anchor}`}
        aria-labelledby="editorial-faq-title"
        tabIndex={-1}
      >
        <div className={styles.shell}>
          <div className={styles.faqGrid}>
            <header className={styles.faqHeading}>
              <h2 id="editorial-faq-title" className={styles.title}>
                Perguntas frequentes
              </h2>
              <p className={styles.copy}>Tire suas dúvidas sobre a comunidade.</p>
            </header>
            <div className={styles.faqList}>
              {questions.map(({ question, answer }, index) => (
                <details key={index} className={styles.faqItem}>
                  <summary className={styles.faqQuestion}>
                    <span>{question}</span>
                    <span className={styles.faqSymbol} aria-hidden="true" />
                  </summary>
                  <p className={styles.faqAnswer}>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="cta-final"
        className={`${styles.invitation} ${styles.anchor}`}
        aria-labelledby="editorial-invitation-title"
        tabIndex={-1}
      >
        <div className={styles.shell}>
          <h2 id="editorial-invitation-title" className={styles.title}>
            Seu jeito de cuidar também pode inspirar.
          </h2>
          <p>Crie, compartilhe e viva experiências com quem também ama cuidar da casa.</p>
          <Link className={styles.cta} href="/cadastro" prefetch={false}>
            Quero fazer parte
          </Link>
        </div>
      </section>
    </>
  );
}

export function EditorialFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.footerGrid}>
          <div className={styles.footerAbout}>
            <a
              className={styles.footerBrand}
              href="#topo"
              aria-label="NUY Creators, voltar ao início"
            >
              <Image
                className={styles.footerLogo}
                src="/brand/nuy-creators-clean/logo/nuy-creators-logo.png"
                alt=""
                width={1278}
                height={297}
                sizes="168px"
                loading="lazy"
              />
            </a>
            <p className={styles.footerDescription}>
              A comunidade de quem gosta de cuidar da casa.
            </p>
          </div>
          <nav className={styles.footerNav} aria-labelledby="editorial-footer-explore">
            <h2 id="editorial-footer-explore">Explore</h2>
            <ul role="list">
              {exploreLinks.map(([label, hash]) => (
                <li key={hash}>
                  <a href={hash}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav className={styles.footerNav} aria-labelledby="editorial-footer-information">
            <h2 id="editorial-footer-information">Informações</h2>
            <ul role="list">
              {informationLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} prefetch={false}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <p>
            © 2026 <span translate="no">NUY Creators</span>
          </p>
          <a href="#topo">Voltar ao início</a>
        </div>
      </div>
    </footer>
  );
}
