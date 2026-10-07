# Sprint 7 — administração e conteúdo real

A área administrativa do NUY Creators, entregue para a equipe operar **sem abrir o
Console, SQL, script ou código** no dia a dia. Nada de segredo aqui: nem endpoint,
nem id de projeto, nem chave.

## 1. O que a equipe passa a operar

Treze páginas em `/admin` mais o layout que as serve. Toda rota confere **sessão +
membership confirmada** em `nuy-admins` no servidor, e cobra a capacidade certa —
o menu escondido é conveniência, nunca a barreira.

| rota                      | capacidade       | o que resolve                                          |
| ------------------------- | ---------------- | ------------------------------------------------------ |
| `/admin`                  | `view-audit`     | visão geral do acervo e do que espera agora            |
| `/admin/desafios`         | `manage-catalog` | catálogo de desafios, por estado                       |
| `/admin/desafios/novo`    | `manage-catalog` | criar desafio (rascunho ou publicado)                  |
| `/admin/desafios/[id]`    | `manage-catalog` | editar, publicar, encerrar, ajustar estoque/requisitos |
| `/admin/recompensas`      | `manage-catalog` | catálogo de recompensas e edição de estoque            |
| `/admin/recompensas/nova` | `manage-catalog` | criar recompensa                                       |
| `/admin/recompensas/[id]` | `manage-catalog` | editar, publicar, desativar, corrigir estoque          |
| `/admin/creators`         | `view-audit`     | quem são as creators e o que cada uma acumulou         |
| `/admin/creators/[id]`    | `view-audit`     | ficha da creator: jornada, pontos, resgates            |
| `/admin/submissoes`       | `moderate`       | fila de moderação consolidada                          |
| `/admin/submissoes/[id]`  | `moderate`       | decidir envio (aprovar / pedir revisão / recusar)      |
| `/admin/campanhas`        | `manage-catalog` | campanhas                                              |
| `/admin/relatorios`       | `view-audit`     | período: creators, desafios, envios, pontos, semanas   |

Papéis: `admin` acumula as cinco capacidades; `moderator` tem `moderate`;
`fulfillment` tem `fulfill`. Um papel a mais nunca é concedido por engano: papel
vem de membership **confirmada** e a apuração roda por sessão (a identidade da
linha é conferida; listagem não filtrada não vale papel).

## 2. Nada foi inventado — de onde cada número vem

- Toda leitura passa por `@/features/admin/services/*`; a página é casca. Um portão
  (`tests/unit/app-no-fake-data.test.ts`) percorre as treze páginas e falha se
  alguma montar dado próprio ou deixar de passar pela porta.
- Zero é resposta: sem desafio, mostra 0; sem creator, mostra 0. Não existe
  "preencher para a tela não ficar vazia".
- Estados são os que o banco já tinha (`draft · published · closed`); `active`
  continua sendo lido como "no ar" e nunca oferecido como escolha.
- **Nenhuma coluna, índice ou tabela nasceu nesta rodada.** O plano remoto fecha
  `0 create · 0 update · 310 noop · 0 security drift · 0 immutable drift ·
0 blockers`. O único recurso novo do sprint é a function `admin-console` (§3).

## 3. Registro da única mudança de infraestrutura: function `admin-console`

Exigido pela própria rodada: "se algum campo/index precisar ser adicionado, não
aplicar silenciosamente; documentar mudança, motivo, impacto e rollback".

- **Mudança:** uma entrada em `functionDefinitions` (`infra/appwrite/schema.ts`),
  publicada pela `infra:deploy`. Nada de schema de dados: nenhuma tabela, coluna ou
  índice.
- **Motivo:** a área administrativa precisa de escritas que a sessão da creator não
  pode fazer (criar/publicar desafio e recompensa, corrigir estoque). O caminho é o
  mesmo já provado na moderação — Function com `execute: ['team:nuy-admins']` e
  reapuração de capacidade dentro do container (`manage-catalog`, `moderate`,
  `view-audit`) — em vez de dar escrita de linha à chave de sessão do app.
