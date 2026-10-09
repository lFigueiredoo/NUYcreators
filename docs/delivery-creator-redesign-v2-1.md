# Entrega — Polimento visual final V2.1 (NUY Creators)

**Rodada:** V2.1 · **data:** 2026-10-08 · **árvore:** `master`, com as mudanças da rodada **sem commit**

**O que esta rodada fez:** os quatro itens pedidos, nas telas já aprovadas. Nada de redesenho:
shell/sidebar/header, Meus conteúdos, Pontos, Ranking, Notificações, Perfil e a responsividade da
navegação continuam como a revisão da V2 aprovou.

**Status:** parado para **aprovação visual final**. Não commitei e não empurrei nada.

---

## 0. Limites respeitados

| não alterado | como dá para conferir |
| --- | --- |
| Backend, Appwrite, esquemas, enums, payloads | nenhum arquivo fora de `src/app/(protected)/app/**`, `src/features/workspace/**`, `src/styles/app-surface.css` e os dois specs de app foi tocado (`git diff --name-only`) |
| Pontos, Ranking, Resgates, Moderação, Permissões | nenhuma rota, comando ou consulta dessas áreas mudou. Em `commands.ts` mudou **uma frase** — a mensagem de `window_closed`, que era falsa para o desafio que ainda não começou (§4) |
| Admin e Landing pública | zero arquivos em `src/app/(protected)/admin/**` e `src/features/public-landing/**` no diff |
| Rotas | nenhuma rota nova, nenhum caminho renomeado |
| Dados de QA preservados para revisão humana | as 2 recompensas e os 2 resgates do staging seguem intactos (`_auditoria-2.log`, `_limpeza-verificacao.log`) |
| Fotografias | nenhuma imagem foi criada, gerada ou substituída nesta rodada |

---

## 1. Primeiro acesso ao painel

**Antes (V2):** o herói era uma **caixa branca** com um ícone laranja pequeno no meio — a mesma
caixa vazia em qualquer tela, sem a marca e sem dizer em que ponto da jornada a creator está.

**Depois (V2.1):** a **faixa institucional navy com o packshot real** — a mesma composição que a
creator com jornada já vê —, agora também para quem acabou de se cadastrar. A foto do packshot vem
do acervo da marca (`public/brand/nuy-creators-v2/products/products-floral.webp`); nenhuma imagem
foi gerada:

- selo **Primeiros passos**;
- **"Sua jornada começa aqui."** (mantido);
- **"Ainda sem Pontos NUY — eles entram com o primeiro aprovado."** — o vazio dito como vazio;
- **"Seus pontos de jornada definem seu nível e não diminuem."** — a regra, no lugar do número que
  ainda não existe;
- o destaque honesto do momento: *"QA — Desafio de revisão visual está aberto — 250 Pontos NUY
  quando o conteúdo for aprovado."*;
- **"Explorar desafios"**, o mesmo CTA de antes.

**Nenhum número inventado:** a sonda lê **0 cartões de indicador** na tela de primeiro acesso
(`sonda.json` → `auditarPrimeiroAcesso`). Saldo, posição e pontos de jornada não aparecem como zero
— simplesmente não aparecem, porque não existem ainda.

Folha: `artifacts/creator-redesign-v2-1/comparacao/ajuste-1-primeiro-acesso.png`

---

## 2. Fallbacks de imagem

Dois casos, um desenho só (`CoverFallback`, em `src/features/workspace/components/ui/card.tsx`):

1. **a linha não tem imagem publicada** (`fileId` nulo);
2. **o arquivo não pôde ser entregue** (404, arquivo removido, bucket fora do ar) — o `CatalogMedia`
   cai no mesmo lugar por `onError` **e** por leitura do DOM depois do commit, porque o 404 volta
   antes de o React hidratar e o evento chegaria sem listener.

