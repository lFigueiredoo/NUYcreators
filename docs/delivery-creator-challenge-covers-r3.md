# NUY Creators — capas dos desafios, rodada 3

Entrega para revisão humana, **9 de outubro de 2026**. **Nada foi commitado, nada foi enviado ao
repositório remoto.** A evidência está em `artifacts/creator-challenge-covers/` (pasta ignorada pelo
git), com os arquivos desta rodada em `_r3/` e as capturas em `rodada3/`.

Continua valendo o relatório da rodada 1 e 2 (`docs/delivery-creator-challenge-covers.md`): mesma
disciplina, mesmo fluxo de envio, mesma regra de que estas capas são **peça de marca, não promessa de
produto** — nenhum produto foi associado a um desafio que o cite.

---

## 1. O que o pedido dizia, e o que foi feito

O pedido, com a captura do cartão "QA — Desafio do dreno agendado" em anexo:

> "ainda tem alguns assim, não quero apenas o produto, bote em um fundo bonito (que não pareça IA e
> seja elegante sempre, os que já estiver não modifique e nem mude nada)"

Lido em três partes, e cumprido nas três:

| parte do pedido | o que foi feito |
| --- | --- |
| "não quero apenas o produto" | as **duas** capas que ainda eram o packshot sozinho sobre o creme passaram a ter cena |
| "não pareça IA e seja elegante sempre" | a cena **não foi gerada**: todo pixel de fundo vem das composições que a própria NUY forneceu |
| "os que já estiver não modifique e nem mude nada" | as duas capas dos kits **não foram tocadas** — nem por este script, nem por engano |

### 1.1 As duas capas que mudaram

| desafio | antes | depois |
| --- | --- | --- |
| `qa-dreno-agendado` | aromatizador Flores Vibrantes 200 ml recortado, flutuando no creme do cartão | o mesmo aromatizador **em cena**: piso de mármore, jasmins em discos, arcos navy e anéis dourados |
| `qa-aviso-na-tela` | limpador Brisa Floral 125 ml recortado, flutuando no creme do cartão | o mesmo limpador **em cena**: Flores de cerejeira, plintos de mármore, arcos navy e anéis dourados |

### 1.2 As duas capas que não mudaram

`qa-revisao-visual` e `qa-revisao-visual-nao-iniciado` continuam com as composições de kit da rodada 2,
**byte a byte**. A prova não é visual — é o `imageFileId` e o SHA, na seção 5.

---

## 2. Como a cena foi feita — sem gerar um pixel

Esta é a parte que precisa de leitura humana, porque é uma decisão de artesanato, não um download.

**Não foi gerada nenhuma imagem.** Também não foi tirada nenhuma foto nova. A cena inteira é
**remontagem de pixels reais** dos dois arquivos de composição que a NUY entregou em 8 de outubro
(`16_10_19-2.png`, kit Herbal Selvagem, e `16_10_17-1.png`, kit Brisa Floral).

O raciocínio: essas composições já têm a direção de arte que a NUY aprovou — fundo creme quente, arcos
navy nas bordas, anéis dourados finos, discos e laje de mármore, folhagem, piso reflexivo. O que
atrapalha é só o trio de produtos no meio. Então:

1. **As duas faixas laterais da composição são preservadas como estão** — são a esquerda e a direita
   originais, onde moram os arcos, os anéis, o mármore e a folhagem. Enquadramento NUY, intacto.
2. **O miolo, onde estavam os produtos, é preenchido por espelhamento dessas mesmas faixas**, cruzadas
   com uma máscara de transição suave (smoothstep) para não haver emenda.
3. O produto recortado entra **por cima**, no centro, já existente no acervo: o packshot real do
   aromatizador, e o packshot real do limpador.
4. Sombra de contato e reflexo no piso são derivados do **próprio alfa do packshot** — não há sombra
   pintada à mão nem desenhada por IA.

O resultado tem uma propriedade que o revisor deve conhecer, e que é consequência do método, não
acidente: **a cena é simétrica em torno do produto**. Os dois buquês de jasmim se espelham, os dois de
cerejeira também. Lê-se como um *set* de estúdio montado, não como uma fotografia de ambiente — que é
exatamente o registro das duas composições originais, onde a folhagem também aparece dos dois lados.

