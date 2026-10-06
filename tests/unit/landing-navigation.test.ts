import { describe, expect, it } from 'vitest';
import {
  anchorFor,
  landingAccountLinks,
  landingFooterNavigation,
  landingNavigation,
} from '../../src/features/public-landing/landing-navigation';

/**
 * Contrato da navegação pública da Proposta C.
 *
 * A landing inteira (header e rodapé) aponta para as próprias seções — nunca
 * para as rotas operacionais do workspace, que exigem sessão. As páginas de
 * `(public)` usam esta mesma navegação, com `anchorFor(..., true)` devolvendo
 * a âncora absoluta (`/#faq`) porque a seção vive noutra rota.
 */
describe('navegação pública da Proposta C', () => {
  it('aponta cada seção do documento, sem rota operacional', () => {
    expect(landingNavigation).toEqual([
      ['Início', '#topo'],
      ['Comunidade', '#comunidade'],
      ['Desafios', '#desafios'],
      ['Recompensas', '#recompensas'],
      ['Conteúdos', '#conteudos'],
      ['FAQ', '#faq'],
    ]);
  });

  it('o rodapé repete as seções na ordem do documento', () => {
    expect(landingFooterNavigation).toEqual([
      ['Comunidade', '#comunidade'],
      ['Desafios', '#desafios'],
      ['Recompensas', '#recompensas'],
      ['Conteúdos', '#conteudos'],
      ['FAQ', '#faq'],
    ]);
  });

  it('oferece login e cadastro ao visitante', () => {
    expect(landingAccountLinks(false)).toEqual([
      { label: 'Entrar', href: '/login', primary: false },
      { label: 'Fazer parte', href: '/cadastro', primary: true },
    ]);
  });

  it('oferece só o painel a quem está autenticado', () => {
    expect(landingAccountLinks(true)).toEqual([
      { label: 'Ir para meu painel', href: '/app', primary: true },
    ]);
  });

  it('âncora relativa vira absoluta fora da landing', () => {
    expect(anchorFor('#faq', false)).toBe('#faq');
    expect(anchorFor('#faq', true)).toBe('/#faq');
    // Rota de verdade não é tocada pela troca.
    expect(anchorFor('/login', true)).toBe('/login');
  });
});