A composição é de identidade, não foto: **navy com brilho dourado no topo**, ícone em anel dourado,
lockup "NUY Creators" e régua. Em nenhum lugar a tela diz "imagem ainda não publicada" — *o que o
item é* continua dito pelo nome, no corpo do cartão, logo abaixo. Nas miniaturas de 56 px das listas
o desenho continua sendo a **inicial do nome**, que naquele tamanho lê melhor.

**Tamanho consistente entre cartões — medido, não estimado** (`_medir-midias.log`, DOM no staging):

| tela | com foto | com a capa institucional |
| --- | --- | --- |
| cartão de desafio · 1440 | 361×203 | **361×203** |
| cartão de desafio · 390 | 348×196 | **348×196** |
| cartão de recompensa · 1440 | 546×410 | **546×410** |
| cartão de recompensa · 390 | 348×232 | **348×232** |

10 caixas com a capa institucional e 6 com foto, **nenhuma vazia, nenhuma quebrada** em 24 telas.

**Uma diferença que existe de propósito, e fica registrada:** no **detalhe**, o herói com foto mede
1120×374 (1440) / 350×220 (390) e o herói com a capa institucional mede **1120×274** / 350×200 — o
`aspect-ratio` não convive com `max-height` nesse bloco (o navegador encolhe a largura junto), então
o detalhe usa altura declarada: `clamp(220px, 26vw, 400px)` com foto e `clamp(200px, 19vw, 300px)`
sem. A capa institucional é **~100 px mais baixa** no desktop porque ali não há cartão vizinho para
alinhar — na grade as caixas são idênticas, como a tabela acima mostra.

**Contrato funcional preservado.** `tests/e2e-app/image-chain.spec.ts` mudou de texto e de alvo
(`[class*="cardMedia"]`, a moldura, em vez da variante de um dos cartões), não de exigência:

> sem imagem, com arquivo indisponível ou com id que o catálogo não referencia → a UI mostra a capa
> institucional, **nunca ícone quebrado**; a rota `/app/midia/<id>` não vira oráculo de leitura do
> bucket e não é servida a quem não tem sessão.

Os 7 testes continuam passando, agora contra o novo desenho.

Folhas: `comparacao/ajuste-2-fallback-desafios.png` · `comparacao/ajuste-2-fallback-detalhe.png`

---

## 3. Vitrine de recompensas — o que existe, e a proposta

**Veredito: não há correspondência.** As 12 fotos oficiais do repositório são packshots e cenas de
produto; nenhuma recompensa publicada descreve um deles. As **duas** recompensas do staging dizem,
com todas as letras, *"Registro de QA — não é um prêmio real"*, e as quatro da fixture falam de um
kit, uma mentoria, uma caneca e uma vaga. Dar a foto de um sabonete a qualquer uma delas seria
transformar registro de QA em anúncio — então **nenhuma foto foi ligada a nenhuma recompensa
existente**.

O que existe no lugar é uma **proposta de fixture**, puramente aditiva (**+130 / −0**): seis linhas
de QA, cada uma com o produto **que está na foto**, com o par foto↔produto autorizado pelo **rótulo
impresso na embalagem**, lido em ampliação 4× (`rotulos/*-4x.png`) — seis dos sete nomes de arquivo
conferem; a sétima foto (frasco vermelho, 157×354) **não permite ler o nome**, e por isso a
recompensa que a usa **não afirma fragrância nenhuma**: chama-se "Limpador perfumado NUY 125 ml —
versão vermelha".

A proposta mostra os três estados reais da vitrine — ao alcance, acima do saldo e **esgotado** —
e foi demonstrada contra o **stub de teste** (as fotos vêm do repositório; a rota de mídia e o
controle de acesso não mudam). Os dois arquivos de fixture foram **revertidos**: a proposta está
guardada como patch.

- `artifacts/creator-redesign-v2-1/proposta-vitrine/NOTAS.md` — a auditoria completa;
- `…/proposta-fixture.diff` — o patch pronto para aplicar, se aprovado;
- `…/vitrine-com-fotos-{desktop,mobile}.png` · `…/rotulos/` — as capturas e a prova dos rótulos.

