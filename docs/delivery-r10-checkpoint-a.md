# R10 · Checkpoint A — Header + Hero + 01 O PROJETO (OPÇÃO C: minimalista premium)

Diretriz: a imagem **OPÇÃO C — MINIMALISTA PREMIUM** (`Downloads/NUY_Creators_Opcao_C_Minimalista_Premium (1).png`, 342×1536) é a **nova referência visual primária** — layout, densidade, hierarquia, proporções, cores, tipografia, ornamentos, uso de flores e ritmo. **Onde a landing atual conflita com a referência C, a referência C vence.** Nada do visual anterior foi adaptado: a camada pública do frame novo é CSS novo em `src/features/public-landing-v3/` (o módulo antigo foi reescrito do zero, sem reutilizar decoração legada).

Escala: o mockup de 342×1536 equivale a uma página de 1024 css-px (@0,334). As âncoras são medidas em **% da largura** e as fontes em px de página. Hero = **81,87% da largura com teto de 1200px** (decisão sua, via pergunta do checkpoint).

Estático por contrato: **nenhuma animação nova** foi implementada e o motion do hero segue desligado (`PublicMotion` detecta `[data-static-artboard]` e não monta GSAP no herói), para o frame estático ser comparável 1:1 com a referência.

**Não tocado**: Auth, Appwrite, Functions, database, permissions, env, rotas autenticadas, lógica de negócio — nada em `src/app/(auth)`, `src/app/(protected)`, `src/features/auth`, `src/lib/appwrite`, `infra/` ou `functions/` foi alterado nesta rodada (o `git status` mostra edições ali vindas de rodadas anteriores, com data de 03/10; as desta rodada são todas do frame público). Seções 03–10 seguem legadas a partir deste checkpoint. Como pedido: **nenhum commit, nenhum push**.

## Evidências (`artifacts/r10/checkpoint-a/`)

| Arquivo                                                               | Conteúdo                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `reference-c.png`                                                     | a referência OPÇÃO C, cópia verbatim (342×1536)                 |
| `implementation-c-1920.png`                                           | implementação @1920 DPR1 — hero + 01 O PROJETO (1920×1679)      |
| `implementation-c-1440.png`                                           | implementação @1440 (hero 1179 + projeto)                       |
| `implementation-c-390.png`                                            | implementação mobile 390 (hero 1100, altura automática)         |
| `comparison-c-reference-vs-implementation.png`                        | referência (escalada a 1920) sobre a implementação, com rótulos |
| `crop-1920-header.png`                                                | header @1920 (0–240)                                            |
| `crop-1920-headline.png`                                              | copy do herói (kicker → assinatura)                             |
| `crop-1920-produto.png`                                               | metade direita: composição do produto                           |
| `crop-1920-chips.png`                                                 | faixa inferior funcional                                        |
| `crop-1920-projeto.png`                                               | seção 01 O PROJETO inteira                                      |
| `crop-1920-flores.png`                                                | flor lilás ancorada na borda direita do projeto                 |
| `crop-{header,headline,produto,chips,projeto,flores}-ref-vs-impl.png` | cada crop pareado com a mesma região da referência              |

Capturas: `scripts/r10-capture-checkpoint-a.mjs` (servidor efêmero :3123, `reducedMotion: reduce`, `loading=eager` + `decode()` antes dos shots, audit de imagem honesto por bitmap servido).

## O que a referência C definiu (medido, não aproximado)

| Elemento                 | Referência (%)                                       | Implementação @1920                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Altura do hero           | 81,87% da largura                                    | 1200px (teto aprovado; 81,87vw = 1572)                                                                                                                               |
| Régua editorial (gutter) | 7,02%                                                | 134,8px — header, copy, faixa e projeto                                                                                                                              |
| Header                   | lockup no topo da régua, pill creme na borda direita | wordmark 161,3 + "CREATORS" 11,5px/0,44em; nav solta; "Entrar" + pill creme                                                                                          |
| Kicker dourado           | y ≈ 30% do hero                                      | y 366 (30,5%), 15px, 0,27em, `#d9b98a`                                                                                                                               |
| Headline                 | 2 linhas, "Bem-vinda ao" a 0,72×                     | "Bem-vinda ao" 95px (y443) / "NUY CREATORS" 132px (y543), largura 912 ≈ 47,5%                                                                                        |
| Descrição                | coluna estreita sob o headline                       | 21px / 1,6, 651px de largura (máx. 31em)                                                                                                                             |
| CTAs                     | pílula clara + contorno, lado a lado                 | pílula dourada em gradiente + contorno creme, 64px de altura                                                                                                         |
| Assinatura               | discreta sob os CTAs                                 | "Crie. Compartilhe. Conquiste." 12,5px, 0,2em, α 0,6                                                                                                                 |
| Faixa funcional          | 4 itens, sem caixa, cruzando o quadro                | 136 → 1784 (space-between), ícones dourados 22px, separadores de 1px, base a 4,3% do rodapé do hero, contraste medido 13,9–14,6:1 (1º–3º) e 7,8:1 (4º, sobre a cena) |
| Composição do produto    | canto direito/inferior, flores integradas            | cena ancorada na borda direita e na base, 985,9×1200 (altura = 100% do hero)                                                                                         |
| 01 O PROJETO             | banda creme de 28,65%, 2 colunas                     | 479px (dentro da banda de 550); título 64px em 3 linhas; coluna direita alinhada ao topo do título; 1 flor lilás sangrando a borda                                   |

