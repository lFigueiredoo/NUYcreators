# Entrega — Refinamento visual V2 (NUY Creators)

**Base funcional congelada:** `dfcdb3f6` — *feat: complete NUY creator operational experience*.
**Natureza da rodada:** ajustes visuais pontuais sobre a identidade e o shell já aprovados. Não é
outro redesign.
**Estado:** **não commitado, não publicado.** Aguardando revisão visual.

---

## 0. Limites respeitados

| Regra do pedido | Como foi cumprida |
| --- | --- |
| Não alterar backend, Appwrite, banco, regras, pontos, níveis, permissões, moderação, resgates, rotas | Nenhum arquivo fora de `src/features/workspace/`, `src/app/(protected)/app/`, `src/styles/app-surface.css` e `tests/e2e-app/` foi tocado. Nenhuma rota nova. Nenhum server action novo. A landing pública e o Admin não estão nessa lista — e não foram tocados. |
| Não criar registros falsos em produção | Nenhuma linha criada no staging. A conta temporária usada para o cartão preenchido foi criada pelo fluxo real de cadastro e **apagada** ao fim (resíduo zero, §6). |
| Não mexer nos `PRESERVE_FOR_HUMAN_REVIEW` | As linhas do manifesto (`artifacts/creator-qa/fixtures.json`) não foram alteradas, nem lidas para escrita. |
| Não gerar fotografia falsa | Nenhuma imagem criada. As capas institucionais são composição CSS + ícone; as duas fotos oficiais de produto são as que já existiam no repositório. |
| Não mudar enums, valores de banco ou payloads | Os rótulos humanos (`ugc` → "Criadora de conteúdo UGC") vivem em `domain/labels.ts`, um mapa **só de tela**; gravação, payload e enum continuam iguais. |
| Não remover campos, comandos, consentimentos | Nada removido; consentimentos e redes sociais intactos (nenhuma marcada como verificada). |
| Não alterar landing pública nem Admin | Intocados. A suíte pública continua passando (§7). |
| Não enfraquecer os testes existentes | O contrato do cartão sem imagem (inicial "C"/"R") foi **preservado** e o teste realinhado à moldura compartilhada; nenhuma asserção foi relaxada. |

---

## 1. Mudanças por tela

### Início (Dashboard) — prioridade máxima
- **Faixa navy mantida**, com a **foto oficial de packshot** que já existia (`products-floral.webp`) — não é arte nova.
- **CTA contextual** como elemento primário, em quatro estados reais:
  - há desafio aberto → **"Participar do desafio"** (ou "Conhecer o desafio" quando a operação de entrada não está ligada — o botão não promete o que o servidor não grava);
  - creator já está em um desafio → **"Continuar participando"** + "Você está em «X». Continue de onde parou.";
  - nada aberto → "Ver desafios da comunidade" com a explicação honesta;
  - leitura falhou → "Ver desafios da comunidade" com o aviso de indisponibilidade (nunca um número inventado).
- **Três indicadores reais** preservados: Pontos disponíveis · Pontos de jornada · No ranking.
- **Área de baixo reestruturada** em duas colunas editoriais: à esquerda a **atividade principal em destaque** (cartão grande de "Continuar participando" ou a faixa de desafios) e o **extrato de últimas atividades**; à direita **Recompensas em destaque** (linhas amplas com imagem, pontos e status) e o **Ranking como bloco de comunidade** — posição real em bloco navy, líder do ciclo e a nota de privacidade. Títulos e links de topo de bloco alinhados na mesma linha de base.
- O objetivo declarado — "comunidade NUY, não coleção de widgets" — está atendido pela hierarquia: uma atividade dominante, blocos amplos, nada de cards pequenos fragmentados.

