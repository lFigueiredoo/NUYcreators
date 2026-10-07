import Link from 'next/link';
import { LegalDocument } from '@/features/legal/components/legal-document';

/**
 * Termos de Uso — versão 2026-10-07-v1 (provisória).
 *
 * É a versão registrada no aceite do onboarding (`acceptedTermsVersion`) e o
 * aviso do topo é a única afirmação sobre o status deste documento: versão
 * provisória, sujeita à revisão jurídica antes do lançamento definitivo. Nada
 * aqui declara aprovação jurídica já ocorrida, e nenhuma cláusula nomeia
 * pessoa, CNPJ ou canal que não exista — os contatos são os canais oficiais,
 * como na Política de Privacidade.
 */
export const metadata = { title: 'Termos de Uso — NUY Creators' };

export default function Terms() {
  return (
    <LegalDocument
      eyebrow="Transparência"
      title="Termos de Uso — NUY Creators"
      subtitle="Versão 2026-10-07-v1 · 07/10/2026"
      notice="Versão provisória — sujeita à revisão jurídica antes do lançamento definitivo."
    >
      <h2>Quem pode participar</h2>
      <p>
        O NUY Creators é uma comunidade para maiores de 18 anos. Ao criar a conta, a participante
        declara que tem 18 anos ou mais e que as informações do cadastro são verdadeiras. A data de
        nascimento é conferida no preenchimento do perfil e a participação é recusada abaixo dessa
        idade.
      </p>

      <h2>Desafios e campanhas</h2>
      <p>
        A participante pode entrar em desafios e campanhas publicados pela equipe do NUY Creators.
        Cada desafio informa suas próprias regras, prazos e critérios. Participar é opcional: a
        criadora escolhe em quais desafios quer participar.
      </p>

      <h2>Conteúdo enviado</h2>
      <p>
        Ao enviar um conteúdo, a participante declara que é autora ou que tem autorização para
        usá-lo. O conteúdo enviado pode ser analisado pela equipe e exibido dentro da plataforma,
        conforme as regras do desafio. O envio não transfere a propriedade do conteúdo.
      </p>

      <h2>Moderação</h2>
      <p>
        Todo conteúdo enviado passa por moderação. Um envio pode ser recusado ou removido quando não
        seguir as regras do desafio ou destes termos, com o motivo registrado. A decisão pode ser
        revista pelos canais oficiais.
      </p>

      <h2>Pontos NUY</h2>
      <p>
        Pontos NUY registram a participação dentro da comunidade. Eles{' '}
        <strong>não têm valor monetário</strong>, não são moeda, não podem ser transferidos entre
        contas nem convertidos em dinheiro. A equipe pode corrigir pontos lançados em erro, com
        registro do ajuste.
      </p>

      <h2>Ranking</h2>
      <p>
        O ranking é calculado a partir dos pontos das participantes, seguindo as regras divulgadas.
        Em caso de correção de pontos ou de fraude comprovada, a posição pode ser recalculada.
      </p>

      <h2>Recompensas</h2>
      <p>
        As recompensas estão limitadas ao estoque disponível e às regras de cada campanha. O resgate
        depende de pontos suficientes e da disponibilidade no momento do pedido, e fica registrado
        na conta da participante.
      </p>

      <h2>Integridade e fraude</h2>
      <p>
        Não é permitido criar contas falsas ou duplicadas, usar automação para acumular pontos,
        manipular o ranking ou enviar conteúdo enganoso. A plataforma pode recusar participações,
        reverter pontos e suspender contas em caso de fraude.
      </p>

      <h2>Redes sociais não verificadas</h2>
      <p>
        Perfis e links de redes sociais informados no perfil aparecem como{' '}
        <strong>Não verificado</strong>. Enquanto não houver um processo específico de verificação,
        o NUY Creators não confirma seguidores, audiência ou autenticidade desses perfis.
      </p>

      <h2>Privacidade e LGPD</h2>
      <p>
        O tratamento de dados pessoais segue a{' '}
        <Link href="/privacidade">Política de Privacidade</Link>, que faz parte destes termos. A
        participante pode exercer os direitos previstos na LGPD (Lei nº 13.709/2018) pelos canais
        oficiais.
      </p>

      <h2>Imagem, voz e publicidade</h2>
      <p>
        O aceite destes termos <strong>não concede autorização irrestrita</strong> para uso
        publicitário da imagem, da voz ou do conteúdo da participante. Quando uma campanha exigir
        esse uso, as condições específicas deverão ser apresentadas separadamente, para aceite
        próprio.
      </p>

      <h2>Alterações destes termos</h2>
      <p>
        Estes termos são versionados. Alterações relevantes passam a valer em uma nova versão e
        podem exigir novo aceite antes de a participante continuar usando a plataforma.
      </p>

      <h2>Legislação e canais oficiais</h2>
      <p>
        Estes termos são regidos pela legislação brasileira. Dúvidas, pedidos e denúncias são
        atendidos pelos canais oficiais da NUY.
      </p>
    </LegalDocument>
  );
}
