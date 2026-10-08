import { expect, it } from 'vitest';
import { judge, namedScopes, PROFILES } from '../../infra/appwrite/key-scopes';

/**
 * O leitor do 401 e o juiz das expectativas.
 *
 * A forma da mensagem NÃO foi imaginada: veio medida contra a chave de teste
 * (`artifacts/calibrar-sondas.mjs`). O corpo chega duas vezes escapado quando o SDK
 * entrega a resposta como texto, e o extrator exigindo aspas limpas lia "não
 * nomeado" onde o escopo estava escrito — o erro que estes testes prendem.
 */

const recusa = (mensagem: string) => ({ code: 401, response: mensagem });

it('lê o nome do escopo no corpo escapado que o SDK entrega', () => {
  const corpo =
    '{"message":"app.<projeto>@service.<host> (role: applications) missing scopes ([\\"users.read\\"])","code":401,"type":"general_unauthorized_scope"}';
  expect(namedScopes(recusa(corpo))).toEqual(['users.read']);
});

it('lê TODOS os nomes quando a recusa cita mais de um', () => {
  const corpo =
    'missing scopes ([\\"tables.write\\",\\"collections.write\\",\\"columns.write\\",\\"attributes.write\\"])';
  expect(namedScopes(recusa(corpo))).toEqual([
    'tables.write',
    'collections.write',
    'columns.write',
    'attributes.write',
  ]);
});

it('lê também o corpo limpo (objeto), não só o escapado', () => {
  expect(
    namedScopes({ code: 401, response: { message: 'missing scopes (["files.read"])' } }),
  ).toEqual(['files.read']);
  expect(namedScopes({ code: 401, message: 'missing scopes (["keys.write"])' })).toEqual([
    'keys.write',
  ]);
});

it('recusa sem lista de escopos devolve lista vazia, não um nome inventado', () => {
  expect(namedScopes(recusa('{"code":401,"type":"general_unauthorized_scope"}'))).toEqual([]);
  expect(namedScopes(new Error('rede caiu'))).toEqual([]);
});

it('expectativa decide o veredito: ter o proibido reprova, faltar o necessário reprova', () => {
  // A chave de operação precisa de rows.* e não pode ter o resto.
  expect(judge('need', 'authorized')).toBe(true);
  expect(judge('need', 'denied')).toBe(false);
  expect(judge('forbidden', 'denied')).toBe(true);
  expect(judge('forbidden', 'authorized')).toBe(false);
  // "A mais" também reprova: a chave deixa de ser mínima.
  expect(judge('excess', 'authorized')).toBe(false);
  expect(judge('excess', 'denied')).toBe(true);
  // Não medido nunca passa: sonda que não mediu não absolve ninguém.
  for (const expectation of ['need', 'forbidden', 'excess'] as const)
    expect(judge(expectation, 'unmeasured'), expectation).toBe(false);
});

it('os perfis não pedem de si mesmos o que proíbem', () => {
  for (const [nome, perfil] of Object.entries(PROFILES)) {
    for (const escopo of perfil.need)
      expect(perfil.forbidden.includes(escopo), `${nome}/${escopo}`).toBe(false);
    for (const escopo of perfil.excess)
      expect(perfil.forbidden.includes(escopo), `${nome}/${escopo}`).toBe(false);
    for (const escopo of perfil.forbidden)
      expect(perfil.need.includes(escopo), `${nome}/${escopo}`).toBe(false);
  }
  // E os mínimos são os que o código usa, não outros.
  expect(PROFILES.ops.need).toEqual(['rows.read', 'rows.write']);
  expect(PROFILES.ops.forbidden).toContain('files.write');
  expect(PROFILES.media.need).toEqual(['files.read', 'files.write']);
  expect(PROFILES.media.forbidden).toContain('rows.write');
});
