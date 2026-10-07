import { submitContent } from '../../src/features/workspace/core';
import { hosted, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `submit-content` — envio de conteúdo para um desafio em que a criadora entrou.
 *
 * Link é canonizado e o conteúdo repetido esbarra na unicidade do banco
 * (`duplicate_content`); arquivo sobe antes, para o bucket privado, e chega aqui
 * como `fileId`.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true });
  if (!run.ready) return run.response;
  const result = await submitContent(run.ctx, {
    challengeId: text(run.body.challengeId),
    url: text(run.body.url),
    fileId: text(run.body.fileId),
    platform: text(run.body.platform),
  });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, result.value.created ? 201 : 200);
}
