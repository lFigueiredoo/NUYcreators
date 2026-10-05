# Hero: artboard estático para revisão visual

## Abordagem

Fonte exclusiva: `artifacts/visual/hero-reference.png` (744×410). A prancha não foi usada nesta rodada.

Shell full-width de92svh; artboard interno lógico1600×900, aspect-ratio16/9. O artboard usa **escala uniforme contain**, sem deformar imagens/tipos ou reflow de colunas. Quando a proporção do shell difere, o espaço periférico recebe o fundo contínuo do shell, não um painel/rail vazio. Todos os anchors de campanha são absolutos/proporcionais: headline, kicker, descrição, CTAs, logo, nav, ícones, headerCTA, produto, flores ebenefícios. A pequena distribuição interna de links/ícones não controla a composição.

Artboard em1920:1766.39×993.59, x76.80,y0. Em1440:1440×810,x0,y55. Essa diferença é deliberada para preservar16/9 por escala uniforme. O shell continua1920×993.59 e1440×920. Mobile tem tradução própria390×820; não é uma miniatura desktop com texto ilegível.

## Passadas reais

1. `artifacts/vertical/artboard-pass1/`: posicionamento estático proporcional e header/typografia sem reflow. Inspeção mostrou a borda do fundo do artboard e diferença de peso dos CTAs.
2. `artboard-pass2/`: artboard com escala uniforme, máscaras intersectadas no packshot, duas órbitas, starlight eglow localizado. Capturas ecomparações regionais geradas.
3. `artboard-pass3/` e `artboard-final/`: flores emtrês planos, recortes periféricos, blur seletivo, luz de base e ambiente isolado. A comparação de cores identificou navy excessivamente uniforme; a faixa inferior foi recomposta e o título/CTA ajustados novamente antes da captura final.

**Passada4 não executada:** o usuário condicionou animação à aprovação do frame. O hero está marcado `data-static-artboard`; PublicMotion ignora somente sua entrada/parallax/trilhas/cursor. As animações existentes das outras seções eLenis não foram redesenhadas. Não se usa movimento para mascarar diferenças.

## Composição eassets

- HTML real “Bem-vinda ao / NUY CREATORS”, assinatura secundária, links navegáveis eheader integrado.
- Background: navy, violeta profundo localizado, textura, pontos estrelados, vinheta/feather emcamadas eambiente inferior. Atmosphere fora do artboard garante fundo contínuo até as bordas do shell.
- Packshot: asset modular de produto/arquitetura, não o hero completo. Máscaras horizontal evertical intersectadas eliminam bordas perceptíveis; object-fit:contain preserva a proporção.
- Background floral desfocado; bouquet intermediário junto ao produto; flores grandes nos cantos, parcialmente cortadas, com máscaras suaves.
- Arcos primário/secundário e luz inferior emSVG/CSS. Sem animação durante comparação.
- Novo `hero-environment-art.webp`: faixa isolada300×49 da base paisagística/luminosa de hero-reference, sem texto/UI. Extração reproduzível em `scripts/extract-artboard-assets.mjs`. Original não modificado.
- Fontes locais existentes Cormorant Garamond eDM Sans. Não foi baixado outro asset nem usado background da screenshot completa.

## Caixas observadas em1920

| Elemento                  | x       | y      | width   | height |
| ------------------------- | ------- | ------ | ------- | ------ |
| Shell                     | 0       | 0      | 1920    | 993.59 |
| Artboard                  | 76.80   | 0      | 1766.39 | 993.59 |
| Headline                  | 179.24  | 251.38 | 900.84  | 221.44 |
| Packshot (caixa do asset) | 1083.65 | 139.09 | 759.55  | 854.48 |
| Benefícios                | 168.65  | 921.73 | 1586.23 | 29.14  |

Medidas correspondentes em1440 estão em `geometry-final-1440.json`. E2E verifica também a proporção16/9, anchorx5.8%/y25.3% do headline, área do packshot>40% ebarra de benefícios>85% do artboard.

