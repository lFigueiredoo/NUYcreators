# R8 · Checkpoint 3 — Comunidade (06) + Recompensas (07) (Proposta C "Entre Casa & Creators")

Rodada: 05/10/2026 · Branch `master` · **sem commit nesta rodada** (workflow: commit só a pedido)
Escopo tocado: `src/features/public-landing/*` (blocos 06 e 07), `tests/e2e/*` (contrato das duas
seções novas), `scripts/pc-*` (captura/comparação desta rodada), `public/brand/nuy-creators-v2/*`
(três recortes novos + uma foto promovida). **Nada** em Appwrite, Auth, database, Functions,
permissions, env, rotas protegidas, área autenticada ou regras de pontos/níveis.

**Congelado nesta rodada e conferido byte a byte**: Header, Hero, Faixa de benefícios, Creators e
Desafio — nenhum arquivo dessas áreas foi aberto para edição e o topo da página continua idêntico à
captura do Checkpoint 2 (ver "Regressão 01–05").

Referência oficial: prancha **"Imagens a utilizar"** (1122×1402) — item **4. Casa e bem-estar**
(mosaico de cenários de casa) e item **6. Mobile/comunidade** (mock + cards), mais o item **2.
Packshot de produtos** como régua de fotografia de produto.

---

## Resultado

### 06 · Comunidade / manifesto

- `<section id="manifesto">`, fundo **azul NUY #0E2A44**, editorial e limpo.
- Copy **verbatim** do brief, em HTML real: eyebrow `COMUNIDADE NUY` (dourado #D4B98A, caixa alta
  espaçada) · título `Mais que limpeza,` / `uma casa que acolhe.` (Playfair Display; a segunda linha
  em itálico) · corpo "Conteúdos, desafios, experiências e pessoas reais que tornam a rotina mais
  leve, bonita e significativa." · CTA `Fazer parte da comunidade` → `/cadastro`.
- **Nenhum número**: sem contagem de creators, de desafios ou de recompensas. Auditado por teste
  (`communityDigits`).
- Desktop (1920): copy à esquerda na régua (`x=104`, 690px) e **fotografia ocupando a direita** —
  958×539, ou seja **50% da largura e 74% da altura da seção**, encostada na régua direita
  (`1816 = 1920 − 104`). Não há bloco vazio: a foto é o peso visual da composição. Copy centrada na
  altura da foto com desvio ≤ 2px (medido por `offsetTop/offsetHeight`, que ignoram o `transform` do
  reveal).
- Quatro marcas em linha (Creators · Desafios · Recompensas · Conteúdos) com **ícone de contorno** +
  rótulo, sem card, separadas do CTA por uma régua de 1px. Em 390 elas quebram em duas linhas.
- Mobile (390): empilhado na ordem do brief — eyebrow, título, corpo, CTA, marcas e **a foto
  full-bleed** (390×219, proporção nativa 1.78 preservada, sem corte).
- Alturas: **732px** em 1920 · 578 em 1440 · 737 em 390.

### 07 · Recompensas

- `<section id="recompensas">`, volta ao claro: **creme #FDFAF5**. Corte **seco** entre 06 e 07
  (gap medido = 0) — sem onda, flor, curva ou SVG de transição.
- Título `Recompensas que fazem sentido.` · corpo "Sua participação abre novas possibilidades com a
  NUY." · nota "Categorias disponíveis para quem faz parte da comunidade."
- Três cards, **fotografia protagonista**, nada de card de SaaS: `Produtos NUY` · `Kits exclusivos` ·
  `Experiências especiais` — imagem 3:4, título, microcopy de uma linha e seta. Nenhum preço, nenhum
  número, nenhum botão de resgate.
- **Não exibido, por decisão do brief** (dados que pertencem à área autenticada): saldo, estoque
  real, botão de resgate, histórico, catálogo completo, preço em pontos, quantidade disponível —
  auditado por teste (`rewardsOperational`, `rewardsDigits`).
- Desktop (1920): título e corpo à esquerda (`x=104`, 480px) + **fileira de três cards de 344px**
  fechando na régua direita (`1816`). Muito creme, muito respiro: 767px de seção, cards de 567px
  com 459px de imagem.
- Hover sutil (no link do card, hover e `focus-visible`): imagem `scale(1 → 1.015)`, título navy →
  navy (não troca de cor) e seta `+3px`. Nada mais se mexe.
