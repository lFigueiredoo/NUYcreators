import { LegalDocument } from '@/features/legal/components/legal-document';

/**
 * Política de Privacidade — versão provisória de 07/10/2026.
 *
 * O corpo é o texto aprovado para o staging, reproduzido na íntegra e NA MESMA
 * ORDEM. Os `<h2>` são só títulos editoriais: cada um nomeia o parágrafo que
 * vem logo abaixo e nenhum deles acrescenta, remove ou reescreve obrigação —
 * a política era um bloco corrido e passou a ser legível, sem uma palavra a
 * mais no texto jurídico.
 *
 * Nenhum controlador, CNPJ, DPO ou endereço jurídico é nomeado porque nenhum
 * deles existe neste momento do projeto; o caminho para exercer direitos são
 * os canais oficiais, como o próprio texto declara. "Mundo NUY" saiu daqui:
 * era leitura de nome de empresa onde o texto só precisava dizer de quem são
 * os canais. O fecho do corpo é também o aviso honesto da página: versão
 * provisória, a revisar antes da abertura definitiva ao público.
 */
export const metadata = { title: 'Política de Privacidade — NUY Creators' };

export default function Privacy() {
  return (
    <LegalDocument
      eyebrow="Cuidado com seus dados"
      title="Política de Privacidade — NUY Creators"
      subtitle="Versão provisória — 07/10/2026"
    >
      <h2>Como usamos seus dados</h2>
      <p>
        O NUY Creators utiliza dados pessoais necessários para disponibilizar e administrar a
        comunidade, autenticar participantes, permitir participação em desafios, analisar conteúdos,
        administrar Pontos NUY e recompensas, prevenir fraudes, prestar suporte e manter a segurança
        da plataforma.
      </p>
      <h2>Dados tratados</h2>
      <p>
        Podemos tratar dados fornecidos no cadastro e perfil, como nome, e-mail, data de nascimento,
        informações do perfil de creator e links de redes sociais; dados relacionados à participação
        na plataforma, como desafios, conteúdos enviados, pontos, níveis, ranking e resgates; e
        dados técnicos necessários à autenticação, segurança, auditoria e funcionamento do serviço.
      </p>
      <h2>Idade mínima</h2>
      <p>
        A data de nascimento é utilizada, entre outras finalidades aplicáveis, para verificar o
        requisito de idade mínima de 18 anos. O NUY Creators não é destinado a menores de 18 anos.
      </p>
      <h2>Redes sociais</h2>
      <p>
        Perfis ou links de redes sociais informados pela participante não são considerados
        verificados pela NUY enquanto não houver um processo específico de verificação.
      </p>
      <h2>Fornecedores e obrigações legais</h2>
      <p>
        Os dados poderão ser processados por fornecedores de tecnologia necessários ao funcionamento
        da plataforma, como serviços de infraestrutura, autenticação, armazenamento e segurança,
        sempre de acordo com as finalidades da operação e as obrigações aplicáveis. Também poderão
        ser tratados ou compartilhados quando necessário para cumprimento de obrigação legal,
        exercício regular de direitos ou proteção da plataforma e de seus usuários.
      </p>
      <h2>Retenção e segurança</h2>
      <p>
        Registros de segurança, auditoria e operações poderão ser mantidos pelo período necessário
        para preservar a integridade da plataforma, investigar incidentes e cumprir obrigações
        aplicáveis.
      </p>
      <h2>Seus direitos</h2>
      <p>
        A participante poderá exercer os direitos previstos na Lei Geral de Proteção de Dados
        Pessoais — LGPD (Lei nº 13.709/2018), pelos canais oficiais da NUY.
      </p>
      <h2>Imagem, voz e conteúdo</h2>
      <p>
        O aceite desta Política e dos Termos de Uso não representa autorização geral para uso
        publicitário de imagem, voz ou conteúdo da participante. Quando uma campanha exigir
        autorização adicional, suas condições deverão ser apresentadas separadamente.
      </p>
      <h2>Sobre esta versão</h2>
      <p>
        Esta versão é provisória para validação operacional e deverá ser revisada antes da abertura
        definitiva ao público.
      </p>
    </LegalDocument>
  );
}