Comparação de proporções dentro de cada artboard, com bboxes aproximadas medidas na fonte:

| Caixa      | Referência x/y/w/h (%)  | HTML x/y/w/h (%)        |
| ---------- | ----------------------- | ----------------------- |
| Headline   | 5.78/25.85/52.42/20.00  | 5.80/25.30/51.00/22.29  |
| Packshot   | 57.26/13.66/42.47/86.34 | 57.00/14.00/43.00/86.00 |
| Benefícios | 5.38/92.20/83.33/5.37   | 5.20/92.77/89.80/2.93   |

Headlinebbox é caixaHTML, não segmentação de glifos. Packshotbbox é container do recorte artístico, não prova da escala opaca de cada frasco. Essas distinções impedem tratar números como certificação de igualdade visual.

## Arquivos de revisão

Pasta atual: `artifacts/vertical/artboard-final/`.

- `reference-1920.png`, `implementation-1920.png`.
- `hero-reference-vs-final.png`: REFERENCE à esquerda, IMPLEMENTATION à direita.
- `blur-reference.png`, `blur-implementation.png`, `hero-blur-comparison.png`: blur32px.
- `overlay-25.png`:25%ref/75%HTML; `overlay-50.png`:50/50.
- Crops: `region-header-comparison.png`, `region-headline-comparison.png`, `region-packshot-comparison.png`, `region-flowers-comparison.png`, `region-benefits-comparison.png`.
- `geometry-final-1920.json`, `geometry-final-1440.json`, `geometry-final-390.json`.
- `regional-proportions.json`, `color-histogram.json`, `regions.json`, `*-ancestors.json`.
- Screenshots reais: `hero-final-1920.png`, `hero-final-1440.png`, `hero-final-390.png`.

Comparações normalizadas1920×1080, resizecontain sem distorção. Navy de registro preservado, não escondido para aumentar similaridade. Crops usam coordenadas iguais dos dois frames. Histograma: RGB quantizado embins32, amostra320×180, com registro incluído. Nenhuma percentagem de aprovação automática ou threshold favorável.

## Diferenças ainda evidentes — não declarar pixel similarity aprovada

O bin navy mais frequente representa25.54% da referência e40.19% da implementação final (era45.46% antes da recomposição inferior). O equilíbrio ainda é mais escuro/menos variado; isso permanece registrado. Blur também mostra massa inferior quente da referência mais extensa e uma órbita mais intensa. A caixa do headline está mais próxima, mas a fonte exata e os glifos diferentes ainda alteram a silhueta. Barra inferior tem menor altura e textos diferentes. Logo segue provisório.

Recortes de flores são repetidos emplanos diferentes, não originais separados de cada pétala. Asset rasterizado de baixa resolução perde definição em1920; feather modifica transparências. Há diferença entre o shell92svh e a proporção16/9, com inset proporcional do artboard em1920. Esses fatores explicam diferenças, mas não são considerados aceite ou justificativa para alegar fidelidade completa.

Entrega do frame estático **para revisão**, sem afirmar aprovação visual. Animações do hero continuam bloqueadas até aprovação.

## Validação eescopo

Typecheck: passou. Unitários:41/8 arquivos passaram. Playwright:14 passaram,2 combinações redundantes desktop no projeto mobile excluídas. ESLint, Prettier eNext build passaram. Shell, proporção do artboard, anchors regionais, mobile sem overflow, leitura semJS, navegação ecleanup testados.

Alterados: `hero.tsx`, `scene.tsx`, novo `hero-artboard.module.css`, guard do hero estático em `public-motion.tsx`, teste visual, script de captura eextração, novoasset isolado, documentação. Não foram editados `landing.tsx`, header compartilhado, outras seções, footer, Appwrite, Auth, env, backend, Functions, banco, permissões ou segurança. Servidor de produção isolado/desconectado3101 para capturas; dev3000 preservado. Nenhum commit executado.
