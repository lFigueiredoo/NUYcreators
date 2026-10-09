# NUY Creators — as imagens das recompensas

Entrega para revisão humana, **9 de outubro de 2026**. **Nada foi commitado, nada foi enviado ao
repositório remoto.** A evidência está em `artifacts/creator-challenge-covers/_r3/` (pasta ignorada
pelo git): os scripts `_subir-recompensas.mjs`, `_varrer-bucket.mjs`, `_conferir-bytes.mjs`,
`_capturar-recompensas.mjs` e `_quadro-recompensas.mjs`, os logs ao lado deles, e as capturas em
`_recompensas-antes/`, `_recompensas-meio/` e `_recompensas-depois/`.

Continua valendo a disciplina das rodadas anteriores (`docs/delivery-creator-challenge-covers.md` e
`-r3.md`): o envio de imagem passa pelo formulário do `/admin`, e **nenhuma imagem é gerada**.

---

## 1. O que o pedido dizia

As duas recompensas de QA apareciam no catálogo uma ao lado da outra e **não se pareciam**: a
"Recompensa de revisão visual" mostrava um frasco de sabonete solto sobre o creme, pequeno no meio da
caixa, e a "Recompensa do resgate V2" caía na composição institucional navy — o "fundo azul genérico".
O pedido: usar **somente** imagens reais já existentes no projeto, sem gerar nada por IA, sem inventar
produto, sem mexer em rótulo, embalagem, cor ou formato; ajustar o container para a imagem ser
apresentada como vitrine; e **parar para revisão**.

| restrição do pedido | como foi cumprida |
| --- | --- |
| não usar imagem gerada por IA | os bytes enviados são, literalmente, os arquivos da NUY — SHA-256 idêntico nos três pontos da cadeia (§12) |
| não inventar produto | as duas composições mostram 6 produtos que existem: 4 limpadores 125 ml e 2 sabonetes 500 ml, rótulos lidos a 2× (§3.1) |
| não alterar embalagem, rótulo, cor ou formato | nenhum pixel foi redesenhado: nada foi recortado, recodificado ou reescalado antes do envio |
| usar só o acervo já disponível | as duas composições escolhidas eram as **únicas** do acervo ainda sem uso (§2) |
| não mexer em regras de negócio | nenhuma mudança em pontos, estoque, resgate, status ou backend (§11) |

---

## 2. O acervo real, auditado

`artifacts/images/` tem 17 arquivos. Os que servem a uma recompensa são:

**8 composições de cena, todas 1672×941 (1,777:1)** — mas são **4 cenas, cada uma guardada em duas
cópias byte a byte idênticas** (mesmo SHA-256 sob dois nomes):

| cena | nomes | conteúdo |
| --- | --- | --- |
| kit Brisa Floral | `16_10_17-1.png` ≡ `17_04_56.png` | trio rosa: sabonete, aromatizador spray, frasco |
| kit Herbal Selvagem | `16_10_19-2.png` ≡ `17_05_08.png` | trio verde |
| 4 limpadores 125 ml | `16_10_21-3.png` ≡ `17_05_16.png` | Brisa Floral, Chá Branco, Flores Vibrantes, Herbal Selvagem |
| 2 sabonetes 500 ml | `16_10_23-4.png` ≡ `17_05_23.png` | Frescor Herbal, Cereja Selvagem |

**7 packshots de produto** (`02_` a `08_`), com razões de **0,469 a 1,334** — dois deles minúsculos
(`05_LIMPADOR_VARIANTE_VERMELHO` tem 173×369; `04_LIMPADOR_CHA_BRANCO` tem 246×328), nenhum deles
16:9. Mais o logo e a referência de site, que não são imagem de produto.

**O que já estava em uso antes desta rodada:** as duas composições de kit (capas dos desafios
`qa-revisao-visual` e `qa-revisao-visual-nao-iniciado`) e o packshot `07` (imagem da recompensa 1).

**O que estava livre:** exatamente `16_10_21-3` e `16_10_23-4`. São as duas que entraram — ou seja,
as recompensas passaram a mostrar composições de cena **que nenhum desafio usa**, o que atende ao
"composições diferentes entre as duas recompensas, para não ficar repetitivo" e evita repetir a arte
das capas de desafio em outro lugar da mesma tela.