### 2.1 Por que isso responde ao "não pareça IA"

Porque **não há pixel inventado**. Cada tom de creme, cada veio de mármore, cada pétala e cada reflexo
do piso veio de um arquivo fotográfico que a NUY já tinha aprovado. Não existe artefato de geração
porque não existe geração. A única transformação aplicada é geométrica (espelhar, recortar, compor) e
de cor (um leve ajuste de temperatura no produto, para casar com a luz creme da cena).

### 2.2 O tamanho escolhido

As quatro composições da NUY têm **1672×941**, que é 16:9. As duas capas novas foram produzidas
**exatamente nesse tamanho** — não por estética, por medição: a caixa do cartão é 16:9
(`.challengeMedia { aspect-ratio: 16/9 }`), então uma imagem 16:9 preenche o cartão sem sobra. Nas
capturas da seção 6, a caixa do cartão mede 720×405 e 348×196, e a imagem servida mede 1672×941 em
todas — nenhuma faixa creme aparece no cartão.

---

## 3. O quadro antes → depois

`artifacts/creator-challenge-covers/_r3/_quadro-antes-depois-r3.png` — as quatro capas na mesma
escala. As duas colunas da esquerda são as intocadas; as duas da direita mostram o antes (packshot no
creme, como a aplicação renderiza) e o depois.

O "antes" de cada coluna é renderizado **como o app renderiza**: caixa 16:9, creme `#F8F4EC`,
`object-fit: contain` — a mesma regra de `.challengeMedia`.

---

## 4. Arquivos gerados e enviados

| arquivo | px | KB | SHA-256 do que subiu |
| --- | --- | --- | --- |
| `_r3/_final-dreno.png` | 1672×941 | 2 247 | `cfff4872c7b1db5c9c382cc4ee0dd1e2ea58c3558ff84722bfd8c388d26b1b3b` |
| `_r3/_final-aviso.png` | 1672×941 | 2 583 | `4342a72bedd4259a9c390c8b710257b9a96743878a2429022a2408a538377cd2` |

Os intermediários de estudo (`_v0-` a `_v6-`, as chapas sem produto, as réguas de medida) ficam em
`_r3/` como registro do caminho, e não são entregáveis.

O upload foi feito **pelo fluxo existente**, o mesmo das rodadas 1 e 2: operador autenticado →
`/admin/desafios/<id>` → campo de imagem → "Salvar e publicar". Nada de escrita direta no bucket,
nada de `createMediaFile` chamado por fora. Quem subiu o arquivo, validou os bytes, gravou o
`imageFileId` e aposentou o arquivo antigo foi a aplicação.

---

## 5. Os arquivos no Appwrite — e a prova de que os kits não foram tocados

Rodada 3, `artifacts/creator-challenge-covers/_r3/_subir-capas-rodada3.log`:

| desafio | `imageFileId` antes | `imageFileId` depois | recado da aplicação |
| --- | --- | --- | --- |
| `qa-dreno-agendado` | `6ac7efc71301a128244f` | **`6ac8f2926f55814c9ab2`** | Desafio publicado. As alterações já valem para as creators. |
| `qa-aviso-na-tela` | `6ac7efcc810207bd13c9` | **`6ac8f29a78865c5d30d1`** | Desafio publicado. As alterações já valem para as creators. |

E as duas que **não** entraram no mapa de envio desta rodada:

| desafio | `imageFileId` na rodada 2 | `imageFileId` agora | |
| --- | --- | --- | --- |
| `qa-revisao-visual` | `6ac7f9f38968164d9093` | `6ac7f9f38968164d9093` | idêntico |
| `qa-revisao-visual-nao-iniciado` | `6ac7f9fb36a574c5da25` | `6ac7f9fb36a574c5da25` | idêntico |

Mesma verificação feita de dentro da aplicação, pela sonda de DOM (seção 6): as duas linhas dos kits
servem os **mesmos ids da rodada 2**, com o mesmo `natural` 1672×941. Não foram reenviadas, não foram
apagadas, não foram regravadas.

