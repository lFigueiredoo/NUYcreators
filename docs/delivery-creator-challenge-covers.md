# NUY Creators — capas reais dos desafios

Entrega para revisão humana, em **duas rodadas** no mesmo dia, 8 de outubro de 2026: **nada foi
commitado, nada foi enviado ao repositório remoto**. Toda a evidência está em
`artifacts/creator-challenge-covers/` (pasta ignorada pelo git).

- **Rodada 1** — os quatro desafios de QA do staging receberam capa: fotos reais da NUY, subidas pelo
  formulário de admin, com os bytes originais preservados.
- **Rodada 2** — a pedido da NUY, os **dois desafios de revisão visual** trocaram de capa para os
  **kits** (sabonete + aromatizador + limpador da mesma linha) e a **faixa da tela Início** trocou a
  arte de acervo por uma dessas composições.

O que nenhuma das rodadas fez: não gerou imagem, não recriou embalagem, não inventou produto, não
mexeu em recompensa, e não tocou em pontuação, participação, envio, moderação ou resgate.

---

## 1. Inventário das imagens fornecidas

`artifacts/images/` — 17 arquivos de imagem e um `README.txt`. Os packshots têm canal alfa (o produto
recortado sobre transparência), e é por isso que a sobra de proporção aparece como a superfície creme
do cartão.

| arquivo | px | alfa | MB | o que é |
| --- | --- | --- | --- | --- |
| `02_AROMATIZADOR_FLORES_VIBRANTES_200ML.png` | 852×800 | sim | 0,19 | Aromatizador 200 ml — rótulo **Flores Vibrantes** |
| `03_SABONETE_CEREJA_SELVAGEM_500ML.png` | 464×464 | sim | 0,13 | Sabonete líquido — **Cereja Selvagem** |
| `04_LIMPADOR_CHA_BRANCO_125ML.png` | 246×328 | sim | 0,06 | Limpador 125 ml — **Chá Branco** |
| `05_LIMPADOR_VARIANTE_VERMELHO_125ML.png` | 173×369 | sim | 0,14 | Limpador 125 ml — **Flores Vibrantes** (rótulo conferido a 4×) |
| `06_LIMPADOR_BRISA_FLORAL_125ML.png` | 738×983 | sim | 0,37 | Limpador 125 ml — **Brisa Floral** |
| `07_SABONETE_FRESCOR_HERBAL_500ML.png` | 1475×1106 | sim | 0,46 | Sabonete líquido — **Frescor Herbal** |
| `08_LIMPADOR_HERBAL_SELVAGEM_125ML.png` | 725×967 | sim | 0,38 | Limpador 125 ml — **Herbal Selvagem** |
| `01_LOGO_NUY_CREATORS.png` | 1448×1086 | — | 0,64 | Logotipo — não é foto de produto |
| `00_REFERENCIA_SITE_OPCAO_1.png` | 941×1672 | — | 2,09 | Referência de site; idêntico byte a byte ao arquivo já no repositório (`public/brand/nuy-creators-clean/reference/`). O `README.txt` o marca como referência |
| `…16_10_17-1.png` | 1672×941 | — | 1,98 | Composição — **kit Brisa Floral** |
| `…16_10_19-2.png` | 1672×941 | — | 1,91 | Composição — **kit Herbal Selvagem** |
| `…16_10_21-3.png` | 1672×941 | — | 2,15 | Composição — **4 limpadores** |
| `…16_10_23-4.png` | 1672×941 | — | 2,19 | Composição — **2 sabonetes** |
| `…17_04_56.png` | 1672×941 | — | 1,98 | **Duplicata** de `16_10_17-1` (`a4985f17…`) |
| `…17_05_08.png` | 1672×941 | — | 1,91 | **Duplicata** de `16_10_19-2` (`0729df09…`) |
| `…17_05_16.png` | 1672×941 | — | 2,15 | **Duplicata** de `16_10_21-3` (`cc6c3b0b…`) |
| `…17_05_23.png` | 1672×941 | — | 2,19 | **Duplicata** de `16_10_23-4` (`327ad6f9…`) |