### 2.1 Uma divergência de rótulo, resolvida

Dois scripts anteriores rotulavam `17_05_08`/`17_04_56` como "kit Herbal Selvagem"/"kit Brisa Floral"
e `16_10_19-2`/`16_10_17-1` como as mesmas coisas. Os dois estavam certos: **são o mesmo arquivo com
dois nomes**, como a tabela acima prova por SHA. Isso também explica a divergência registrada no §9 do
relatório da rodada 3, que foi corrigido: a tabela da rodada 1 estava certa, e a leitura de grade
sobre miniaturas é que errava.

---

## 3. A imagem de cada recompensa

| recompensa | arquivo original (caminho completo) | px | razão | SHA-256 do que subiu |
| --- | --- | --- | --- | --- |
| QA — Recompensa de revisão visual | `artifacts/images/Imagem do ChatGPT 8 de out. de 2026, 16_10_21-3.png` | 1672×941 | 1,7768 | `cc6c3b0bc56e3d9a9355143a499752a555ecdc42d0bb153eda50a4f4d9c0e789` |
| QA — Recompensa do resgate V2 | `artifacts/images/Imagem do ChatGPT 8 de out. de 2026, 16_10_23-4.png` | 1672×941 | 1,7768 | `327ad6f99defa0dbaf5749b94eb1ba7d63fbbb9cf109e06f7cf743198100408f` |

E o que aconteceu em cada uma — **as duas foram troca de `imageFileId`, não ajuste de layout**:

| recompensa | `imageFileId` antes | `imageFileId` depois | recado da aplicação |
| --- | --- | --- | --- |
| QA — Recompensa de revisão visual | `6ac8f6f1cc12dca3fefb` (packshot do sabonete) | **`6ac8feb12f7d0d86b3ac`** | Recompensa salva. |
| QA — Recompensa do resgate V2 | *(nenhuma — caía no institucional)* | **`6ac8feb85aae8c2f7485`** | Recompensa salva. |

O arquivo antigo da recompensa 1 foi **aposentado e apagado** pela política de órfãos da própria
aplicação (404 no bucket), como manda o desenho — não foi limpeza minha.

### 3.1 Os rótulos, lidos antes de nomear

Nenhum arquivo foi nomeado por palpite. Cada frasco foi recortado e ampliado a 2× antes de virar nome
de arquivo (`_rotulos-c3-par0.png`, `_rotulos-c3-par1.png`, `_rot-c3-verde.png`, `_rot-c4-verde.png`,
`_rot-c4-rosa.png`):

- **`16_10_21-3`** — `LIMPADOR DE USO GERAL`, `rende até 250 litros`, `Concentrado`, **125 ml**:
  **Brisa Floral** (rosa), **Chá Branco** (transparente), **Flores Vibrantes** (vermelho),
  **Herbal Selvagem** (verde).
- **`16_10_23-4`** — `SABONETE LÍQUIDO`, **500 ml**: **Frescor Herbal** (verde),
  **Cereja Selvagem** (rosa).

---

## 4. O container da mídia

Era o coração do problema. A caixa da vitrine era **4/3 (1,333:1)** com `object-fit: cover`, e a arte
da NUY é **16:9 (1,777:1)**. Essa diferença de 33% tinha de sair de algum lugar — e saía do produto.

**A medição, no arquivo, não no olho.** A caixa 4/3 de 546×410 com `cover` mantinha da fonte a janela
**x 209..1463**. Medindo onde o corpo das garrafas realmente está, por varredura de pixel
(`_decisao.mjs` e sonda de linha):

| linha | corpo da garrafa rosa começa em | fora de quadro |
| --- | --- | --- |
| y = 600 | x = **172** | 37 px |
| y = 700 | x = **112** | **97 px** |

Ou seja: a garrafa da ponta esquerda era **fatiada até 97 px adentro**, com o rótulo cortado ao meio.
A garrafa da ponta direita sofria o mesmo do outro lado. As duas pontas — justamente o que a regra da
rodada 1 proíbe cortar.

