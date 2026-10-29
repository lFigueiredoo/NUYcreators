import Link from 'next/link';
import { LegalDocument } from '@/features/legal/components/legal-document';
import { CURRENT_TERMS_VERSION, LEGAL_EFFECTIVE_DATE } from '@/features/legal/versions';

/** Termos de Uso oficiais do NUY Creators. */
export const metadata = { title: 'Termos de Uso — NUY Creators' };

export default function Terms() {
  return (
    <LegalDocument
      eyebrow="Transparência"
      title="Termos de Uso — NUY Creators"
      subtitle={`Versão ${CURRENT_TERMS_VERSION} · vigente desde ${LEGAL_EFFECTIVE_DATE}`}
      notice="Documento oficial vigente. Leia estes Termos antes de criar a conta ou participar do NUY Creators."
    >
      <h2>1. Identificação da operadora e aceite</h2>
      <p>
        O NUY Creators é operado por <strong>SIRMIONE COMERCIO E DISTRIBUICAO LTDA</strong>, nome de
        fantasia <strong>NSN COMERCIO E DISTRIBUICAO</strong>, inscrita no CNPJ sob o nº{' '}
        <strong>36.120.044/0001-00</strong>, com sede na Rua Projetada, S/N, Distrito Mecânico,
        Pedras de Fogo — PB, CEP 58.328-000, doravante denominada “NUY”.
      </p>
      <p>
        Ao marcar a caixa de aceite e concluir o cadastro ou onboarding, a participante declara ter
        lido e concordado com esta versão dos Termos e com a{' '}
        <Link href="/privacidade">Política de Privacidade</Link>. A plataforma poderá registrar a
        versão aceita, a data e os identificadores técnicos necessários para comprovar o aceite e
        proteger as partes.
      </p>

      <h2>2. Objeto e documentos aplicáveis</h2>
      <p>
        Estes Termos disciplinam o acesso e o uso do NUY Creators, incluindo perfil, desafios,
        conteúdos, Academia NUY, comentários, Pontos NUY, ranking, recompensas e notificações. A
        Política de Privacidade explica o tratamento de dados pessoais. Campanhas, pontuações
        especiais e premiações também obedecem ao Regulamento vigente e às regras específicas
        apresentadas no painel antes da participação.
      </p>
      <p>
        Em caso de divergência, a regra específica prevalece apenas para o respectivo desafio ou
        campanha. Estes Termos, a Política de Privacidade e a legislação aplicável continuam
        obrigatórios.
      </p>

      <h2>3. Elegibilidade e conta</h2>
      <p>
        A plataforma é destinada a pessoas físicas com 18 anos ou mais. A participante deve fornecer
        informações verdadeiras, manter seus dados atualizados, usar apenas a própria conta e
        proteger suas credenciais. Contas falsas, duplicadas, cedidas ou criadas para contornar
        limites podem ser suspensas após análise. Ações promocionais podem exigir, em seu
        Regulamento, CPF válido, residência no Brasil, perfil público e outros critérios
        específicos.
      </p>
      <p>
        A participação é voluntária e não cria, por si só, vínculo empregatício, sociedade,
        representação comercial, exclusividade ou mandato entre a participante e a NUY. Essa
        disposição não afasta direitos que sejam obrigatórios conforme a realidade da relação e a
        legislação aplicável.
      </p>

      <h2>4. Desafios, campanhas e envios</h2>
      <p>
        Cada desafio informa prazo, formatos aceitos, requisitos, critérios de aprovação e
        quantidade de Pontos NUY. O conteúdo deve ser enviado pelo fluxo indicado e dentro do prazo.
        A participante é responsável pela veracidade das informações e pela conformidade do material
        com o briefing, as regras das plataformas e a legislação.
      </p>

      <h2>5. Análise, moderação e contestação</h2>
      <p>
        Envios e interações podem passar por análise da equipe. O material pode ser aprovado,
        recusado, devolvido para correção, ocultado ou removido quando não cumprir as regras, violar
        direitos de terceiros ou representar risco à comunidade. Sempre que aplicável, a decisão e
        seu motivo ficam registrados e podem ser questionados pelo e-mail oficial de suporte.
      </p>

      <h2>6. Pontos NUY</h2>
      <p>
        Pontos NUY são registros de participação na plataforma. Eles não são moeda, não rendem
        juros, não podem ser vendidos, transferidos entre contas ou convertidos em dinheiro, salvo
        previsão expressa de Regulamento válido. O painel pode distinguir pontos disponíveis para
        recompensas, pontos de jornada usados para nível e pontos de um ciclo de ranking. Correções
        de erro, fraude, cancelamento ou duplicidade podem gerar ajustes rastreáveis.
      </p>

      <h2>7. Ranking e ciclos</h2>
      <p>
        O ranking considera os pontos elegíveis obtidos dentro do período indicado na tela. O início
        de um novo ciclo não apaga o histórico nem os pontos de jornada: apenas inicia nova
        apuração. Empates, auditorias, correções e critérios de premiação seguem o Regulamento
        vigente e as regras divulgadas antes do ciclo.
      </p>

      <h2>8. Recompensas, comissões e premiações</h2>
      <p>
        Recompensas do catálogo dependem do saldo disponível, estoque, limites, dados corretos e
        confirmação do resgate. Comissões por vendas, quando oferecidas, não se confundem com Pontos
        NUY ou prêmios e seguem condições comerciais próprias. Premiações promocionais dependem de
        Regulamento vigente, das autorizações legalmente exigidas e da comunicação oficial
        aplicável.
      </p>

      <h2>9. Publicidade e transparência</h2>
      <p>
        Conteúdo produzido em razão de pagamento, comissão, envio de produto, bonificação ou outro
        benefício deve identificar de forma clara, imediata e ostensiva seu caráter publicitário,
        inclusive em vídeos, Stories e transmissões ao vivo. A participante deve relatar
        experiências verdadeiras, seguir o briefing aprovado e não atribuir aos produtos qualidades,
        resultados ou indicações que não tenham sido fornecidos ou comprovados pela NUY.
      </p>

      <h2>10. Autoria, imagem e licença necessária à plataforma</h2>
      <p>
        A participante mantém a autoria e os direitos sobre o conteúdo que cria e declara possuir as
        autorizações necessárias sobre imagem, voz, música, marcas e materiais de terceiros. O envio
        concede à NUY licença gratuita, não exclusiva e limitada ao armazenamento, análise,
        moderação e exibição necessários à operação da plataforma e à apuração da participação.
      </p>
      <p>
        Repostagem, impulsionamento, adaptação ou uso publicitário externo pela NUY dependem de
        autorização específica que informe finalidade, meios, território e prazo, preservados os
        direitos morais da autora. O simples aceite destes Termos não representa cessão total ou
        definitiva de direitos autorais, imagem ou voz.
      </p>

      <h2>11. Condutas proibidas</h2>
      <p>
        Não é permitido usar bots, automação indevida, compra de engajamento, autocompra
        fraudulenta, informações falsas, conteúdo duplicado para manipular limites, discurso
        discriminatório, ameaças, assédio, violação de propriedade intelectual ou qualquer
        expediente destinado a manipular aprovações, pontos, ranking, comissões ou recompensas.
      </p>

      <h2>12. Academia NUY e comunidade</h2>
      <p>
        Aulas, vídeos, PDFs e demais materiais da Academia destinam-se ao uso pessoal da
        participante e não podem ser copiados ou redistribuídos sem autorização. Comentários e
        respostas devem respeitar as demais participantes, podem ser moderados e permanecem sujeitos
        às regras de privacidade, propriedade intelectual e segurança da plataforma.
      </p>

      <h2>13. Dados pessoais e segurança</h2>
      <p>
        O tratamento de dados segue a Política de Privacidade e a legislação aplicável, incluindo a
        Lei Geral de Proteção de Dados Pessoais. A participante pode solicitar o exercício de seus
        direitos pelos canais oficiais. Pedidos de exclusão observam obrigações legais, prevenção a
        fraudes, segurança e exercício regular de direitos.
      </p>

      <h2>14. Plataformas de terceiros e disponibilidade</h2>
      <p>
        Instagram, TikTok, YouTube, Shopee e outros serviços externos possuem termos,
        disponibilidade e sistemas próprios. A NUY não controla indisponibilidades, remoções ou
        mudanças dessas plataformas, mas avaliará situações comprovadas conforme as regras do
        desafio ou campanha. Manutenções e eventos técnicos podem afetar temporariamente o NUY
        Creators, e a equipe adotará medidas razoáveis para restaurar o serviço e preservar os
        registros válidos.
      </p>

      <h2>15. Suspensão, cancelamento e encerramento</h2>
      <p>
        A conta pode ser temporariamente limitada ou suspensa para investigação de fraude, risco de
        segurança ou violação relevante. O encerramento definitivo deve considerar a gravidade, as
        evidências, os direitos já adquiridos e eventual manifestação da participante, sem impedir
        medidas urgentes de proteção da plataforma e da comunidade. A participante pode solicitar o
        encerramento da conta pelo canal de suporte.
      </p>

      <h2>16. Responsabilidades</h2>
      <p>
        Cada parte responde pelos atos que praticar e pelos danos que causar nos termos da lei. A
        NUY não responde por atos exclusivos da participante ou de terceiros fora de seu controle,
        nem por expectativa de resultado, alcance, venda ou engajamento não garantida pelas regras
        oficiais. Nada nestes Termos exclui responsabilidade ou direito que não possa ser afastado
        pela legislação brasileira.
      </p>

      <h2>17. Alterações dos Termos</h2>
      <p>
        Alterações relevantes receberão nova identificação de versão e comunicação clara. Quando a
        natureza da mudança exigir, a continuidade da participação dependerá de novo aceite. A
        versão vigente permanecerá disponível nesta página, com sua data de vigência.
      </p>

      <h2>18. Legislação, solução de dúvidas e contato</h2>
      <p>
        Estes Termos são regidos pela legislação brasileira, inclusive pelas normas aplicáveis de
        proteção de dados, internet, direitos autorais, publicidade e defesa do consumidor. As
        partes buscarão solução amigável pelo suporte antes de recorrer às medidas cabíveis. Fica
        preservado o foro determinado pela legislação aplicável, inclusive o domicílio da
        participante quando esse direito for legalmente assegurado.
      </p>
      <p>
        Dúvidas, contestações e solicitações podem ser encaminhadas para{' '}
        <a href="mailto:mundonuy@gmail.com">mundonuy@gmail.com</a> ou para o endereço da sede
        informado na cláusula 1.
      </p>
    </LegalDocument>
  );
}