Os quatro arquivos de `17_0x_xx` foram acrescentados pela NUY no meio da rodada ("adicionei as
imagens certas, tinha colocado as erradas"). **Eles são byte a byte idênticos** aos quatro de
`16_10_xx` — o SHA-256 de cada par bate —, então o acervo disponível não mudou: o que a NUY
considera "as imagens certas" já estava lá desde o começo. Nenhuma das 17 foi alterada, recodificada
ou recortada em nenhum momento.

Agrupamento pedido no briefing:

- **A. Limpadores NUY individuais** — 04 (Chá Branco), 05 (Flores Vibrantes), 06 (Brisa Floral), 08 (Herbal Selvagem).
- **B. Sabonetes líquidos NUY** — 03 (Cereja Selvagem), 07 (Frescor Herbal).
- **C. Kit sabonete + aromatizador + limpador** — composições #1 e #2. **Usadas na rodada 2.**
- **D. Coleção de limpadores** — composição #3. Usada na rodada 1, aposentada na rodada 2.
- **E. Composição floral com produtos NUY** — composições #1, #2 e #4. A #4 foi usada na rodada 1 e
  aposentada na rodada 2; as #1 e #2 são as que estão no ar agora.

## 2. Uma correção de rótulo — inclusive contra este relatório

O pareamento das capas é por **rótulo lido**, e é bom que seja: a primeira versão deste documento
afirmava que a composição #1 era o kit "Herbal Selvagem" e a #2 o "Brisa Floral". **Estava trocado.**
As duas foram reabertas e os rótulos conferidos ampliados 3×:

| composição | arquivo | o que os rótulos dizem |
| --- | --- | --- |
| **#1** | `16_10_17-1.png` = `17_04_56.png` | sabonete líquido **Cereja Selvagem** 500 ml + aromatizador de ambiente 200 ml **Brisa Floral** + limpador de uso geral 125 ml **Brisa Floral** |
| **#2** | `16_10_19-2.png` = `17_05_08.png` | sabonete líquido **Frescor Herbal** 500 ml + aromatizador de ambiente 200 ml **Herbal Selvagem** + limpador de uso geral 125 ml **Herbal Selvagem** |

O hash confirma o pareamento sem depender de memória: `17_04_56.png` tem o mesmo SHA-256 de
`16_10_17-1.png` (`a4985f17…`) e `17_05_08.png` o mesmo de `16_10_19-2.png` (`0729df09…`). Os
recortes ampliados usados para ler os rótulos ficaram em `_conferencia-rotulo/`.

## 3. Qual desafio recebeu qual imagem — estado final

| desafio (tela) | slug | id | pontos | imagem no ar |
| --- | --- | --- | --- | --- |
| QA — Desafio de revisão visual | `qa-revisao-visual` | `1511a61f5f8d4f2396708417a4f7bd1a2d6d` | 250 | **kit Herbal Selvagem** — composição #2 |
| QA — Desafio de revisão visual (não iniciado) | `qa-revisao-visual-nao-iniciado` | `7ac2619f1a563e62c1ed014cf8fe1fb2eed4` | 100 | **kit Brisa Floral** — composição #1 |
| QA — Desafio do dreno agendado | `qa-dreno-agendado` | `592c81ea0d9ca1a6e0cba8f59dd875253ab1` | 50 | packshot — aromatizador Flores Vibrantes |
| QA — Desafio do aviso na tela | `qa-aviso-na-tela` | `1d63ac755cea9cbf356dcf01d29d01301518` | 30 | packshot — limpador Brisa Floral |

E a **faixa da tela Início** (`/app`): passou de `products-floral.webp` (arte de acervo da marca,
208 KB) para a **composição #2 — kit Herbal Selvagem**, a mesma que virou capa do `qa-revisao-visual`.

**Nenhum produto foi associado a um desafio que o cite.** Os quatro desafios de QA não citam produto
nenhum no título nem na descrição — todos dizem o mesmo: "Desafio criado para … Registro de QA — não
é uma ação real da marca". A imagem entra como **visual de marca da NUY**, e não como recompensa nem
como peça de campanha: o card e a capa não prometem produto em lugar nenhum, e a descrição de cada
desafio diz em texto que é registro de QA.

## 4. Caminho original de cada arquivo

```
artifacts/images/Imagem do ChatGPT 8 de out. de 2026, 17_05_08.png     (kit Herbal Selvagem)
artifacts/images/Imagem do ChatGPT 8 de out. de 2026, 17_04_56.png     (kit Brisa Floral)
artifacts/images/02_AROMATIZADOR_FLORES_VIBRANTES_200ML.png
artifacts/images/06_LIMPADOR_BRISA_FLORAL_125ML.png
```

Esses arquivos **não foram alterados**: os quatro subiram byte a byte idênticos ao original (§8) e o
que foi para dentro do repositório para a faixa também (§9).

## 5. Arquivos no Appwrite

Bucket `community-media`, que continua **privado**. Nome do arquivo = nome que aparece no bucket.

| desafio | arquivo no bucket | `imageFileId` | bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| revisão visual | `qa-kit-herbal-selvagem-nuy.png` | `6ac7f9f38968164d9093` | 1 999 995 | `0729df09…38fc70` |
| revisão visual (não iniciado) | `qa-kit-brisa-floral-nuy.png` | `6ac7f9fb36a574c5da25` | 2 079 181 | `a4985f17…a1716f` |
| dreno agendado | `qa-aromatizador-flores-vibrantes-nuy.png` | `6ac7efc71301a128244f` | 200 634 | `ad6127e4…ff36e8` |
| aviso na tela | `qa-limpador-brisa-floral-nuy.png` | `6ac7efcc810207bd13c9` | 390 684 | `5b767f70…bf274a94` |

**ID anterior de cada linha, como o briefing manda registrar:**

| desafio | `imageFileId` antes da rodada 2 | destino |
| --- | --- | --- |
| `qa-revisao-visual` | `6ac7efbc5dffb13e4b0a` (composição "4 limpadores") | aposentado e apagado pela política de órfãos |
| `qa-revisao-visual-nao-iniciado` | `6ac7efc265e298df0bfd` (composição "2 sabonetes") | aposentado e apagado pela política de órfãos |
| `qa-dreno-agendado` | `6ac7efc71301a128244f` | **não mudou nesta rodada** |
| `qa-aviso-na-tela` | `6ac7efcc810207bd13c9` | **não mudou nesta rodada** |

E, da rodada 1: `qa-revisao-visual` tinha `6ac7ef7920fb013c1d20` (imagem de controle de 143 KB, do
diagnóstico) e `qa-dreno-agendado` tinha `6ac78e05c465431d9845` (bloco teal liso, 1 484 bytes); ambos
já aposentados. O histórico completo está em `_capas-enviadas-rodada1.json`,
`_capas-enviadas-rodada2.json` e nos respectivos `_subir-capas-rodada*.log`.

O bucket ficou com **5 arquivos**: as quatro capas no ar e o `recompensa-qa.png`
(`6ac78dfd1e69164ac815`), que **não** foi tocado — uma linha de recompensa ainda o referencia, e a
política de órfãos o preservou por isso. As trocas foram feitas pelo **fluxo existente**: operador
autenticado → `/admin/desafios/<id>` → campo de imagem → "Salvar e publicar" → envio no servidor com
a chave de mídia → `challenge.save` → aposentadoria do arquivo antigo. Nenhum link direto para
`artifacts/`, nenhum segundo sistema de imagens, nenhuma chave no navegador.

## 6. Resultado visual — desktop, tablet e mobile

Validado em 1440 px, 768 px e 390 px nas telas `/app`, nas quatro abas de `/app/desafios` e nas
quatro páginas de detalhe — **nove telas, três larguras, 27 capturas**. **Estouro horizontal: 0 px em
todas as 27.** Todas as imagens carregaram
(`naturalWidth > 0` em todas), nenhuma caiu na composição institucional, e o `object-fit` computado é
`contain` em todas as caixas de capa de desafio (`_capturar-rodada2.log`).

Uma correção de contêiner foi necessária na rodada 1. Com a foto real no lugar, ficou visível que
`object-fit: cover` **cortava produto**: uma composição de 1672×941 dentro da capa de detalhe
(1120×374, ou 2,99:1) perdia 20% da altura em cima e 20% embaixo, e as tampas ficavam rentes à borda
de cima. O briefing proíbe exatamente isso ("não cortar tampas, rótulos ou produtos") e manda
preferir `contain` quando for preciso preservar a embalagem inteira. A mudança foi **só de CSS, só
nas caixas de capa de desafio** — nenhum arquivo foi alterado para caber, e a proporção das caixas
não mudou; o que mudou foi o encaixe. A sobra de proporção fica na superfície creme que o cartão já
usa, que é praticamente a cor do fundo das próprias composições.

Antes e depois medidos na mesma caixa, com o kit no lugar:

| | caixa | `object-fit` | o que aparece |
| --- | --- | --- | --- |
| rodada 1, com `cover` | 1120×374 | `cover` | 1120×630 recortado para 1120×374 — tampas na borda |
| agora | 1120×374 | `contain` | 664×374 inteira, centrada, sobre o creme |

**A faixa da tela Início é o caso oposto e não precisou de mudança.** Ela usa `cover` desde antes
desta rodada, e o briefing proíbe cortar produto ali também — então o corte foi medido em vez de
suposto (`_sonda-faixa.mjs`):

| viewport | caixa | corte do `cover` | veredito |
| --- | --- | --- | --- |
| 1440 px | 525×347 | 7,55% em cada lateral | três produtos **inteiros** — o corte cai em flor e mármore |
| 768 px | 720×405 | zero | mesma proporção do arquivo |
| 390 px | 316×178 | 0,16% em cada lateral | três produtos inteiros |

A prova de que "cai em flor e mármore" não é retórica: o script extrai do arquivo original o recorte
exato que o `cover` desenha e grava em `_conferencia-rotulo/faixa-1440-recorte-simulado.png`. Nele os
três produtos aparecem com tampa, gatilho e rótulo completos.

## 7. Antes e depois

- `_quadro-mapeamento.png` — **arte fornecida → desafio que a recebeu**, com os próprios arquivos ao
  lado do recorte exato da caixa de mídia no ar, mais `imageFileId` e SHA-256 de cada um.
- `_quadro-antes-depois.png` — os quatro pares antes/depois da capa do detalhe, a seção **"o que mudou
  na rodada 2"** (rodada 1 → rodada 2, lado a lado, nos dois desafios que trocaram), a grade de
  cartões, a faixa da tela Início antes/depois e o cartão deitado do painel.

Antes da rodada 1: três desafios mostravam a **capa institucional** da NUY (navy com o lockup) e um
mostrava um **bloco teal liso** de 1 484 bytes. Depois da rodada 1: composições nos dois de revisão
visual e packshot nos outros dois. Depois da rodada 2: kits nos dois de revisão visual, packshot nos
outros dois, e a faixa da tela Início com a composição no lugar da arte de acervo.

As capturas de tela estão em `antes/`, `depois/` (rodada 1 com `cover`, o estado intermediário que
revelou o corte), `depois-css/` (rodada 1 com `contain`) e `rodada2/` (estado atual), cada uma com as
telas em 1440, 768 e 390 px, em viewport e em página inteira. Os recortes usados nos quadros estão em
`recortes/vivo/` (agora), `recortes/rodada1/` (o que a rodada 1 tinha posto) e `recortes/antes/` (o
estado anterior a tudo) — quem recorta é o próprio navegador (`locator.screenshot`), não uma
coordenada estimada.

Uma observação para quem for revisar: **a aba "Disponíveis" de `/app/desafios` está vazia para esta
conta** — a Creator QA já entrou nos quatro desafios que existem. Os cartões com capa, portanto,
estão nas abas do histórico; a grade foi capturada em `?aba=done` (3 cartões) e `?aba=in_review`.

## 8. Provas e testes

**Integridade dos bytes** — `_conferir-integridade.mjs` baixa de volta do bucket cada capa enviada e
compara o SHA-256 com o arquivo original: **4 de 4 byte a byte idênticos** (`_integridade.log`), e o
mesmo vale para a cópia que foi para o repositório (§9).

**Dados preservados** — `_preservado.mjs` relê o banco e compara com a linha de base gravada antes de
qualquer envio (`_dados-antes.json`): 4 participações idênticas, 6 envios idênticos, conta de pontos
idêntica (150 disponíveis, 300 de jornada, nível `exploradora`). Nos quatro desafios mudaram
**apenas** `imageFileId`, `version` e o carimbo de tempo — pontos, nível exigido, janela e status
seguem iguais. Resultado: "Nada além da capa mudou."

**Gates** — todos verdes:

| gate | resultado |
| --- | --- |
| `git diff --check` | limpo (só os avisos de CRLF desta máquina) |
| `tsc --noEmit` | sem erro |
| `vitest run` | 22 arquivos, **187 testes**, todos passando |
| `playwright test --config playwright.app.config.ts` | **21 testes**, todos passando |
| `next build` | build de produção concluído |

Dentro da suíte do `/app`, os testes que cobrem exatamente a cadeia desta rodada
(`tests/e2e-app/image-chain.spec.ts`): o desafio com capa mostra a imagem **e o navegador nunca fala
com o Appwrite**; o detalhe mostra a mesma capa sem estourar a largura; a recompensa com capa mostra
a imagem; **sem imagem gravada a caixa mostra a capa institucional** e nenhum `img` quebrado; arquivo
indisponível cai no mesmo desenho; a rota recusa id que o catálogo não referencia, mesmo existindo no
bucket; e a rota recusa quem não tem sessão. Ou seja: **o fallback continua funcionando**, e a rota
de mídia continua privada.

## 9. Mudanças feitas

Quatro, e nenhuma delas em regra de negócio.

1. **`src/features/workspace/styles/app.module.css`** (rodada 1) — um bloco novo que faz a capa de
   desafio usar `object-fit: contain` nas três caixas da família (`.challengeMedia`, `.featureMedia`,
   `.detailMedia`). A vitrine de recompensas ficou de fora de propósito: aquela origem é um recorte
   justo do produto e não é desta rodada.
2. **`next.config.ts`** (rodada 1) — `experimental.serverActions.bodySizeLimit: '6mb'`. O padrão do
   Next para o corpo de uma Server Action é 1 MB, enquanto o formulário do admin promete aceitar 5 MB
   (`MEDIA_MAX_BYTES`). Uma foto de 2,07 MB não devolvia recado nenhum: a requisição morria com
   `ERR_CONNECTION_RESET` e o operador ficava olhando "Enviando…" para sempre. O teto agora cabe o que
   o próprio produto diz aceitar, com folga para o que o `multipart/form-data` acrescenta. Provado com
   um controle: um arquivo de 143 KB pelo mesmo formulário passava; um de 2,07 MB, não.
3. **`public/brand/nuy-creators-v2/products/products-herbal-selvagem.png`** (rodada 2, novo) — a
   composição #2, **cópia byte a byte** do arquivo fornecido (mesmo SHA-256 `0729df09…`, 1 999 995
   bytes). Não é recodificação nem recorte: os bytes são os da NUY.