**A correção: a caixa passa a ter a proporção da ARTE.** `.rewardMedia` foi de `4/3` para `16/9`, e a
vitrine entrou na mesma regra de `contain` que a capa de desafio já usava.

| | antes | depois |
| --- | --- | --- |
| proporção da caixa | 4/3 (1,333) | **16/9 (1,7778)** |
| `object-fit` | `cover` (corte nosso) | **`contain`** |
| fonte 1672×941 (1,7768) | janela x 209..1463 — **cortava** | **arte inteira, x 0..1672** |
| desktop | 546×410 | **546×307** |
| telefone | 348×232 (havia um override `3/2` só no mobile) | **348×196** |
| sobra | — | **0,06% (sub-pixel, ≤0,1 px)** |

A diferença entre 16/9 da caixa e 1,7768 da arte é de **0,06%** — no desktop isso dá **um décimo de
pixel** de folga. Não aparece faixa de creme em lugar nenhum, que é o que a captura confirma (§9).

O override de `3/2` que existia só no mobile foi **removido**: ele nascera quando a caixa do desktop
era 4/3 e a foto ficava alta demais no telefone. Com a caixa em 16/9 o problema não existe mais, e
mantê-lo faria **a mesma composição ser recortada só no telefone**.

O `contain` também protege o futuro: se um dia alguém subir um packshot retrato (as razões do acervo
vão de 0,469 a 1,334), ele entra **inteiro**, com creme nas laterais, em vez de perder a tampa — que é
exatamente o que a regra de `contain` das capas de desafio já documentava.

---

## 5. As miniaturas

A mesma composição aparece também em miniatura: **96×96** na coluna de recompensas do painel (72×72 no
telefone) e **56×56** nas linhas compactas. Essas molduras são **quadradas** com `cover`, o que numa
arte 16:9 corta **44% da largura** — sobrariam as duas garrafas do meio e as das pontas seriam
fatiadas.

`.thumb` é compartilhada com desafios, conteúdos e perfil, então a correção foi **escopada**: a linha
de recompensa ganhou a classe `rewardThumb`, e só ela entra inteira. As outras molduras de 56 px do
produto continuam com o corte que sempre tiveram.

O resultado é a composição como uma faixa 16:9 centrada no quadrado, sobre o mesmo creme — uma vitrine
pequena, com o produto inteiro.

---

## 6. O fallback sem imagem

O pedido manda manter o fallback, mas torná-lo mais elegante e menos genérico. O `CoverFallback` era
**navy com anel dourado** — e era exatamente o "bloco institucional" reclamado.

Criei `RewardCoverFallback`: **a mesma composição de identidade, na paleta clara** — creme no lugar do
navy, ouro e navy em tinta, mesmo anel, mesmo lockup, mesma régua. Nada muda de lugar entre as duas
paletas, e nenhuma foto é inventada para fingir que existe uma.

O desenho em si foi extraído para um `CoverMark` compartilhado, para não haver duas marcas.

> **Isto já não aparece em nenhuma recompensa** — as duas passaram a ter imagem. Fica para quando uma
> recompensa nova for publicada sem foto.

### 6.1 Um erro meu, que a captura pegou

A primeira versão do fallback claro ficou **ilegível**: o lockup saía **creme sobre creme**. A causa
era especificidade — a cor do texto vem de `.app.creator .coverBrand` (**0,3,0**) e a minha regra era
uma classe solta (**0,2,0**), que perde. Corrigido com o prefixo `.app.creator`.

Mas havia um erro maior, e mais interessante: **mesmo legível, o creme liso com a marca no centro de
uma caixa de 546×307 lê como "imagem que não carregou"** — que é precisamente o problema que a
composição navy existia para resolver. A captura de tela foi o que denunciou; nenhuma leitura de CSS
teria denunciado. A correção foi dar **estrutura à superfície**: um fio dourado a 15 px da borda, que
diz que ali há um desenho e não uma falha.

`_recompensas-meio/_zoom-fallback.png` é o registro do antes e do depois deste item.

---

## 7. O quadro antes → depois

`artifacts/creator-challenge-covers/_r3/_quadro-recompensas.png` — as duas caixas na **largura real**
(546 px no desktop, sem reescala), antes e depois, mais a mesma comparação a 390 px.