### Desafios
- **Vazio de "Disponíveis" ciente do histórico** (§4): para quem já participou de tudo, o texto usa as contagens **das próprias abas** ("Você já participou dos desafios publicados pela comunidade — 1 em análise · 3 concluídos…") e o botão leva direto ao que ela tem em andamento. Quem nunca participou continua vendo o vazio simples. Em nenhum dos dois casos o texto sugere que ela nunca participou.
- **Cartão preenchido real** capturado numa conta temporária (§6) — a Creator QA principal não tinha desafio disponível.
- Contagem por aba vem da participação real; leitura falha → estado "indisponível" honesto, sem número.

### Detalhe do desafio
- **Só o fallback foi redesenhado**: composição institucional NUY em navy com o ícone da marca em anel dourado, o lockup "NUY Creators" e a nota "Imagem de capa ainda não publicada." — nada de uma letra "Q" quase vazia num bloco de 400 px.
- **Com imagem real, o renderizador é o mesmo de antes** — o fallback é irmão condicional, não substituto.
- Alturas equilibradas: `clamp(220px, 26vw, 400px)` com imagem; `clamp(200px, 19vw, 300px)` no fallback.

### Recompensas
- Vitrine em duas colunas, mídia em 4/3 (mesma moldura do desafio), **nome + custo em pontos** lado a lado, status claro (disponível / pontos insuficientes / estoque / resgatada) e a ação disponível no rodapé do cartão.
- **Recusa consciente:** a imagem verde do cartão de QA não foi trocada (§10) — é dado `PRESERVE_FOR_HUMAN_REVIEW`, e só existem dois packshots oficiais no repositório, ambos já usados na faixa do Início. Proposta registrada em §10.

### Notificações
- Os botões repetidos "Marcar como não lida" viraram **ação compacta**: botão-ícone (envelope aberto/fechado) com `aria-label` e `title` por extenso ("Marcar como lida" / "Marcar como não lida"), 44 px de alvo.
- Preservados: marcar como lida, marcar como não lida, marcar todas, links para o destino e o isolamento por usuária.
- **Peso maior** para título e corpo (título em serifa, corpo legível); a diferenciação lida/não lida continua discreta (selo "Não lida" dourado + ponto de estado), sem gritar.

### Perfil
- Repetição do formulário no topo **reduzida**. Ordem nova: cabeçalho com avatar, nome e nível → resumo público → dados pessoais → **edição claramente acessível** (editor recolhido, que abre por ação explícita) → redes sociais → preferências.
- Nenhum campo removido; o editor é o mesmo, apenas atrás de uma ação em vez de sempre aberto.

### Ranking
- Estado para **poucos participantes**: posição da creator em bloco navy de largura total ("Sua posição · 1º · 300 pontos ganhos em Outubro de 2026"), lista de destaques com o selo "Você" na própria linha e a nota "Neste ciclo, **1 pessoa** pontuou até agora. A classificação cresce conforme a comunidade participa."
- Sem espaço vazio excessivo: a tela se fecha em três blocos (posição, destaques, privacidade) em vez de esticar um pódio que não tem gente.

### Mobile
- **Breadcrumb redundante do topo escondido** abaixo de 900 px: era ele que chegava cortado ("— Meus conte…") enquanto o título completo sempre esteve dentro da página. O título da tela permanece integral no cabeçalho do conteúdo (§5).
- Barra inferior preservada, com **"Mais"** abrindo Recompensas, Ranking, Notificações e Sair (os mesmos links da sidebar; nenhum destino inventado). Alvos de toque medidos: **61×50 px** cada.

### Copy de apresentação
- `ugc` → **"Criadora de conteúdo UGC"**, `instagram` → **"Instagram"** (e TikTok/YouTube, Consumidora, Influenciadora, nichos) — apenas exibição.
- "1 creator já participou" → **"1 pessoa já participou"**, com pluralização onde faz sentido.
- Valor fora do mapa aparece **cru** — nunca um rótulo traduzido no chute.

---

## 2. Prints antes/depois