4. **`src/features/workspace/components/dashboard-screen.tsx`** (rodada 2) — a faixa da tela Início
   passa a apontar para esse arquivo, com `width`/`height` reais (1672×941) e um comentário dizendo de
   onde a imagem veio. O CSS da faixa **não** mudou.

Nenhum arquivo de imagem foi criado por geração, recodificado ou editado. Nenhuma permissão, schema
ou peça de infraestrutura foi alterada. Nenhuma imagem de recompensa foi substituída.

## 10. `git status`

Árvore suja, como estava: as alterações desta entrega somam-se ao trabalho ainda não commitado das
rodadas anteriores (o redesign do espaço da creator). Continuam fora do índice os documentos de
entrega e a pasta de referência de marca.

```
 M next.config.ts                                  ← rodada 1
 M src/features/workspace/styles/app.module.css    ← rodada 1 (um bloco)
 M src/features/workspace/components/dashboard-screen.tsx  ← rodada 2
 M … 24 arquivos do redesign anterior                      (27 modificados no total)
?? docs/delivery-creator-challenge-covers.md              (este relatório)
?? docs/delivery-creator-redesign-v2.md
?? docs/delivery-creator-redesign-v2-1.md
?? public/brand/nuy-creators-clean/reference/
?? public/brand/nuy-creators-v2/products/products-herbal-selvagem.png   ← rodada 2 (novo)
?? src/features/workspace/domain/labels.ts
```

