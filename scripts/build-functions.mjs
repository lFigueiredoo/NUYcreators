#!/usr/bin/env node
import { access, readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Empacota as Appwrite Functions.
 *
 * Cada function é um diretório com `main.ts` e vira `src/main.js` — bundle ESM
 * de plataforma node com as dependências EXTERNAS (`--packages=external`): o
 * runtime do Appwrite fornece `node-appwrite`, e empacotá-lo só duplicaria SDK.
 *
 * O esbuild usado é o que já está instalado em `functions/complete-onboarding`
 * (versão fixada no `package.json` de lá): um binário só para todos os bundles,
 * sem inventar dependência nova na raiz. Faltando, o script diz exatamente o que
 * rodar em vez de falhar por caminho implícito.
 *
 * Sem credencial em lugar nenhum: o bundle lê o ambiente em tempo de execução.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = resolve(root, 'functions');

async function esbuildBinary() {
  const candidates = [
    resolve(functionsDir, 'complete-onboarding/package.json'),
    resolve(functionsDir, 'join-challenge/package.json'),
    resolve(root, 'package.json'),
  ];
  for (const anchor of candidates) {
    try {
      await access(anchor);
      const require = createRequire(anchor);
      return require.resolve('esbuild');
    } catch {
      continue;
    }
  }
  throw new Error(
    'esbuild não encontrado. Rode `npm install` em functions/complete-onboarding antes de empacotar.',
  );
}

async function targets() {
  const entries = await readdir(functionsDir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'shared') continue;
    const main = resolve(functionsDir, entry.name, 'main.ts');
    try {
      await access(main);
      found.push({ id: entry.name, main });
    } catch {
      // Diretório sem entrada própria não é function — segue.
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

const list = await targets();
if (!list.length) {
  console.error('Nenhuma function com main.ts encontrada.');
  process.exit(1);
}
const esbuildPath = await esbuildBinary();
const { build } = await import(pathToFileURL(esbuildPath).href);

/**
 * Dependência externa que o bundle importa e o `package.json` da function NÃO
 * declara.
 *
 * Com `--packages=external` a importação sobrevive ao bundle e é resolvida no
 * runtime pelo `node_modules` do deploy. Dependência usada e não declarada só
 * aparece lá — como `ERR_MODULE_NOT_FOUND` na primeira execução real, depois do
 * deploy. Medido nesta rodada: TODOS os bundles do núcleo importam `zod` (o
 * schema do onboarding entra pelo core), e só `complete-onboarding` o declarava.
 * O gate existe para que esse erro aconteça no build, e não em produção.
 */
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
async function undeclaredImports(outfile, declared) {
  const bundle = await readFile(outfile, 'utf8');
  const specifiers = new Set();
  for (const match of bundle.matchAll(/(?:from|import)\s*"([^"]+)"/g)) {
    const specifier = match[1];
    if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
    // Nome do pacote: `@escopo/nome` tem dois segmentos, o resto tem um.
    const segments = specifier.split('/');
    specifiers.add(
      specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] ?? specifier),
    );
  }
  return [...specifiers].filter((name) => !BUILTINS.has(name) && !declared.has(name)).sort();
}

let failed = false;
for (const target of list) {
  const pkg = JSON.parse(await readFile(resolve(functionsDir, target.id, 'package.json'), 'utf8'));
  const outfile = resolve(functionsDir, target.id, 'src/main.js');
  await build({
    entryPoints: [target.main],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node22',
    logLevel: 'warning',
    legalComments: 'none',
    absWorkingDir: resolve(functionsDir, target.id),
  });
  const undeclared = await undeclaredImports(outfile, new Set(Object.keys(pkg.dependencies ?? {})));
  if (undeclared.length) {
    failed = true;
    console.error(
      `DEPENDÊNCIA_AUSENTE ${target.id}: o bundle importa [${undeclared.join(', ')}] e o package.json não declara. ` +
        `Com --packages=external isso quebra no runtime do Appwrite, depois do deploy.`,
    );
    continue;
  }
  console.log(`empaquetado: ${target.id} (${pkg.name})`);
}
if (failed) process.exit(1);