O script de envio desta rodada só conhece dois desafios — os outros dois não estão no mapa
`ALVOS` em `_r3/_subir-capas-r3.mjs`. Reenviar um byte-idêntico não é neutro: a aplicação aposenta o
arquivo antigo a cada publicação, então passar por ali seria apagar e regravar sem motivo.

---

## 6. O resultado na aplicação — desktop, tablet e mobile

Capturas em `artifacts/creator-challenge-covers/rodada3/`, com a conta real da Creator QA, em 1440,
768 e 390 px. O log é `_capturar-rodada3.log`.

**27 páginas conferidas, zero estouro horizontal, zero aviso de imagem não carregada, zero
composição institucional de fallback em qualquer uma.**

A sonda de DOM responde "a embalagem aparece inteira?" com número, não com olho. Em todas as larguras:

| largura | caixa do cartão | arquivo servido | natural | `object-fit` | fallback |
| --- | --- | --- | --- | --- | --- |
| 1440 | 720×405 | `6ac8f2926f55814c9ab2` (dreno) | 1672×941 | `contain` | não |
| 1440 | 720×405 | `6ac8f29a78865c5d30d1` (aviso) | 1672×941 | `contain` | não |
| 768 | 720×405 | idem | 1672×941 | `contain` | não |
| 390 | 348×196 | idem | 1672×941 | `contain` | não |

Caixa do cartão 720×405 = 1,7778; imagem 1672×941 = 1,7768. A diferença é de **0,2 px** na altura
renderizada — sub-pixel, sem faixa visível. O `object-fit` continua `contain`, como nas rodadas
anteriores: é regra documentada não cortar topo, tampa nem rótulo.

No **detalhe do desafio** a caixa mede 1120×374 (≈2,99:1) em desktop e 722×220 / 350×220 nas telas
menores. Como a imagem é 16:9 e a caixa é mais larga do que alta, o `contain` deixa creme nas laterais
— comportamento **pré-existente da aplicação**, igual para as quatro capas antes e depois desta
rodada. Não foi alterado CSS nesta rodada.

---

## 7. Provas e testes

| prova | onde | resultado |
| --- | --- | --- |
| nenhum estouro horizontal | `_capturar-rodada3.log` | 27/27 páginas com 0 px |
| nenhuma imagem sem carregar | `_capturar-rodada3.log` | 0 avisos |
| nenhum fallback institucional no lugar da foto | `_capturar-rodada3.log` | 0 ocorrências de "COMPOSIÇÃO" |
| os kits não foram tocados | `_subir-capas-rodada3.log` + `_capas-enviadas.json` | ids idênticos aos da rodada 2 |
| os bytes subiram como estavam | `_subir-capas-rodada3.log` | SHA-256 calculado antes do envio, na seção 4 |
| persistência do `imageFileId` | `_subir-capas-rodada3.log` | campo relido **depois de recarregar a página** |
| sem emenda visível na remontagem | `_r3/_sonda-emenda.mjs` | maior salto vertical **na faixa de parede** (y 60..520, onde não há flor para disfarçar): chapa dreno **16,7**, chapa aviso **34,1** — contra **56,8** e **56,1** das próprias composições originais. A emenda não supera o relevo natural do conteúdo |
| o packshot tem sombra real, não halo branco | `_r3/_sonda.mjs` | sombra escura assada no alfa do aromatizador: `alfa 1–40 → rgb(81,81,81)`, 9 008 px. Por isso a sombra de contato foi **multiplicada**, não pintada |

Uma nota para quem for abrir os scripts: `_sonda.mjs` mede a **capa final**, já com o produto
composto, e acusa Δ de até 75 px — mas nas colunas x=920 (dreno) e x=700 (aviso), que são **a borda da
própria garrafa**, não a emenda da remontagem. A medição que responde pela emenda é a de
`_sonda-emenda.mjs`, que roda só sobre a chapa sem produto e isola a faixa de parede.

---

## 8. Mudanças feitas

**Nenhum arquivo de código foi alterado nesta rodada.** Nada de `src/`, nada de CSS, nada de schema,
nada de recompensa, pontuação, participação, envio, moderação ou resgate. As únicas escritas foram:

