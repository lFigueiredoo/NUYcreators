import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import styles from '../styles/landing.module.css';

/**
 * 06 — FAQ (navy).
 *
 * Disclosure nativo (`<details>`/`<summary>`): abre pelo teclado, funciona sem
 * JavaScript e precisa de zero estado no cliente. Simplicidade da referência:
 * linha/border, texto branco, chevron — nada de card por pergunta.
 */
const perguntas = [
  {
    pergunta: 'Quem pode participar da comunidade NUY Creators?',
    resposta:
      'Clientes NUY, criadores de conteúdo e pessoas que gostam de casa, limpeza, perfumação e rotina. As condições completas de participação estão nos termos da comunidade.',
  },
  {
    pergunta: 'Como funciona o cadastro?',
    resposta:
      'Você cria sua conta, completa o perfil e passa a ter acesso à área da comunidade, onde ficam os desafios e as oportunidades.',
  },
  {
    pergunta: 'Como funcionam os desafios?',
    resposta:
      'São convites criativos publicados pela NUY. Cada desafio traz suas próprias orientações e critérios de participação, sempre anunciados antes de começar.',
  },
  {
    pergunta: 'Como recebo meus pontos?',
    resposta:
      'Participando dos desafios e enviando conteúdos que atendam aos requisitos publicados. Os pontos são concedidos após a aprovação pela equipe NUY.',
  },
  {
    pergunta: 'Como funcionam as recompensas?',
    resposta:
      'Os pontos podem ser trocados por produtos, kits e experiências, conforme disponibilidade e regras de cada oportunidade. Participar não garante uma recompensa específica.',
  },
  {
    pergunta: 'Posso enviar qualquer tipo de conteúdo?',
    resposta:
      'Conteúdos precisam combinar com o território da marca — casa, limpeza, perfumação e bem-estar no lar — e cumprir as diretrizes de cada desafio.',
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="pl-faq-title">
      <h2 id="pl-faq-title" className={styles.sectionTitle} data-pl-reveal data-pl-index="0">
        Perguntas frequentes
      </h2>
      <p className={styles.faqSub} data-pl-reveal data-pl-index="1">
        Tire suas dúvidas sobre a plataforma.
      </p>

      <div className={styles.faqList}>
        {perguntas.map((item, index) => (
          <details
            key={item.pergunta}
            className={styles.faqItem}
            data-pl-reveal
            data-pl-index={String(Math.min(index, 5))}
          >
            <summary className={styles.faqQuestion}>
              <span>{item.pergunta}</span>
              <ChevronDown
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
                className={styles.faqChevron}
              />
            </summary>
            <p className={styles.faqAnswer}>{item.resposta}</p>
          </details>
        ))}
      </div>

      <p className={styles.faqFoot} data-pl-reveal data-pl-index="1">
        Ainda tem dúvidas?{' '}
        <Link href="/cadastro" className={styles.faqLink}>
          Faça parte da comunidade
        </Link>{' '}
        ou{' '}
        <Link href="/login" className={styles.faqLink}>
          entre na sua conta
        </Link>
        .
      </p>
    </section>
  );
}
