# Rodada final de polimento visual — NUY Creators (entrega)

> Escopo: exclusivamente acabamento visual e correção de bugs na home pública.
> Toque: **zero** em Appwrite, Auth, Functions, banco, permissões, env e rotas
> autenticadas. A arquitetura da home e a copy principal foram preservadas.
>
> **Nenhum commit foi executado** — a revisão visual fica para quando desejar.

## 1. Lockup NUY / CREATORS

Submarca em estrutura vertical em todos os contextos (`<div class="brand-lockup">`):

- `src/components/layout/header.tsx` — `Link` agora carrega `wordmark brand-lockup`; o
  elemento interno é mantido (imagem do lettering na variante editorial, texto na do
  texto).
- `src/styles/globals.css` — `.wordmark` virou coluna: logo em cima, `CREATORS`
  ~9–10px (0.6rem), uppercase, tracking 0.34em, alinhado à esquerda com o lettering,
  sem o antigo filete (`border-left`).
- Alinhamento óptico: o lettering PNG (`nuy-wordmark-hi.png`, tinta com margens
  esquerda 26 / direita 37 sobre 384px) recebeu `margin-left: 0.5cqw` no artboard do
  hero (26/384 × 7.4cqw) para o primeiro C alinhar com o n ascendente.
- Variantes: `hero-artboard.module.css` (0.56cqw no desktop), `auth-experience.module.css`
  (9px, mobile 7.5px) e o mobile do header público (7.5px), proporcional conforme o
  brief.
- Gate E2E novo: estrutura (logo + span), texto exatamente `CREATORS`, rótulo entre
  7–12px e empilhado **abaixo** do logo.

## 2. Header editorial

- Navegação centralizou verticalmente dentro do shell (`top: 50%`,
  `translateY(-50%)`), gap editorial de 2.6cqw, tracking 0.02em.
- Hover: o item esquenta para `#f4ead2` e um fio de 1px nasce da esquerda e corre
  até 100% (gradiente ouro→violeta) — sem sublinhado permanente (removido o
  `border-bottom` fixo que ficava em "O projeto").
- Ações à direita flex absolutas (Entrar; "Fazer parte" pill sem quebrar em duas
  linhas — bloco absoluto antigo e um `display: contents` remanescente eram a causa).
- Limpeza: `public-header.module.css` perdeu o posicionamento absoluto legado.

## 3. Textos de desenvolvimento

Confirmado que os quatro textos existem apenas sob `process.env.NODE_ENV ===
'development'` / `isDevelopment`: "Composição conceitual · referência visual, não
fotografia oficial" (hero), "Composição conceitual NUY." (auth), "Inspiração visual ·
categorias, não ofertas disponíveis." (experiências) e "Arte conceitual · não é
fotografia de creator publicado." (CTA final). Nenhum aparece em produção; um gate
E2E já impede o regresso.

## 4. Fio de ouro do Como funciona — **bug de raiz corrigido**

A linha que atravessava números e textos — inclusive reaparecendo na seção
"Para quem é" — tinha **uma** causa: o SVG do conector (`viewBox 0 0 100 100`,
proporção intrínseca 1:1) era dimensionado só por `inset`, e um elemento
substituto absoluto resolve a altura pela razão intrínseca, não pelo bloco. Resultado
medido: caixa de **853×853px** para um bloco de 271px; com `overflow: visible`, a
metade inferior do caminho pintava ~600px abaixo, atravessando Níveis e Para quem.

- Correção: `top/left` + `width: 103%; height: 101%` explícitos → caixa real
  **852.8×274.6** (verificada viva). O caminho agora segue só as costuras:
  border-tops dos passos, subida no vão entre colunas, descida pela faixa externa
  direita e volta pela costura inferior — `vector-effect: non-scaling-stroke`
  (corrige também o warning `Invalid DOM property vector-effect`).
- Os `li` empilham acima do SVG (`z-index` 1 vs 0) e o stroke é 1px a 55% de
  opacidade.
- Gate E2E novo: amostragem de 140 pontos por path dos dois conectores contra os
  retângulos de **todo** texto das seções — zero interseções.

## 5. Jornada (níveis)

- Caminho redesenhado com base em **medição viva** dos centros dos halos
  (x 9.8/29.9/50.0/70.1/90.2%), entrando e saindo pela metade de cada círculo — os
  halos opacos cobrem as emendas e o fio não toca os nomes, que ficam abaixo.