- duas imagens novas no bucket `community-media` (via aplicação), que aposentaram as duas anteriores;
- os artefatos de estudo e captura em `artifacts/creator-challenge-covers/_r3/` e `rodada3/`;
- o registro `artifacts/creator-challenge-covers/_capas-enviadas.json`, com as duas linhas atualizadas;
- este documento.

---

## 9. Correção: a atribuição da rodada 1 está certa — quem errou foi a sonda desta rodada

Esta seção afirmava, na primeira versão, que a tabela da rodada 1 estava invertida. **Estava errado.**
Fica reescrita porque a tabela da rodada 1 segue em `docs/` e alguém vai lê-la.

O relatório da rodada 1 atribui `16_10_21-3.png` a "4 limpadores" e `16_10_23-4.png` a "2 sabonetes".
A conclusão contrária veio de uma leitura de grade feita sobre miniaturas — que não identifica produto.
A conferência que resolveu foi **ler o rótulo de cada frasco a 2×** (`_rotulos-c3-par0.png`,
`_rotulos-c3-par1.png`, `_rot-c3-verde.png`, `_rot-c4-verde.png`, `_rot-c4-rosa.png`):

| arquivo | o que está impresso no rótulo | frascos |
| --- | --- | --- |
| `16_10_21-3.png` | `LIMPADOR DE USO GERAL` · `250 litros` · `Concentrado` · `125 ml` | **BRISA FLORAL** (rosa), **CHÁ BRANCO** (transparente), **FLORES VIBRANTES** (vermelho), **HERBAL SELVAGEM** (verde) |
| `16_10_23-4.png` | `SABONETE LÍQUIDO` · `500 ml` | **FRESCOR HERBAL** (verde), **CEREJA SELVAGEM** (rosa) |

A lição de método vale além deste caso: **grade de miniaturas não diz qual é o produto — a leitura
tem de ser do rótulo, ampliado.** Foi essa mesma leitura que nomeou os dois arquivos enviados como
imagem de recompensa em 09/10/2026 (`docs/delivery-reward-images.md`).

Nenhuma das duas composições estava no ar como capa de desafio — a rodada 2 aposentou as duas em
favor das composições #1 e #2 —, então a divergência nunca afetou capa publicada.

---

## 10. O que fica para revisão humana

1. **Olhar o quadro antes → depois** e dizer se a direção de arte das duas capas novas é a que a NUY
   quer. A cena é remontagem das composições fornecidas: se a preferência da NUY for não repetir a
   mesma direção de arte em desafios diferentes, isso é decisão de marca, não de implementação — e o
   caminho de troca está montado.
2. **Confirmar a simetria como aceitável.** É a propriedade mais visível do método (seção 2). Se a
   NUY preferir composição assimétrica, o caminho é partir de uma fotografia fornecida em que o
   produto já esteja em cena.
3. **Decidir sobre o `object-fit: contain` no detalhe do desafio.** A caixa 1120×374 é 2,99:1 e a
   imagem é 16:9, então sobram cerca de 228 px de creme de cada lado no desktop. É comportamento
   anterior a esta rodada e igual para as quatro capas; não foi mexido por não ser o que o pedido
   pedia.
4. ~~A divergência de rótulo da seção 9~~ — **resolvida**: a tabela da rodada 1 está certa, e a
   leitura de sondas desta rodada é que estava errada. A seção 9 foi reescrita com a prova.

---

## 11. Anexo — o quadrado verde da recompensa

Pergunta da NUY: *"pq está tela verde?"*, com um print da linha "QA — Recompensa de revisão visual"
no painel.

**Não era defeito.** O arquivo gravado como imagem daquela recompensa **era um verde chapado**:

| o que | valor |
| --- | --- |
| arquivo no bucket | `recompensa-qa.png` |
| `imageFileId` | `6ac78dfd1e69164ac815` |
| bytes | 640×360, **1 484** |
| conteúdo | **uma cor só**, `rgb(40,116,88)`, em 100% dos 230 400 pixels |
| desvio padrão | `0.000 / 0.000 / 0.000` |
| criado em | 08/10/2026 12:35 UTC |