- **Impacto:** nenhum papel novo; `team:nuy-admins` já é a equipe que a moderação
  usa. A chave de sessão do app **não** ganhou escopo (a exigência do §12 continua
  valendo, e nenhuma escrita administrativa passa pelo navegador).
- **Rollback:** remover a entrada do manifesto e rodar `infra:deploy` — a function
  fica órfã no projeto e pode ser apagada; nenhum dado depende dela. O caminho de
  volta é de um deploy, sem migração.
- **Prova:** o plano remoto a mostra como `NOOP` (publicada e habilitada como
  declarada) e a suíte de integração exercita o fluxo inteiro por ela.
- **Deploy corrigido (§4), medido no fechamento:** a function está ativa com
  `deploymentId 6ac686006e204d8189f8` — `status: ready`, criado em
  `2026-10-07T17:48:48Z`, **posterior** à correção. Não foi o comando que
  respondeu por isso: as execuções da jornada de fechamento foram conferidas uma a
  uma e **todas** carregam esse `deploymentId`, incluindo a que devolveu **409**
  na edição obsoleta. Rebuildar e reenviar só a `admin-console` foi deliberado —
  nenhum outro recurso entrou de carona no deploy.

## 4. Bug real encontrado pelo teste de integração — e corrigido

O catálogo administrado (`core/catalog.ts`, o núcleo novo desta rodada) foi
submetido ao teste de ponta a ponta do enunciado — rascunho → editar → publicar →
encerrar contra o staging. O teste falhou, e o defeito era do código, não do
teste: **`saveChallenge` e `saveReward` não gravavam `status` nem `version` na
edição.** O patch de edição levava só os campos do formulário.

Consequência medida, não suposta:

1. a versão da linha congelava na primeira gravação, então o `expectedVersion`
   parava de barrar a segunda edição: duas pessoas com a tela aberta mandavam a
   mesma versão e a última digitação vencia em silêncio;
2. publicar um rascunho que já existia trocava a permissão da linha para
   `read(any)` **sem trocar o estado** — desafio legível por toda creator e, ao
   mesmo tempo, listado como rascunho.

Correção: `{ ...data, status, version }` nos dois `updateRow`, com o porquê escrito
no código. Trava em dois níveis: teste de integração contra o staging (lê a LINHA,
não o retorno) e teste unitário novo (`tests/unit/catalog-write.test.ts`) que
exercita o patch de edição e falha se a versão não andar.

## 5. Auditoria: por que `complete-onboarding` continua fechada

Pergunta da rodada, respondida com o que está medido — e a resposta **não** é
"abrir":

- **Por que está fechada:** o manifesto declara `audience: 'closed'`
  (`enabled=false`, sem papel de execução). O app está com
  `APPWRITE_FUNCTIONS_ENABLED` desligado, então o formulário de onboarding não é
  acionável e ninguém alcança a function. **Correção do fechamento (medida, não
  suposta):** uma versão anterior deste parágrafo afirmava que "a razão original
  ('nunca teve deployment') já não vale — ela está publicada". Isso era **falso**.
  A sonda de estado remoto responde `deploymentId: ""` e `listDeployments` devolve
  `total 0`: a function **nunca foi publicada**, nunca teve deployment nenhum. A
  razão original continua valendo inteira, e as duas — "nunca publicada" e "o
  produto não a usa" — apontam para o mesmo lado.
- **O que a function faria se abrisse:** identidade vem do JWT da sessão
  (`Account.get()`), nunca de um `userId` do corpo; exige e-mail verificado;
  aplica idade mínima e versão dos termos no servidor; não faz escrita financeira.
  Ou seja: abrir é seguro por construção — mas não é necessário hoje.
