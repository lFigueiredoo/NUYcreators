import { beforeEach, expect, it, vi } from 'vitest';
import { hosted, type FunctionEvent } from '../../functions/shared/host';

/**
 * Leitura do corpo no hospedeiro das functions.
 *
 * `req.bodyJson` é um GETTER do runtime que faz `JSON.parse` no corpo cru — o
 * evento abaixo imita o runtime de propósito, com o `JSON.parse` de verdade
 * dentro do getter. O defeito medido no staging nasceu aqui: a execução
 * AGENDADA chega com `body: ''`, o getter estourava `SyntaxError: Unexpected end
 * of JSON input` e a function morria antes de `machineAuthorized` — 116 de 116
 * execuções agendadas em HTTP 500.
 *
 * Os três casos são a fronteira inteira: sem corpo tolera; corpo válido lê;
 * corpo presente e inválido CONTINUA sendo erro.
 */
function event(raw: string | undefined): FunctionEvent {
  return {
    req: {
      headers: { 'x-appwrite-key': 'chave-da-function', 'x-appwrite-trigger': 'schedule' },
      body: raw,
      // Mesmo caminho do runtime: o getter lê o corpo cru e quebra se não for JSON.
      get bodyJson() {
        return JSON.parse(String(raw));
      },
    },
    res: { json: vi.fn((data: unknown, status?: number) => ({ data, status })) },
    error: vi.fn(),
  };
}

beforeEach(() => {
  vi.stubEnv('APPWRITE_FUNCTION_API_ENDPOINT', 'https://example.test/v1');
  vi.stubEnv('APPWRITE_FUNCTION_PROJECT_ID', 'projeto-de-teste');
  vi.stubEnv('APPWRITE_DATABASE_ID', 'nuy-creators');
  return () => vi.unstubAllEnvs();
});

it('A · execução agendada sem corpo nenhum não estoura e vale corpo vazio', async () => {
  const run = await hosted(event(''));
  expect(run.ready).toBe(true);
  if (!run.ready) return;
  expect(run.body).toEqual({});
});

it('B · corpo JSON válido continua sendo lido', async () => {
  const run = await hosted(event('{"kind":"session","n":7}'));
  expect(run.ready).toBe(true);
  if (!run.ready) return;
  expect(run.body).toEqual({ kind: 'session', n: 7 });
});

it('B2 · corpo que não é objeto (lista, número, texto) vira corpo vazio', async () => {
  const list = await hosted(event('[1,2,3]'));
  const number = await hosted(event('7'));
  expect(list.ready && list.body).toEqual({});
  expect(number.ready && number.body).toEqual({});
});

it('C · corpo presente e JSON inválido CONTINUA sendo erro', async () => {
  await expect(hosted(event('{"kind":'))).rejects.toThrowError(SyntaxError);
});

it('ACL privada exige schema pronto e atestado explícito no host da Function', async () => {
  vi.stubEnv('APPWRITE_ACADEMY_CHALLENGE_ACL_PRIVATE_READY', 'true');
  vi.stubEnv('APPWRITE_ACADEMY_SCHEMA_READY', 'false');
  const blocked = await hosted(event('{}'));
  expect(blocked.ready && blocked.ctx.challengeCommentsPrivateReady).toBe(false);
  vi.stubEnv('APPWRITE_ACADEMY_SCHEMA_READY', 'true');
  const ready = await hosted(event('{}'));
  expect(ready.ready && ready.ctx.challengeCommentsPrivateReady).toBe(true);
});
