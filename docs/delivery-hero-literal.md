# Hero — nova headline e comparação por regiões

## Inspeção e causa da coluna histórica

Leitura da cadeia de componentes: `src/app/page.tsx` → `Landing` → `Hero`. O Hero é filho direto de `main#main`; seu único irmão é `.landingFlow`, que começa **abaixo** dele. Nenhum aside, rail, placeholder ou segundo grid column está presente no primeiro viewport. A auditoria final registra também todos os irmãos de cada ancestral até html: `artifacts/vertical/hero-literal-final/1920-ancestors.json`.

A causa histórica das medições1141/629 e848/467 era `.referenceGrid` (`grid-template-columns:1.586fr 1fr`) e o antigo `aspect-ratio:744/410`, em `src/features/community/components/landing.module.css`, com wrappers/coluna lateral em `landing.tsx`. Essa estrutura já havia sido removida antes desta rodada. Os números citados não foram reproduzidos pelo DOM atual. A classe residual de aspect-ratio do hero foi removida da regra base nesta rodada, não apenas sobrescrita; o resultado computado éauto. Não se afirma ter removido do DOM um elemento que não existia mais.

Antes de editar: captura real emlocalhost:3000 em `artifacts/vertical/headline-before/`, com1920×993.59375 e1440×920. Depois: mesmas dimensões do shell, nova hierarquia/composição. O espaço navy que permanece à esquerda/acima pertence à cena, não a uma coluna vazia à direita.

| Viewport  | Antes desta rodada | Depois         | x   | Critérios                     |
| --------- | ------------------ | -------------- | --- | ----------------------------- |
| 1920×1080 | 1920×993.59375     | 1920×993.59375 | 0   | width≥1850,height≥900: passou |
| 1440×1000 | 1440×920           | 1440×920       | 0   | width≥1380,height≥850: passou |
| 390×844   | 390×820            | 390×820        | 0   | largura preservada            |

Shell:92svh,100% largura, max-width:none, overflow:hidden, border0, radius0. Header final1920px/1440px, sem antiga contenção. Wrapper/main/body: display:block, grid-template-columns:none, max-width:none, padding0. Auditados todos os ancestrais e irmãos; footer e seções seguintes não foram modificados.

## Alterações do hero/header

- Headline real emHTML: “Bem-vinda ao” / “NUY CREATORS”, segunda linha maior. A frase “Crie. Compartilhe. Conquiste.” virou assinatura secundária.
- Copy posicionada emx6%; bloco começa20% da altura e título após kicker, aproximadamente25%. Largura45%, sem grid de colunas estruturais.
- Subheadline nova com “Uma comunidade real…”, escala desktop ampliada, CTAs aumentados após comparação desfocada mostrar peso insuficiente.
- Produto mantém object-fit:contain e proporção original. Bouquet ampliado à esquerda/base, flor suspensa reposicionada; ornamentação recortada e luz localizada continuam em camadas.
- Dois arcos SVG atrás do packshot, trilhas mais discretas; shell corta ornamentação periférica.
- Header editorial ganha ícones: explorar conteúdos leva a/#conteudos; conta leva a/login. Não há pesquisa fictícia ou botão sem ação. Variante não editorial permanece igual.
- Barra inferior: Comunidade NUY, Conteúdos exclusivos, Desafios mensais, Pontos e recompensas, ícones finos, sem cards.
- Mobile: headline adaptada em duas linhas, cena reposicionada, ícones acessíveis e largura390px. Sem overflow horizontal nos testes.

## Evidência atual — pasta única

`artifacts/vertical/hero-literal-final/`:

- `hero-reference-normalized-1920.png`.
- `hero-final-1920.png`, `hero-final-1440.png`, `hero-final-390.png`.
- `hero-reference-vs-final.png`, `hero-overlay-50.png`, `hero-blur-comparison.png`.
- `geometry-final-1920.json`, `geometry-final-1440.json`, `geometry-final-390.json`.
- `1920-ancestors.json`, `1440-ancestors.json`, `390-ancestors.json`.
- `region-header-comparison.png`, `region-copy-comparison.png`, `region-packshot-comparison.png`, `region-flowers-comparison.png`, `region-light-comparison.png`, `region-cta-comparison.png`, `region-benefits-comparison.png`.

Em todas as comparações, referência à esquerda eHTML à direita. Cada hero comparado é normalizado1920×1080 comcontain, sem distorção e com faixa navy de registro quando necessário. Crops usam as mesmas coordenadas em ambas as imagens; não são deslocados individualmente para esconder divergências. Coordenadas documentadas em `regions.json`. Blur24px, overlay média50/50 e diff absolutoRGB. A referência original nunca é alterada ou usada como fundo integral.

Passadas intermediárias em `headline-pass1/` e `headline-pass2/`. Após inspecionar crops/blur, foram ampliados headline, logo e CTAs e corrigido o alinhamento vertical; suíte ebuild reexecutados antes da captura final de produção. Os artefatos anteriores continuam históricos, não medidas atuais.

## Limitações visíveis

Fonte editorial é aproximação, logo provisório, conteúdo textual diferente. Os recortes rasterizados fornecidos continuam com resolução limitada, especialmente em1920. A massa floral adicional e linhas SVG não são iguais em cada pixel à fonte; crops eblur deixam essas diferenças visíveis. Não se declara igualdade pixel-perfect ou aceite visual do usuário.

## Validação e escopo

Typecheck,41 testes unitários/8 arquivos, ESLint, Prettier ebuild passaram. Playwright:14 passaram,2 combinações desktop redundantes no projeto mobile excluídas. Limites mínimos atualizados paraheight900/850 ewidth1850/1380. Navegação real dos CTAs, leitura sem JS, reduced motion, cleanup e overflow continuam testados.

Arquivos de código alterados nesta rodada: `src/features/community/components/hero.tsx`, `scene.tsx`, regras do hero em `landing.module.css`, `src/components/layout/header.tsx` (somente variante editorial), `tests/e2e/landing-visual.spec.ts`, `tests/e2e/public.spec.ts`, `scripts/capture-vertical-landing.mjs`. Documentação/índice de artefatos atualizados.

`landing.tsx`, manifesto, comunidade, como funciona, desafio, níveis, recompensas, ranking, FAQ, CTA final efooter não foram editados. Appwrite, Auth, env, Functions, banco, permissões e segurança intactos. Servidor de captura3101 desconectado com env somente no processo, sem edição em disco; dev3000 preservado. Nenhum commit executado.
