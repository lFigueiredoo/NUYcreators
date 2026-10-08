import { expect, it } from 'vitest';
import { notificationLink, notificationType } from '../../src/features/workspace/domain/status';
import { message } from '../../src/features/workspace/core/outbox';
import { pointTypeLabel } from '../../src/features/workspace/domain/points';
import { flashHref, returnPath } from '../../src/features/workspace/domain/flash';

/**
 * Rótulos e destinos que a creator lê.
 *
 * Três defeitos medidos na revisão visual viram teste aqui:
 *  · o aviso abria com o CÓDIGO do evento (`submission.approved`) porque o mapa
 *    de rótulos estava chaveado por categoria (P1-1);
 *  · o extrato imprimia `· earn` / `· redeem` / `· adjust` (P2-2);
 *  · nenhum aviso era clicável, embora dois mandassem a creator conferir o
 *    conteúdo (P2-3).
 */

it('o rótulo do aviso é humano para TODO tipo de evento que a conta tem', () => {
  const types = [
    'challenge.joined',
    'submission.approved',
    'submission.rejected',
    'submission.revision_requested',
    'reward.redeemed',
    'points.adjusted',
  ];
  for (const type of types) {
    const { label } = notificationType(type);
    expect(label).not.toBe(type);
    expect(label).not.toMatch(/[._]/);
    expect(label.trim().length).toBeGreaterThan(0);
  }
});

it('tipo de evento desconhecido não vira código interno no chip', () => {
  expect(notificationType('submission.appealed').label).toBe('Aviso');
  expect(notificationType(null).label).toBe('Aviso');
});

it('o chip é a CATEGORIA do aviso, nunca o título repetido na mesma linha', () => {
  // Medido no E2E de staging: com o título no chip, a linha do aviso dizia
  // "Conteúdo aprovado" duas vezes — e a asserção por texto da jornada passou a
  // casar dois elementos. O chip diz a família; o título diz o que aconteceu.
  const types = [
    'challenge.joined',
    'submission.approved',
    'submission.rejected',
    'submission.revision_requested',
    'reward.redeemed',
    'points.adjusted',
  ];
  for (const type of types) {
    const copy = message(type, { points: 50 });
    expect(notificationType(type).label, type).not.toBe(copy!.title);
  }
  // Categoria é vocabulário fechado e curto — o mesmo que o resto da área usa.
  expect(notificationType('challenge.joined').label).toBe('Desafio');
  expect(notificationType('submission.approved').label).toBe('Conteúdo');
  expect(notificationType('submission.rejected').label).toBe('Conteúdo');
  expect(notificationType('reward.redeemed').label).toBe('Recompensa');
  expect(notificationType('points.adjusted').label).toBe('Pontos');
});

it('o TÍTULO entregue é humano: nunca o código do evento (§7)', () => {
  const types = [
    'challenge.joined',
    'submission.approved',
    'submission.rejected',
    'submission.revision_requested',
    'reward.redeemed',
    'points.adjusted',
  ];
  for (const type of types) {
    const copy = message(type, { points: 50 });
    expect(copy, type).not.toBe(null);
    expect(copy!.title, type).not.toBe(type);
    expect(copy!.title, type).not.toMatch(/[._]/);
    expect(copy!.body.trim().length, type).toBeGreaterThan(0);
  }
});

it('evento sem texto conhecido não entrega notificação nenhuma', () => {
  // Sem copy não há entrega: o evento é marcado como ignorado, não inventamos
  // um título a partir do código.
  expect(message('submission.appealed', {})).toBe(null);
});

it('o aviso de conteúdo leva à linha exata do envio', () => {
  expect(notificationLink({ type: 'submission.rejected', referenceId: 'c1fb9848' })).toEqual({
    href: '/app/conteudos?aba=rejected#c1fb9848',
    label: 'Ver este conteúdo',
  });
  // Sem entidade no dado, o destino cai para a aba — nunca um id inventado.
  expect(notificationLink({ type: 'submission.approved', referenceId: '' })?.href).toBe(
    '/app/conteudos?aba=approved',
  );
});

it('resgate e ajuste de pontos levam à tela onde o fato aparece', () => {
  expect(notificationLink({ type: 'reward.redeemed' })?.href).toBe('/app/recompensas');
  expect(notificationLink({ type: 'points.adjusted' })?.href).toBe('/app/pontos');
});

it('participação confirmada NÃO tem link: o evento guarda o id, a rota usa o slug', () => {
  expect(notificationLink({ type: 'challenge.joined' })).toBe(null);
});

it('o extrato nomeia o tipo de movimentação em português', () => {
  expect(pointTypeLabel('earn')).toBe('Pontos ganhos');
  expect(pointTypeLabel('redeem')).toBe('Resgate');
  expect(pointTypeLabel('adjust')).toBe('Ajuste de pontos');
  expect(pointTypeLabel('algo_novo')).toBe('');
  expect(pointTypeLabel(null)).toBe('');
});

it('o aviso viaja na URL de volta e o destino é conferido', () => {
  expect(flashHref('/app/recompensas', 'Resgate registrado.')).toBe(
    '/app/recompensas?aviso=Resgate%20registrado.',
  );
  expect(flashHref('/app/desafios?aba=joined', 'Ok')).toBe('/app/desafios?aba=joined&aviso=Ok');
  expect(returnPath('/app/desafios/qa', '/app/desafios')).toBe('/app/desafios/qa');
  expect(returnPath('//evil.test/app', '/app/desafios')).toBe('/app/desafios');
  expect(returnPath('/admin', '/app/desafios')).toBe('/app/desafios');
  expect(returnPath('https://evil.test', '/app/desafios')).toBe('/app/desafios');
});
