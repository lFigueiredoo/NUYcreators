import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RegulationScreen } from '../../src/features/regulation/components/regulation-screen';
import {
  moreNav,
  primaryNav,
  sectionLabel,
} from '../../src/features/workspace/components/navigation';

const publication = {
  promoterLegalName: null,
  promoterTradeName: null,
  promoterAddress: null,
  promoterCnpj: null,
  participationStartsAt: null,
  participationEndsAt: null,
  viralViewsGoal: null,
  supportEmail: null,
  authorizationCertificate: null,
};

const officialPublication = {
  ...publication,
  promoterLegalName: 'SIRMIONE COMERCIO E DISTRIBUICAO LTDA',
  promoterTradeName: 'NSN COMERCIO E DISTRIBUICAO',
  promoterAddress: 'Rua Projetada, S/N, Distrito Mecânico, Pedras de Fogo - PB, CEP 58.328-000',
  promoterCnpj: '36.120.044/0001-00',
  participationStartsAt: '03/11/2026',
  participationEndsAt: '03/11/2027 (12 meses)',
  viralViewsGoal: '20.000 (vinte mil) visualizações',
  supportEmail: 'mundonuy@gmail.com',
};

describe('página do regulamento NUY Creators', () => {
  it('fica acessível pela navegação autenticada no desktop e no menu Mais', () => {
    expect(
      primaryNav.some(
        (entry) => entry.label === 'Regulamento' && entry.href === '/app/regulamento',
      ),
    ).toBe(true);
    expect(moreNav.some((entry) => entry.href === '/app/regulamento')).toBe(true);
    expect(sectionLabel('/app/regulamento')).toBe('Regulamento');
  });

  it('renderiza resumo, pontuação, premiação e as dez seções jurídicas', () => {
    const html = renderToStaticMarkup(createElement(RegulationScreen, { publication }));

    expect(html).toContain('Regulamento do programa');
    expect(html).toContain('Tabela de pontuação');
    expect(html).toContain('Proposta de premiação do Top 5');
    expect(html).toContain('Regulamento completo do programa');
    expect(html).toContain('Minuta não vigente');
    expect(html).toContain('Razão Social da NUY');
    expect(html).toContain('Certificado de autorização');
    expect(html).not.toContain('R$ 500 em PIX');

    for (let section = 1; section <= 10; section += 1) {
      expect(html).toContain(`id="secao-${section}"`);
    }
  });

  it('mantém o documento de Termos de Uso separado da regra do programa', () => {
    expect(primaryNav.some((entry) => entry.href === '/termos')).toBe(true);
    expect(primaryNav.some((entry) => entry.href === '/app/regulamento')).toBe(true);

    const rankingIndex = primaryNav.findIndex((entry) => entry.href === '/app/ranking');
    expect(primaryNav[rankingIndex + 1]?.href).toBe('/app/regulamento');
    expect(primaryNav[rankingIndex + 2]?.href).toBe('/termos');
  });

  it('exibe os dados institucionais fornecidos sem preencher o certificado pendente', () => {
    const html = renderToStaticMarkup(
      createElement(RegulationScreen, { publication: officialPublication }),
    );

    for (const value of [
      'SIRMIONE COMERCIO E DISTRIBUICAO LTDA',
      'NSN COMERCIO E DISTRIBUICAO',
      '36.120.044/0001-00',
      '03/11/2026',
      '03/11/2027 (12 meses)',
      '20.000 (vinte mil) visualizações',
      'mundonuy@gmail.com',
    ]) {
      expect(html).toContain(value);
    }
    expect(html).toContain('Certificado de autorização, quando exigível');
  });
});