- **A armadilha (achado desta auditoria):** a MESMA flag
  (`APPWRITE_FUNCTIONS_ENABLED`) abre o onboarding e o núcleo operacional
  (`join-challenge`, `submit-content`, `redeem-reward`). Quem ligar a flag para
  ter desafio/submissão/resgate vivos e **não** publicar esta function junto trava o
  produto na porta de entrada: a creator cadastrada não consegue salvar o perfil.
- **Ação tomada:** a armadilha ficou escrita no manifesto, ao lado da decisão (o
  lugar onde quem liga a flag olha), e a recusa ganhou frase própria (§6) para não
  ser confundida com indisponibilidade passageira.
- **Como abrir (quando a rodada pedir):** trocar `audience` para `'users'`;
  publicar no mesmo deploy; provar pelo runtime com uma sessão real de teste
  (execução `completed` com HTTP 200 e perfil gravado) e limpar a conta de teste
  depois. Sem essa prova, a declaração volta a ser promessa.

## 6. Hardening de auth/onboarding desta rodada

A recusa ao salvar o perfil tinha **uma** frase para todos os casos: "não foi
possível salvar, tente novamente mais tarde". Dois casos reais ficavam presos nela —
idade mínima abaixo da exigida e e-mail não verificado — insistindo para sempre.

Agora (`src/features/auth/services/onboarding-refusal.ts`) o motivo que a Function
já respondia vira a frase que a pessoa lê; 4xx da plataforma (sessão sem permissão
de execução, function inexistente) vira "instalação ainda não liberada" — definitiva,
sem convite a repetir; 429 e 5xx continuam retentáveis. Corpo vazio, HTML de proxy e
JSON torto caem na frase genérica: motivo desconhecido não vira causa inventada.
Onze casos travados em `tests/unit/auth.test.ts`.

## 7. Chave SSR (`APPWRITE_AUTH_API_KEY`) — auditoria e pendência

Auditado lendo o código, não a documentação:

- **Único consumidor:** `createSessionAccount()` → `Account.createEmailPasswordSession`
  (login) e `deleteSession` (logout). Perfil, comandos e moderação usam a **sessão da
  usuária**, não a chave.
- **Escopo mínimo necessário: `sessions.write`.** Nada de `rows.read/write`,
  `users.read`, `teams.read` ou leitura de banco.
- **Estado medido hoje:** a chave é aceita mas está **acima do perfil mínimo** —
  consegue ler `/tablesdb` (o probe reporta `authKey=accepted-over-scoped`), e
  `sessionsWrite=authorized`. O gate `verifyIntegrationIdentity` **bloqueia a
  qualificação do app** enquanto isso: é requisito, não aviso.
- **A troca é ato de Console — medido, não presumido.** No fechamento tentou-se
  criar a chave por API, com a chave de provisionamento: a rota de leitura responde
  `200`, mas a de criação responde **403 `key_creation_denied`** — _"An API key
  cannot be created from a request authorized with an API key. Authenticate with a
  session instead."_ Não há endpoint de chave efêmera nesta versão (`404`). Ou
  seja: **nenhum script deste repositório consegue reduzir a chave SSR**; é ato
  humano no Console, e a plataforma o exige de propósito.
- **Pendência (ação humana, no Console):** criar uma chave nova **somente**
  `sessions.write`, trocar no ambiente server-side, rodar `npm run infra:preflight`
  (esperado: `accepted-with-read-denied` + `sessionsWrite=authorized`), repetir os
  testes de login e revogar a antiga. Procedimento completo em
  `docs/delivery-sprint6-fechamento.md` §3.
- **Agravante registrado no fechamento:** **as três** chaves do projeto
  (`nuy-creators`, `APPWRITE_API_KEY`, `APPWRITE_AUTH_API_KEY`) foram lidas e todas
  têm escopo **máximo** — inclusive `keys.read`, `keys.write`, `databases.write` e
  `project.write`. A separação exigida pelo guard de `identity.ts` (valores
  distintos) é real, mas **hoje é só de valor, não de escopo**. Reduzir a SSR é o
  primeiro passo; as outras duas merecem rodada própria.

