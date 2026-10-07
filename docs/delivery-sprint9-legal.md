# Sprint 9 — as páginas legais em vigor

`/termos` e `/privacidade` deixaram de ser dois parágrafos de aviso e passaram a ser
os documentos que a plataforma já promete no aceite. Nada de segredo aqui: nem
endpoint, nem id de projeto, nem chave.

---

## 1. O que a rodada consertou de fato

As duas rotas estavam **órfãs de estilo** desde o commit `a666986` ("refine NUY
Creators public landing motion"): naquele commit as classes `legal`, `legalTitle`,
`legalNote` e `sectionEyebrow` saíram do `landing.module.css`, e as duas páginas
continuaram a pedi-las. O que o servidor publicava era `class="undefined"` — sem
coluna, sem medida, com o texto transbordando a viewport em qualquer largura.

O gate `experience-boundary.spec.ts` pegava a **frase** de cada página e não pegava
a **forma**, então o defeito atravessou sprints sem aparecer em vermelho. Agora o
mesmo teste mede também a largura: `documentElement.scrollWidth <= innerWidth` nas
duas rotas, nos dois projetos (desktop e mobile).

## 2. O que passou a existir

- **`src/features/legal/components/legal-document.tsx`** — a moldura de documento:
  sobretítulo, título, linha de versão, aviso e corpo. O chrome (header e rodapé)
  continua vindo do layout de `(public)`, então a identidade é a mesma da landing;
  o que muda é a página ser um documento: coluna estreita, ritmo de leitura,
  nenhum reveal (`data-pl-reveal` não existe aqui — o observer é só da landing).
- **`src/features/legal/styles/legal.module.css`** — a coluna e a tipografia do
  miolo. Os tokens (`--nuy-*`, `--pl-font-*`) **não** são redefinidos: eles são
  herdados do contêiner `pl-landing` que o layout monta, para a página não divergir
  da landing. Conferido no DOM: `--nuy-navy #082b55`, `--nuy-cream #f8f4ec` e
  `--nuy-ruler` resolvem dentro do `article`.
- **`/termos`** — treze seções, cada uma nomeando algo que a plataforma já faz:
  idade mínima, desafios e campanhas, conteúdo enviado, moderação, Pontos NUY,
  ranking, recompensas, integridade, redes não verificadas, LGPD, imagem e voz,
  versionamento e legislação.
- **`/privacidade`** — o corpo do texto de staging, na íntegra, com o fecho de
  provisoriedade no fim.

## 3. Nada foi inventado — o que cada frase pode apontar

- **Nenhum controlador, CNPJ, DPO, endereço ou e-mail de encarregado é nomeado**,
  porque nenhum deles existe no projeto hoje. O caminho para exercer direitos são
  "os canais oficiais da NUY". **`LEGAL_CONTROLLER_CONFIRMATION_PENDING`**: a
  identificação formal do controlador continua pendente e nenhuma frase depende
  dela para fazer sentido — as duas páginas dizem a quem escrever sem dizer quem
  responde juridicamente. Na primeira rodada as páginas diziam "canais oficiais
  disponibilizados pela **Mundo NUY**"; o nome saiu por não ser (nem poder ser
  apresentado como) razão social, controladora ou pessoa jurídica (§12).
- **"Mundo NUY" não aparece em nenhum arquivo do projeto.** As duas ocorrências
  que existiam eram as duas páginas legais, e as duas foram trocadas por "canais
  oficiais da NUY". O que sobra no repositório é a menção a esta decisão, em
  comentário e neste relatório — nunca em texto jurídico.
- **"Não verificado" é estado real do produto**, não retórica: é o que
  `profile-screen.tsx`, `onboarding-form.tsx` e `creators-screen.tsx` renderizam
  para `verificationStatus` não verificado.
- **Pontos sem valor monetário, resgate sujeito a estoque, moderação com motivo
  registrado** — as três frases descrevem comportamento que o ledger, o catálogo
  e a fila de moderação já executam.
- **A idade mínima é checada duas vezes**: no preenchimento do perfil e, de novo,
  dentro da function (`age < minimumAge` → `age_requirement`). O texto diz as duas
  coisas e as duas acontecem.

## 4. O aviso honesto continua — e em lugar diferente em cada página

A versão em vigor é **provisória** e continua marcada como tal. O que mudou é onde
cada página declara isso, e a escolha é deliberada:

