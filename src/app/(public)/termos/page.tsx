import Link from 'next/link';
import { LegalDocument } from '@/features/legal/components/legal-document';

/**
 * Proposta de Termos de Uso v2, revisada em 29/10/2026.
 *
 * A versão continua identificada como minuta até que o jurídico aprove o
 * documento, a configuração de aceite seja atualizada e, quando necessário, a
 * plataforma implemente o novo aceite. O texto descreve apenas capacidades que
 * existem no produto; campanhas promocionais e premiações ficam no Regulamento.
 */
export const metadata = { title: 'Termos de Uso — NUY Creators' };

export default function Terms() {
  return (
    <LegalDocument
      eyebrow="Transparência"
      title="Termos de Uso — NUY Creators"
      subtitle="Minuta 2026-10-29-v2 · 29/10/2026"
      notice="Minuta revisada para validação jurídica. A nova versão somente entrará em vigor após aprovação e comunicação às participantes."
    >
      <h2>1. Objeto e documentos aplicáveis</h2>
      <p>
        Estes Termos disciplinam o acesso e o uso do NUY Creators, incluindo perfil, desafios,
        conteúdos, Academia NUY, comentários, Pontos NUY, ranking, recompensas e notificações. A{' '}
        <Link href="/privacidade">Política de Privacidade</Link> explica o tratamento de dados
        pessoais. Campanhas, pontuações especiais e eventuais premiações dependem também do
        Regulamento e das regras específicas publicadas no painel.
      </p>

      <h2>2. Elegibilidade e conta</h2>
      <p>
        A plataforma é destinada a pessoas com 18 anos ou mais. A participante deve fornecer
        informações verdadeiras, manter seus dados atualizados, usar apenas a própria conta e
        proteger suas credenciais. Contas falsas, duplicadas, cedidas ou criadas para contornar
        limites podem ser suspensas após análise.
      </p>

      <h2>3. Desafios, campanhas e envios</h2>
      <p>
        A participação em desafios é opcional. Cada desafio informa prazo, formatos aceitos,
        requisitos, critérios de aprovação e quantidade de Pontos NUY. O conteúdo precisa ser
        enviado pelo fluxo indicado e dentro do prazo. As regras específicas do desafio prevalecem
        para aquela participação, sem afastar estes Termos, a legislação e a Política de
        Privacidade.
      </p>

      <h2>4. Análise e moderação</h2>
      <p>
        Envios e interações podem passar por análise da equipe. O material pode ser aprovado,
        recusado, devolvido para correção, ocultado ou removido quando não cumprir as regras, violar
        direitos de terceiros ou representar risco à comunidade. Sempre que aplicável, a decisão e
        seu motivo ficam registrados e podem ser questionados pelos canais oficiais.
      </p>

      <h2>5. Pontos NUY</h2>
      <p>
        Pontos NUY são registros de participação na plataforma. Eles não são moeda, não podem ser
        vendidos, transferidos entre contas ou convertidos em dinheiro. O painel pode distinguir
        pontos disponíveis para recompensas, pontos de jornada usados para nível e pontos obtidos em
        um ciclo de ranking. Correções de erro, fraude, cancelamento ou duplicidade podem gerar
        ajustes rastreáveis.
      </p>

      <h2>6. Ranking e ciclos</h2>
      <p>
        O ranking considera os pontos elegíveis obtidos dentro do período indicado na tela. O início
        de um novo ciclo não apaga o histórico nem os pontos de jornada: apenas inicia uma nova
        apuração. Empates, correções e critérios de premiação, quando existirem, seguem o
        Regulamento vigente e as regras divulgadas antes do ciclo.
      </p>

      <h2>7. Recompensas, comissões e premiações</h2>
      <p>
        Recompensas do catálogo dependem do saldo disponível, estoque, limites e confirmação do
        resgate. Comissões por vendas, quando oferecidas, não se confundem com Pontos NUY ou prêmios
        e dependem de condições comerciais próprias. Nenhum valor financeiro ou prêmio é prometido
        por estes Termos; uma eventual promoção somente poderá ocorrer conforme Regulamento
        definitivo, autorizações aplicáveis e comunicação oficial.
      </p>

      <h2>8. Publicidade e transparência</h2>
      <p>
        Conteúdo produzido em razão de pagamento, comissão, envio de produto, bonificação ou outro
        benefício deve identificar de forma clara e imediata seu caráter publicitário, inclusive em
        vídeos, Stories e transmissões ao vivo. A participante deve relatar experiências
        verdadeiras, seguir o briefing aprovado e não atribuir aos produtos qualidades, resultados
        ou indicações que não tenham sido fornecidos ou comprovados pela NUY.
      </p>

      <h2>9. Autoria, imagem e licença de uso</h2>
      <p>
        A participante mantém a autoria e os direitos sobre o conteúdo que cria e declara possuir as
        autorizações necessárias sobre imagem, voz, música, marcas e materiais de terceiros. O envio
        autoriza apenas o armazenamento, a análise, a moderação e a exibição necessária dentro da
        plataforma. Repostagem, impulsionamento, adaptação ou uso publicitário externo pela NUY
        dependem de autorização específica que informe finalidade, meios, território e prazo,
        preservados os direitos morais da autora.
      </p>

      <h2>10. Condutas proibidas</h2>
      <p>
        Não é permitido usar bots, automação indevida, compra de engajamento, autocompra
        fraudulenta, informações falsas, conteúdo duplicado para manipular limites, discurso
        discriminatório, ameaças, assédio, violação de propriedade intelectual ou qualquer
        expediente destinado a manipular aprovações, pontos, ranking, comissões ou recompensas.
      </p>

      <h2>11. Academia NUY e comunidade</h2>
      <p>
        Aulas, vídeos, PDFs e demais materiais da Academia destinam-se ao uso pessoal da
        participante e não podem ser redistribuídos sem autorização. Comentários e respostas devem
        respeitar as demais participantes, podem ser moderados e permanecem sujeitos às regras de
        privacidade e segurança da plataforma.
      </p>

      <h2>12. Dados pessoais e segurança</h2>
      <p>
        O tratamento de dados segue a Política de Privacidade e a legislação aplicável, incluindo a
        Lei Geral de Proteção de Dados Pessoais. A participante pode solicitar o exercício de seus
        direitos pelos canais oficiais. Pedidos de exclusão observam obrigações legais, prevenção a
        fraudes, segurança e exercício regular de direitos.
      </p>

      <h2>13. Plataformas de terceiros</h2>
      <p>
        Instagram, TikTok, YouTube, Shopee e outros serviços externos possuem termos,
        disponibilidade e sistemas próprios. A NUY não controla indisponibilidades, remoções ou
        mudanças dessas plataformas, mas avaliará situações comprovadas conforme as regras do
        desafio ou campanha.
      </p>

      <h2>14. Suspensão e encerramento</h2>
      <p>
        A conta pode ser temporariamente limitada ou suspensa para investigação de fraude, risco de
        segurança ou violação relevante. O encerramento definitivo deve considerar a gravidade, as
        evidências, os direitos já adquiridos e eventual manifestação da participante, sem impedir
        medidas urgentes de proteção da plataforma e da comunidade.
      </p>

      <h2>15. Alterações, legislação e contato</h2>
      <p>
        Estes Termos são regidos pela legislação brasileira, inclusive pelas normas aplicáveis de
        proteção de dados, internet, direitos autorais e defesa do consumidor. Alterações relevantes
        receberão nova versão, comunicação clara e, quando necessário, novo aceite. Dúvidas,
        contestações e solicitações devem ser encaminhadas pelos canais oficiais divulgados pela
        NUY.
      </p>
    </LegalDocument>
  );
}
