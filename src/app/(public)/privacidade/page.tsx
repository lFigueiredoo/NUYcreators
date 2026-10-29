import { LegalDocument } from '@/features/legal/components/legal-document';
import { CURRENT_PRIVACY_VERSION, LEGAL_EFFECTIVE_DATE } from '@/features/legal/versions';

/** Política de Privacidade oficial vinculada aos Termos de Uso vigentes. */
export const metadata = { title: 'Política de Privacidade — NUY Creators' };

export default function Privacy() {
  return (
    <LegalDocument
      eyebrow="Cuidado com seus dados"
      title="Política de Privacidade — NUY Creators"
      subtitle={`Versão ${CURRENT_PRIVACY_VERSION} · vigente desde ${LEGAL_EFFECTIVE_DATE}`}
      notice="Documento oficial vigente. Esta Política explica como os dados pessoais são tratados no NUY Creators."
    >
      <h2>1. Controladora e contato</h2>
      <p>
        A controladora dos dados tratados no NUY Creators é{' '}
        <strong>SIRMIONE COMERCIO E DISTRIBUICAO LTDA</strong>, nome de fantasia{' '}
        <strong>NSN COMERCIO E DISTRIBUICAO</strong>, CNPJ 36.120.044/0001-00, com sede na Rua
        Projetada, S/N, Distrito Mecânico, Pedras de Fogo — PB, CEP 58.328-000. Solicitações sobre
        privacidade podem ser enviadas para{' '}
        <a href="mailto:mundonuy@gmail.com">mundonuy@gmail.com</a>.
      </p>

      <h2>2. Dados pessoais tratados</h2>
      <p>
        Podemos tratar dados de cadastro e perfil, como nome, e-mail, telefone, data de nascimento,
        cidade, estado, nicho e tipo de creator; links e identificadores de redes sociais; dados de
        participação, como desafios, conteúdos enviados, comentários, pontos, níveis, ranking,
        recompensas e resgates; e dados técnicos necessários à autenticação, segurança e auditoria,
        como identificadores de conta, data e versão de aceite, registros de acesso e operações.
      </p>
      <p>
        Dados financeiros, fiscais ou de entrega somente serão solicitados quando necessários para
        comissões, premiações, resgates ou cumprimento de obrigação legal, pelos meios indicados
        para a respectiva operação.
      </p>

      <h2>3. Finalidades do tratamento</h2>
      <p>
        Os dados são utilizados para criar e autenticar a conta; verificar elegibilidade; manter o
        perfil; permitir participação em desafios e na comunidade; analisar conteúdos; calcular e
        auditar pontos, ranking e recompensas; processar operações solicitadas; prestar suporte;
        prevenir fraude e abuso; proteger a plataforma; cumprir obrigações legais; e exercer ou
        defender direitos.
      </p>

      <h2>4. Bases legais</h2>
      <p>
        Conforme a finalidade e o contexto, o tratamento pode se apoiar na execução dos Termos e de
        procedimentos solicitados pela participante, no cumprimento de obrigações legais ou
        regulatórias, no exercício regular de direitos, na prevenção à fraude e segurança, no
        legítimo interesse avaliado com respeito aos direitos da titular e, quando aplicável, em
        consentimento específico.
      </p>

      <h2>5. Idade mínima</h2>
      <p>
        A data de nascimento é utilizada, entre outras finalidades aplicáveis, para verificar o
        requisito de idade mínima de 18 anos. O NUY Creators não é destinado a menores de 18 anos.
        Contas identificadas como inelegíveis poderão ser bloqueadas e analisadas para exclusão,
        preservados os registros exigidos por lei ou necessários à proteção de direitos.
      </p>

      <h2>6. Redes sociais e fontes externas</h2>
      <p>
        Perfis, links, publicações e métricas enviados pela participante podem ser consultados para
        validar desafios e operações do programa. Links informados não são considerados verificados
        pela NUY enquanto não houver processo específico de verificação. As próprias plataformas de
        redes sociais realizam tratamentos independentes conforme seus respectivos termos e
        políticas.
      </p>

      <h2>7. Compartilhamento e operadores</h2>
      <p>
        Os dados podem ser tratados por fornecedores necessários à operação, como serviços de
        hospedagem, infraestrutura, autenticação, banco de dados, armazenamento, comunicação,
        segurança e suporte, limitados às finalidades contratadas. Também poderão ser compartilhados
        com autoridades ou terceiros quando necessário ao cumprimento de obrigação legal, prevenção
        a fraude, exercício regular de direitos ou proteção da participante, da NUY e da comunidade.
      </p>

      <h2>8. Transferências internacionais</h2>
      <p>
        Alguns fornecedores de tecnologia podem processar dados em outros países. Quando houver
        transferência internacional, a NUY adotará mecanismos e salvaguardas compatíveis com a LGPD
        e limitará o tratamento às finalidades informadas nesta Política.
      </p>

      <h2>9. Retenção e exclusão</h2>
      <p>
        Os dados são mantidos pelo tempo necessário para operar a conta e o programa, cumprir
        obrigações legais ou regulatórias, prevenir fraude, resolver disputas e exercer direitos.
        Encerrada a finalidade, os dados serão eliminados ou anonimizados, salvo quando a
        conservação for autorizada ou exigida pela legislação.
      </p>

      <h2>10. Segurança e incidentes</h2>
      <p>
        A NUY adota medidas técnicas e administrativas razoáveis para proteger os dados contra
        acesso não autorizado e situações acidentais ou ilícitas de destruição, perda, alteração,
        comunicação ou divulgação. Nenhum sistema é absolutamente invulnerável. Incidentes
        relevantes serão avaliados e comunicados às pessoas e autoridades competentes quando exigido
        pela legislação.
      </p>

      <h2>11. Direitos da titular</h2>
      <p>
        Nos termos da LGPD, a participante pode solicitar, quando aplicável, confirmação e acesso;
        correção; anonimização, bloqueio ou eliminação; portabilidade conforme regulamentação;
        informação sobre compartilhamento; oposição; revogação de consentimento; eliminação de dados
        tratados com consentimento, ressalvadas as hipóteses legais de conservação; e revisão de
        decisões tomadas unicamente com base em tratamento automatizado que afetem seus interesses.
      </p>
      <p>
        A solicitação é gratuita e pode exigir confirmação de identidade para impedir acesso
        indevido. Quando não for possível atender imediatamente, a NUY informará as razões de fato
        ou de direito aplicáveis.
      </p>

      <h2>12. Imagem, voz e conteúdo</h2>
      <p>
        O aceite desta Política e dos Termos de Uso não representa autorização geral para uso
        publicitário externo de imagem, voz ou conteúdo da participante. Quando uma campanha exigir
        autorização adicional, suas condições deverão ser apresentadas separadamente.
      </p>

      <h2>13. Alterações desta Política</h2>
      <p>
        Alterações relevantes receberão nova versão e comunicação adequada. Quando a mudança exigir
        novo consentimento ou aceite, ele será solicitado antes do tratamento correspondente. A
        versão vigente permanecerá disponível nesta página.
      </p>
    </LegalDocument>
  );
}