- No mobile (≤760) o traço horizontal some e entra o percurso vertical em ziguezague
  (já existente, validado no 390).

## 6. Experiências (opção B)

- Recorte editorial editado em **resolução nativa** do `product-concept.webp`
  (688×880 — mesma composição produto+flores do hero, outro enquadramento, sem
  repetir o hero): `public/brand/reference/experience-editorial-688.webp`, afiado
  (sigma 0.6), webp q94, sem nenhum texto embutido.
- Nítido no tamanho exibido (≤460px); gate E2E verifica o bitmap servido ≥ pixels
  exibidos (DPR 1) e recusa o asset antigo ampliado.
- O caption "Inspiração visual…" continua apenas no development mode.

## 7. Flor de "O projeto"

Agora ela **invade pela borda direita** da viewport (`right: -6.5%`), sangra fora do
papel (clipped no wrapper raiz), entra emplumada por máscara linear dupla
(interseção horizontal/vertical) — sem oval, sem sombra, sem aparência de recorte
colado. Verificado que o `scrollWidth` permanece igual à viewport.

## 8. Para quem é (hover)

Estrutura mantida, sem cards. No hover (desktop): o texto aquece para `#f6eedd`, a
costura ganha intensidade (`border-bottom-color` sobe) e um fio da borda desenha a
linha ao longo dela (gradiente violeta→dourado, `width 0 → 100%`,
`cubic-bezier` suave) enquanto o microtexto contextual surge à direita. Altura das
linhas inalterada.

## 9. Benefícios

- Ícones dentro de **círculos hairline** dourados (mesma linguagem dos halos ✧ da
  jornada) — hierarquia visual consistente, sem virar cards.
- Alinhamentos: `align-items: flex-start`, gap ícone-texto 14→16px, `line-height` do
  título 1.3, corpo `#c8c4d2` 1.65 — contraste e respiro melhores.
- Grade: gap 36×44 entre células; os seis benefícios preservados.

## 10. FAQ (−22,3%)

- **670.8 → 521px** fechado (alvo do brief: −20–25%): itens de 64px para 50.5px
  (resumo 15px, padding 13px, glifo `+` com `line-height: 1`), resposta mais rente
  (margem-topo 12px, padding-bottom 14px) e paddings de seção 52/72px.
- Interações: `+` gira 45° e vira `×`; abertura anima altura
  (`::details-content` height + `content-visibility`, já presente) e a resposta entra
  com micro-fade (`faq-reveal`).
- Título à esquerda / acordeão à direita mantidos; teto E2E do FAQ abaixou de 820
  para 560px para travar a compactação.

## 11. CTA final

- Descoberta importante: os blocos `acquisition` para `.finalPortrait`/`.finalCopy`
  eram **código morto** — o `img`/`div` carregam só as classes do `landing.module.css`,
  cuja regra absoluta antiga (`left: 25%; bottom: -18%; z-index: -1`) vencia; esse era
  o "retrato em cima do texto".
- As duas classes agora também vinham do `acquisition` e a composição ficou:
  copy na coluna 1, retrato na coluna 2 (`grid-column` explícitos), in-flow,
  `max-height: 88%` — **0px de sobreposição título×imagem** (verificado por
  retângulos), contraste do texto agora é só sobre o navy.
- Máscara elíptica suaviza o recorte; `line-height` do título já segue 1.12;
  botões a 48px de altura com gap 14px.
- No mobile o retrato agora fica empilhado abaixo do copy (grid-row 2) — antes o
  `grid-column: 2` criava uma coluna implícita e o retrato ficava invisível.

## 12. Tipografia (7+ headings)

- `line-height` dos `h2` do fluxo: **1.06 → 1.12**. Em 1920px nenhuma colisão de
  tinta existia ainda (verificado com zoom 2× em todos os headings), mas a folga
  entre a cedilha de "participação" e a linha seguinte era de ~4px — frágil para
  Bodoni. 1.12 respira em qualquer tamanho e não altera o caráter do layout.
- `text-wrap: balance` presente em todos; `overflow` visível (nenhum glifo escondido
  — gate E2E de corte segue passando); `overflow-wrap: break-word` como rede.

## 13. Transições entre seções