**Custos, estoque e resgates da Creator QA: intactos e conferidos por sonda independente.**

---

## 4. Desafios futuros — o defeito era objetivo, e foi provado antes de mexer

A auditoria comparou o **mesmo desafio** (`qa-revisao-visual-nao-iniciado`, publicado, janela
2026-11-01 → 2026-12-01) nas duas rodadas. O que a tela dizia **antes**:

- nenhuma marca de "ainda não começou";
- **"Aberto desde 01 de novembro de 2026."** — uma data **futura** anunciada como já aberta;
- um cartão **"Como participar"** com o botão **"Participar do desafio"**.

Ou seja: o produto convidava a entrar num desafio que não pode ser iniciado. **Depois:**

- selo **"Em breve"** no título (na lista e no detalhe);
- **"Começa em 01 de novembro de 2026."**;
- cartão **"Ainda não começou"**: *"A participação abre em 01 de novembro de 2026 — até lá, este
  desafio fica publicado para você ler o briefing e os requisitos com antecedência."*;
- **nenhum formulário de entrada e nenhum botão de participar** na tela (`form=false`,
  `botões: (nenhum)` em `_probe-futuro.log`).

**Nenhuma regra de calendário ou de elegibilidade foi tocada** — o que mudou é o que a tela *diz* e
o que ela *oferece*. Para a creator que já participou do desafio futuro, o selo do título é o do
próprio envio (o slot é um só) e o prazo segue correto ("Começa em…"), igualmente sem formulário.

A frase de recusa do servidor foi corrigida junto, porque ela era falsa no mesmo caso: o código
`window_closed` cobre **as duas pontas da janela** (recusa antes do início e depois do fim), e
"Este desafio não está mais no prazo de participação" lido por quem tentasse entrar num desafio
futuro dizia o oposto do que aconteceu. Agora: *"Esta ação está fora do prazo: ou ainda não começou,
ou já foi encerrada."* — um texto, nenhum comportamento novo.

Folhas: `comparacao/ajuste-4-desafio-futuro.png` · `…/ajuste-4-desafio-futuro-detalhe.png`

---

## 5. Evidências

`artifacts/creator-redesign-v2-1/` (fora do commit — `artifacts/` é ignorado pelo git):

- **`depois/`** — 24 capturas desta rodada, 12 telas × desktop 1440 / mobile 390, `fullPage`, com o
  servidor do **mesmo modo** que a V2 usou (para o antes/depois diferir só pelo que a rodada mudou):
  `01-inicio`, `01b-inicio-primeiro-acesso`, `02-desafios`, `02b-em-analise`, `02c-participando`,
  `02d-concluidos`, `02e-desafios-primeiro-acesso`, `03-desafio-detalhe-sem-capa`,
  `03b-detalhe-com-imagem`, `03c-desafio-futuro-em-breve`, `03d-desafio-futuro-participando`,
  `06-recompensas`;
- **`antes/`** — 24 capturas da rodada V2, **cópia byte a byte**, com o mesmo recorte;
- **`comparacao/`** — 7 folhas antes|depois lado a lado, cada uma com as duas telas reais e o nome da
  rodada impresso em cima;
- **`sonda.json`** — 24 telas medidas: **maior transbordo horizontal 0 px, nenhum elemento
  estourando a largura**;
- **`_medir-midias.log`** — a régua das caixas de mídia (§2);
- **`_probe-futuro.log`** — o texto que a tela diz do desafio futuro, nas duas sessões (§4);
- **`proposta-vitrine/`** — a proposta do item 3, com a auditoria, o patch e as provas dos rótulos.

**Origem das telas, sem stub disfarçado de produção:** as 24 capturas são do **staging real**, com a
Creator QA principal e com uma conta temporária criada pelo fluxo público de cadastro e **apagada no
fim** (`_conta-v21.mjs`; `_limpeza-verificacao.log` confirma que o e-mail e as linhas não existem mais).
As capturas da vitrine com fotos são do **stub de teste** e estão rotuladas como tal.

