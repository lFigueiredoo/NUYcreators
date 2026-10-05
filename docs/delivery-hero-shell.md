# Hero desktop: auditoria dos ancestrais e geometria comprovada

## Causa e distinção entre artefatos

A implementação histórica colocava o hero dentro de `.referenceGrid` com `grid-template-columns: 1.586fr 1fr`, padding lateral e wrappers de coluna. Isso restringia o painel à primeira coluna (~60%). O `aspect-ratio: 744/410` produzia aproximadamente848×467 em1440. Não era um viewport hero. O header interno herdava essa mesma largura. Essa estrutura era decorrente da interpretação incorreta da prancha como tela única.

**Esse grid já não existe na home atual.** Antes de qualquer edição desta rodada, a inspeção real de localhost:3000 mediu1920×1056 e1440×976, ambos x=0. Os JSONs em `artifacts/visual/v3/` pertencem à versão antiga; os JSONs em `artifacts/vertical/final/` pertencem à correção vertical anterior. Não há evidência de restrição residual de60% no código servido durante esta rodada. Não foi adicionada uma correção fictícia de ancestral inexistente.

Cadeia observada: `section[data-visual-hero] → main#main → div.experience → body → html`. Todos com display:block, grid-template-columns:none, grid-column:auto, flex-basis:auto, max-width:none e padding0. Hero aspect-ratio:auto, border0 e border-radius0. Wrapper experience usa overflow:clip para ornamentos, mas ocupa100% e não restringe a largura. A auditoria completa de estilos computados está nos novos arquivos `*-ancestors.json`.

## Ajustes exclusivamente no hero

- Altura desktop alterada de100svh–24px para92svh, conforme intervalo88–95svh solicitado.
- Copy40% da largura, afastada6% da borda; tamanho de headline preservado.
- Produto reposicionado centro/direita, bouquet expandido e flor intermediária deslocada. Cena combinada ocupa aproximadamente metade do viewport.
- Imagem mantém object-fit:contain; caixa calculada pela proporção316/354 e altura disponível para não distorcer o produto nem deixar máscara em espaço vazio. Background, SVGs/glow e header continuam full-width.
- Mobile preservado em390×820. Não houve mudanças nas seções seguintes, ordem, conteúdo, backend, Auth, env ou segurança.

## Geometria final observada em produção

| Viewport  | Hero x | Hero width | Hero height | Header width | Critérios                       |
| --------- | ------ | ---------- | ----------- | ------------ | ------------------------------- |
| 1920×1080 | 0      | 1920       | 993.59375   | 1920         | width≥1850 e height≥850: passou |
| 1440×1000 | 0      | 1440       | 920         | 1440         | width≥1380 e height≥800: passou |
| 390×844   | 0      | 390        | 820         | 390          | largura mobile preservada       |

## Evidências desta rodada — não confundir com arquivos antigos

Pasta: `artifacts/vertical/hero-shell-final/`.

- Screenshots: `1920-viewport.png`, `1440-viewport.png`, `390-viewport.png`.
- Geometria: `1920-geometry.json`, `1440-geometry.json`, `390-geometry.json`.
- Auditoria dos ancestrais: `1920-ancestors.json`, `1440-ancestors.json`, `390-ancestors.json`.
- Comparativo referência/HTML: `1920-hero-comparison.png`.
- Overlay50/50: `1920-hero-overlay.png`.
- Diff RGB absoluto: `1920-hero-diff.png`.
- Imagens normalizadas: `1920-reference-normalized.png`, `1920-implementation-normalized.png`.

Ambas as imagens comparadas são normalizadas em **1920×1080**, com resize contain, sem distorção. Isso pode gerar faixas navy de registro quando proporções diferem; elas não são escondidas. Apenas `hero-reference.png` é usado, nunca a geometria da prancha. O script recusa gerar overlay quando os limites mínimos de largura/altura não são cumpridos. Comparativo e overlay não representam declaração de igualdade pixel-perfect; os textos são diferentes e a arte rasterizada ainda tem resolução limitada.

Servidor de produção desconectado/isolado3101, sem alteração de env em disco; reduced motion para capturas determinísticas. Dev3000 preservado. Script: `node scripts/capture-vertical-landing.mjs hero-shell-final http://localhost:3101`.

## Validação

Typecheck,41 testes unitários/8 arquivos, ESLint, Prettier e build passaram. Playwright:14 passaram;2 combinações desktop redundantes no projeto mobile excluídas. Testes exigem as larguras mínimas, alturas mínimas, altura88–95% do viewport, fluxo vertical e ausência de sidebar. Motion/reduced motion, cleanup, navegação e leitura sem JS continuam passando.

Arquivos de código alterados nesta rodada: somente `landing.module.css` (regras do hero), `tests/e2e/landing-visual.spec.ts` e `scripts/capture-vertical-landing.mjs`. Nenhum commit executado.
