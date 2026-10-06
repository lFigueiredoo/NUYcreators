# R8 · Checkpoint 2 — Creators + Desafio (Proposta C "Entre Casa & Creators")

Rodada: 05/10/2026 · Branch `master` · **sem commit nesta rodada** (workflow: commit só a pedido)
Escopo tocado: `src/features/public-landing/*`, `src/styles/globals.css` (só remoção de CSS morto da
landing antiga), `tests/e2e/*` (contrato da Proposta C), `scripts/pc-*` (captura/comparação),
`public/brand/nuy-creators-v2/*` e `public/fonts/*`. **Nada** em Appwrite, Auth, database, Functions,
permissions, env, rotas protegidas, área autenticada ou regras de pontos/níveis.

Referência oficial: prancha **"Imagens a utilizar"** (1122×1402) — item **3. Creators em destaque**
(tira de quatro retratos) e item **5. Banner desafio/recompensas** (navy, copy "Casa perfumada,
rotina mais feliz.", pill creme, manuscrito "Pequenas rotinas, grandes sensações.").

---

## Resultado

### 04 · Creators

Grade de quatro retratos na régua editorial, sem moldura de texto sobre a foto: não existe creator
público no backend e batizar uma pessoa gerada seria inventar comunidade. A linha honesta do bloco
("Imagens de campanha NUY — os perfis da comunidade chegam com os primeiros conteúdos.") fica abaixo
da grade.

| Medida (1920 CSS px)    | Valor                             |
| ----------------------- | --------------------------------- |
| Título (x)              | 104 (= gutter)                    |
| Grade (x, largura)      | 104 / 1713                        |
| Cards (x)               | 104 · 556 · 1008 · 1460           |
| Card (largura × altura) | **356 × 534 = bitmap nativo 1:1** |

O retrato nativo mede 356×534: quatro cards **não** preenchem 1712px sem ampliar o bitmap. Decisão de
checkpoint: a grade usa `justify-content: space-between` com teto de 356px por card — a tira abre e
fecha na régua (x 104 → 1817) e a sobra vira respiro (96px) entre os cards; nenhum bitmap é esticado.
Em 1440 os cards encolhem para 305 (ainda 1,15 px de bitmap por px de CSS) e abaixo de 900px a grade
vira carrossel com sangria nas duas bordas (`scrollWidth` 1145 vs `clientWidth` 390 em 390px).

### 05 · Desafio

Banner navy full-bleed com a still life sangrando pela direita e a copy na régua. Estado de
**pré-lançamento**: sem data, prazo, pontos ou participantes — só o convite e a nota "O primeiro
desafio está em preparação — quem entra agora recebe o convite."

| Medida (1920)     | Valor                                       |
| ----------------- | ------------------------------------------- |
| Seção             | 1920 × 646 · fundo `rgb(14, 42, 68)`        |
| Foto (x, largura) | 980 · 940 (encosta na borda direita)        |
| Copy (x, largura) | 104 · 524                                   |
| Copy sobre a foto | 628 − 980 = **0px além do início da faixa** |
| Título            | Playfair Display 48,8px                     |

O manuscrito da referência entra em creme, ancorado à direita da coluna de copy — nunca sobre a
massa clara da foto em nenhuma largura (o comentário no CSS registra o porquê). Contraste medido no
bitmap renderizado, WCAG com sRGB linearizado: título **14,07:1**, corpo **10,31:1**, nota e eyebrow
dourados **7,75:1**, tinta navy no pill creme **14,07:1** — todos acima de AA/AAA.

### Auditoria de bitmap (DPR 1, `w=` do srcset conferido no bitmap servido)

| Asset                  | Bitmap    | Exibido        | px de bitmap / px de CSS |
| ---------------------- | --------- | -------------- | ------------------------ |
| `hero-lifestyle.webp`  | 1448×1086 | 1269,5 × 952,1 | 1,141                    |
| `creator-01.webp`      | 356×534   | 356 × 534      | **1,000 (nativo)**       |
| `products-floral.webp` | 1080×810  | 940 × 645,6    | 1,149 / 1,255            |

Varredura em 900/1024/1100/1440/1920 (`scripts/pc-upscale-probe.mjs`): **nenhum upscale** em nenhuma
largura. O caso 1024 que falhava servia 640px para um slot de 655px; `sizes` passou a espelhar a
caixa real com `min()` — `min(64vw, 940px)` no banner e `min(23vw, 356px)` na grade — e agora serve
750px. Zero texto rasterizado: todo o texto das duas seções é HTML real (o único manuscrito é fonte
web, não imagem).

## Validação

| Gate                                             | Resultado                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                   | ✓                                                                                                                       |
| `vitest run`                                     | ✓ 44/44                                                                                                                 |
| `eslint .`                                       | ✓ 0 erros (22 warnings, todos em scripts de rodadas anteriores)                                                         |
| `prettier --check`                               | ✓ em `src/`, `tests/` e nos scripts desta rodada (39 arquivos legados de R8/R9/R10 seguem fora do padrão — não tocados) |
| `next build`                                     | ✓ produção                                                                                                              |
| `playwright` (suite completa, config porta 3124) | ✓ **38 passou / 14 skipped / 0 falha**                                                                                  |

Log completo em `artifacts/proposta-c/gates-playwright.txt`. Servidores efêmeros (3124/3125/3126)
desligados; o dev server do usuário (:3000) não foi tocado.

Correções que fizeram o gate fechar:

- **U+FEFF no meio do `landing.module.css`** — o caractere invisível colava num seletor e fazia a
  regra `.creators` (padding + fundo) ser **descartada em silêncio** pelo parser. A grade caía em
  x=0. Removido; geometria conferida por probe (título e cards em 104).
- **`sizes` subestimando a caixa real** em 1024px (upscale de 15px no banner) — resolvido com `min()`.
- **Tetos de altura no `landing-quality.spec.ts`** mediam a coluna de copy esticada pela grade
  (952px) em vez da seção do hero; o teste agora mede a seção (teto 1000px).
- **Reveal lido no meio da transição** de 0,72s — o teste passou a fazer polling em vez de leitura
  instantânea.
- **Teste do "Entrar" em 390px** exigia o link solto do header, que só existe ≥1160px; agora abre o
  painel antes de clicar.
- **CSS morto da landing antiga ainda em `globals.css`**: `.hero-copy .eyebrow` (×3), `.challenge-section`,
  `.ranking-section`, `.experience-panel .eyebrow`, `.final-cta > p`, `@keyframes faq-reveal` — removidos
  (nenhum aparece em `src/`). Sobraram em `globals.css` as classes `auth-*`/`back-link`, sem uso no
  `src/` atual, **preservadas de propósito**: são da área de autenticação e o brief manda não mexer.

### Comparações lado a lado

A prancha é folha de especificação, não mock de página: seus blocos são miniaturas (a tira de
retratos mede 528px, o banner 540px). Comparar em 1920 exigiria ampliar o recorte 3,6× — então a
comparação é feita **na escala da prancha**, com a implementação reduzida até o card ter exatamente a
largura do card da prancha (fator medido: 0,36 para creators, 0,28 para o banner), e a seção em 1:1
logo abaixo para inspeção de detalhe. Nenhum bitmap é ampliado em nenhum passo.

- `artifacts/proposta-c/checkpoint-2/comparison-04-creators-1920.png` — prancha 1:1 | implementação na
  mesma escala, e a seção 04 em 1:1.
- `artifacts/proposta-c/checkpoint-2/comparison-05-desafio-1920.png` — banner da prancha 1:1 |
  implementação na mesma largura, e a seção 05 em 1:1.
- `artifacts/proposta-c/checkpoint-2/comparison-390.png` — mock mobile da prancha ao lado do bloco
  empilhado a 390 CSS px (DPR2).

## Escopo

**Componentes novos** (`src/features/public-landing/`): `public-landing.tsx`, `landing-fonts.ts`,
`landing-navigation.ts`, `landing-reveal.tsx`, `components/public-header.tsx`, `components/hero.tsx`,
`components/benefits-strip.tsx`, `components/creators.tsx` **(CP2)**, `components/challenge.tsx` **(CP2)**,
`styles/landing.module.css`.

**Removidos** (landing antiga, 15 arquivos em `src/features/community/components/`): `landing.tsx`,
`landing.module.css`, `hero.tsx`, `hero-artboard.module.css`, `hero-motion.tsx`,
`hero-motion.module.css`, `public-motion.tsx`, `scene.tsx`, `floral.tsx`, `botanical.tsx`,
`experiences.tsx`, `how-it-works.tsx`, `levels-section.tsx`, `faq.tsx`, `acquisition.module.css` —
mais o teste `tests/e2e/hero-motion.spec.ts`. Nenhum deles tinha referência restante. O
`community/components/landing-fonts.ts` **fica**: serve `(auth)/layout.tsx` e `(app)/layout.tsx`.

**Assets usados**: `creators/creator-01..04.webp` (356×534, recortados sem reamostragem da tira de
quatro), `products/products-floral.webp` (1448×1086), `hero/hero-lifestyle.webp` (CP1), fontes
`playfair-display-latin.woff2`, `playfair-display-italic-latin.woff2`, `inter-latin.woff2` e a
`caveat-latin.woff2` (acento manuscrito). `/brand/reference/*` continua servindo auth, header e
footer — não é da landing.

**Candidatos a remoção** (sem nenhuma referência em `src/`): `public/brand/v2/` (232K),
`public/brand/v3/` (236K), `public/brand/c/` (152K), `public/brand/polish/` (320K),
`public/brand/product-concept.webp` e, dentro de `nuy-creators-v2/`, `cozy-home.webp`,
`products-home.webp`, `imagens-a-utilizar.webp` e `proposal-c.webp` (só aparecem em scripts de
montagem). Não foram apagados: apagar assets é decisão sua, e a tira-mestra
`creators-reference.webp` é a procedência dos quatro recortes.

**Arquivos alterados nesta rodada**: `src/features/public-landing/components/{creators,challenge}.tsx`,
`src/features/public-landing/styles/landing.module.css`, `src/styles/globals.css` (remoção),
`tests/e2e/{landing-visual,landing-quality,public,experience-boundary}.spec.ts`,
`tests/e2e/landing-reveal.spec.ts` (novo), `tests/e2e/hero-motion.spec.ts` (removido),
`.gitignore`/`.prettierignore` (cache do Playwright), `scripts/pc-*`.

**Não inventado**: nenhum número de creators, @, data, prazo, pontuação ou participante aparece na
landing — auditado por teste (`landing-quality.spec.ts`).

Nenhum commit executado.
