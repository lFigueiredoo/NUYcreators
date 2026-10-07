# Fechamento do Sprint 6 — core operacional no Appwrite

Encerramento formal do Sprint 6. Nenhuma feature nova: só o fechamento técnico do
que já está publicado e provado. Nenhum segredo é impresso aqui — nem endpoint,
nem id de projeto, nem chave.

## 1. Estado final do core operacional

Sete Functions publicadas, habilitadas e provadas pelo **runtime do Appwrite**
(execução real, com `deploymentId`, `status` e HTTP registrados):

| function              | execute           | agenda        | prova                                                    |
| --------------------- | ----------------- | ------------- | -------------------------------------------------------- |
| `join-challenge`      | `users`           | —             | 201 `completed`                                          |
| `submit-content`      | `users`           | —             | 201 `completed`                                          |
| `moderate-submission` | `team:nuy-admins` | —             | 200 `completed`                                          |
| `adjust-points`       | `team:nuy-admins` | —             | 200/409/403 `completed`                                  |
| `rebuild-ranking`     | `team:nuy-admins` | —             | 200 `completed`; 401 de plataforma para sessão sem papel |
| `process-outbox`      | `team:nuy-admins` | `*/5 * * * *` | 200 `completed`                                          |
| `redeem-reward`       | `users`           | —             | 201 `completed`; 409 `out_of_stock` na última unidade    |

`complete-onboarding` continua **fechada** (`enabled=false`, sem papel de execução
e sem deployment). O código existe e é empacotado; a function só abre depois de
publicada e provada pelo runtime — declarar aberta antes disso seria declarar
pronta.

O plano remoto fecha limpo: `0 create · 0 update · 309 noop · 0 security drift ·
0 immutable drift · 0 blockers`. A landing pública segue congelada (zero diff
contra a base visual aprovada).

## 2. Pendência administrativa (ação humana, deliberada)

> **A conta administrativa ainda precisa receber membership explícita em
> `nuy-admins`.**

O produto é fail-closed: a área `/admin` (fila de moderação, ajuste de pontos,
ranking) só abre para membership **confirmada** na equipe administrativa. O
vínculo não é criado por código, por provisionamento nem por teste — é ato de
quem opera o projeto, no Console do Appwrite (Team → adicionar membro com papel
`admin`). Nenhum email e nenhum id de usuária são fixados aqui de propósito: a
concessão é decisão humana e auditável, não um valor no repositório.

Enquanto o vínculo não existir, a moderação continua **fechada** (e segura): as
suítes provam que o caminho funciona quando há membership confirmada.

## 3. Chave SSR — o que o fluxo de autenticação realmente usa

Auditoria do uso real da chave de servidor do app (`APPWRITE_AUTH_API_KEY`),
feita lendo o código, não a documentação:

- **Único consumidor:** `Account.createEmailPasswordSession` — o **login**. Sai de
  `createSessionAccount()` (`src/lib/appwrite/server.ts`), chamado apenas em
  `saveSession` (`src/features/auth/services/actions.ts`), usado por login e
  cadastro.
- **Todo o resto dispensa chave:** perfil privado e comandos usam a **sessão da
  usuária** (`sessionClient`/`sessionTables`); recuperação, redefinição e
  verificação de email usam as chamadas públicas da conta; o onboarding usa a
  sessão contra a Function.
- **Escopo mínimo necessário: `sessions.write`.** Nada de leitura/escrita de
  linhas, nada de `users.read`, `teams.read` ou leitura de banco.
- **Estado atual:** o preflight reporta a chave como _acima do perfil mínimo_
  (ela consegue ler `/tablesdb`) e confirma que o necessário está autorizado
  (`sessionsWrite=authorized`).

### Plano de redução (documentado, **não executado** nesta rodada)

1. Criar no projeto de staging uma chave nova com **apenas** `sessions.write`.
2. Substituir `APPWRITE_AUTH_API_KEY` no ambiente server-side (nunca em
   `NEXT_PUBLIC_*`; a variável não é exposta ao cliente).
3. `npm run infra:preflight` → esperado: chave aceita **com privilégio negado**
   para leitura (`accepted-with-read-denied`) e `sessionsWrite=authorized`.
4. Rodar a suíte de identidade/autenticação (`tests/e2e/auth-identity.spec.ts`) e
   o QA conectado (`tests/e2e-staging/`) — login por sessão, cadastro e
   recuperação.
5. Revogar a chave antiga e registrar data, responsável e resultado.

Critério: nenhuma capacidade nova é concedida; a troca só **reduz** privilégio, e
só é declarada concluída depois do preflight e do login provados de novo.

## 4. Limpeza do working tree (esta rodada)

Removidos **21 scripts de diagnóstico temporários**, sem nenhuma citação no
código, nos testes ou nos documentos de entrega (`diag-*.mjs` da investigação de
schema/transações/permissões e um capturador de tela de uso único).

Preservados de propósito, por serem **citação de procedência** de medições que
seguem no código: `scripts/diag-write-path.mjs` (citado em
`services/commands.ts` e `lib/appwrite/data/client.ts`), `scripts/polish3-*.mjs`
(citados no CSS congelado da landing como origem das medidas),
`scripts/inventory-staging.mjs` (citado no relatório do Sprint 6) e
`scripts/build-functions.mjs` (usado pelo `package.json`).

Nada de conteúdo foi criado no staging: **0 desafios publicados e 0 recompensas
publicadas** seguem sendo o estado do ambiente. O conteúdo real entra no Sprint 7.

## 5. Adiado para o Sprint 7 (deliberadamente)

- membership explícita da conta administrativa (§2);
- redução da chave SSR ao mínimo (§3);
- publicação da `complete-onboarding` (código pronto, runtime ainda fechado);
- conteúdo real: primeiro desafio, primeira recompensa;
- gestão de desafios, recompensas, creators, campanhas e relatórios básicos.
