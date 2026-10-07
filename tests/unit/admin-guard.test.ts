import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminNavEntries } from '../../src/features/admin/components/nav-items';
import { adminCapabilities } from '../../src/lib/security/permissions';

/**
 * Portão das rotas administrativas.
 *
 * A regra da sprint é dura e fácil de quebrar em silêncio: TODA rota `/admin`
 * confere sessão e membership no servidor. O menu escondido é conveniência — se
 * uma rota nova nascer sem `requireStaff`, o link não aparece para a creator,
 * mas a URL abre. Este teste é o que impede esse esquecimento, e é mais barato
 * que revisitar catorze arquivos a cada rota nova.
 *
 * Ele também amarra MENU e ROTA: o destino do menu declara a capacidade, e a
 * página tem que cobrar a MESMA. Menu dizendo uma coisa e rota cobrando outra é
 * o jeito mais rápido de oferecer um link que leva a "acesso negado".
 */
const ADMIN_ROOT = join(process.cwd(), 'src', 'app', '(protected)', 'admin');

function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesIn(path);
    return path.endsWith('page.tsx') || path.endsWith('layout.tsx') ? [path] : [];
  });
}

const KNOWN_CAPABILITIES = new Set<string>(
  Object.values(adminCapabilities).flat() as readonly string[],
);

describe('rotas /admin', () => {
  const screens = filesIn(ADMIN_ROOT);

  it('encontra as telas da área', () => {
    // Sete destinos + cinco telas internas (novo/editar de desafio, recompensa,
    // submissão e creator) + o layout.
    expect(screens.length).toBeGreaterThanOrEqual(13);
  });

  it('toda tela e o layout chamam requireStaff — nenhuma depende do menu escondido', () => {
    for (const screen of screens) {
      const source = readFileSync(screen, 'utf8');
      expect(source, `${relative(ADMIN_ROOT, screen)} não confere sessão e membership`).toMatch(
        /requireStaff\(/,
      );
    }
  });

  it('a capacidade cobrada é uma capacidade que existe', () => {
    for (const screen of screens) {
      const source = readFileSync(screen, 'utf8');
      for (const match of source.matchAll(/requireStaff\(\s*'([^']+)'\s*\)/g))
        expect(
          KNOWN_CAPABILITIES.has(match[1]),
          `${relative(ADMIN_ROOT, screen)}: ${match[1]}`,
        ).toBe(true);
    }
  });

  it('o menu é a mesma lista da rota: destino existe e cobra a mesma capacidade', () => {
    for (const entry of adminNavEntries) {
      const page = join(ADMIN_ROOT, ...entry.href.split('/').filter(Boolean).slice(1), 'page.tsx');
      const source = readFileSync(page, 'utf8');
      expect(source, `${entry.href} não cobra '${entry.capability}'`).toContain(
        `requireStaff('${entry.capability}')`,
      );
    }
  });

  it('o menu cobre as sete áreas na ordem da operação, e nenhuma além', () => {
    expect(adminNavEntries.map((entry) => entry.label)).toEqual([
      'Visão geral',
      'Desafios',
      'Submissões',
      'Creators',
      'Recompensas',
      'Campanhas',
      'Relatórios',
    ]);
    expect(adminNavEntries.map((entry) => entry.href)).toEqual([
      '/admin',
      '/admin/desafios',
      '/admin/submissoes',
      '/admin/creators',
      '/admin/recompensas',
      '/admin/campanhas',
      '/admin/relatorios',
    ]);
  });
});
