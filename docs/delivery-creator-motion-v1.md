# Entrega — Sprint de motion design e fluidez (NUY Creators)

**Rodada:** motion v1 · **data:** 2026-10-09 · **árvore:** `master`, com as mudanças **sem commit**

**O que esta rodada fez:** a camada de movimento que faltava na área da creator — entrada de tela,
microinteração de sidebar/cartões/abas/botões, transição de estado e a abertura do painel mobile.
Nenhum redesenho: creme, navy, dourado, cartões editoriais, fotos reais e a organização da sidebar
seguem como a V2.1 aprovou.

**Status:** parado para **revisão de fluidez**. Não commitei e não empurrei nada.

---

## 1. Bibliotecas reutilizadas ou adicionadas

**Nenhuma biblioteca foi adicionada, e nenhuma foi usada.**

O `package.json` já trazia quatro dependências de movimento instaladas e **nunca importadas em
`src/`**: `motion ^14.0.0`, `gsap ^3.15.0`, `lenis ^1.3.26` e `swiper ^14.3.0`. Continuam
instaladas e continuam sem nenhum import — não foram removidas porque remover não é o pedido desta
rodada (a §1 diz "não instalar bibliotecas desnecessárias", não "limpar as que estão lá").

Há um motivo a mais para não usar o Lenis: `tests/e2e/landing-reveal.spec.ts:50-53` **proíbe** o
scroll suave dele de voltar, e o teste continua passando.

Todo o movimento é CSS puro: `transition`, `animation` e quatro keyframes. Zero componente client
novo, zero `IntersectionObserver` novo (o único que existe é o do reveal da landing, e não foi
tocado), zero `template.tsx`.

## 2. Tokens de movimento

Dentro de `.app` (`app.module.css:97`), junto de `--app-radius` e `--app-shadow`. Como o `/admin`
veste `.app`, ele herda os mesmos tokens — mas **não** herda a cascata de entrada (§3 abaixo), que
só existe nas telas da creator.

| token                 | valor                               | §2 pede                                                          |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `--app-motion-fast`   | `140ms`                             | FAST 120–160                                                     |
| `--app-motion-normal` | `210ms`                             | NORMAL 180–240                                                   |
| `--app-motion-reveal` | `360ms`                             | REVEAL 280–420                                                   |
| `--app-ease-out`      | `cubic-bezier(0.22, 0.61, 0.36, 1)` | a curva da casa (`--ease-premium`)                               |
| `--app-ease-state`    | `cubic-bezier(0.4, 0, 0.2, 1)`      | transição de estado                                              |
| `--app-rise`          | `6px`                               | o **menor** degrau da faixa 6–14: um cartão que sobe 6px assenta |
| `--app-step`          | `40ms`                              | passo da cascata                                                 |

Ambas as curvas são monotônicas — sem overshoot, sem elástico. Não há bounce, zoom exagerado,
paralaxe, glow nem animação infinita decorativa em lugar nenhum do diff.

A landing mantém a régua dela (`--motion-fast/base/slow` em `.landing`), que é mais lenta de
propósito e foi aprovada: nada empresta de lá, nada lá foi reescrito.

## 3. Animações por tela

Quatro keyframes, todos finitos e de uma passada só: `appRise` (só `transform`), `appFadeLift`
(opacidade + 6px), `appFade` (opacidade) e `appFill` (`scaleX` para a barra de progresso). A
cascata é uma família de classes — `.enter` mais `.i1`…`.i5` — e **nenhum elemento recebe `.enter`
dentro de outro `.enter`**: as amplitudes não se somam.

