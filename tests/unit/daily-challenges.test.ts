import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { dailyChallenges } from '../../src/features/regulation/daily-challenges';
import { ChallengesScreen } from '../../src/features/workspace/components/challenges-screen';

describe('desafios diários', () => {
  it('mantém os cinco formatos, pontos e limites oficiais em uma fonte compartilhada', () => {
    expect(dailyChallenges).toHaveLength(5);
    expect(new Set(dailyChallenges.map((item) => item.id)).size).toBe(5);
    expect(dailyChallenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'instagram-reels-feed',
          points: '10 pontos / post',
        }),
        expect.objectContaining({
          id: 'instagram-photo-carousel',
          points: '10 pontos / post',
        }),
        expect.objectContaining({
          id: 'instagram-stories',
          points: '1 ponto / story',
          rule: expect.stringContaining('Máximo de 10 pontos por dia'),
        }),
        expect.objectContaining({
          id: 'tiktok-collab',
          points: '15 pontos / post',
          rule: expect.stringContaining('Máximo de 2 posts por dia'),
        }),
        expect.objectContaining({
          id: 'shopee-video',
          points: '20 pontos / vídeo',
          rule: expect.stringContaining('Máximo de 2 vídeos por dia'),
        }),
      ]),
    );
  });

  it('exibe as tarefas na tela de Desafios e liga para o Regulamento', () => {
    const html = renderToStaticMarkup(
      createElement(ChallengesScreen, {
        view: [],
        tab: 'available',
        now: new Date('2026-11-06T12:00:00-03:00'),
      }),
    );

    expect(html).toContain('id="daily-challenges-title"');
    expect(html).toContain('Desafios diários');
    expect(html).toContain('15 stories aprovados rendem 10 pontos');
    expect(html).toContain('até 30 pontos');
    expect(html).toContain('até 40 pontos');
    expect(html).toContain('href="/app/regulamento"');
    expect(html.match(/data-label="Plataforma"/g)).toHaveLength(5);
  });
});
