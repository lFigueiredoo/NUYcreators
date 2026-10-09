/**
 * Formatação — sempre no servidor, com valor pronto entregue ao cliente.
 *
 * Formatar data no cliente abriria divergência de fuso entre o HTML do servidor
 * e a hidratação. Aqui as funções são puras e recebem ISO em UTC.
 */
const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const full = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function parse(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "03 out" — usado no extrato e nas listas. */
export function shortDate(iso: string | null | undefined) {
  const date = parse(iso);
  if (!date) return '—';
  return `${day.format(date)} ${monthShort.format(date).replace('.', '')}`;
}

/** "03 de outubro de 2026". */
export function longDate(iso: string | null | undefined) {
  const date = parse(iso);
  return date ? full.format(date) : '—';
}

/**
 * Prazo relativo ao instante informado. Devolve `null` quando não há data —
 * a UI simplesmente não mostra prazo em vez de inventar um.
 */
export function deadlineLabel(iso: string | null | undefined, now: Date) {
  const date = parse(iso);
  if (!date) return null;
  const days = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return 'Encerrado';
  if (days === 0) return 'Último dia';
  if (days === 1) return 'Termina amanhã';
  if (days <= 7) return `Termina em ${days} dias`;
  return `Até ${longDate(iso)}`;
}

/**
 * O item já começou? Comparação de LEITURA entre a data da linha e o instante da
 * tela — nenhuma regra mora aqui.
 *
 * Quem decide se a entrada é aceita é o servidor: `core/join.ts` recusa com
 * `window_closed` enquanto `startsAt` está no futuro. Esta função existe para a
 * tela não oferecer o que o servidor vai recusar.
 */
export function notStarted(iso: string | null | undefined, now: Date) {
  const date = parse(iso);
  return date !== null && date.getTime() > now.getTime();
}

/** "Começa em 03 de outubro de 2026" — o oposto de "Aberto desde". `null` sem data. */
export function startLabel(iso: string | null | undefined) {
  return parse(iso) ? `Começa em ${longDate(iso)}` : null;
}

export function plural(count: number, singular: string, pluralWord: string) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}
