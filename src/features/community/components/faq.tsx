const questions = [
  [
    'O que é NUY Creators?',
    'A comunidade oficial da NUY para consumidores, creators e influenciadores compartilharem seu olhar sobre rotina, casa e bem-estar.',
  ],
  [
    'Preciso ter muitos seguidores?',
    'A proposta valoriza conteúdo autêntico. Cada desafio terá seus próprios critérios, publicados antes da participação.',
  ],
  [
    'Como vou conquistar Pontos NUY?',
    'Participando dos desafios e enviando conteúdos que atendam aos requisitos. Os pontos são concedidos após a aprovação pela equipe NUY.',
  ],
  [
    'Posso conectar minhas redes sociais?',
    'No onboarding, você poderá informar links de Instagram, TikTok e YouTube. Esses links serão identificados como não verificados; não há conexão OAuth nesta etapa.',
  ],
  [
    'Quando poderei trocar pontos?',
    'Quando o catálogo e o fluxo de resgates forem liberados. Cada recompensa terá custo, disponibilidade e regras próprios.',
  ],
];
export function FAQ() {
  return (
    <section id="faq" className="section-pad faq-section">
      <div>
        <p className="eyebrow">10 / Antes de começar</p>
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
    </section>
  );
}
