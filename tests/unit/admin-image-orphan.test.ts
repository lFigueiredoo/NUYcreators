import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A política de órfão do upload de capa — provada pelo DESTINO de cada falha.
 *
 * Por que este arquivo existe: a política certa e a errada só se distinguem no
 * caminho de erro, que nenhum print mostra e nenhum teste de sucesso alcança. As
 * duas perguntas que ele responde são as que sobram depois que tudo dá certo:
 *
 *   1. **Upload OK, gravação da linha falhou** — o arquivo recém-enviado foi
 *      apagado, ou ficou no bucket sem nenhuma linha apontando para ele?
 *   2. **Troca de imagem** — o arquivo anterior foi apagado depois de conferir que
 *      NENHUMA outra linha ainda aponta para ele, ou foi apagado direto, quebrando
 *      a imagem de quem mais o usasse?
 *
 * O dublê de arquivos aplica a exclusão (mesma escolha de `creator-write-scope`):
 * a asserção é sobre o que sobrou no bucket, não sobre o retorno. E o dublê de
 * linhas conta as consultas, para que "conferiu antes de apagar" seja medido, não
 * suposto.
 *
 * O que este arquivo NÃO prova: a gravação contra o Appwrite real — essa fica com
 * o arranjo de staging.
 */

const arquivos = new Map<string, string>();
const exclusoes: string[] = [];
let sequencia = 0;
const leituras: string[] = [];
/** Faz a leitura do catálogo falhar, para medir a política quando ela é impossível. */
let catalogoIndisponivel = false;
/** Ids que alguma linha do catálogo ainda usa. */
let referenciados = new Set<string>();
let falhaAoApagar = false;
let midiaConfigurada = true;

vi.mock('@/lib/appwrite/media', () => ({
  mediaConfigured: () => midiaConfigurada,
  createMediaFile: async ({ name }: { name: string }) => {
    const id = `arquivo-${++sequencia}`;
    arquivos.set(id, name);
    return id;
  },
  deleteMediaFile: async (fileId: string) => {
    if (falhaAoApagar) return false;
    exclusoes.push(fileId);
    arquivos.delete(fileId);
    return true;
  },
}));

vi.mock('@/lib/appwrite/data', () => ({
  databaseId: () => 'nuy-creators',
  sessionTables: (secret: string) => ({ secret }),
  // A assinatura real leva as tabelas como PRIMEIRO argumento (a sessão de quem
  // opera); o alvo da consulta vem no segundo.
  listTableRows: async (_tables: unknown, { tableId }: { tableId: string }) => {
    leituras.push(tableId);
    if (catalogoIndisponivel) throw new Error('catálogo fora do ar');
    // O dublê não lê a query: ele responde conforme o cenário, e é o cenário que
    // o teste declara ("outra linha ainda aponta" ou não).
    return { rows: [], total: referenciados.size > 0 ? 1 : 0 };
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'sessao-de-quem-opera' }) }),
}));

const { discardUploaded, imageForForm, retireReplaced } =
  await import('../../src/features/admin/services/media');

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
]);

/** Um `File` de verdade: o código lê `size` e a fatia de bytes do cabeçalho. */
const capa = (over: Partial<{ name: string; type: string; bytes: Uint8Array }> = {}) =>
  new File([new Uint8Array(over.bytes ?? PNG)], over.name ?? 'capa.png', {
    type: over.type ?? 'image/png',
  });

beforeEach(() => {
  arquivos.clear();
  exclusoes.length = 0;
  leituras.length = 0;
  sequencia = 0;
  catalogoIndisponivel = false;
  referenciados = new Set();
  falhaAoApagar = false;
  midiaConfigurada = true;
});

describe('upload concluído, gravação da linha falhando', () => {
  it('desfaz o arquivo que subiu — o bucket não fica com um órfão', async () => {
    const subiu = await imageForForm({ file: capa(), keep: '', clear: false });
    expect(subiu.ok && subiu.uploaded).toBeTruthy();
    expect(arquivos.size).toBe(1);

    // A linha não pôde ser gravada. É o instante exato da janela.
    await discardUploaded(subiu.ok ? subiu.uploaded : null);

    expect(exclusoes).toEqual([subiu.ok ? subiu.uploaded : null]);
    expect(arquivos.size).toBe(0);
  });

  it('sem upload não há o que desfazer — e nada é apagado', async () => {
    await discardUploaded(null);
    expect(exclusoes).toEqual([]);
    expect(arquivos.size).toBe(0);
  });

  it('se a limpeza também falhar, o erro não sobe: a falha funcional já aconteceu', async () => {
    const subiu = await imageForForm({ file: capa(), keep: '', clear: false });
    falhaAoApagar = true;

    await expect(discardUploaded(subiu.ok ? subiu.uploaded : null)).resolves.toBeUndefined();
    // O arquivo fica — e o servidor diz isso no log. Um arquivo a mais é melhor
    // que uma exceção no meio de uma falha que já estava sendo tratada.
    expect(arquivos.size).toBe(1);
  });
});

