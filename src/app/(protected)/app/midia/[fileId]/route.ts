import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Query } from 'node-appwrite';
import { SESSION_COOKIE, currentUser } from '@/lib/appwrite/server';
import { databaseId, listTableRows, sessionTables } from '@/lib/appwrite/data';
import { MEDIA_ID_PATTERN } from '@/features/workspace/domain/media';
import { mediaConfigured, readMediaFile } from '@/lib/appwrite/media';

export const dynamic = 'force-dynamic';

/**
 * Serve a imagem de catálogo.
 *
 * Por que uma rota nossa em vez da URL do Appwrite:
 *
 *  · o bucket é PRIVADO e o arquivo é criado sem permissão nenhuma — não existe
 *    URL direta que um navegador possa abrir. Quem tem a chave é o servidor, e é
 *    ele que entrega os bytes;
 *  · nenhuma chave, nem token de sessão do Appwrite, chega ao navegador;
 *  · o arquivo não precisa virar público (`read("any")`) nem o bucket abrir:
 *    a única coisa que mudou no Appwrite foi o arquivo existir.
 *
 * Duas guardas antes de entregar:
 *
 *  1. **sessão** — a rota vive sob `/app`, e rota de rota não herda layout: a
 *     porta é conferida aqui, não presumida;
 *  2. **o arquivo é referenciado pelo catálogo** — um `fileId` qualquer não é
 *     servido. Sem isto, a chave de mídia viraria um oráculo de leitura do bucket
 *     inteiro para qualquer sessão. As linhas de `challenges` e `rewards` têm
 *     leitura pública (`core/catalog.ts`), então a conferência vale igual para
 *     criadora e para a equipe, sem alargar permissão de ninguém.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!MEDIA_ID_PATTERN.test(fileId)) return new NextResponse(null, { status: 404 });
  if (!mediaConfigured()) return new NextResponse(null, { status: 404 });

  const secret = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret) return new NextResponse(null, { status: 401 });
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  if (!(await isCatalogImage(secret, fileId))) return new NextResponse(null, { status: 404 });

  const file = await readMediaFile(fileId);
  if (!file) return new NextResponse(null, { status: 404 });

  return new NextResponse(file.bytes, {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.bytes.byteLength),
      // Imutável: o id é novo a cada envio, então o mesmo endereço nunca troca de
      // conteúdo. `private` porque quem vê é quem tem sessão.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}

async function isCatalogImage(secret: string, fileId: string): Promise<boolean> {
  const tables = sessionTables(secret);
  const query = [Query.equal('imageFileId', fileId), Query.limit(1)];
  for (const tableId of ['challenges', 'rewards']) {
    try {
      const found = await listTableRows(tables, {
        databaseId: databaseId(),
        tableId,
        queries: query,
      });
      if (found.total > 0) return true;
    } catch {
      // Tabela ilegível para ESTA sessão não autoriza nada — segue para a
      // próxima e, no fim, nega. Falha fechada de propósito.
    }
  }
  return false;
}
