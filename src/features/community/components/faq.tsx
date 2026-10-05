import Image from 'next/image';
import acquisition from './acquisition.module.css';

const questions = [
  [
    'O que é NUY Creators?',
    'A comunidade oficial da NUY para consumidores, creators e influenciadores compartilharem seu olhar sobre rotina, casa e bem-estar.',
  ],
  [
    'Quem pode participar?',
    'Clientes NUY, creators UGC, influenciadores e pessoas apaixonadas por casa, perfume, rotina e bem-estar, conforme os termos de participação.',
  ],
  [
    'Preciso ter muitos seguidores?',
    'A proposta valoriza conteúdo autêntico. Cada desafio terá seus próprios critérios, publicados antes da participação.',
  ],
  [
    'Como funcionam os desafios?',
    'São convites criativos da NUY. Na área da comunidade, cada desafio publicado apresenta suas orientações e condições de participação.',
  ],
  [
    'Como ganho Pontos NUY?',
    'Participando dos desafios e enviando conteúdos que atendam aos requisitos. Os pontos são concedidos após a aprovação pela equipe NUY.',
  ],
  [
    'O que posso conquistar?',
    'Produtos, kits, benefícios e experiências, conforme disponibilidade e regras de cada oportunidade. Participar não garante uma recompensa específica.',
  ],
  [
    'Participar é gratuito?',
    'O cadastro e a participação na comunidade são gratuitos. Oportunidades específicas seguem as condições publicadas pela NUY.',
  ],
  [
    'Posso sair quando quiser?',
    'Sim. Você pode deixar de participar e solicitar o encerramento da conta conforme as orientações do aviso de privacidade.',
  ],
];
export function FAQ() {
  return (
    <section id="faq" className="section-pad faq-section">
      <div>
        <p className="eyebrow">07 / FAQ</p>
        <h2>
          Conversas
          <br />
          <em>que esclarecem.</em>
        </h2>
      </div>
      <div className="faq-list">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      {/* Flor creme-alaranjada do canto inferior-esquerdo (crop da ref): a
          imagem é maior que a parte dentro da FAQ de propósito — o fio de luz
          e as pontas das pétalas ATRAVESSAM a fronteira com a CTA (a seção
          FAQ fica acima da CTA na empilha; ver CSS). */}
      <Image
        src="/brand/reference/faq-bloom-corner-feathered.webp"
        alt=""
        width={312}
        height={540}
        quality={90}
        className={acquisition.faqBloomL}
        sizes="(max-width: 760px) 46vw, 15.1vw"
      />
    </section>
  );
}