describe('troca de imagem: apagar só depois de conferir', () => {
  it('outra linha ainda aponta para o arquivo antigo → ele é MANTIDO', async () => {
    arquivos.set('antigo', 'capa-anterior.png');
    referenciados = new Set(['antigo']);

    await retireReplaced('antigo', 'novo');

    expect(exclusoes).toEqual([]);
    expect(arquivos.has('antigo')).toBe(true);
    // A conferência ACONTECEU. Ela para na primeira tabela que responde "usa"
    // (curto-circuito), e é isso que a lista de leituras mostra.
    expect(leituras).toEqual(['challenges']);
  });

  it('ninguém mais aponta → o arquivo antigo sai', async () => {
    arquivos.set('antigo', 'capa-anterior.png');

    await retireReplaced('antigo', 'novo');

    expect(leituras).toEqual(['challenges', 'rewards']);
    expect(exclusoes).toEqual(['antigo']);
    expect(arquivos.has('antigo')).toBe(false);
  });

  it('a conferência impossível MANTÉM o arquivo: falha fechada, imagem quebrada é pior', async () => {
    arquivos.set('antigo', 'capa-anterior.png');
    catalogoIndisponivel = true;

    await retireReplaced('antigo', 'novo');

    expect(exclusoes).toEqual([]);
    expect(arquivos.has('antigo')).toBe(true);
  });

  it('sem chave de mídia não se apaga nada — a capacidade está desligada', async () => {
    arquivos.set('antigo', 'capa-anterior.png');

    await retireReplaced('antigo', 'novo');
    expect(exclusoes).toEqual(['antigo']);

    midiaConfigurada = false;
    arquivos.set('outro', 'capa-anterior.png');
    await retireReplaced('outro', 'novo');
    expect(exclusoes).toEqual(['antigo']);
    expect(arquivos.has('outro')).toBe(true);
  });

  it('troca que não trocou (mesmo id) não apaga o arquivo que está em uso', async () => {
    arquivos.set('mesmo', 'capa.png');

    await retireReplaced('mesmo', 'mesmo');

    expect(leituras).toEqual([]);
    expect(exclusoes).toEqual([]);
    expect(arquivos.has('mesmo')).toBe(true);
  });

  it('remover a imagem aposenta o arquivo anterior e não grava id nenhum', async () => {
    arquivos.set('antigo', 'capa-anterior.png');

    const resultado = await imageForForm({ file: null, keep: 'antigo', clear: true });
    expect(resultado).toMatchObject({ ok: true, fileId: '', uploaded: null, replaced: 'antigo' });

    await retireReplaced(
      resultado.ok ? resultado.replaced : null,
      resultado.ok ? resultado.fileId : '',
    );
    expect(arquivos.has('antigo')).toBe(false);
  });

  it('a remoção aposenta EXATAMENTE o arquivo que o formulário declarou — e nenhum se ele não declarar', async () => {
    // O contrato tem duas pontas e a segunda é uma armadilha: `replaced` é o que o
    // formulário mandou em `imageFileId`. Quando o campo oculto do /admin ZERAVA o
    // id ao remover, a linha ficava sem imagem, a tela voltava para a inicial, tudo
    // parecia certo — e o arquivo continuava no bucket, sem ninguém apontando para
    // ele. O arquivo abaixo é esse, e ele tem de continuar aqui: é o que trava a
    // ponta do formulário.
    arquivos.set('antigo', 'capa-anterior.png');

    const semDeclarar = await imageForForm({ file: null, keep: '', clear: true });
    expect(semDeclarar).toMatchObject({ ok: true, fileId: '', replaced: '' });

    await retireReplaced(
      semDeclarar.ok ? semDeclarar.replaced : null,
      semDeclarar.ok ? semDeclarar.fileId : '',
    );
    expect(arquivos.has('antigo')).toBe(true);
  });

  it('salvar sem escolher arquivo mantém o que já estava: nada sobe, nada sai', async () => {
    arquivos.set('antigo', 'capa-anterior.png');

    const resultado = await imageForForm({ file: null, keep: 'antigo', clear: false });
    expect(resultado).toMatchObject({ ok: true, fileId: 'antigo', uploaded: null, replaced: null });

    await discardUploaded(resultado.ok ? resultado.uploaded : null);
    await retireReplaced(
      resultado.ok ? resultado.replaced : null,
      resultado.ok ? resultado.fileId : '',
    );
    expect(arquivos.has('antigo')).toBe(true);
    expect(exclusoes).toEqual([]);
  });
});

describe('nada sobe antes de a régua decidir', () => {
  it('arquivo inválido é recusado ANTES do upload — o bucket não recebe nem para descartar', async () => {
    const executavel = capa({
      name: 'inocente.png',
      bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0, 0, 0]),
    });

    const resultado = await imageForForm({ file: executavel, keep: '', clear: false });

    expect(resultado.ok).toBe(false);
    expect(arquivos.size).toBe(0);
    expect(exclusoes).toEqual([]);
  });

  it('sem chave de mídia, o arquivo é recusado e NADA é criado', async () => {
    midiaConfigurada = false;

    const resultado = await imageForForm({ file: capa(), keep: '', clear: false });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok ? '' : resultado.message).toMatch(/não foi configurado/);
    expect(arquivos.size).toBe(0);
  });

  it('com arquivo válido, sobe e marca o anterior como substituído', async () => {
    arquivos.set('antigo', 'capa-anterior.png');

    const resultado = await imageForForm({ file: capa(), keep: 'antigo', clear: false });

    expect(resultado.ok && resultado.uploaded).toBe('arquivo-1');
    expect(resultado.ok && resultado.replaced).toBe('antigo');
    expect(resultado.ok && resultado.fileId).toBe('arquivo-1');
  });
});