## 8. Testes desta rodada

- **Unitários:** **119 passando** — inclui três portões novos: `admin.test.ts`
  (autorização, contrato de membership por sessão, estados do catálogo, matemática
  do período, visão geral do acervo), `admin-guard.test.ts` (toda rota `/admin`
  chama `requireStaff`; menu e rota cobram a MESMA capacidade; a ordem das sete
  áreas), `catalog-write.test.ts` (o que a edição grava) — mais o portão
  anti-dado-inventado estendido à área administrativa.
- **Integração (staging real, chave de teste):** **77/77 passando**. A suíte cobre o
  fluxo ponta a ponta — rascunho nasce sem permissão, publicar troca a permissão no
  mesmo commit, editar exige a versão que a tela viu, encerrar tira do ar sem
  apagar, creator entra e envia, moderação decide, pontos e ranking andam — com
  limpeza depois. Foi ela que encontrou o defeito do §4.
- **E2E:** **duas** suítes contra o staging, ambas passando.
  `tests/e2e-staging/operacoes.spec.ts` percorre o caminho operacional pelo
  navegador (admin e creator) — o log traz as execuções reais que a jornada
  disparou (`join-challenge` 201, `submit-content` 201, `moderate-submission` 200,
  `process-outbox` 200, `redeem-reward` 201) e a tela de `/admin/submissoes` foi
  operada pelo navegador (fila → Analisar → Aprovar) até a creator ver os pontos.
  `tests/e2e-staging/catalogo.spec.ts` cobre o catálogo administrado: rascunho não
  aparece para a creator, editar → publicar troca estado/versão/permissão, a
  creator vê o publicado, a segunda edição com a versão antiga leva **409**, e o
  mesmo vale para recompensa.

## 9. O que ficou no ambiente depois dos testes

Varredura de leitura no staging, tabela por tabela, depois das duas suítes:

- **Todas as tabelas operacionais em 0**: desafios, requisitos, participações,
  envios, perfis, contas, contas de pontos, transações, recompensas, resgates,
  campanhas, ranking, notificações, outbox, chaves de operação.
- **Uma conta de autenticação**: a conta administrativa humana
  (`apoio.franquia@…`, verificada). Nenhuma conta de teste sobrou.
- **2 linhas em `audit_logs` + 4 em `audit_log_snapshots`** — sonda minha de campo
  oculto, identificada no próprio conteúdo (`Sonda A/B … — apagada em seguida`,
  ator técnico), cuja linha de campanha foi apagada na hora. A trilha de auditoria
  ficou: **apagar auditoria não é limpeza de dado de teste, é mexer no histórico**,
  e isso não se faz sem decisão explícita de quem opera. Fica registrado aqui com
  os ids (…31bf14c0, …b0c5f7128) para quem quiser removê-las.

Ou seja: o ambiente está **limpo de conteúdo** — 0 desafios e 0 recompensas
publicados. O primeiro conteúdo real é criação de marca, entra pela tela, e não é
inventado por esta rodada (nem apagado por ela: a limpeza só toca o que a própria
rodada cria, marcado por `runId`).

## 10. Abertos (ação humana ou próxima rodada)

1. **Chave SSR mínima** (§7) — bloqueia a qualificação do app; procedimento pronto.
2. **Publicar `complete-onboarding`** (§5) — no mesmo deploy em que
   `APPWRITE_FUNCTIONS_ENABLED` for ligado, com prova de runtime.
3. **Primeiro conteúdo real** — a equipe cria em `/admin/desafios/novo` e
   `/admin/recompensas/nova`, sem Console. Nada foi inventado aqui: o fluxo está
   provado com dado marcado de teste e limpo depois; o conteúdo é decisão de marca.
