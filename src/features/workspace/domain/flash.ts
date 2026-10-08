/**
 * Aviso de ação concluída — o canal e o destino seguro.
 *
 * O formulário dono da mensagem desmonta como CONSEQUÊNCIA do que ele acabou de
 * gravar: o botão "Participar" dá lugar a "Seu envio", o "Resgatar" dá lugar a
 * "Limite atingido". A resposta do servidor chegava a um componente que já não
 * existia e a confirmação nunca pintava — medido com 40 amostras de DOM a cada
 * 100 ms durante o resgate: zero mensagens, com o banco já alterado.
 *
 * O aviso passa a viajar na própria URL de destino, que é o canal que o
 * onboarding já usa (`/onboarding?verification=sent`). O texto é sempre copy do
 * SERVIDOR: a tela não inventa confirmação de nada. Quem adota e limpa o
 * parâmetro é o componente `Flash`, no shell da área autenticada.
 */
export const FLASH_PARAM = 'aviso';

/** Destino com o aviso do servidor anexado à URL. */
export function flashHref(path: string, message: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${FLASH_PARAM}=${encodeURIComponent(message)}`;
}

/**
 * Destino de volta aceito: só caminho INTERNO da área da creator.
 *
 * O valor chega por argumento ligado à server action (cifrado pelo Next, não
 * vem do formulário), mas o guarda fica aqui do mesmo jeito: `redirect()` com
 * destino arbitrário é redirecionamento aberto, e isso não fica por conta de uma
 * suposição sobre o transporte. Qualquer outra coisa cai no destino padrão da
 * ação.
 */
export function returnPath(value: string, fallback: string): string {
  return /^\/app(\/|$|\?)/.test(value) ? value : fallback;
}