---

## 6. Testes e gates

| gate | resultado |
| --- | --- |
| `next build` | exit 0 |
| `tsc --noEmit` | **exit 0** (sem saída) |
| Vitest | **22 arquivos / 187 testes** — todos passando |
| Playwright `/app` (`test:e2e:app`) | **21 passaram** (14 da área autenticada + 7 da cadeia de imagem) |
| Playwright público | **58 passaram · 14 ignorados** |
| Transbordo horizontal | **0 px em 24 telas**, medido por DOM |

Nota de manutenção: o Prettier acusa 7 arquivos da **landing pública** — dívida de formatação que
**já existia antes desta rodada** (`git show HEAD:<arquivo> | npx prettier --check` também acusa) e
que esta rodada não toca, porque a landing está fora do escopo.

---

## 7. `git status` e `git diff`

```
$ git status --short
 M src/app/(protected)/app/layout.tsx
 M src/app/(protected)/app/perfil/page.tsx
 M src/features/workspace/components/app-nav.tsx
 M src/features/workspace/components/app-shell.tsx
 M src/features/workspace/components/catalog-media.tsx
 M src/features/workspace/components/challenge-card.tsx
 M src/features/workspace/components/challenges-screen.tsx
 M src/features/workspace/components/core-forms.tsx
 M src/features/workspace/components/dashboard-screen.tsx
 M src/features/workspace/components/navigation.tsx
 M src/features/workspace/components/notifications-screen.tsx
 M src/features/workspace/components/profile-screen.tsx
 M src/features/workspace/components/ranking-screen.tsx
 M src/features/workspace/components/reward-card.tsx
 M src/features/workspace/components/rewards-screen.tsx
 M src/features/workspace/components/topbar.tsx
 M src/features/workspace/components/ui/card.tsx
 M src/features/workspace/components/ui/pill.tsx
 M src/features/workspace/domain/format.ts
 M src/features/workspace/domain/status.ts
 M src/features/workspace/services/commands.ts
 M src/features/workspace/services/journey.ts
 M src/features/workspace/styles/app.module.css
 M src/styles/app-surface.css
 M tests/e2e-app/authenticated-app.spec.ts
 M tests/e2e-app/image-chain.spec.ts
?? docs/delivery-creator-redesign-v2.md
?? public/brand/nuy-creators-clean/reference/
?? src/features/workspace/domain/labels.ts
```

```
$ git diff --stat
 26 files changed, 2620 insertions(+), 796 deletions(-)
```

Três dos não rastreados merecem atenção de quem for commitar:

- **`src/features/workspace/domain/labels.ts`** — módulo **novo e necessário**: três componentes já
  o importam (`challenges-screen`, `core-forms`, `profile-screen`). É só de tela (código do banco →
  palavra exibida); nenhum enum, payload ou gravação passa por ele;
- `docs/delivery-creator-redesign-v2.md` — o relatório da rodada V2, que ficou sem commit;
- `public/brand/nuy-creators-clean/reference/` — imagem de referência de arte, anterior a esta
  rodada e **não referenciada por código nenhum**.

---

## 8. O que ficou de fora de propósito — para a decisão humana

1. **Packshots retratos em moldura paisagem** (item 3, §5 do `NOTAS.md`): os produtos do acervo são
   verticais (152×401 … 365×673) dentro de uma moldura 4:3/3:2. Com `cover`, o corte come as pontas
   do rótulo numa das fotos. Não é defeito — o nome do cartão está logo abaixo — e a moldura foi
   aprovada na V2, então **não mexi**. Saídas possíveis: `object-position` mais alto, uma moldura
   retrato só na vitrine, ou manter.
2. **Herói do detalhe 100 px mais baixo sem foto** (§2): decisão de desenho declarada, sem cartão
   vizinho para alinhar. Se a revisão preferir a mesma altura dos dois, é uma linha de CSS.
3. **A proposta da vitrine entra só se aprovada.** Nada foi aplicado ao staging nem à fixture.