| tela                | o que entra na cascata                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/app`              | saudação (fora do Suspense) → faixa institucional → os três indicadores → atalhos → destaques → as duas colunas      |
| `/app/desafios`     | cabeçalho → abas → bloco da lista. O detalhe: cabeçalho → grade                                                      |
| `/app/conteudos`    | cabeçalho → abas → bloco → resumo dos envios                                                                         |
| `/app/pontos`       | cabeçalho → os dois cartões de saldo → "Sua jornada" → "Extrato"                                                     |
| `/app/recompensas`  | cabeçalho → saldo navy → nota → "Meus resgates", e a **cascata posicional** do catálogo (4 degraus por `:nth-child`) |
| `/app/ranking`      | cabeçalho → cartão de posição → destaques → classificação                                                            |
| `/app/notificacoes` | cabeçalho → nota → lista de avisos                                                                                   |
| `/app/perfil`       | cabeçalho → identidade → nota → presença → dados → edição → redes → preferências                                     |

Maior atraso de qualquer tela: **200ms**; a última região assenta em **560ms**. O primeiro conteúdo
já está pintado no primeiro quadro — a animação nunca segura a navegação.

**Microinterações:** `.navLink`/`.navIcon`/`.navBadge` (fundo, cor, opacidade), `.tab` (a pílula
navy _chega_ em vez de piscar), `.button` (4 propriedades + 1px de descida no `:active` — é o único
retorno que o dedo recebe no celular), `.challengeCard`/`.featureCard` (hover **e** `:focus-within`:
`translateY(-2px)`, borda e um degrau de sombra), `.cardMedia` (fade da caixa), `.progressBar`
(`appFill`), `.notif` (transição de `background-color`), `.input` (borda no foco), `.formStatus`
(fade ao chegar), e o `<details>` do perfil animando com `interpolate-size` + `::details-content`.

## 4. Transições de navegação entre páginas

O achado da auditoria (§1) decide esta seção: **a casca nunca remonta.** Sidebar, topbar, barra
inferior e faixa de aviso vivem em `app-shell.tsx`, renderizados pelo `layout.tsx` da rota — e não
existe `template.tsx` no projeto. Sidebar e header estáveis por construção, como a §3 pede.

**A entrada é só deslocamento, não fade, e isto é deliberado — com a exceção registrada abaixo.**
Toda tela que não é o painel está **inteira dentro de um `<Suspense>`** que substitui um esqueleto
na mesma região. Se a região entrasse com `opacity: 0`, o esqueleto sairia e o conteúdo ficaria
transparente no mesmo lugar: abriria um vão claro onde havia esqueleto. Por isso o estado escondido
mora **exclusivamente no `from` do keyframe** — onde a animação não roda, a região nasce visível e
no lugar.

Isto é um **desvio literal** da §3 ("entrada com fade + deslocamento mínimo"). O fade ficou onde é
seguro: a saudação do painel (o `DashboardHero` fica fora do Suspense), a folha "Mais", o menu da
identidade, a mensagem de ação e a foto chegando na moldura já reservada. **É o primeiro ponto a
revisitar se o vídeo não convencer.**

Trocar de aba **não** re-anima: `?aba=` é o mesmo segmento de rota e o React reaproveita os mesmos
nós de `ScreenHeader` e `Tabs`. Nenhum formulário é desmontado; nenhuma confirmação já corrigida
volta a sumir.

## 5. Experiência mobile

- **Painel "Mais":** entra com `appFadeLift` e um degrau de 14px (a folha nasce da borda inferior —
  6px não contariam de onde ela veio; 14 ainda está dentro da faixa). O véu entra com `appFade`.
- **Barra inferior:** transição de fundo/cor e resposta do ícone no estado de repouso.
- **Botões:** o `:active` de 1px é o retorno visível no toque.
- Escape, fechar na navegação e fechar no clique fora **já existiam** e não foram tocados.
- Nada foi escondido atrás da barra inferior e o toque não passou a ser interceptado — o `overflow`
  horizontal mede 0px em 390px (sonda abaixo).

## 6. Comportamento com `prefers-reduced-motion`

O kill switch global (`globals.css:119-127`) zera `animation`, `transition` e `scroll-behavior`. Ele
não alcança **pseudo-elementos** — `*, *::before, *::after` não casa com `::details-content`. A
landing já tinha o remédio para o FAQ dela; a abertura do editor do perfil ganhou o mesmo, junto da
regra que o criou (`app.module.css:2976`), com `transition-duration: 0s` exato — o contrato medido
pelos testes exige zero, não `0.01ms`.

A abertura do painel mobile da landing é declarada sob `@media (prefers-reduced-motion:
no-preference)`, o idioma que a landing já usa na pílula do header.

Medido, não afirmado (sonda de repouso, §8): sob `reduce`, **zero** `transform` residual nas oito
telas e **nenhuma** animação rodando — e o conteúdo inteiro continua lá (`/app` segue dizendo
"Pontos disponíveis"). A suíte `authenticated-app.spec.ts:280-313` prova o mesmo pelo lado do
contrato: a transição existe sem a preferência e é `0s` com ela.

## 7. Resultado de performance

Medido com `requestAnimationFrame` em Chromium **visível** (GPU real; headless em software engasga),
contra o build de produção, ao lado de cada vídeo. Dados brutos em
`artifacts/creator-motion-v1/quadros.json`.

| clipe              | quadros | p50    | p95    | pior quadro | onde os engasgos caem                 |
| ------------------ | ------- | ------ | ------ | ----------- | ------------------------------------- |
| A painel           | 147     | 16.7ms | 17.2ms | 66.6ms      | 67–383ms (primeira pintura + cascata) |
| B navegação        | 839     | 16.7ms | 16.9ms | 183.1ms     | nas trocas de rota (RSC + Suspense)   |
| C hover nos cards  | 296     | 16.7ms | 16.9ms | **33.3ms**  | nenhum quadro acima de dois a 60Hz    |
| D abas             | 408     | 16.7ms | 16.9ms | 66.5ms      | 67ms (carga) e 2831ms (troca de aba)  |
| E recompensas      | 279     | 16.7ms | 17ms   | 49.9ms      | 2449ms (rolagem/navegação)            |
| F "Mais" no mobile | 402     | 16.7ms | 17ms   | **33.4ms**  | nenhum                                |
| G landing          | 570     | 16.7ms | 16.8ms | 133.3ms     | primeiros 500ms (fotos do hero)       |
| R reduce           | 325     | 16.7ms | 17ms   | **33.4ms**  | nenhum                                |

p50 de **16,7ms em todos os clipes** — 60Hz travado. E a localização dos picos diz o que importa: as
animações desta rodada (hover, painel "Mais", abas, cascata sob `reduce`) **não têm um único quadro
acima de dois a 60Hz**. Os picos estão na primeira pintura (imagens carregando) e na troca de rota
(buscar o payload do servidor) — trabalho que existia antes desta rodada e que animação nenhuma
resolve. Só `transform` e `opacity` são animados; `width`, `height`, `top` e `left` não são animados
em lugar nenhum, e o `box-shadow` transita apenas por um degrau curto no hover.

## 8. Vídeos de demonstração

Em `artifacts/creator-motion-v1/` (área ignorada pelo git), gravados com `recordVideo` do Playwright
em Chromium visível, 1440×900 e 390×844:

| arquivo                     | §19 | o que mostra                                                        |
| --------------------------- | --- | ------------------------------------------------------------------- |
| `a-painel-1440.webm`        | A   | painel carregando: saudação, faixa, indicadores, destaques, colunas |
| `b-navegacao-1440.webm`     | B   | as oito telas, clicadas na sidebar                                  |
| `c-cards-hover-1440.webm`   | C   | hover nos cartões de desafio e no catálogo de recompensas           |
| `d-abas-desafios-1440.webm` | D   | as quatro abas, e a lista que **não** re-anima                      |
| `e-recompensas-1440.webm`   | E   | catálogo, cascata posicional e rolagem                              |
| `f-mais-390.webm`           | F   | abrir, fechar por Escape, reabrir e sair por um destino             |
| `g-landing-1440.webm`       | G   | rolagem e reveal por seção da landing                               |
| `r-reduce-1440.webm`        | §15 | o mesmo app com `reducedMotion: 'reduce'`                           |

O roteiro que os gera é `scripts/capture-motion-v1.mjs` (novo, não commitado). Ele sobe a mesma
pilha da suíte autenticada — stub de Appwrite + build de produção + proxy HTTPS — e entra com uma
usuária de fixture pelo formulário de login: **nenhuma senha real passa por aqui.**

**Sondas de repouso** (mesmo arquivo, `quadros.json → sondas`), nas oito telas, em 1440, 390 e sob
`reduce`:

- **`transform` residual = 0** — e **0 animações rodando** em repouso, nas três passagens: nada
  desta rodada é infinito nem decorativo.
- **Nenhum estouro horizontal.** Em 390px a medida é `0`; em 1440px ela é `−15px`, que é a barra de
  rolagem vertical (o conteúdo útil é 15px mais estreito que a viewport) — negativo aqui é o valor
  saudável, e o teto do contrato que a suíte afere é `≤ 1`.
- O número de elementos com entrada por tela confere com o desenhado: `7/3/4/4/4/4/3/7`.

## 9. Regressões

**Uma, encontrada pela própria sonda e corrigida nesta rodada — vale entender, porque era silenciosa.**

As animações começaram com `animation-fill-mode: both`. Os keyframes terminam em `transform: none`,
e isso _parece_ suficiente para não deixar resíduo. Não é: o Chrome **interpola `none` como matriz
identidade**, e com `both` essa matriz permanece aplicada **para sempre** depois que a animação
acaba. Resultado medido: **todos** os elementos de entrada ficavam com
`transform: matrix(1, 0, 0, 1, 0, 0)` no repouso.

Um `transform` residual não é invisível: ele cria **contexto de pilha** e **bloco contentor**. Um
`position: fixed` dentro de um cartão passaria a se posicionar pelo cartão. Nada quebra hoje — a
sonda mede 0 residual agora — mas era uma armadilha armada para a próxima tela.

A correção é `animation-fill-mode: backwards` nas sete declarações que animam `transform`: o
`backwards` segura o `from` durante o atraso (é ele que faz o degrau da cascata existir) e, ao
terminar, **devolve o repouso ao CSS**. Re-medido depois da correção: residual 0 nas três passagens.

**Nenhuma regressão funcional:** nenhum teste existente foi enfraquecido ou afrouxado, e as três
suítes que medem movimento passaram sem alteração —
`authenticated-app.spec.ts:280-313` (reduce), `:315-327` (overflow ≤1px em 8 larguras × 8 rotas) e
`image-chain.spec.ts:71-77` (`naturalWidth` das imagens de catálogo).

## 10. Testes

Todos sobre o estado final do CSS (as suítes foram re-rodadas depois da correção do item 9).

| suíte                                                              | resultado                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `git diff --check`                                                 | limpo (0 erros de espaço em branco; só os avisos de LF→CRLF do Windows) |
| `npm run typecheck`                                                | **0 erros**                                                             |
| `npm test` (vitest)                                                | **187 passam** (22 arquivos)                                            |
| `npm run lint` (ESLint, arquivos alterados)                        | **0 erros**, 1 aviso **pré-existente**                                  |
| `prettier --check` (arquivos alterados)                            | reprova `landing.module.css` — **pré-existente**                        |
| `npm run test:e2e` (landing pública)                               | **58 passam**, 14 pulados por projeto                                   |
| `npm run test:e2e:app`                                             | **21 passam**                                                           |
| `npm run test:integration` (`APPWRITE_RUN_INTEGRATION_TESTS=true`) | **80 passam** (3 arquivos), contra o backend vivo — nas duas execuções  |
| `npm run build`                                                    | **sucesso**                                                             |

A suíte de integração rodou duas vezes contra o backend vivo: **80/80 em 494,83s** antes da correção
do item 9 e **80/80 em 460,75s** depois dela. Não foi otimismo — `tests/integration/*.ts` não importa
**nenhum** `.css` e **nenhum** `.tsx` (só `vitest`, `node-appwrite`, `node:*`, `infra/appwrite/*` e
`src/lib/**`), então a mudança de folha de estilo não tem caminho para alcançá-la; a segunda execução
existe para não deixar isso como argumento. A primeira das duas levou 20 minutos a mais do que o
relógio de parede sugeria e as sondas de CPU mostravam todos os processos pais em 0% — pareceu
travamento e era só espera de rede; o `exit:0` desmentiu.

Os dois achados do lint/formatação são **anteriores a esta rodada** e foram verificados como tais, não
presumidos: `RewardCard` já era import morto em `HEAD` (`git show HEAD:…/dashboard-screen.tsx` só
encontra a linha do import), e o Prettier **já reprovava** a versão de `HEAD` de
`landing.module.css` (dois blocos antigos, nas linhas 634 e 1421, sem relação com o que esta rodada
escreveu). Não reformatei nem "consertei" nenhum dos dois: as duas correções seriam churn fora do
escopo num diff que você vai revisar linha a linha. Ficam registrados como recomendação.

## 11. Arquivos alterados

13 arquivos, **+445 / −35**. Nenhum arquivo fora de `src/features/workspace/**` e
`src/features/public-landing/styles/landing.module.css` foi tocado.

| arquivo                                         | o que mudou                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `workspace/styles/app.module.css`               | os tokens, os 4 keyframes, a família `.enter`/`.i1`–`.i5`, e as microinterações — o corpo da rodada           |
| `workspace/components/dashboard-screen.tsx`     | cascata do painel                                                                                             |
| `workspace/components/challenges-screen.tsx`    | cascata da lista e do detalhe                                                                                 |
| `workspace/components/contents-screen.tsx`      | cascata                                                                                                       |
| `workspace/components/points-screen.tsx`        | cascata                                                                                                       |
| `workspace/components/rewards-screen.tsx`       | cascata                                                                                                       |
| `workspace/components/ranking-screen.tsx`       | cascata                                                                                                       |
| `workspace/components/notifications-screen.tsx` | cascata                                                                                                       |
| `workspace/components/profile-screen.tsx`       | cascata                                                                                                       |
| `workspace/components/ui/screen.tsx`            | `ScreenHeader` passa a aceitar `className`                                                                    |
| `workspace/components/ui/tabs.tsx`              | `Tabs` passa a aceitar `className`                                                                            |
| `workspace/components/core-forms.tsx`           | `key` na mensagem de ação, para o fade tocar quando o estado muda (única mudança estrutural de JSX da rodada) |
| `public-landing/styles/landing.module.css`      | **+10 linhas**: a abertura do painel mobile, que era a única ausência da §14                                  |

`ScreenHeader` e `Tabs` ganharam `className` **opcional**, como `Block` e `Card` já aceitavam. As 16
chamadas do `/admin` (13 de `ScreenHeader`, 3 de `Tabs`) não passam nada e ficaram byte a byte como
estavam — conferido por `grep`: zero `className` passado no admin. **Nenhum Server Component virou
Client Component** para animar.

E o que a §17 congela continua congelado: nenhuma rota, consulta, schema, ponto, estoque, resgate,
regra de status ou server action foi tocada. Não foi preciso parar e perguntar porque **nenhuma
animação exigiu mudar lógica**.

### Um ajuste na landing, e o que a §14 preservou

A §14 diz "se já existir animação equivalente: PRESERVAR. Não duplicar efeitos." O inventário
mostrou que título, CTA, composição de produtos, cards, benefícios, reveal por seção, FAQ e botões
**já tinham** movimento. A única ausência era a abertura do painel de navegação mobile, que passou a
usar o `plHeaderIn` **já existente** — o mesmo keyframe da pílula do header, na duração mais curta
da régua da landing (220ms; um menu que espera meio segundo para abrir parece travado). Nenhum
efeito duplicado, nada redesenhado.

### Fora de escopo — achados para relatar, não para consertar

- `auth-access.module.css` tem **9 transições em 6 durações soltas** (0.2/0.25/0.28/0.3/0.32/0.4) e
  a bezier da casa copiada 4×. A §17 congela **Auth**; não foi tocado.
- `.sidebar` é `position: sticky; height: 100dvh` **sem `overflow-y`**: em viewport baixa a navegação
  pode cortar sem rolagem própria. A §4 proíbe mexer na sidebar, e não é assunto de movimento.
- `button.tsx` (`src/components/ui/`) é **código morto** — ninguém importa.
- `app-surface.css:15` lê `var(--nuy-app-focus)`, que **não existe em lugar nenhum** (o token real é
  `--app-focus`). Vale pelo fallback.
- `.mobileNavLink` da landing (hover) troca de fundo **sem transição**. Não estava na §14 nem no
  plano; preferi não acrescentar movimento por conta própria numa página aprovada. Fica a um `git
diff` de distância se você quiser.

## 12. `git status`

```
 M src/features/public-landing/styles/landing.module.css
 M src/features/workspace/components/challenges-screen.tsx
 M src/features/workspace/components/contents-screen.tsx
 M src/features/workspace/components/core-forms.tsx
 M src/features/workspace/components/dashboard-screen.tsx
 M src/features/workspace/components/notifications-screen.tsx
 M src/features/workspace/components/points-screen.tsx
 M src/features/workspace/components/profile-screen.tsx
 M src/features/workspace/components/ranking-screen.tsx
 M src/features/workspace/components/rewards-screen.tsx
 M src/features/workspace/components/ui/screen.tsx
 M src/features/workspace/components/ui/tabs.tsx
 M src/features/workspace/styles/app.module.css
?? scripts/capture-motion-v1.mjs
```

A rodada anterior (imagens de recompensas) **já foi commitada** — `6750757 creators`. A árvore tem
só o motion. `artifacts/` é ignorado pelo git, então os vídeos e o `quadros.json` não aparecem aqui.

---

## Para revisar a fluidez

1. Abra `artifacts/creator-motion-v1/b-navegacao-1440.webm` e `f-mais-390.webm` — são os que mais
   dizem sobre a sensação.
2. `c-cards-hover-1440.webm` mostra o hover sem nenhum vizinho se mexer.
3. `r-reduce-1440.webm` é o controle: mesma interface, sem movimento.
4. `quadros.json` tem os números por clipe, com a posição de cada engasgo.

**Não commitei, não empurrei. Parado para revisão.**