O "antes" é a captura de verdade da aplicação com a conta da Creator QA, não uma reconstrução: o mesmo
script, com o mesmo cookie de sessão, rodou antes e depois. As duas passagens estão lado a lado em
`_recompensas-antes/` e `_recompensas-depois/`.

O que o quadro mostra:

- **antes**, recompensa 1: um frasco de sabonete sozinho sobre o creme, ocupando pouco mais de um
  terço da largura da caixa;
- **antes**, recompensa 2: o bloco navy institucional, sem foto;
- **depois**, as duas: composição real, de ponta a ponta, sem corte, sem faixa e sem bloco.

---

## 8. Responsividade — 1440 e 390

`_capturar-recompensas.mjs depois` percorre `/app/recompensas`, `/app` e `/app/perfil` em 1440 e 390 e,
além do PNG, **mede o que a página desenhou** — assim uma imagem que não carregou não passa despercebida.

**6 páginas conferidas: zero estouro horizontal, zero imagem sem carregar, zero fallback institucional.**

| largura | tela | caixa | razão | arquivo servido | natural | razão | `object-fit` | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | vitrine | 546×307 | 1,778 | `6ac8feb12f7d0d86b3ac` | 1672×941 | 1,777 | `contain` | não |
| 1440 | vitrine | 546×307 | 1,778 | `6ac8feb85aae8c2f7485` | 1672×941 | 1,777 | `contain` | não |
| 1440 | painel | 96×96 | 1,000 | os dois ids acima | 1672×941 | 1,777 | `contain` | não |
| 390 | vitrine | 348×196 | 1,778 | os dois ids acima | 1672×941 | 1,777 | `contain` | não |
| 390 | painel | 72×72 | 1,000 | os dois ids acima | 1672×941 | 1,777 | `contain` | não |

Legibilidade do texto do cartão: intacta — o corpo do cartão não mudou de fonte, de cor nem de
pululação; só a caixa de mídia ficou mais baixa (410 → 307 no desktop), e o texto continua com o mesmo
espaço. No telefone a caixa foi de 232 para 196 px de altura.

---

## 9. Arquivos alterados

**Código — três arquivos, nenhum de regra de negócio:**

| arquivo | o que mudou |
| --- | --- |
| `src/features/workspace/styles/app.module.css` | `.rewardMedia` de `4/3` para `16/9`; `.rewardMedia .catalogMediaImg { object-fit: contain }`; `.rewardThumb .catalogMediaImg { object-fit: contain }`; remoção do override `3/2` do mobile; `.rewardFallback` (paleta clara) e a moldura de fio dourado; comentários de topo atualizados |
| `src/features/workspace/components/ui/card.tsx` | novo `RewardCoverFallback`; o desenho foi extraído para `CoverMark`, compartilhado com o `CoverFallback` que já existia |
| `src/features/workspace/components/reward-card.tsx` | passa `RewardCoverFallback` em vez de `CoverFallback`; a linha compacta ganha a classe `rewardThumb` |

`npm run typecheck` e `eslint` nos dois componentes alterados: **limpos**.

**Dados — três escritas, todas pela aplicação:** duas imagens novas no bucket `community-media`
(via `/admin/recompensas/<id>` → "Salvar e ativar"), e a aposentadoria do arquivo antigo da
recompensa 1 pela política de órfãos. **Nenhuma escrita direta no bucket, nenhum `createMediaFile`
chamado por fora.**

**Evidência e documento:** os scripts, logs e PNGs em `artifacts/creator-challenge-covers/_r3/`; a
correção do §9 de `docs/delivery-creator-challenge-covers-r3.md`; e este documento.

---

## 10. O que NÃO foi alterado

- **Regra de negócio**: nada de pontos, saldo, estoque, resgate, elegibilidade, status, moderação,
  participação ou envio. Nenhuma rota, nenhuma `action`, nenhum schema, nenhuma função.
- **Backend**: nenhuma tabela, coluna, índice, permissão ou variável de ambiente.
- **O sistema de imagem privada**: bucket privado, rota `/app/midia/[fileId]`, controle de acesso e
  o campo `imageFileId` continuam como estavam. Nada de imagem pública, nada embutida em base64.
