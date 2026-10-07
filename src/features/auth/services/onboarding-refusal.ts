/**
 * Por que o perfil não foi salvo — traduzido para quem digitou o formulário.
 *
 * A Function já responde o motivo (`{error}`), e antes TUDO virava "tente
 * novamente mais tarde". Dois casos reais ficavam presos nisso: quem não tem a
 * idade mínima (§ o servidor recusa por política) e quem não verificou o
 * e-mail — os dois tentariam para sempre, porque a frase que liam convidava a
 * insistir. Uma recusa com motivo conhecido vira uma frase que a pessoa pode
 * resolver; motivo desconhecido continua genérico, porque inventar causa é pior
 * que admitir que não se sabe.
 *
 * Nada aqui decide permissão — quem recusa é a Function, com a identidade da
 * sessão. Isto é só o nome do que já aconteceu.
 *
 * Módulo sem import de servidor de propósito: é a única forma de o teste unitário
 * exercitar estas frases sem subir o Next.
 */

/** Códigos que a própria Function devolve — cada um com um conserto diferente. */
const REFUSALS: Record<string, string> = {
  age_requirement: 'Você ainda não tem a idade mínima para participar do NUY Creators.',
  email_not_verified: 'Verifique seu e-mail antes de salvar o perfil.',
  account_disabled: 'Esta conta não pode participar. Fale com a nossa equipe.',
  invalid_profile: 'Confira os dados: algum campo não passou na validação.',
};

/** Genérica e retentável: o salvamento é resumível, mas não está confirmado. */
const UNAVAILABLE =
  'O serviço de perfis está indisponível. Não foi possível confirmar o salvamento; você pode tentar novamente.';

/**
 * Instalação ainda não liberada: nenhuma repetição resolve, e é o operador quem
 * precisa agir — `APPWRITE_FUNCTIONS_ENABLED` desligado ou a Function
 * `complete-onboarding` fechada no manifesto.
 */
const NOT_RELEASED =
  'O salvamento de perfil ainda não está liberado nesta instalação. Fale com a nossa equipe.';

function errorCode(body: string | undefined): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed.error === 'string' ? parsed.error : '';
  } catch {
    return '';
  }
}

/** Resposta da Function que não foi 200. */
export function refusalMessage(status: number, body?: string): string {
  const known = REFUSALS[errorCode(body)];
  if (known) return known;
  const code = errorCode(body);
  // Instalação sem política de participação (idade mínima e versão dos termos na
  // Function) e Function sem a identidade da sessão (`x-appwrite-key`/JWT
  // ausentes) são defeitos de configuração nossos: repetir não muda nada, e
  // quem resolve é quem opera.
  if (code === 'participation_policy_unconfigured' || status === 401) return NOT_RELEASED;
  return UNAVAILABLE;
}

/** Recusa da plataforma: a execução nem chegou a rodar, ou caiu no caminho. */
export function failureMessage(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  // 4xx da plataforma = "esta sessão não pode executar esta Function" ou "esta
  // Function não existe": repetir não muda nada. 429 e 5xx são do mundo real
  // (limite de tentativas, indisponibilidade) e merecem nova tentativa.
  if (code === 401 || code === 403 || code === 404) return NOT_RELEASED;
  return UNAVAILABLE;
}
