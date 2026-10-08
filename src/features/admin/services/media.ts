import 'server-only';
import { Query } from 'node-appwrite';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/appwrite/server';
import { databaseId, listTableRows, sessionTables } from '@/lib/appwrite/data';
import { createMediaFile, deleteMediaFile, mediaConfigured } from '@/lib/appwrite/media';
import { mediaExtension, mediaIssue } from '@/features/workspace/domain/media';

/**
 * A imagem do formulário de catálogo: subir, trocar, remover — e não deixar lixo.
 *
 * ## Por que o arquivo sobe no SALVAR, e não ao escolher
 *
 * O preview que o operador vê enquanto monta o formulário é local (`blob:` no
 * navegador), dos BYTES que serão enviados. Só no salvar o arquivo vai para o
 * bucket. A consequência é a que interessa: **abandonar o formulário não cria
 * arquivo nenhum**. Se o upload acontecesse na escolha, cada formulário
 * abandonado deixaria um arquivo no bucket — órfão por construção, e invisível,
 * porque nenhuma linha apontaria para ele.
 *
 * ## Política de órfão (o que sobra e o que não sobra)
 *
 * Ordem no salvar: valida → sobe → grava a linha. Cada falha tem um destino dito:
 *
 *  · **formulário inválido** → nada sobe (a validação vem antes);
 *  · **upload falha** → nada é gravado, mensagem legível, nenhum arquivo criado;
 *  · **upload OK, gravação da linha falha** → o arquivo recém-enviado é APAGADO
 *    na hora (ação compensatória). Sem isto, o arquivo ficaria no bucket sem
 *    nenhuma linha apontando para ele;
 *  · **troca de imagem** → o arquivo anterior só é apagado depois de a linha nova
 *    estar gravada E depois de conferir que nenhuma outra linha (desafio ou
 *    recompensa) aponta para ele. Dois formulários podem ter apontado para o
 *    mesmo arquivo; apagar sem conferir quebraria o outro;
 *  · **a conferência não pôde ser feita, ou a exclusão falhou** → o arquivo é
 *    MANTIDO e o fato é registrado no log do servidor. Preferimos um arquivo a
 *    mais do que uma imagem quebrada em produção — e não é silencioso: fica dito.
 *
 * Não existe varredura periódica de órfãos nesta rodada: com esta ordem, o único
 * jeito de sobrar arquivo é a exclusão falhar, e isso fica registrado.
 */

export type ImageInput = {
  /** Arquivo escolhido agora. `null` quando o operador não trocou nada. */
  file: File | null;
  /** Id já gravado na linha (campo oculto). */
  keep: string;
  /** Operador pediu para remover a imagem. */
  clear: boolean;
};

export type ImageOutcome =
  | { ok: true; fileId: string; uploaded: string | null; replaced: string | null }
  | { ok: false; message: string };

/** Resolve o campo de imagem do formulário em um id pronto para gravar. */
export async function imageForForm(input: ImageInput): Promise<ImageOutcome> {
  if (input.clear && !input.file)
    return { ok: true, fileId: '', uploaded: null, replaced: input.keep };
  if (!input.file || input.file.size === 0)
    return { ok: true, fileId: input.keep, uploaded: null, replaced: null };

  if (!mediaConfigured())
    return {
      ok: false,
      message:
        'Enviar imagem ainda não está ativo neste ambiente: o armazenamento não foi configurado. Nenhum arquivo foi enviado e nada foi gravado.',
    };

  const head = new Uint8Array(await input.file.slice(0, 16).arrayBuffer());
  const issue = mediaIssue({
    name: input.file.name,
    declaredType: input.file.type,
    size: input.file.size,
    head,
  });
  if (issue) return { ok: false, message: issue };

  const bytes = await input.file.arrayBuffer();
  try {
    const fileId = await createMediaFile({
      bytes,
      name: input.file.name,
      extension: mediaExtension(input.file.name),
    });
    return { ok: true, fileId, uploaded: fileId, replaced: input.keep || null };
  } catch {
    return {
      ok: false,
      message: 'O envio da imagem falhou no servidor de arquivos. Nada foi gravado.',
    };
  }
}

/** A gravação da linha falhou depois do upload: desfaz o arquivo para não sobrar. */
export async function discardUploaded(uploaded: string | null): Promise<void> {
  if (!uploaded) return;
  if (!(await deleteMediaFile(uploaded)))
    console.warn(
      `[midia] arquivo ${uploaded} ficou no bucket: a gravação falhou e a limpeza também.`,
    );
}

/**
 * Aposenta o arquivo que a linha deixou de usar.
 *
 * `newFileId` vazio significa que a imagem foi REMOVIDA — aí o arquivo anterior
 * não é usado por esta linha, mas pode ser usado por outra: a conferência vale
 * igual.
 */
export async function retireReplaced(replaced: string | null, newFileId: string): Promise<void> {
  if (!replaced || replaced === newFileId) return;
  if (!mediaConfigured()) return;
  if (await stillReferenced(replaced)) {
    console.info(
      `[midia] arquivo ${replaced} mantido: outra linha do catálogo ainda aponta para ele.`,
    );
    return;
  }
  if (!(await deleteMediaFile(replaced)))
    console.warn(`[midia] arquivo ${replaced} ficou no bucket: não foi possível apagar.`);
}

/**
 * Alguma linha do catálogo ainda usa este arquivo?
 *
 * Lê com a SESSÃO de quem opera: as linhas de catálogo têm leitura pública
 * (`core/catalog.ts`), então a conferência não precisa de chave nenhuma e não
 * depende de `APPWRITE_OPS_API_KEY`.
 *
 * Falha FECHADA: se a leitura não puder ser feita, responde "sim, ainda usa" — e
 * o arquivo é mantido. O erro cai para o lado de não apagar.
 */
async function stillReferenced(fileId: string): Promise<boolean> {
  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return true;
  const tables = sessionTables(secret);
  const query = [Query.equal('imageFileId', fileId), Query.limit(1)];
  for (const tableId of ['challenges', 'rewards'] as const) {
    try {
      const found = await listTableRows(tables, {
        databaseId: databaseId(),
        tableId,
        queries: query,
      });
      if (found.total > 0) return true;
    } catch {
      return true;
    }
  }
  return false;
}