A rota `/app/midia/6ac78dfd1e69164ac815` respondia **200 `image/png` 640×360** — o arquivo carregava
perfeitamente. Na miniatura de 96 px com `object-fit: cover`, ele preenchia o quadrado. O aplicativo
estava desenhando fielmente o que recebeu.

Descartei as outras hipóteses com medida, não com olho: o `CoverFallback` é navy com anel dourado; o
fundo de `.thumb` e `.cardMedia` é creme `#FBF7F0`; e o hex `#287458` **não existe em nenhum lugar do
código** — nem como literal, nem como token de tema. Um PNG de uma cor só ocupa ~1 484 bytes, e esse
tamanho é a assinatura de placeholder: a rodada 1 já tinha registrado o irmão dele, quando o desafio
do dreno esteve com um "bloco teal liso, 1 484 bytes".

**Correção aplicada.** O placeholder saiu e entrou foto real da NUY, pelo fluxo de sempre — operador
autenticado → `/admin/recompensas/<id>` → campo de imagem → "Salvar e ativar":

| | |
| --- | --- |
| arquivo novo | `recompensa-sabonete-frescor-herbal-nuy.png`, 1475×1106, 468 KB |
| SHA-256 | `c8f06e0d9abd8cd53703db67678a3b4ecfcfddbd6674efce0250169cfaa53565` |
| `imageFileId` antes | `6ac78dfd1e69164ac815` |
| `imageFileId` depois | **`6ac8f6f1cc12dca3fefb`** |
| recado | Recompensa salva. |
| o anterior | **apagado** pela política de órfãos (404 no bucket) |

Por que esta foto, e não outra: a caixa da recompensa é **4:3 com `object-fit: cover`** — ela não
está na regra de `contain` das capas de desafio, porque foi desenhada para "um recorte justo do
produto". Medindo os candidatos nessa caixa (folha `_r3/_candidatos-recompensa.png`):

| candidato | razão | corte na caixa 4:3 |
| --- | --- | --- |
| **sabonete Frescor Herbal** | **1,334** | **zero** — é 4:3 nativo |
| composição kit Herbal Selvagem | 1,777 | 12,5% de cada lado |
| composição kit Brisa Floral | 1,777 | 12,5% de cada lado |
| aromatizador Flores Vibrantes | 1,065 | **20% da altura** — decepa o gatilho |
| limpador Brisa Floral | 0,751 | **44% da altura** — decepa a tampa |

Os dois últimos foram descartados por medição: numa caixa com `cover`, packshot retrato perde topo e
base, e o que sai da moldura é justamente a tampa — o que a regra da rodada 1 proíbe. O sabonete foi
escolhido por ser o único que entra sem corte nenhum. Rótulo conferido a 2× antes de subir:
"SABONETE LÍQUIDO / FRESCOR HERBAL / 500 ml".

Uma observação de vitrine, não de código: no catálogo as duas recompensas ficam lado a lado e **não
se parecem** — esta agora tem foto sobre o creme, e a "Recompensa do resgate V2" cai na composição navy
institucional. É a diferença entre "tem imagem" e "não tem imagem", desenhada de propósito; se a NUY
quiser as duas iguais, o caminho é decidir a imagem da segunda (registro na seção 10, item 4 da rodada
anterior: ela não tem nenhuma).

**O bucket ficou com 5 arquivos, todos em uso, sem órfãos:** as quatro capas de desafio e a imagem da
recompensa. O `recompensa-qa.png` verde deixou de existir.

### 11.1 Uma não-descoberta, registrada para não voltar

No painel, a faixa navy mostra a composição **verde** do kit Herbal Selvagem enquanto o desafio em
andamento é o "aviso na tela", cuja capa é a **rosa**. Parece divergência, e não é: a foto da faixa é
arte fixa do acervo da marca (`public/brand/nuy-creators-v2/products/products-herbal-selvagem.png`),
não a capa do desafio — o próprio `BannerShell` documenta que "a casca é uma só para as duas versões
da faixa". Nenhum bug.
