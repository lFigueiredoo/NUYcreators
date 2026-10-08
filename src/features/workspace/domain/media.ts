/**
 * Imagem de catálogo — o que é aceito e por onde ela é servida.
 *
 * Módulo PURO de propósito: a validação é a mesma no formulário do operador e no
 * servidor que grava, e o endereço é o mesmo no preview do admin e no cartão da
 * creator. Nada aqui fala com o Appwrite.
 *
 * Três decisões, cada uma com um risco atrás:
 *
 *  1. **Assinatura do arquivo, não só o que o navegador diz.** `File.type` vem do
 *     cliente e é falsificável: renomear um `.exe` para `.png` faz o navegador
 *     declarar `image/png`. O primeiro bytes do arquivo é que decidem — é a
 *     diferença entre confiar na etiqueta e conferir o conteúdo.
 *  2. **Teto próprio, menor que o do bucket.** O bucket aceita 25 MB; capa de
 *     catálogo não precisa disso, e um teto menor erra mais cedo e mais barato.
 *  3. **O endereço é uma rota NOSSA**, não a URL do Appwrite. O bucket é privado;
 *     quem serve os bytes é o servidor, com a chave de mídia. Nenhuma chave chega
 *     ao navegador, e o arquivo não vira público.
 */

/** Formatos aceitos: os que o bucket `community-media` aceita E fazem sentido como capa. */
export const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/** Teto do aplicativo. Abaixo do teto do bucket (25 MB) de propósito. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const MEDIA_MAX_LABEL = '5 MB';

/** O tipo declarado que cada formato pode alegar. Serve para conferir, não para decidir. */
const DECLARED_TYPES: Record<string, string[]> = {
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

/**
 * Assinatura binária de cada formato aceito.
 *
 * WEBP é `RIFF` + 4 bytes de tamanho + `WEBP`: os 4 do meio são tamanho variável,
 * por isso o teste é em dois pedaços, não numa sequência contínua.
 */
type Signature = { bytes: number[]; offset?: number };
const SIGNATURES: Record<string, Signature | Signature[]> = {
  jpg: { bytes: [0xff, 0xd8, 0xff] },
  jpeg: { bytes: [0xff, 0xd8, 0xff] },
  png: { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  webp: [{ bytes: [0x52, 0x49, 0x46, 0x46] }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
};

export function mediaExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** O conteúdo começa com a assinatura do formato que a extensão promete? */
export function looksLikeFormat(extension: string, head: Uint8Array): boolean {
  const signature = SIGNATURES[extension];
  if (!signature) return false;
  const checks = Array.isArray(signature) ? signature : [signature];
  return checks.every((check) =>
    check.bytes.every((byte, index) => head[(check.offset ?? 0) + index] === byte),
  );
}

/**
 * O que impede este arquivo de virar capa — ou `null` se ele serve.
 *
 * A mensagem é lida pelo operador: diz qual é o problema e qual é o limite, sem
 * "arquivo inválido".
 */
export function mediaIssue(file: {
  name: string;
  declaredType: string;
  size: number;
  head?: Uint8Array;
}): string | null {
  const extension = mediaExtension(file.name);
  if (!MEDIA_EXTENSIONS.includes(extension as (typeof MEDIA_EXTENSIONS)[number]))
    return `Formato não aceito. Use ${MEDIA_EXTENSIONS.join(', ')}.`;
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > MEDIA_MAX_BYTES)
    return `A imagem passa de ${MEDIA_MAX_LABEL}. Reduza antes de enviar.`;
  // O tipo declarado precisa ser coerente com a extensão. Sozinho ele não prova
  // nada — é uma segunda barreira, não a decisão.
  if (!DECLARED_TYPES[extension].includes(file.declaredType.toLowerCase()))
    return `O arquivo não parece ser ${extension.toUpperCase()}: o navegador o declarou como ${file.declaredType || 'tipo desconhecido'}.`;
  // A decisão: o conteúdo bate com o formato prometido.
  if (file.head && !looksLikeFormat(extension, file.head))
    return `O conteúdo do arquivo não é ${extension.toUpperCase()}, apesar da extensão. Envie a imagem original.`;
  return null;
}

/**
 * Endereço da imagem, servido por nós.
 *
 * Id de arquivo é opaco e vem do Appwrite (≤36 caracteres). Qualquer outra coisa
 * não vira endereço: é o mesmo cuidado do `optionalId` do catálogo, aqui para não
 * montar caminho com valor que não é id.
 */
export const MEDIA_ID_PATTERN = /^[A-Za-z0-9_]{1,36}$/;

export function mediaHref(fileId: string | null | undefined): string | null {
  if (!fileId || !MEDIA_ID_PATTERN.test(fileId)) return null;
  return `/app/midia/${fileId}`;
}