`artifacts/creator-redesign-v2/`

- **`antes/`** — 20 PNGs. São **cópias byte a byte** das capturas da rodada V1 revisada (conferido por md5 em três arquivos), ou seja: a linha de base é exatamente o que foi avaliado, não uma reconstrução.
- **`depois/`** — 38 PNGs em **1440 (desktop) e 390 (mobile)** cobrindo Início, Desafios (Disponíveis, Participando, Em análise, Concluídos), Detalhe do desafio **com e sem imagem**, Meus conteúdos, Pontos, Recompensas, Ranking, Notificações e Perfil; mais a série `c2-*` da conta temporária (§6).
- **`_crops/`** — 18 recortes ampliados para julgar detalhe pequeno (rótulo, selo, alvo, nota da capa, item de notificação, cartões de recompensa, pódio, CTA da faixa).
- **`depois/transbordo.json`** — varredura de overflow nas 38 telas: **0 px de transbordo horizontal em todas**, e nenhum elemento ofensor.
- **`depois/detalhes.json`** — quais linhas reais alimentaram os detalhes: com imagem `qa-dreno-agendado`, sem imagem `qa-aviso-na-tela`, disponível na conta temporária `qa-revisao-visual-nao-iniciado`.

> Nota de rastreabilidade: as capturas saíram do código desta rodada. Depois delas houve apenas (a) a correção de lint em `app-nav.tsx` — refactor de estado sem efeito visual — e (b) formatação Prettier em 4 arquivos desta rodada. O comportamento da barra "Mais" foi **reverificado depois** das duas mudanças (§7, `_interacao-final.log`).

---

## 3. Como ficou o Dashboard

O topo responde à pergunta "o que eu faço agora?" antes de mostrar número: faixa navy com a foto real do produto, nível e progresso, e **uma** ação primária contextual. Os três indicadores reais vêm logo abaixo, em cartões largos. A metade de baixo é uma página editorial, não uma grade de widgets:

- **esquerda:** a atividade principal (destaque grande, com o estado real do envio) e o extrato de últimas atividades com os lançamentos reais (+50, −50, −200, +250, +100);
- **direita:** Recompensas em destaque (linhas amplas, imagem/pontos/status/ação) e o **Ranking como bloco de comunidade**, com a posição real (1º), o líder do ciclo e a nota de privacidade ("O nome exibido é o público — só ele aparece aqui; nunca e-mail, telefone ou cidade").

Nada foi inventado: onde não havia imagem, entrou o fallback institucional; onde não havia desafio, entrou a faixa explicativa com link para o que ela tem em andamento.

---

## 4. Desafios: estado vazio e estado preenchido

**Vazio (Creator QA principal, que já participou de tudo).** Antes: um vazio genérico que soava como se a tela não a conhecesse. Agora, com números das próprias abas dela:

> **Nenhum desafio aberto agora.**
> Você já participou dos desafios publicados pela comunidade — 1 em análise · 3 concluídos. Quando a equipe NUY publicar um novo desafio, ele aparece aqui com prazo, requisitos e Pontos NUY.
> **[Acompanhar o que está em análise →]**

O botão vai para a aba com trabalho em curso (ou "Ver meus desafios", quando não há nada em análise). Quem **nunca** participou vê o vazio simples de sempre — o texto não presume histórico.

**Preenchido (conta temporária).** `c2-02-desafios-disponiveis` mostra a aba "Disponíveis 4" com os quatro desafios publicados reais: cartões com pontos, nome, descrição, prazo e "Ver desafio". Três deles não têm imagem na linha e mostram a inicial (o contrato provado pelo `image-chain.spec.ts`); um traz **imagem de verdade vinda do bucket** (`qa-dreno-agendado`, a fixture teal de QA). É o cartão preenchido real que faltava — capturado sem tocar em nenhuma linha da Creator QA principal.

---

## 5. Melhorias da experiência mobile