| página         | onde o aviso aparece       | o que ele diz                                                                                                        |
| -------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/termos`      | topo, antes da 1ª cláusula | "Versão provisória — sujeita à revisão jurídica antes do lançamento definitivo."                                     |
| `/privacidade` | fecho do corpo             | "Esta versão é provisória para validação operacional e deverá ser revisada antes da abertura definitiva ao público." |

Nos termos o aviso vem antes: quem vai clicar em "aceito" precisa saber o que está
aceitando antes de ler. Na política ele fecha o corpo, junto das demais ressalvas —
é o formato do texto aprovado para o staging e não foi reescrito para caber na
rodada.

## 5. A versão declarada é a mesma que o aceite registra

A página declara `2026-10-07-v1`. Isso não é um carimbo de decoração: é a string que
a function grava em `acceptedTermsVersion` quando a participante conclui o perfil.
Lida agora do container `complete-onboarding`:

```
NUY_TERMS_VERSION = "2026-10-07-v1" (secret: false)
NUY_MINIMUM_AGE = "18" (secret: false)
```

**Correção de método, não de dado:** o probe do sprint 8 conferia a política pelo
campo `hasValue` de `listVariables` e esse campo vinha `false` mesmo logo depois de
um `set` com valor — ou seja, ele não serve para conferir nada. O caminho que
devolve o valor de verdade é `listVariables` lendo `v.value` (é o que
`artifacts/sprint9-legal/probe-politica.mjs` faz, e o único script da rodada que
toca o Appwrite — só leitura).

## 6. O aceite das duas telas de entrada

A redação do aceite mudou nos dois formulários (`/cadastro` e `/onboarding`) para
dizer o que o produto realmente exige:

> Declaro que tenho 18 anos ou mais e li e concordo com os **Termos de Uso** e a
> **Política de Privacidade** do NUY Creators.

Os dois nomes são links reais (`/termos` e `/privacidade`), e clicar neles **navega
sem marcar a caixa** — `<a>` é conteúdo interativo, então o `<label>` não dispara a
ativação do controle. Medido: caixa `false` antes, `false` depois de navegar; o
clique direto na caixa continua marcando (`false → true`, mesma URL).

O clique foi medido em `/cadastro`, que é público. O aceite de `/onboarding` está
**atrás de sessão** e a captura não o alcança (`aceite nao encontrado` no
`resumo.txt`, e é o esperado — a rota redireciona sem sessão); lá a cobertura é a
suíte autenticada, não esta rodada.

## 7. Medições da rodada

Coluna, medida de linha, contraste e presença do aviso, tudo lido do DOM renderizado
(`artifacts/sprint9-legal/probes.json`). A primeira linha da tabela é o estado
**antes** do polimento (§9); as demais, o estado entregue:

| rota × viewport      | coluna do corpo | car/linha (média de todas as linhas) | rolagem horizontal | aviso topo | aviso fecho |
| -------------------- | --------------- | ------------------------------------ | ------------------ | ---------- | ----------- |
| **antes** (as duas)  | 720px           | **98**                               | não                | —          | —           |
| `/termos` @1920      | 623px (69,2ch)  | **68,3** (41 linhas)                 | não                | sim        | não         |
| `/privacidade` @1920 | 623px (69,2ch)  | **68,6** (31 linhas)                 | não                | não        | sim         |
| `/termos` @1440      | 623px (69,2ch)  | **68,3** (41 linhas)                 | não                | sim        | não         |
| `/privacidade` @1440 | 623px (69,2ch)  | **68,6** (31 linhas)                 | não                | não        | sim         |
| `/termos` @390       | 350px (38,9ch)  | 40,0 (70 linhas)                     | não                | sim        | não         |
| `/privacidade` @390  | 350px (38,9ch)  | 40,2 (53 linhas)                     | não                | não        | sim         |

Texto do corpo em `0,95rem`/`1,8` nas seis (15,2px / 27,36px): o mesmo parágrafo do
resto do site, agora declarado no documento. `ch` é medido na fonte renderizada
(largura do zero), não presumido.

A moldura e o cabeçalho continuam em **720px** (título, linha de versão, aviso do
topo e a régua que fecha o cabeçalho): quem estreitou foi só o corpo do texto. No
celular nada mudou — 623px não cabe em 350px, então lá quem manda é a moldura.

Contraste medido no par **composto** (o `rgba()` do texto sobre o creme da página,
não sobre branco): aviso **15,42:1**, corpo **15,42:1**, título **14,12:1**,
subtítulo **5,89:1** — os mesmos números de antes do polimento. Zero erro de
JavaScript nas seis navegagens; header e rodapé presentes nas seis; os **8 destinos
de link** de cada página respondem (nenhum 4xx).

### Duas medições erradas que valem o registro

1. **O tamanho do texto era medido no contêiner, não no parágrafo.** O `.body`
   declarava `1.075rem` enquanto os parágrafos renderizavam em `0.95rem`, porque a
   regra global `p { font-size: 0.95rem }` (`globals.css`, sobra do tema antigo)
   vence a herança. O relatório anterior publicou "corpo 17,2px" quando o texto
   tinha 15,2px — e uma coluna pedida em `em` contra o número errado sai 13% mais
   larga que o previsto. O probe agora lê o estilo do **parágrafo**.
2. **Linha se conta por `top` distinto, não por retângulo.** Um `<strong>` no meio
   do parágrafo parte a linha em vários retângulos do Range: contando retângulos,
   os termos mediam 48 caracteres contra 69 da política **na mesma coluna**. O
   probe agora agrupa por `top`.

## 8. Achados abertos

1. ~~A medida de linha no desktop é longa: 98 caracteres.~~ **Resolvido (§9).**
2. ~~A política não tem seções.~~ **Resolvido (§9)** — nove títulos editoriais, sem
   tocar em uma palavra do texto jurídico.
3. ~~"Mundo NUY" só existe nas duas páginas legais.~~ **Resolvido (§9)** — as duas
   ocorrências saíram; o que resta é menção à decisão, não texto jurídico.
4. **`LEGAL_CONTROLLER_CONFIRMATION_PENDING`** — segue aberto e é do jurídico, não
   do código: identificar formalmente o controlador (razão social, CNPJ, DPO,
   endereço, canal do encarregado). As duas páginas foram escritas para não
   dependerem disso; quando a identificação existir, ela entra como **acréscimo**,
   sem reescrever as frases que já estão lá.

## 9. Polimento final (mesma rodada, sem tocar no conteúdo jurídico)

Três ajustes de apresentação, e o que cada um custou em texto:

| ajuste                                 | onde                                   | efeito no texto jurídico |
| -------------------------------------- | -------------------------------------- | ------------------------ |
| medida de leitura ~68–72 car.          | `legal.module.css` (`max-width: 41em`) | **nenhum**               |
| política em nove seções                | `privacidade/page.tsx`                 | **nenhum** — só `<h2>`   |
| "Mundo NUY" → "canais oficiais da NUY" | as duas páginas                        | troca de 2 frases        |

- **Medida:** `.body` passou a `max-width: 41em` **e** a declarar `font-size:
0.95rem`/`line-height: 1.8` — o tamanho que o texto realmente tem. A largura é
  pedida em `em` do próprio corpo, e **não** em `ch`: em fonte proporcional `1ch` é
  a largura do zero, bem mais larga que a média das letras, e `70ch` daria os
  mesmos 720px que já estavam lá. 41em de 0,95rem = 623px.
- **Seções:** os nove parágrafos continuam na mesma ordem, um a um; entrou um `h2`
  antes de cada. Prova mecânica — o texto extraído das duas versões é idêntico em
  8 dos 9 parágrafos, e a única diferença é a troca de "Mundo NUY" no parágrafo 7
  (o nono é o fecho de provisoriedade). Nenhuma obrigação nova, nenhuma frase
  removida, nenhum sentido alterado.
- **Títulos:** Como usamos seus dados · Dados tratados · Idade mínima · Redes
  sociais · Fornecedores e obrigações legais · Retenção e segurança · Seus direitos
  · Imagem, voz e conteúdo · Sobre esta versão.
- **Mundo NUY:** duas ocorrências, as duas no mesmo formato ("canais oficiais
  disponibilizados pela Mundo NUY"). Nenhuma das duas identificava controlador —
  as duas só diziam de quem são os canais, então a troca preserva o sentido e não
  inventa entidade.

## 10. O que não foi tocado

Appwrite (nenhuma tabela, coluna, índice, bucket, function ou variável), auth
(server actions, sessões, cookies, redirects, validações, tokens), permissões,
regras de pontos e níveis, rotas protegidas, e-mail e env. **Nenhuma escrita no
projeto remoto** — o único script da rodada que fala com o Appwrite só lê (§5).
Commit local, sem push.

## 11. Verificação

| checagem                                    | resultado                                                           |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `npx tsc --noEmit`                          | limpo                                                               |
| `npm run lint`                              | 0 erros · 32 avisos, todos anteriores e fora dos arquivos da rodada |
| `npx prettier --check` (arquivos da rodada) | todos formatados                                                    |
| `npm test` (vitest)                         | 16 arquivos · **125 testes passando**                               |
| `npm run test:e2e` (público)                | **58 passando · 14 pulados · 0 falhando**                           |
| `npm run build`                             | ok; `/termos` e `/privacidade` seguem dinâmicas (`ƒ`)               |

O gate novo dentro de `experience-boundary.spec.ts` é o que trava a regressão de
forma: título exato, aviso exato e **sem rolagem horizontal**, nas duas rotas e nos
dois projetos.

## 12. O gate da medida de leitura

A coluna deixou de ser só um número neste documento e passou a ser contrato.

**`experience-boundary.spec.ts` → "a coluna dos documentos legais mantém a medida
de leitura"** (os dois projetos). Lê o `getBoundingClientRect()` do elemento REAL
que contém os parágrafos, ancorado por `data-testid="legal-body"` — o nome da
classe é hasheado pelo CSS Module e não serve de âncora. Sem screenshot, sem
pixel, sem OCR, sem média de caracteres.

| viewport       | o que o gate exige                                                 |
| -------------- | ------------------------------------------------------------------ |
| desktop (1280) | **600px ≤ corpo ≤ 640px**, e o corpo mais estreito que a moldura   |
| mobile (390)   | o corpo **igual à moldura** (±1px), `min-width` sem piso em px     |
| os dois        | `documentElement.scrollWidth ≤ innerWidth` e ≥1 parágrafo no corpo |

O que ele **não** testa, de propósito: os 69,2ch exatos, a média de ~68 caracteres
por linha, a contagem de linhas e o ponto das quebras. Isso é evidência da rodada
— está na §7 e nos `probes.json` — e muda com qualquer palavra nova. O contrato é
a geometria: é ela que volta a 720px (~98 caracteres) se o `max-width` sair.

**O gate foi testado ao contrário.** Com `max-width: none` no lugar de `41em`, ele
cai: `Expected: <= 640 · Received: 720` em `/termos` desktop — e o mobile continua
passando, que é o correto (lá a coluna legitimamente usa a largura disponível). Um
gate que nunca falha não protege nada; este falha pelo motivo certo.

## 13. Evidências (`artifacts/sprint9-legal/`)

- `termos-{1920,1440,390}.png`, `privacidade-{1920,1440,390}.png` — página inteira,
  `loading=eager` + `decode()` antes do disparo, DPR 2 no mobile.
- `zoom-termos-aviso-{1920,1440,390}.png` — o aviso de provisoriedade ampliado 2×.
- `zoom-privacidade-versao-*` — a linha de versão ampliada (a política não tem
  aviso no topo; rotular o subtítulo de "aviso" seria evidência mentirosa).
- `cadastro-aceite-1920.png` e `zoom-cadastro-aceite.png` — o aceite novo.
- `probes.json`, `resumo.txt` — as medidas da §7, cruas (inclui o probe de links).
- `politica-do-container.txt`, `probe-politica.mjs` — a leitura da §5.
- `termos-antes.tsx`, `privacidade-antes.tsx` — as duas páginas antes do polimento,
  congeladas para a comparação de texto da §9.
- `debug-medida.mjs` — o diagnóstico que achou o `0.95rem` do `globals.css`.
- `medida-no-gate.mjs` — a coluna lida nos viewports DO GATE (1280 e 390), para
  confirmar em vez de presumir que o número fixo em px não muda com o viewport.
- `../../scripts/capture-legal-docs.mjs` — o script que produz tudo acima.

`artifacts/` fica fora do commit: é evidência, não código. O script de captura
entra por seguir a convenção já existente no repositório (cada rodada versiona o
seu: `capture-admin.mjs`, `capture-clean-landing.mjs`, `capture-qa-visual.mjs`) e
por ser o único executável que reproduz a evidência citada aqui — contraste no par
composto, os destinos de link e o probe do aceite, que nenhum teste cobre.