`artifacts/` é ignorada pelo git — toda a evidência desta entrega vive fora do repositório.

**Nada foi commitado. Nada foi enviado ao remoto.**

## 11. O que fica para revisão humana

- **A ressalva que não desapareceu.** As composições #1 e #2 trazem um "AROMATIZADOR DE AMBIENTE /
  200 ml" rotulado **Brisa Floral** e **Herbal Selvagem**. Entre os arquivos fornecidos existe **um
  único packshot de aromatizador**, e ele diz **Flores Vibrantes** (arquivo 02) — ou seja, essas duas
  variantes de 200 ml não têm packshot correspondente no acervo. Na rodada 1 isso me fez descartá-las;
  a NUY as forneceu de novo e autorizou o uso, e é por isso que elas estão no ar. Se elas
  correspondem a produtos que a marca pretende lançar, está resolvido; se não, as capas dos dois
  desafios de revisão visual precisam de outra imagem — e a faixa da tela Início também.
- **A mesma imagem em dois lugares.** A composição #2 é hoje a capa do `qa-revisao-visual` **e** a
  faixa da tela Início. Foi o que a NUY escolheu, mas vale saber que as duas aparecem juntas para
  quem abre `/app` e rola até os desafios do histórico.
- O fallback institucional segue no lugar para qualquer desafio sem capa, e a rota de mídia segue
  privada. Nada nesta entrega reduziu essa proteção.
- O cartão do painel cresce conforme a proporção da capa (o retrato fica mais alto que a
  composição). Não foi mexido: é comportamento anterior à rodada e ajustá-lo seria redesign.