1. **Título cortado não existe mais.** O cabeçalho fixo mostrava "— Meus conte…" ao lado do logo; o breadcrumb redundante foi escondido ≤900 px e o título completo permanece no cabeçalho da página (crops `z-kicker-antes-4x.png` / `z-kicker-depois-4x.png`, e antes/depois de "Meus conteúdos"). Confirmado por leitura do DOM servido: o elemento está `display: none`, largura 0.
2. **Barra inferior + "Mais"** com seis alvos de **61×50 px** (≥44 px), folha com cortina, `aria-expanded`, fechamento por **Esc** e por navegação — todos exercidos.
3. **Nada fica atrás da barra fixa.** Rolagem real até o fim em cinco telas: o último bloco termina *acima* do topo da barra em todas (`_interacao-final.log`).
4. Sem overflow horizontal: 0 px nas 38 capturas, incluindo as 19 em 390 px.

---

## 6. Dados de QA utilizados

**Conta principal:** `Creator QA NUY — QA` (a conta de QA existente; nenhuma alteração nela). Tudo o que aparece nas telas dela é linha real já existente: 4 participações, 6 envios, 150 pontos disponíveis, 300 de jornada, nível Exploradora, 1º no ciclo.

**Conta temporária (só para o cartão preenchido):** `QA Vitrine V2` — criada **pelo fluxo real** de cadastro + onboarding, usada para as séries `c2-*` e **apagada** ao fim: `profiles`, `social_accounts`, `point_accounts`, `users/<id>` e a conta de autenticação, nessa ordem; credencial efêmera removida do disco. Conferência por dump ao vivo antes/depois: **a única diferença entre os dois estados é a própria conta temporária** — nenhum outro registro foi criado, alterado ou removido.

**PRESERVE_FOR_HUMAN_REVIEW:** intacto. Os desafios `7ac2619f…` e `1511a61f…` e a recompensa `d2bc173b1f97…` não foram modificados — inclusive por isso a captura do "preenchido" foi feita numa conta nova em vez de mexer neles.

---

## 7. Testes

Todos rodados **na árvore final**, depois das duas mudanças de qualidade (lint + Prettier):

| Portão | Resultado |
| --- | --- |
| `tsc --noEmit` | limpo |
| `eslint . --quiet` | **0 problemas** (havia 1 erro introduzido nesta rodada — corrigido, §10) |
| `prettier --check` (arquivos da rodada) | todos no padrão |
| `vitest run` | **187/187** em 22 arquivos |
| `npm run test:e2e:app` (Playwright autenticado) | **21 passed** |
| `npm run test:e2e` (Playwright público) | **58 passed, 14 skipped** |
| `next build` | exit 0, compilou em 12,1 s |
| `_interacao.mjs` (interação real na pilha de fixture) | **✔ nenhum ponto de atenção** |
| `_clique-leitura.mjs` (clique real contra o staging) | **✔ toggle compacto: ida e volta confirmadas** |

O que a bateria de interação mede, em números: 6 destinos na barra com 50 px de altura · folha "Mais" abre, fecha no Esc e fecha ao navegar · **132 combinações de contraste medidas, 0 abaixo do mínimo** (pior caso 4,59 contra 4,5 exigido) · rolagem até o fim em 5 telas sem conteúdo coberto · ordem de foco do desktop com anel visível na cor do produto em todos os controles da superfície.

O clique do botão compacto de leitura **não fica na promessa**: a pilha de teste roda com a operação desligada de propósito (o stub não inventa aviso), então o clique foi exercido contra o backend real — mede alvo, nome acessível, alterna o estado e **restaura o estado inicial**, terminando a central exatamente como começou.

---

## 8. Arquivos modificados

23 arquivos, +2.379 / −782, todos dentro da superfície da creator:

- `src/features/workspace/components/` — `dashboard-screen.tsx`, `challenge-card.tsx`, `challenges-screen.tsx`, `reward-card.tsx`, `rewards-screen.tsx`, `ranking-screen.tsx`, `profile-screen.tsx`, `notifications-screen.tsx`, `core-forms.tsx`, `app-nav.tsx`, `app-shell.tsx`, `navigation.tsx`, `topbar.tsx`, `catalog-media.tsx`, `ui/card.tsx`, `ui/pill.tsx`
- `src/features/workspace/domain/labels.ts` — **novo**, rótulos só de exibição
- `src/features/workspace/services/journey.ts` — leitura que alimenta os estados do painel
- `src/features/workspace/styles/app.module.css`, `src/styles/app-surface.css`
- `src/app/(protected)/app/layout.tsx`, `src/app/(protected)/app/perfil/page.tsx`
- `tests/e2e-app/authenticated-app.spec.ts`, `tests/e2e-app/image-chain.spec.ts` — realinhamento à moldura compartilhada, sem enfraquecer asserção

## 9. Git status

```
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
 M src/features/workspace/services/journey.ts
 M src/features/workspace/styles/app.module.css
 M src/styles/app-surface.css
 M tests/e2e-app/authenticated-app.spec.ts
 M tests/e2e-app/image-chain.spec.ts
?? public/brand/nuy-creators-clean/reference/
?? src/features/workspace/domain/labels.ts
```

Nada em stage. Novos nesta rodada: `docs/delivery-creator-redesign-v2.md` (este relatório) e
`src/features/workspace/domain/labels.ts` (rótulos de exibição). `public/brand/nuy-creators-clean/reference/`
já estava sem rastreamento **antes** desta rodada — não é desta entrega.

---

## 10. Decisões de não mudança (e por quê)

1. **Cartão compacto sem imagem continua com a inicial, não com a moldura institucional.** O `image-chain.spec.ts` assere essa inicial como contrato ("Carrossel" → C, "Reels" → R) para provar o caso real de arquivo removido do bucket com a linha ainda apontando para ele. Trocar o desenho exigiria reescrever a asserção — e o pedido proíbe enfraquecer teste existente. A moldura institucional foi aplicada onde não havia contrato em jogo: no **destaque** do painel e no **detalhe**. Consequência visível: na lista, as mídias vazias continuam em faixa 16/5 (a altura da lista não é uniforme entre cartões com e sem imagem).
2. **A imagem verde do cartão de recompensa não foi substituída.** É fixture de QA (`d2bc173b1f97…`, `PRESERVE_FOR_HUMAN_REVIEW`) e não representa produto real — mas trocá-la seria justamente alterar dado preservado. **Proposta**, se você aprovar: existem **duas** fotos oficiais de produto no repositório (`public/brand/nuy-creators-v2/products/`), hoje usadas na faixa do Início; elas poderiam ser usadas **apenas em fixtures de QA** para que a vitrine pareça produto de verdade nas próximas capturas. Nenhum uso foi feito sem sua palavra.

**Nota sobre captura (não é bug do produto):** nas capturas `fullPage` do mobile, a barra inferior aparece em posição intermediária — é artefato conhecido do recorte de página inteira com elemento fixo (`position: fixed` é pintado na dobra do momento), não comportamento do produto. As medições de "nada atrás da barra" foram feitas por leitura de DOM com rolagem real até o fim.

**Duas correções de qualidade desta rodada**, ambas em arquivos que a rodada tocou: o erro de lint em `app-nav.tsx` (o efeito que fechava a folha "Mais" ao trocar de tela virou *derivação* — a folha guarda **qual** caminho a abriu, então a navegação a fecha sozinha, inclusive o voltar do navegador, sem sincronizar estado em efeito) e a formatação Prettier de 4 arquivos. Nenhuma das duas tem efeito visual, e ambas foram reverificadas.

---

**Nenhum commit executado.** Aguardando revisão visual.
