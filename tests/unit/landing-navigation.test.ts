import { describe, expect, it } from 'vitest';
import {
  anchorFor,
  landingAccountLinks,
  landingFooterLinks,
  landingNavigation,
} from '../../src/features/public-landing/landing-navigation';

/**
 * Contrato da navegação da landing clean (Opção 1): poucos destinos, todos
 * reais — âncoras da própria landing, páginas legais e o acesso por sessão.
 */
describe('navegação pública da landing clean', () => {
  it('o header tem poucos destinos, todos âncora da própria página', () => {
    expect(landingNavigation).toEqual([
      ['O que é', '#o-que-e'],
      ['Como participar', '#como-participar'],
      ['FAQ', '#faq'],
    ]);
  });

  it('o rodapé repete FAQ e as páginas legais', () => {
    expect(landingFooterLinks).toEqual([
      ['FAQ', '#faq'],
      ['Termos', '/termos'],
      ['Privacidade', '/privacidade'],
    ]);
  });

  it('oferece entrar e criar conta ao visitante', () => {
    expect(landingAccountLinks(false)).toEqual([
      { label: 'ENTRAR', href: '/login', primary: false },
      { label: 'CRIAR CONTA', href: '/cadastro', primary: true },
    ]);
  });

  it('oferece só o painel a quem está autenticado', () => {
    expect(landingAccountLinks(true)).toEqual([
      { label: 'Meu painel', href: '/app', primary: true },
    ]);
  });

  it('âncora relativa vira absoluta fora da landing', () => {
    expect(anchorFor('#faq', false)).toBe('#faq');
    expect(anchorFor('#faq', true)).toBe('/#faq');
    // Rota de verdade não é tocada pela troca.
    expect(anchorFor('/login', true)).toBe('/login');
  });
});