- Mobile (390): **uma coluna**, cards de 348px empilhados com 26–36px de respiro; seção de 2071px.
- Alturas: **767px** em 1920 · 634 em 1440 · 2071 em 390.

### Auditoria de bitmap — zero upscale

`currentSrc` de cada imagem foi buscado e lido com `sharp`: a largura do **bitmap servido** contra a
largura CSS × DPR. Em nenhum caso o bitmap é menor que o slot.

| imagem                    | seção              | servido  | exibido     | px por CSS | upscale |
| ------------------------- | ------------------ | -------- | ----------- | ---------- | ------- |
| `cozy-home.webp`          | 06 · DPR 1 em 1920 | 1080×608 | 957.8×538.8 | 1.128      | **não** |
| `reward-products.webp`    | 07 · DPR 1 em 1920 | 384×512  | 344.0×458.7 | 1.116      | **não** |
| `reward-kits.webp`        | 07 · DPR 1 em 1920 | 384×512  | 344.0×458.7 | 1.116      | **não** |
| `reward-experiences.webp` | 07 · DPR 1 em 1920 | 384×512  | 344.0×458.7 | 1.116      | **não** |
| `cozy-home.webp`          | 06 · DPR 2 em 390  | 828×466  | 390.0×219.4 | 2.123      | **não** |
| `reward-products.webp`    | 07 · DPR 2 em 390  | 750×1001 | 347.9×463.9 | 2.156      | **não** |
| `reward-kits.webp`        | 07 · DPR 2 em 390  | 750×1001 | 347.9×463.9 | 2.156      | **não** |
| `reward-experiences.webp` | 07 · DPR 2 em 390  | 750×1001 | 347.9×463.9 | 2.156      | **não** |

O caso afiado é o mobile: em DPR 2 um card de coluna única pede o dobro de pixels. Os recortes foram
refeitos em 814×1086 nativos (o máximo 3:4 que as fontes permitem), então mesmo o degrau de 750px
servido pelo otimizador fica **abaixo** do nativo. O mesmo teste estrito de upscale de
`landing-quality.spec.ts` roda em oito larguras publicadas (1920/1440/1366/1280/1024/430/390/375).

### Contraste WCAG medido no bitmap renderizado

Mediana (p50) do recorte = fundo real; tinta = cor declarada composta sobre ele com seu alfa;
luminância relativa com sRGB linearizado.

