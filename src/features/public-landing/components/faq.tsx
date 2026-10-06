import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import styles from '../styles/landing.module.css';

/**
 * 09 — FAQ (Proposta C).
 *
 * Disclosure nativo (`<details>`/`<summary>`): abre pelo teclado, funciona sem
 * JavaScript e não precisa de estado no cliente. O ícone gira por atributo
 * `[open]` — seletor com classe local, como exige a checagem de pureza do CSS
 * Modules no dev.
 *
 * As respostas são as da comunidade (as mesmas publicadas antes do fechamento
 * público), nenhuma promessa nova: nada de prazo, prêmio ou número.
 */
const perguntas = [
  {
    pergunta: 'O que é a NUY Creators?',
    resposta:
      'A comunidade oficial da NUY para consumidores, creators e influenciadores compartilharem seu olhar sobre rotina, casa e bem-estar.',
  },
  {
    pergunta: 'Quem pode participar?',
    resposta:
      'Clientes NUY, creators UGC, influenciadores e pessoas apaixonadas por casa, perfume, rotina e bem-estar, conforme os termos de participação.',
  },
  {
    pergunta: 'Preciso ter muitos seguidores?',
    resposta:
      'A proposta valoriza conteúdo autêntico. Cada desafio terá seus próprios critérios, publicados antes da participação.',
  },
  {
    pergunta: 'Como funcionam os desafios?',
    resposta:
      'São convites criativos da NUY. Na área da comunidade, cada desafio publicado apresenta suas orientações e condições de participação.',
  },
  {
    pergunta: 'Como ganho Pontos NUY?',
    resposta:
      'Participando dos desafios e enviando conteúdos que atendam aos requisitos. Os pontos são concedidos após a aprovação pela equipe NUY.',
  },
  {
    pergunta: 'O que posso conquistar?',
    resposta:
      'Produtos, kits, benefícios e experiências, conforme disponibilidade e regras de cada oportunidade. Participar não garante uma recompensa específica.',
  },
  {
    pergunta: 'Participar é gratuito?',
    resposta:
      'O cadastro e a participação na comunidade são gratuitos. Oportunidades específicas seguem as condições publicadas pela NUY.',
  },
  {
    pergunta: 'Posso sair quando quiser?',
    resposta:
      'Sim. Você pode deixar de participar e solicitar o encerramento da conta conforme as orientações do aviso de privacidade.',
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="pl-faq-title">
      <div className={styles.faqInner}>
        <div className={styles.faqCopy}>
          <p className={styles.sectionEyebrow} data-pl-reveal>
            FAQ
          </p>

          <h2 id="pl-faq-title" className={styles.sectionTitle} data-pl-reveal>
            Conversas <em>que esclarecem.</em>
          </h2>

          <p className={styles.sectionBody} data-pl-reveal>
            As dúvidas mais comuns sobre a comunidade, respondidas sem rodeio.
          </p>
        </div>

        <div className={styles.faqList}>
          {perguntas.map(({ pergunta, resposta }, indice) => (
            <details
              key={pergunta}
              className={styles.faqItem}
              data-pl-reveal
              style={{ '--pl-stagger': `${indice * 45}ms` } as CSSProperties}
            >
              <summary className={styles.faqSummary}>
                <span className={styles.faqQuestion}>{pergunta}</span>
                <ChevronDown
                  size={18}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className={styles.faqIcon}
                />
              </summary>
              <p className={styles.faqAnswer}>{resposta}</p>
            </details>
          ))}
        </div>
      </div>

      <p className={styles.faqFoot} data-pl-reveal>
        <span>Pronto para começar?</span>
        <Link href="/cadastro" className={styles.link}>
          Fazer parte da comunidade
        </Link>
        <Link href="/login" className={styles.link}>
          Já tenho uma conta
        </Link>
        <Link href="/recuperar-senha" className={styles.link}>
          Esqueci minha senha
        </Link>
      </p>
    </section>
  );
}
