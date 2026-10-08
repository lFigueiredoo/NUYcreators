import 'server-only';
import { Client, Storage } from 'node-appwrite';
import { getEnvironment } from '@/lib/env/server';
import { MEDIA_EXTENSIONS } from '@/features/workspace/domain/media';

/**
 * Arquivos de catálogo (capa de desafio e de recompensa).
 *
 * Decisões, cada uma com a alternativa perigosa que ela evita:
 *
 *  1. **Arquivo criado com `permissions: []`.** O bucket tem `fileSecurity: true`,
 *     então a permissão é POR ARQUIVO — e a escolhida é nenhuma. Quem lê é esta
 *     chave, pelo servidor. Consequência: o arquivo não é público, não é legível
 *     por `users`, e o bucket segue privado. Nada precisou ser aberto.
 *  2. **Chave própria (`APPWRITE_MEDIA_API_KEY`), distinta das outras quatro.**
 *     `rows.read`/`rows.write` (operação) não abre arquivo; a de provisionamento
 *     não entra no processo do app; a de teste não é caminho de produção. Ver o
 *     guard de `infra/appwrite/identity.ts`, que cobra a distinção.
 *  3. **Ausente a chave, a capacidade fica DESLIGADA** — como a operação. O
 *     formulário do admin diz que não dá para enviar em vez de aceitar o arquivo
 *     e perder ele.
 *
 * O bucket e seus limites vêm do manifesto (`infra/appwrite/schema.ts`), não
 * daqui: aqui só se confere que o formato está entre os que o bucket aceita.
 */

/** Bucket do manifesto que recebe capa de catálogo. */
export const MEDIA_BUCKET = 'community-media';

export function mediaConfigured(): boolean {
  const env = getEnvironment();
  return Boolean(
    process.env.APPWRITE_MEDIA_API_KEY && env.APPWRITE_ENDPOINT && env.APPWRITE_PROJECT_ID,
  );
}

function mediaStorage(): Storage {
  const env = getEnvironment();
  if (!env.APPWRITE_ENDPOINT || !env.APPWRITE_PROJECT_ID)
    throw new Error('Appwrite ainda não configurado.');
  const key = process.env.APPWRITE_MEDIA_API_KEY;
  if (!key) throw new Error('Mídia ainda não configurada.');
  return new Storage(
    new Client().setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(key),
  );
}

/** Extensão conferida contra o que o bucket aceita, não contra uma lista paralela. */
export function bucketAccepts(extension: string): boolean {
  return (MEDIA_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Grava o arquivo e devolve o id.
 *
 * `fileId` é gerado pelo Appwrite (`unique()`), nunca pelo formulário: id vindo do
 * cliente é id que o cliente escolhe onde gravar.
 */
export async function createMediaFile(input: {
  bytes: ArrayBuffer;
  name: string;
  extension: string;
}): Promise<string> {
  const file = await mediaStorage().createFile({
    bucketId: MEDIA_BUCKET,
    fileId: 'unique()',
    file: new File([input.bytes], input.name, { type: mediaTypeOf(input.extension) }),
    permissions: [],
  });
  return file.$id;
}

/** Bytes e tipo do arquivo, para o servidor servir. `null` quando o arquivo não existe. */
export async function readMediaFile(
  fileId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const storage = mediaStorage();
  try {
    const [meta, body] = await Promise.all([
      storage.getFile({ bucketId: MEDIA_BUCKET, fileId }),
      storage.getFileView({ bucketId: MEDIA_BUCKET, fileId }),
    ]);
    return { bytes: body as ArrayBuffer, contentType: meta.mimeType || 'application/octet-stream' };
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}

/**
 * Apaga o arquivo. Usado só na troca de imagem, depois de a linha nova estar
 * gravada — e só quando nenhuma outra linha aponta para o arquivo.
 */
export async function deleteMediaFile(fileId: string): Promise<boolean> {
  try {
    await mediaStorage().deleteFile({ bucketId: MEDIA_BUCKET, fileId });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 404) return true;
    return false;
  }
}

function mediaTypeOf(extension: string): string {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}
