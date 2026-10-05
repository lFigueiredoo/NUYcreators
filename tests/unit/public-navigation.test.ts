import { describe, expect, it } from 'vitest';
import {
  publicNavigation,
  publicAccountLinks,
} from '../../src/components/layout/public-navigation';

describe('public acquisition navigation', () => {
  it('exposes editorial anchors, not operational application navigation', () => {
    expect(publicNavigation).toEqual([
      ['O projeto', '/#projeto'],
      ['Como funciona', '/#como-funciona'],
      ['Benefícios', '/#beneficios'],
      ['FAQ', '/#faq'],
    ]);
  });
  it('offers login and registration to a visitor', () => {
    expect(publicAccountLinks(false)).toEqual([
      { label: 'Entrar', href: '/login', primary: false },
      { label: 'Fazer parte', href: '/cadastro', primary: true },
    ]);
  });
  it('offers only the workspace to a confirmed authenticated visitor', () => {
    expect(publicAccountLinks(true)).toEqual([
      { label: 'Ir para meu painel', href: '/app', primary: true },
    ]);
  });
});
