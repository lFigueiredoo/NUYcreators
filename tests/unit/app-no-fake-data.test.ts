import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Portão contra dado inventado na área autenticada.
 *
 * A regra do produto é dura: em produção, ou o dado é real (lido do Appwrite
 * com a sessão da própria usuária) ou a tela mostra o próprio vazio. Fixture
 * mora só em `tests/`. Este teste falha se alguém trouxer mock para dentro do
 * `/app` — é mais barato que revisar arquivo por arquivo a cada rodada.
 */
const ROOT = join(process.cwd(), 'src');

/**
 * Onde a regra vale: o produto autenticado e as rotas que o servem — inclusive a
 * área administrativa, que lê o banco de verdade e não pode ganhar um número de
 * exemplo "só para a tela não ficar vazia". Zero é resposta nas duas áreas.
 */
const GUARDED = [
  join(ROOT, 'features', 'workspace'),
  join(ROOT, 'features', 'admin'),
  join(ROOT, 'features', 'academy'),
  join(ROOT, 'app', '(protected)'),
];

/** Um `creator fictício` com nome e pontos é o formato clássico do mock. */
const FORBIDDEN = [
  { pattern: /\bmock[A-Z]\w*/, what: 'identificador de mock' },
  { pattern: /\b(fake|dummy|sampleData|demoData)\w*/i, what: 'nome de dado fictício' },
  { pattern: /lorem ipsum/i, what: 'texto de preenchimento' },
  { pattern: /Math\.random\(/, what: 'valor sorteado no cliente' },
  { pattern: /from ['"][^'"]*\/tests\//, what: 'import de fixture de teste' },
  { pattern: /\b(TODO|FIXME)\b.*(mock|fake|dado real|real data)/i, what: 'pendência de dado real' },
];

function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return filesIn(path);
    return /\.(ts|tsx)$/.test(path) && !path.includes('.test.') ? [path] : [];
  });
}

const files = GUARDED.flatMap(filesIn);

describe('área autenticada', () => {
  it('encontra os arquivos do produto', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)('não contém $what', ({ pattern }) => {
    const offenders = files.filter((path) => pattern.test(readFileSync(path, 'utf8')));
    expect(offenders.map((path) => relative(ROOT, path))).toEqual([]);
  });

  it('nenhuma tela do /app monta conteúdo próprio: todas leem do serviço', () => {
    const pages = filesIn(join(ROOT, 'app', '(protected)', 'app')).filter((path) =>
      path.endsWith('page.tsx'),
    );
    expect(pages.length).toBeGreaterThanOrEqual(12);
    for (const page of pages) {
      const source = readFileSync(page, 'utf8');
      const name = relative(ROOT, page);
      // Toda tela passa por `workspaceSession` (a sessão da própria usuária) e
      // por pelo menos um `load*` da camada de serviço — nunca por literal.
      expect(source, `${name} não lê a sessão`).toMatch(/workspaceSession\(\)/);
      expect(source, `${name} não lê dados de serviço`).toMatch(
        /from '@\/features\/(workspace|academy)\/services\//,
      );
    }
  });

  it('nenhuma tela do /admin monta dado próprio: a página é casca, e quem lê passa pela porta', () => {
    const pages = filesIn(join(ROOT, 'app', '(protected)', 'admin')).filter((path) =>
      path.endsWith('page.tsx'),
    );
    expect(pages.length).toBeGreaterThanOrEqual(19);
    // A única tela que não lê nada é o formulário de recompensa em branco: ele sai
    // vazio a partir do schema e não tem de onde tirar dado. Está nomeada aqui para
    // que uma tela NOVA que esqueça a porta falhe — e para que a exceção seja lida
    // por quem for mexer, não descoberta por acidente.
    const readsNothing = new Set([
      join('admin', 'recompensas', 'nova', 'page.tsx'),
    ]);
    for (const page of pages) {
      const source = readFileSync(page, 'utf8');
      const name = relative(join(ROOT, 'app', '(protected)'), page);
      // A página não monta markup de dado: ela renderiza a tela da área.
      expect(source, `${name} não renderiza uma tela da área`).toMatch(
        /from '@\/features\/(admin|academy)\/components\//,
      );
      if (readsNothing.has(name)) continue;
      expect(source, `${name} não passa pela porta da administração`).toMatch(
        /from '@\/features\/(admin|academy)\/services\//,
      );
    }
  });

  it('os serviços de leitura são server-only', () => {
    for (const service of readdirSync(join(ROOT, 'features', 'workspace', 'services'))) {
      const source = readFileSync(join(ROOT, 'features', 'workspace', 'services', service), 'utf8');
      // Duas diretivas valem, pela mesma razão: as duas garantem que o módulo
      // NÃO roda no cliente. `server-only` lança se alguém tentar; e `'use
      // server'` faz o import virar referência de Server Action — o corpo nunca
      // é avaliado no navegador. As actions do workspace começam por esta
      // última, como as de autenticação já começavam.
      const guarded =
        source.startsWith("import 'server-only';") || source.startsWith("'use server';");
      expect(guarded, service).toBe(true);
    }
  });
});
