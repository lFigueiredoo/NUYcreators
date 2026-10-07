import { joinChallenge } from '../../src/features/workspace/core';
import { hosted, refuse, text, type FunctionEvent } from '../shared/host';

/**
 * `join-challenge` — entrada em desafio.
 *
 * A identidade vem do JWT da sessão (`hosted` recusa sem ela); o corpo traz
 * apenas o desafio. Toda a regra — janela, nível, vaga, participação única —
 * está no núcleo, que é o mesmo que o servidor Next executa.
 */
export default async function main(event: FunctionEvent) {
  const run = await hosted(event, { requireUser: true });
  if (!run.ready) return run.response;
  const result = await joinChallenge(run.ctx, { challengeId: text(run.body.challengeId) });
  const refused = refuse(event, result);
  if (refused) return refused;
  if (result.ok) return event.res.json(result.value, result.value.created ? 201 : 200);
}