O fio de ouro das margens do hero cruza todas as costuras creme↔navy
(`/como-funciona`, `/experiencias`, FAQ — sempre sangrando 26px sobre a superfície
anterior, opacidade 0.38) e um halo de 46px da cor que chega remove o corte seco
(creme sobre navy em como/faq; navy sobre creme em experiências). Sem grandes ondas;
"O projeto" já tinha o fio no fold hero→creme.

## Os "2 Issues" do badge de desenvolvimento

Investigados na fonte (`.next/dev/logs/next-development.log`); **nada foi escondido**.

1. **`Invalid DOM property "vector-effect"` (Server + Browser)** — problema real da
   aplicação: o JSX usava o atributo HTML em kebab-case; React 19 exige camelCase
   para props DOM. Corrigido em `how-it-works.tsx` (`vectorEffect=
"non-scaling-stroke"`).
2. **Hydration mismatch `<body cz-shortcut-listen="true">`** — **não é a aplicação.**
   É a extensão de navegador **ColorZilla** que injeta o atributo em `<body>`; o
   React compara o HTML do servidor com o DOM já modificado pela extensão. Reproduz
   em qualquer página React com essa extensão ativa. Provar: abrir a página em janela
   anônima ou perfil limpo (sem extensões) — o aviso não aparece. Não há nada a
   corrigir no código.

## Screenshots (`artifacts/delivery/`)

Full page: `full-1920.png`, `full-1440.png`, `full-390.png`, `full-375.png` —
sem overflow horizontal em nenhum (scrollWidth == viewport).

Crops 1920 e 1440: `ent-header`, `ent-como-funciona`, `ent-jornada`, `ent-experiencias`,
`ent-faq`, `ent-final` (× 2 larguras) + mobile full em DPR 2.

## Arquivos alterados (rodada final)

| Arquivo                                                      | Mudança                                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/community/components/how-it-works.tsx`         | `vectorEffect`; caminho do fio por costuras medidas                                                                                     |
| `src/features/community/components/landing.module.css`       | caixa do howLine (bug raiz), heroCopy mobile, journeyLine, limpeza                                                                      |
| `src/features/community/components/acquisition.module.css`   | hover Para-quem, Benefícios, FAQ compacto, `h2` 1.12, CTA final, costuras                                                               |
| `src/features/community/components/landing.tsx`              | asset Experiências; vínculo de classes do retrato/copy                                                                                  |
| `src/features/community/components/levels-section.tsx`       | caminho da jornada pelos halos                                                                                                          |
| `src/components/layout/header.tsx`                           | classe `brand-lockup`                                                                                                                   |
| `src/styles/globals.css`                                     | lockup vertical; animação `faq-reveal`                                                                                                  |
| `src/features/auth/components/auth-experience.module.css`    | lockup vertical (auth)                                                                                                                  |
| `src/features/community/components/hero-artboard.module.css` | submarina, nav/hover, ações                                                                                                             |
| `src/components/layout/public-header.module.css`             | remessa regra absoluta legada                                                                                                           |
| `public/brand/reference/experience-editorial-688.webp`       | asset novo (688×880 nativo)                                                                                                             |
| `scripts/measurement/shots`                                  | `measure-lines-geometry`, `delivery-shots`, `next-grids`, `extract-experience-editorial`, `probe-dev-overlay`, `audit-section-captures` |
| `tests/e2e/landing-quality.spec.ts`                          | gates: fios×texto, lockup, FAQ 560, asset editorial                                                                                     |

## Validação

| Gate                                                   | Resultado                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `npm run typecheck`                                    | ✅ sem erros                                                                 |
| `npm run test` (Vitest)                                | ✅ 44/44                                                                     |
| `npm run lint` (ESLint)                                | ✅ 0 erros (1 warning preexistente em script utilitário)                     |
| `npm run format:check` (Prettier)                      | ✅                                                                           |
| `npm run build` (produção)                             | ✅ 21 rotas                                                                  |
| `playwright test --config=playwright.visual.config.ts` | ✅ 46 passed, 12 skipped (incl. gates novos: fios×texto, lockup, FAQ, asset) |

Mobile 390/375: sem overflow, lockup proporcional, como-funciona/fio desligado e
jornada vertical, retrato do CTA empilhado e visível.

**Nenhum commit executado.**