Cores: navy `#07172f` (profundo `#050f22`), creme `#f7efe4` (claro `#fbf6ee`), dourado `#d9b98a` / `#b98a4e`, lilás `#cfc3ee`. Glow reduzido a dois radiais discretos (haze violeta + halo dourado **atrás** da composição), sem ornamento solto: **o herói tem exatamente 2 imagens — o lockup e a cena** (gate e2e).

## Assets e auditoria de nitidez (DPR 1, bitmap servido de fato)

| Asset                                   | Bitmap nativo             | Display @1920 | Pixels por css-px | Origem                                                                                                                                      |
| --------------------------------------- | ------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/brand/c/scene-hero-c.webp`      | 1064×1295                 | 985,9×1200    | **1,079**         | `hero-composition-hi` (1264×1416) → crop `{200,0,1064,1295}` → blur mascarado no script → fade para navy. Escala nativa (≤1), sem re-render |
| `public/brand/polish/lilac-floral.webp` | 207×255                   | 149,8×184,5   | **1,382**         | asset existente, agora usado no projeto                                                                                                     |
| `public/brand/v2/wordmark-nuy.webp`     | 322×183 (servido 256×145) | 161,3×91,6    | **1,587**         | asset existente                                                                                                                             |

Método: `naturalWidth` **mente** sob `srcset` (o Chromium o normaliza pela densidade do candidato escolhido — foi a fonte de falsos "upscale" nas rodadas anteriores). A auditoria busca o `currentSrc` e mede o bitmap com `sharp`. Nenhum asset é ampliado em DPR 1. O gerador da cena é `scripts/r10-c-assets.mjs` (preview `artifacts/r10/scene-hero-c-preview.png`).

## Deltas conscientes vs a referência (documentados)

1. **Tipografia de apoio normalizada.** O mockup tem escala interna inconsistente: a tipografia de apoio (kicker, chips, nav) mede ~2× o que uma página real comporta, enquanto headline e título do projeto estão consistentes. Seguimos as **proporções (% da largura)** e normalizamos os corpos de apoio — se o mockup fosse seguido literalmente, o kicker teria ~30px e os chips ~32px.
2. **Sem cluster lilás no canto superior direito.** Verificado em crop 2× (`artifacts/r10/scene-c-scriptzone-2x.png`): a arte nativa não tem floral atrás do script — só o interior do arco e folhagem desfocada. Reproduzir aquele cluster exigiria recorte ampliado, o que o brief proíbe.
3. **Script "Mais que limpeza, é uma aura" apagado.** Blur mascarado σ=12 em duas passadas: ilegível a 2×, com a textura do bokeh preservada (σ=45 virava um retângulo lavado).
4. **Teto de 1200px no hero.** A 1920 a proporção da referência (81,87vw = 1572) é cortada em 24%; a cena acompanha (altura = 100% do hero) e fecha o canto como na referência, em ritmo de site premium e não de tela cheia.

## Pontos de decisão para o seu aceite

1. **Enquadramento da composição.** A referência mostra o still life completo (arco + coluna floral esquerda + frascos + florais da direita) dentro de ~47% da largura; a arte nativa recortada — a escolha "arte nativa recortada, sem script" — fecha nos frascos + florais, e a cena é exibida na altura inteira do hero (985,9 css = 51,3% da largura). O que difere não é a faixa ocupada, e sim o conteúdo dentro dela: sem o arco e a coluna floral, os frascos leem mais próximos e maiores no quadro do que no mockup. Reenquadrar para o still life completo exige recortar a arte mais à esquerda (o muro denso e a coluna floral) e reduzir a cena a ~88% da altura do hero. Diga se quer esse reenquadramento no próximo checkpoint — é uma linha de CSS + um crop novo.
2. **Escala do lockup.** O wordmark mede 8,4% da largura (161px @1920, decisão do R9 mantida); na referência ele mede 11,5% (221px @1920). Não segui o literal porque, no mockup de 342px, todo elemento de interface é ampliado para ser legível no tamanho do thumbnail — a nav e a pílula estão na mesma proporção inflada (~2× uma página real), e um logo a 11,5% com a nav normalizada ficaria desproporcional entre si. Se preferir o literal, é uma constante.

## Correções desta rodada

- **Contraste da faixa inferior sobre a cena**: o 4º chip ("Pontos e recompensas") cai sobre a área clara da composição — medido no frame, 3,68:1 (mediana) com picos de 1,6:1, abaixo de AA. Adicionado um scrim de base (`rgba(5,15,34)` de 0 → 0,66 nos últimos 16% do hero, acima da cena e abaixo do texto): o produto passa a assentar no navy como na referência e os quatro chips medem 13,9–14,6 / **7,8:1** (p75 5,0:1). Verificado por amostragem do bitmap renderizado, não a olho. No mobile o scrim é desligado: lá a cena fica acima da faixa no fluxo, então ele não teria função e só apagaria a base da composição (conferido por amostragem dos glifos antes/depois — 0,657 nos dois).
- **Tokens CSS não atravessam irmãos**: `.hero` e `.project` são irmãos, então `--c-gutter` etc. foram declarados nos dois (sem isso o padding do projeto era descartado e o título caía em x=0 — pego por probe de DOM, não a olho).
- **`sizes` da cena subestimava o slot**: a 1024 o slot declarado (57vw) pedia 584px para um display de 689px → subconjunto de pixels. Corrigido para `(max-width:456px) 114vw, (max-width:760px) 520px, (max-width:1463px) 68vw, 986px`, que descreve a largura real (altura do hero × 0,8216).
- **Flor lilás do projeto com `sizes` obsoleto** (0,854 px/css): ajustado para `7,9vw` → 1,382.
- **Título do projeto quebrava em 5 linhas** (referência: 3) — iteração de 3,9vw → 3,33vw, conferida linha a linha.

## E2E atualizados para a geometria da referência C

- `landing-visual.spec.ts`: hero `min(81,87vw, 1200)`; régua 0,0702; headline a 0,32–0,43 da altura do hero; cena **ancorada na borda direita e na base** (tolerância de 2px) em 0,4–0,75 da largura; **hero com exatamente 2 imagens** e zero `floralRight`; chips de 0,07 a 0,86 da largura, base a < 0,07 do rodapé.
- `landing-quality.spec.ts`: fold `min(w×0,8187, cap)` com cap 900 no tablet e 1200 no desktop; mobile preenche o fold; trava do lockup passou a ler o header do herói (`[data-v3-hero] header a[aria-label]`) em vez do wordmark legado; fonte da cena = `scene-hero-c` (a lista de aposentados vale só para o herói — `lilac-floral` segue em uso no projeto); teto de `projeto` de 460 → **585** (banda da referência: 28,65% × 1920 = 550).
- `experience-boundary.spec.ts`: inventário de seções por `main section[id]` (a profundidade deixou de ser uniforme — o frame novo monta direto sob `main`, o fluxo legado 03–10 vive no contêiner próprio).
- `hero-motion.spec.ts`: inalterado — o contrato estático do herói continua o mesmo.

## Gates

| Gate                                             | Resultado                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `next build`                                     | ✓ produção, 22 rotas renderizam                                  |
| `npx tsc --noEmit`                               | ✓ sem erros                                                      |
| `npm run lint`                                   | ✓ 0 erros (20 warnings pré-existentes, todos em `scripts/*.mjs`) |
| `vitest run`                                     | ✓ 44/44                                                          |
| `playwright` (suite completa, config porta 3124) | ✓ **50 passed / 10 skipped / 0 failed** (1,4 min)                |

Log da suíte em `artifacts/r10/gates-playwright.txt`. Servidores efêmeros de 3123/3124 foram desligados; o dev server do usuário (:3000) não foi tocado. **Nenhum commit executado.**

## Aguardando aprovação do checkpoint A

Escopo desta rodada: **somente header + hero + 01 O PROJETO**, como pedido — **PAREI aqui**. Aprovado o frame estático, os próximos checkpoints seguem a mesma ordem (medir → assets → construir → capturar → parar) para 03 COMO FUNCIONA em diante, e só depois retorna a camada de movimento.
