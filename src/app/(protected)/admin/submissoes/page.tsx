import Link from 'next/link';
import { ModerationDecisionForm } from '@/features/workspace/components/core-forms';
import { listPendingSubmissions } from '@/features/workspace/services/commands';
import { requireStaff } from '@/lib/security/authorization';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Moderação de envios' };

/**
 * Fila de moderação.
 *
 * A página inteira depende de `requireStaff('moderate')`: o papel vem de
 * membership CONFIRMADA na equipe administrativa, nunca de um campo ou de um
 * parâmetro. A lista é lida com a chave de operação no servidor, e cada decisão
 * leva a revisão que a equipe viu — se a criadora reenviar no meio, o comando
 * recusa em vez de julgar conteúdo que ninguém leu.
 */
export default async function ModerationQueuePage() {
  await requireStaff('moderate');
  const queue = await listPendingSubmissions();

  return (
    <main id="main" className="public-inner">
      <h1>Envios em análise</h1>
      <p>
        {queue.ok
          ? `${queue.items.length} ${queue.items.length === 1 ? 'envio aguardando' : 'envios aguardando'} decisão. Aprovar credita os pontos do desafio uma única vez.`
          : queue.message}
      </p>

      {queue.ok && queue.items.length > 0 ? (
        <ul>
          {queue.items.map((item) => (
            <li key={item.id}>
              <h2>{item.challengeName}</h2>
              <p>
                {item.platform || 'plataforma não informada'} · revisão {item.revision} · enviado em{' '}
                {item.submittedAt}
              </p>
              {item.url ? (
                <p>
                  <a href={item.url} target="_blank" rel="noreferrer noopener">
                    {item.url}
                  </a>
                </p>
              ) : null}
              <ModerationDecisionForm submissionId={item.id} expectedRevision={item.revision} />
            </li>
          ))}
        </ul>
      ) : null}

      <p>
        <Link href="/admin">Voltar à autorização administrativa</Link>
      </p>
    </main>
  );
}