| texto                        | contraste | mínimo |
| ---------------------------- | --------- | ------ |
| título 06 sobre o navy       | **14.07** | 4.5    |
| corpo 06 sobre o navy        | **10.31** | 4.5    |
| eyebrow 06 (dourado #D4B98A) | **7.75**  | 4.5    |
| marcas 06 (creme)            | **12.10** | 4.5    |
| título 07 sobre o creme      | **14.07** | 4.5    |
| corpo e nota 07              | **6.25**  | 4.5    |
| título de card 07            | **14.07** | 4.5    |
| microcopy de card 07         | **6.25**  | 4.5    |

### Regressão 01–05 (áreas congeladas)

Recorte de 0 até o topo da seção 06 (`2846px`) comparado pixel a pixel contra a captura do
Checkpoint 2, nas duas rodadas de captura (antes e depois da troca dos assets de recompensa):

```
alturaComparada: 2846px · deltaMax: 0 · deltaMedio: 0 · pixelsDiferentes: 0 · totalPixels: 5.464.320
```

`regressao-01-05-1920.png` mostra o mapa de diferenças: nenhum pixel em vermelho. Confirmação
independente: os arquivos das cinco áreas congeladas (`hero.tsx`, `creators.tsx`, `challenge.tsx`,
`benefits-strip.tsx`, `public-header.tsx`) têm data de modificação **anterior** a esta rodada.

### Altura da página

| largura | landing antiga | Checkpoint 2 | **Checkpoint 3** |
| ------- | -------------- | ------------ | ---------------- |
| 1920    | 5413px         | 2846px       | **4344px**       |
| 390     | 6291px         | 2530px       | **5338px**       |

A página continua mais curta que a landing antiga nas duas larguras, mesmo com os dois blocos novos.
Teto de ritmo por teste: 06 ≤ 800px (732), 07 ≤ 840px (767). Nenhuma seção da landing usa
`min-height: 100vh` (zero ocorrências no módulo; o único `100vh` do projeto é o `.auth-layout`, da
área de autenticação, intocado nesta rodada).

---

## Validação

| gate                                           | resultado                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                             | limpo                                                                                      |
| `npx vitest run`                               | 9 arquivos · **44 testes** passando                                                        |
| `npx eslint src tests scripts`                 | **0 erros** · 22 avisos, todos em scripts de rodadas anteriores                            |
| `npx prettier --check` (arquivos desta rodada) | limpo                                                                                      |
| `npx playwright test` (porta 3124)             | **38 passando · 14 pulados por desenho** — `artifacts/proposta-c/gates-playwright-cp3.txt` |
| `npx next build`                               | build de produção OK, sem avisos — `artifacts/proposta-c/gates-build-cp3.txt`              |

Contratos novos nos testes: em `landing-visual.spec.ts`, o item 6 (fundo navy, título com a quebra
exata, corpo verbatim, CTA → `/cadastro`, 4 marcas, foto na régua direita com ≥45% da largura e ≥60%
da altura, centralização vertical ≤2px) e o item 7 (fundo creme, títulos exatos na ordem, cada card
→ `/cadastro`, imagem 3:4, largura ≤ 353px, alt com mais de 20 caracteres, 3 colunas no desktop e 1
no mobile); em `landing-quality.spec.ts`, o teto de ritmo das duas seções e a auditoria de
honestidade (nenhum dígito, nenhum dado operacional); em `experience-boundary.spec.ts`, os ids
`manifesto` e `recompensas` no plano de âncoras.

**Sem JavaScript**: o reveal nasce visível — `opacity: 1` nos 8 nós do bloco 06 e nos 3 cards do 07.

### Correção pós-CP3 — a landing respondia 500 no `next dev`

Depois da entrega do checkpoint, o `npm run dev` passou a devolver 500 na página pública:

```
Transforming CSS failed
./src/features/public-landing/body_834b7479.module.css
Selector "[data-pl-reveal]" is not pure. Pure selectors must contain at least one local class or id.
```

**Causa**: as três regras do reveal viviam em `landing.module.css` escritas como
`:global([data-pl-reveal])` / `:global([data-pl-visible])`. Depois de tirar o `:global(...)`, cada
seletor composto fica só com um atributo — sem classe nem id — e é exatamente isso que a **checagem
de pureza do CSS Modules do Turbopack** reprova. Ela roda **apenas no dev**: o `next build` não a
executa, e é por isso que os gates dos checkpoints 1, 2 e 3 ficaram verdes enquanto o dev estava
quebrado. O trace do erro atribui o módulo ao chunk de `next/font/local`; os seletores citados na
mensagem são a informação confiável.

**Correção** (sem mudança de comportamento):

- `src/features/public-landing/styles/landing-reveal.css` — **novo**, folha global de propósito
  (arquivo global não sofre a checagem de pureza). O escopo passa a ser a classe estável
  `.pl-landing` da raiz: `.pl-landing [data-pl-reveal]` tem a **mesma especificidade** (0,2,0) que a
  regra antiga, e o `--pl-stagger` continua inline em cada elemento — a ordem das folhas não decide nada.
- `landing.module.css` — as três regras saem; fica o comentário apontando para a folha nova. O bloco
  `prefers-reduced-motion` do módulo segue com as transições de hover.
- `public-landing.tsx` — importa a folha, ganha a classe `pl-landing` na raiz e documenta o porquê. O
  `<noscript>` que devolve opacidade/transform com `!important` continua igual.
- **Gates re-rodados depois da correção** — `tsc` limpo · `eslint` **0 erros · 22 avisos** (os
  mesmos, todos em `scripts/`) · `next build` verde · Playwright **38 passando · 14 pulados por
  desenho**, os mesmos números do gate do checkpoint, incluindo o contrato que já existia em
  `landing-reveal.spec.ts` ("sem JavaScript a página inteira nasce visível"), que continua verde.

**Prova**: num dev server Turbopack novo (raiz de projeto própria, porta de sonda), a mesma fonte
real compila e responde **HTTP 200, zero erros "is not pure"**; o chunk servido contém
`.pl-landing [data-pl-reveal]` e `.pl-landing [data-pl-visible]`; e a sonda funcional devolveu
`SEM JS: {total: 42, escondidos: 0, menor: 1}` e, com JS, o card do 07 nascendo em `opacity: 0` +
`translateY(14px)` e revelando ao rolar.

**Reiniciar não bastou — e o motivo apareceu nos artefatos.** Subir o `npm run dev` de novo
continuou devolvendo **500 com os mesmos dois seletores**, que não existem mais na fonte. A auditoria
de `.next` explica: o resultado pré-correção ficou gravado no cache persistente do Turbopack. O CSS
mesclado do chunk ainda traz o seletor cru (`..._body_834b7479_module_css_1igg3k2._.single.css`, de
17:20, linha 38: `[data-pl-reveal] {`), o chunk reescrito às 21:57 (`..._1gdgq2k._.css`) carrega **as
duas versões no mesmo arquivo**, e as duas cópias do cache (`.next/dev/cache` e `.next/cache`) guardam
a própria mensagem `is not pure`, de 17:20/17:26. Depois do restart das 22:43 **nenhum chunk CSS foi
reescrito** — o servidor não recompila, ele reproduz a falha antiga.

**Saída**: com o servidor parado, apagar `.next` — é cache derivado e a próxima subida reconstrói
(mais lenta na primeira vez):

```
Ctrl+C
node -e "require('fs').rmSync('.next',{recursive:true,force:true})"
npm run dev
```

A fonte está limpa (nenhum `global([` em `src/`) e o **build de produção** já saía correto: o
`.next/static/chunks/34tkvji681uxg.css`, gerado às 22:31, tem apenas o `.pl-landing [data-pl-reveal]`
escopado. Os dois testes de cópia — raiz própria com cache novo e com o cache real copiado preservando
mtime — compilam a mesma fonte sem erro: o cache do Turbopack **só vale no caminho original do
projeto**, e é por isso que só este `.next` adoece. Levantamento completo em
`artifacts/proposta-c/tmp/cache-envenenado-pos-fix.txt`.

**Nada mudou visualmente — provado em pixel.** A captura do checkpoint foi refeita no mesmo
protocolo (porta 3125, `reducedMotion=reduce`, `loading=eager`, `decode()` antes do shot) e
comparada com a de antes da correção: **15 de 15 arquivos byte a byte idênticos** (`deltaMax 0`, zero
pixels diferentes, em 390/1440/1920, nas dobras e nas páginas inteiras) —
`artifacts/proposta-c/tmp/nada-mudou-pos-fix.txt`, script `artifacts/proposta-c/tmp/diff-pos-fix.mjs`.
O gate de regressão do próprio script (topo 01–05 contra o checkpoint 2) seguiu em
`{"deltaMax":0,"pixelsDiferentes":0}`, e a geometria do `probe.json` bate com os números publicados
acima (altura 4344 @1920 e 5338 @390; seção 06 = 732; seção 07 = 767; cards 344×567 @1920 e 263×455
@1440).

### Comparações lado a lado

`comparison-06-community.png` e `comparison-07-rewards.png`. A prancha é folha de especificação
(blocos são miniaturas), então a comparação acontece na escala dela, com uma regra sem exceção: **a
referência entra 1:1 e a implementação é reduzida até a largura dela — nunca o contrário.** A
geometria da implementação não é digitada nos scripts: vem do `probe.json` que a captura escreve,
medido pelo próprio navegador.

- **06** — prancha "4. Casa e bem-estar" (mosaico 556×358, 1:1) × a foto da seção reduzida 958→556
  (0,58×); prancha "6. Mobile/comunidade" (fileira 820×252, 1:1) × a seção 06 a 390 CSS px (780px
  físicos, DPR 2, 1:1); e a seção completa em 1920, 1:1.
- **07** — prancha "2. Packshot de produtos" (263×272, 1:1) × o card "Produtos NUY" reduzido 344→263
  (0,76×); card "Recompensas reais" da prancha 6 (120×160, 1:1) × os cards 1 e 3 em 1:1; e a seção
  completa em 1920, 1:1.

As caixas da prancha foram lidas na régua de 100px e conferidas por
`scripts/pc-cp3-plate-check.mjs`, que **desenha cada caixa de volta na prancha** com coordenadas.
Duas não podiam sair de varredura automática e estão documentadas como leitura de régua: a fileira
mobile e o card "Recompensas reais" são **creme sobre creme** (~95% de calha clara), então nenhum
detector de faixa os encontra; e o mosaico do item 4 termina em `x=578` contra o banner navy — o
limite saiu de um corte 1:1 da junção 4|5, não de um palpite.

### Arquivos desta rodada

- `src/features/public-landing/components/community.tsx` — bloco **06**.
- `src/features/public-landing/components/rewards.tsx` — bloco **07** (larguras nativas 814×1086 e
  alts novos).
- `src/features/public-landing/styles/landing.module.css` — estilos dos dois blocos (o restante do
  arquivo é das áreas congeladas e não mudou de efeito: a prova é o diff de pixels).
- `tests/e2e/landing-visual.spec.ts` · `tests/e2e/landing-quality.spec.ts` ·
  `tests/e2e/experience-boundary.spec.ts`.
- `public/brand/nuy-creators-v2/rewards/{reward-products,reward-kits,reward-experiences}.webp`
  (recortes novos) e `public/brand/nuy-creators-v2/home/cozy-home.webp` (promovido a imagem do 06).
- `scripts/pc-cp3-assets.mjs` · `pc-capture-cp3.mjs` · `pc-compare-cp3.mjs` · `pc-cp3-plate-check.mjs`.

Nada em Auth, Appwrite, Functions, database, permissions, env, rotas protegidas ou área autenticada.
Nenhum arquivo de área congelada foi editado.

### Assets usados e procedência

| asset                             | nativo            | onde                  | origem                                                                                                            |
| --------------------------------- | ----------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `home/cozy-home.webp`             | 1672×941 (220 kB) | foto do 06 em 958×539 | asset da própria direção Proposta C; é o único que não aparece em nenhum outro bloco (sem repetição entre seções) |
| `rewards/reward-products.webp`    | 814×1086 (126 kB) | card 1                | recorte 3:4 **1:1 do nativo** de `products/products-floral.webp` (1448×1086), caixa `{380,0,814,1086}`            |
| `rewards/reward-kits.webp`        | 814×1086 (146 kB) | card 2                | recorte de `products/products-home.webp`, caixa `{634,0,814,1086}`                                                |
| `rewards/reward-experiences.webp` | 814×1086 (118 kB) | card 3                | recorte de `products/products-home.webp`, caixa `{0,0,814,1086}`                                                  |

Os recortes são 1:1 do bitmap de origem — nenhuma reamostragem na geração, e nenhum upscale no
servidor. Os cards 2 e 3 vêm da **mesma foto de origem** em regiões que não se sobrepõem; a
alternativa mais bonita (o recorte da mão segurando o frasco, 359px) não sustentava o slot de coluna
única em DPR 2 sem ampliar, e a regra do brief é reduzir o slot ou trocar a imagem — foi trocada.

Nenhum asset da landing antiga foi reaproveitado.

### Dados reais vs. placeholders

Todo o texto da página é HTML real e vem do brief — nada é imagem de texto. Não há número, data,
pontuação, prazo, participante, @ de perfil ou preço em pontos em nenhuma das duas seções. As fotos
são as imagens de campanha da própria marca (produtos e cenários), **sem pessoas geradas
apresentadas como creators**: a foto do 06 é um cenário de casa sem rosto, e os três cards do 07
mostram produto e ambiente.

### Pendências para o Checkpoint 4 (precisam do seu aval)

1. **`#conteudos` e `#faq` do header não têm destino** — o header congelado aponta para âncoras que
   ainda não existem (o `#cta-final` também está no plano). Fecham no CP4.
2. **`#comunidade` é o bloco 04** (Creators) e o bloco 06 tem id próprio `#manifesto`. Renomear o 06
   para `#comunidade` mexeria no congelado, então não fiz — mas o rótulo "Comunidade" do header hoje
   leva para os creators, não para o bloco que fala da comunidade.
3. **Os cards do 07 levam para `/cadastro`** — é a única ação honesta para um visitante deslogado.
4. **Assets de origem em `public/`** (`products-home`, `creators-reference`, `reference/*`) não são
   exibidos pela página: são insumos de build. Se você quiser um `public/` enxuto, eu digo o que sai.

Nenhum commit executado.
