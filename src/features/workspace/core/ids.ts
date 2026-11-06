import { createHash } from 'node:crypto';

/**
 * Identificadores determinísticos.
 *
 * O Appwrite limita `$id` a 36 caracteres, e a maioria das nossas chaves
 * naturais (`userId` + `challengeId`) não cabe. O hash de 36 hexadecimais dá um
 * id estável para a MESMA intenção: repetir o comando reusa o id, esbarra na
 * unicidade da coluna e por isso não duplica escrita. É idempotência por
 * construção, não por consulta-antes-de-inserir (docs/database.md §Antifraude).
 */
export function rowId(...parts: (string | number | undefined)[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 36);
}

/** Hash completo (64 hex) para colunas que aceitam o valor inteiro. */
export function digest(...parts: (string | number)[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex');
}

/**
 * Parâmetros de rastreio que não mudam o conteúdo — removidos antes do
 * fingerprint (docs/database.md §Antifraude: "remover tracking e normalizar
 * host"). A lista é fechada de propósito: chave desconhecida permanece, porque
 * descartar parâmetro que não conhecemos poderia mascarar conteúdo diferente.
 */
const TRACKING = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'igshid',
  'igsh',
  'si',
  'ref',
  'ref_src',
  'mc_cid',
  'mc_eid',
];

/**
 * Link canônico de publicação: host minúsculo sem `www.`, caminho sem barra
 * final, parâmetros de rastreio fora e ordem estável. Devolve `null` quando não
 * é URL absoluta http(s) — link inválido é recusado, nunca "normalizado" para
 * alguma coisa que a usuária não enviou.
 */
export function canonicalUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.replace(/\/+$/, '');
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING.includes(key.toLowerCase()))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  // searchParams já decodificou cada valor. Reencodar preserva caracteres que
  // pertencem ao valor (como %26), em vez de transformá-los em outro parâmetro.
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : '';
  return `${url.protocol}//${host}${path}${query}`;
}

/** Identificador de publicação por plataforma — usado só para exibição/depuração. */
export function platformFromUrl(canonical: string): string {
  let host: string;
  try {
    host = new URL(canonical).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
  const platforms: Record<string, string> = {
    'instagram.com': 'instagram',
    'tiktok.com': 'tiktok',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'shopee.com.br': 'shopee',
    'shopee.com': 'shopee',
  };
  for (const [domain, platform] of Object.entries(platforms))
    if (host === domain || host.endsWith(`.${domain}`)) return platform;
  return host;
}

/** Período `AAAA-MM` no fuso do ciclo — mesma convenção de `ranking_entries`. */
export function periodKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}
