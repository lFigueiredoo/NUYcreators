import { rankingTimeZone } from '@/features/workspace/domain/ranking';

/**
 * Leitura de instantes na administração — no fuso do PRODUTO, não em UTC.
 *
 * O produto da creator formata em UTC (`domain/format.ts`) porque lá a data só
 * responde "quando isso aconteceu", e o dia basta. Aqui não: a operação DIGITA a
 * janela do desafio em hora de São Paulo e precisa reler o que digitou. Mostrar
 * o instante em UTC faria a tela dizer 21:00 para uma janela que ela mesma
 * gravou como 18:00 — três horas de diferença entre o que se escreve e o que se
 * lê, num campo que decide quando o desafio abre.
 *
 * Tudo é formatado no SERVIDOR e entregue pronto ao cliente: formatar no cliente
 * abriria divergência de fuso entre o HTML e a hidratação.
 */
const stamp = new Intl.DateTimeFormat('pt-BR', {
  timeZone: rankingTimeZone,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const day = new Intl.DateTimeFormat('pt-BR', {
  timeZone: rankingTimeZone,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parse(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "07/10/2026 14:30" — datas de janela, envio, moderação e auditoria. */
export function stampIn(iso: string | null | undefined) {
  const date = parse(iso);
  return date ? stamp.format(date) : '—';
}

/** "07/10/2026" — quando a hora não muda a decisão. */
export function dayIn(iso: string | null | undefined) {
  const date = parse(iso);
  return date ? day.format(date) : '—';
}