- **As capas dos desafios**: os quatro `imageFileId` de desafio seguem **os mesmos da rodada 3** —
  `6ac7f9f38968164d9093`, `6ac7f9fb36a574c5da25`, `6ac8f2926f55814c9ab2`, `6ac8f29a78865c5d30d1` —
  e o `CoverFallback` navy continua sendo o desenho delas.
- **As outras molduras de 56 px**: desafio, conteúdos e perfil continuam com o corte que sempre
  tiveram; a regra nova é escopada por `rewardThumb`.
- **A faixa do painel**: continua com a arte fixa da marca, como o `BannerShell` documenta.

---

## 11. Provas

| prova | onde | resultado |
| --- | --- | --- |
| os bytes da tela são o arquivo da NUY | `_conferir-bytes.log` | SHA-256 igual nos **três** pontos (arquivo → rota `/app/midia` → bucket), nas duas recompensas |
| os bytes subiram como estavam | `_subir-recompensas.log` | SHA-256 calculado **antes** do envio, conferido contra o `sizeOriginal` do bucket |
| persistência do `imageFileId` | `_subir-recompensas.log` | campo relido **depois de recarregar a página** |
| o arquivo antigo foi aposentado | `_subir-recompensas.log` | `6ac8f6f1cc12dca3fefb`: 404 — aposentado e apagado |
| nenhum órfão no bucket | `_varrer-bucket.log` | **6 arquivos, 0 órfãos** — todos com a linha que os referencia |
| nenhuma imagem sem carregar | `_capturar-recompensas-depois.log` | 0 avisos em 6 páginas |
| nenhum fallback institucional na vitrine | `_capturar-recompensas-depois.log` | 0 ocorrências |
| sem estouro horizontal | `_capturar-recompensas-depois.log` | 0 px em 1440 e 390 |
| os rótulos não foram adivinhados | `_rotulos-c3-par*.png`, `_rot-c4-*.png` | cada frasco lido a 2× antes de nomear |
| as duas cópias são o mesmo arquivo | SHA dos 8 | pares `16_10_*`/`17_*` idênticos byte a byte |
| typecheck e lint | `tsc --noEmit`, `eslint` | limpos |
| a suíte e2e do app continua verde | `npm run test:e2e:app` | **21/21**, incluindo os dois que exercitam o que mudou aqui: *"sem imagem gravada, a caixa mostra a capa institucional — e nenhum img quebrado"* e *"de 1920 a 375: nenhuma tela estoura na horizontal"* |
| a suíte unitária | `npm test` | 186/187. A única falha (`onboarding-endpoint.test.ts`) é **pré-existente e ambiental**: estoura o timeout de 5 s no primeiro import sob 22 workers, e passa em **650 ms** com `--testTimeout=30000`. O arquivo não tem modificação local e não importa nada alterado nesta rodada |

---

## 12. O que fica para revisão humana

1. **Olhar o quadro antes → depois** (`_quadro-recompensas.png`) e dizer se a escolha está certa:
   a recompensa 1 recebeu os **4 limpadores** e a 2 os **2 sabonetes**. As duas composições livres do
   acervo foram usadas; a troca entre elas é trivial se a preferência for a inversa.
2. **Aprovar a caixa 16/9 no lugar da 4/3.** Foi a decisão central desta rodada e a que mais muda o
   cartão: a caixa ficou mais baixa (546×307 no desktop, 348×196 no telefone). A justificativa é
   medida (§4), mas é uma escolha de proporção — e proporção é decisão de marca.
3. **Decidir sobre a miniatura quadrada.** No painel, a composição aparece como uma faixa 16:9
   centrada num quadrado de 96 px, com creme acima e abaixo. A alternativa seria cortar (e cortar
   fatia as garrafas das pontas). Se a preferência for uma miniatura mais cheia, o caminho é a
   moldura da linha de recompensa deixar de ser quadrada.
4. **Confirmar que imagem de QA não vira promessa de produto.** As duas recompensas são de QA ("não é
   um prêmio real"), então a imagem é peça de marca. Quando uma delas virar prêmio de verdade, a
   imagem tem de ser a do produto que a Creator recebe — a mesma regra que já vale para as capas de
   desafio.
