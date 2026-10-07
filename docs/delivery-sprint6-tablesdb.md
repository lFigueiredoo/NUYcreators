# Sprint 6 — Migração final para TablesDB + core operacional

Entrega única. Nada foi commitado nem enviado (§43). Nenhuma credencial foi
impressa em nenhum passo. Landing, login, cadastro e a superfície pública
continuam como estavam (§42).

## 1. Objetivos, um a um

| #   | Item                                                                                          | Resultado                                                                 |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Provisionador migrado para TablesDB (table/column/row, rowSecurity)                           | **SIM**                                                                   |
| 2   | Camada de persistência migrada (adaptador `src/lib/appwrite/data/`)                           | **SIM**                                                                   |
| 3   | Domínio e UI preservados; experiência pública intocada                                        | **SIM**                                                                   |
| 4   | Staging real provisionado e conferido recurso a recurso                                       | **SIM**                                                                   |
| 5   | Transações e concorrência provadas contra staging (não por documentação)                      | **SIM**                                                                   |
| 6   | Core operacional implementado (participar, enviar, moderar, pontos, resgatar, avisos, perfil) | **SIM**                                                                   |
| 7   | Produto funcional ponta a ponta                                                               | **SIM com a chave de operação; sem ela, somente leitura honesta**         |
| 8   | Matriz de permissões (§24)                                                                    | **SIM**                                                                   |
| 9   | `implemented: true` só depois do fluxo passar, um a um (§36)                                  | **SIM**                                                                   |
| 10  | Stub de teste migrado para TablesDB (§17)                                                     | **SIM** (era o defeito que derrubou o gate `/app`; corrigido e re-medido) |
| 11  | Gates §41                                                                                     | **SIM**                                                                   |
| 12  | Gate anti-fake (§38)                                                                          | **SIM**                                                                   |
| 13  | Segurança e limpeza (§39–40)                                                                  | **SIM**, com resíduo declarado na §7                                      |
| 14  | Nenhuma credencial impressa                                                                   | **SIM**                                                                   |
| 15  | Sem commit, sem push (§43)                                                                    | **SIM**                                                                   |
| 16  | Pendências de autorização                                                                     | **NÃO** — 1 artefato ausente + 7 divergências de escopo (§7)              |

## 2. Arquitetura da migração

- **Manifesto** (`infra/appwrite/schema.ts`): o mapa atributo→coluna é 1:1 e os
  IDs são os mesmos de antes, com UMA exceção medida — `audit_logs` pedia
  `beforeJson` + `afterJson` (10.000 cada) e a soma de `varchar` da table estoura
  o limite da plataforma (~16 KB). Os snapshots foram para
  `audit_log_snapshots`, uma linha por lado, mesma capacidade de 10.000
  caracteres. Nada foi truncado: o adaptador recompõe `beforeJson`/`afterJson`
  para o domínio.
- **Adaptador** (`src/lib/appwrite/data/`): `workspace` e domínio continuam
  falando de objetos de negócio. `$collectionId` legado é normalizado para
  `$tableId`; `rowId` de snapshot é digest de 36 caracteres (o teto medido da
  plataforma).
- **Provisionador**: `infra:plan` offline continua funcionando sem credencial;
  `infra:plan:remote`, `infra:preflight` e `infra:apply` falam TablesDB.
  Política de divergência intacta: `DRIFT_SECURITY`, `DRIFT_IMMUTABLE` e
  `BLOCKED_PERMISSION` bloqueiam o `apply` — nada é apagado ou recriado em
  silêncio.
- **Stub de teste** (`tests/support/appwrite-stub/`): rotas
  `/tablesdb/{db}/tables/{table}/rows[/{id}]`, envelope `rows`, `$tableId` nos
  campos de sistema. O stub não fala mais a linguagem antiga — se a aplicação
  voltar a pedir `/databases/...`, o teste falha alto em vez de passar por
  engano.

## 3. Provas medidas (staging real)

```
infra:capabilities   17 verificações OK — "chave de provisionamento com todas
                     as capacidades necessárias"
infra:preflight      environment=staging, marker=verified, testKey=accepted,
                     authKey=accepted-over-scoped, sessionsWrite=authorized
infra:plan:remote    0 create · 0 update · 302 noop · 7 security drift ·
                     0 immutable drift · 0 blockers  (apply bloqueado)
inventory-staging    tables 31/31, colunas 210/210, índices 48/48,
                     buckets 4/4, functions 8/8, níveis 5/5, marker presente
```

Transações e concorrência (medidas, não presumidas):

- operação estagiada não é visível fora da transação (404);
- `commit` recusado com **409 `transaction_conflict`**, inclusive quando a
  unicidade só é violada no commit;
- `rollback` devolve 200 e a transação termina `status: failed`;
- `decrementRowColumn` com `min: 0` é atômico: em corrida, exatamente um commit
  passa e o perdedor volta **400 `attribute_limit_exceeded`** — saldo nunca
  negativa;
- **achado desta rodada**: `incrementRowColumn` estagiado contra linha
  inexistente é aceito no stage e envenena o commit inteiro
  (`404 document_not_found`, que voltava como `unavailable/503` sem causa). A
  correção é ler antes de escrever (`projectRanking`); o erro deixa de existir e
  falhas futuras voltam a aparecer em vez de se esconder atrás de um 503.

## 4. Core operacional (§25–36)

Cada fluxo abaixo passou contra o staging real (`tests/integration/core.test.ts`)
e só então a função correspondente foi marcada `implemented: true`. Os containers
continuam `enabled: false` e `execute: []`: publicar é decisão de deploy.

| Fluxo                 | O que prova                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| entrar no desafio     | cria a participação uma vez; repetir não duplica                                                       |
| enviar conteúdo       | um envio por impressão digital; reenvio após revisão volta a `pending`                                 |
| moderar               | `pending → approved/rejected/revision_requested`; aprovação é terminal; decisão exige revisão esperada |
| crédito transacional  | aprovar credita uma única vez (`idempotencyKey` + `$id` derivado); aprovar duas vezes não credita duas |
| saldo × jornada       | resgate debita `availableBalance`; `qualifyingPoints` e nível não caem                                 |
| ranking do mês        | pontos **ganhos** no ciclo, `America/Sao_Paulo`, empate divide posição                                 |
| resgatar              | estoque com `stock: 1` em corrida: um ganha, o outro recebe recusa medida                              |
| avisos                | lido/não lido, individual e em bloco                                                                   |
| perfil                | edição pré-preenchida; enums validados por um único schema                                             |
| ajuste administrativo | só equipe, com motivo e referência; não mexe em ranking                                                |

## 5. Gates (§41)

| Gate                      | Resultado                                                     |
| ------------------------- | ------------------------------------------------------------- |
| `tsc --noEmit`            | limpo                                                         |
| Vitest                    | 87/87 (12 arquivos)                                           |
| ESLint                    | 0 erros (25 avisos, todos em scripts de captura descartáveis) |
| Prettier                  | limpo                                                         |
| Playwright público        | 61 passaram, 15 pulados (por viewport, por desenho)           |
| Playwright `/app`         | 13/13                                                         |
| Integração (staging real) | 54/54, 2 arquivos                                             |
| Concorrência              | dentro da integração                                          |
| `next build`              | sucesso, 28 rotas                                             |

O Playwright público rodou na porta **3011** com uma cópia temporária da
configuração (já removida): a 3000 está ocupada por um `next dev` que não é
nosso, e a configuração canônica recusa de propósito reaproveitar servidor
existente. Mesmo build de produção, mesmo ambiente desconectado, mesma suíte.
O comando canônico (`npm run test:e2e`) volta a funcionar assim que a 3000
estiver livre.

## 6. Segurança

- Matriz de permissões (§24): criadora A não lê linha privada de B; criadora não
  escreve em `point_transactions`, `point_accounts`, `ranking_entries`, estoque
  de recompensa nem status de moderação; admin só por `nuy-admins`.
- Identidade sempre da sessão — nunca de campo de formulário, `localStorage`,
  query string ou e-mail. Revisão de origem em toda Server Action.
- Quatro credenciais distintas, com guard de igualdade: provisionamento, sessões
  (`sessions.write`), testes e operação.
- Nenhuma fixture em `src/` (gate anti-fake), nenhuma chave em `NEXT_PUBLIC_*`,
  nenhum segredo em log.

## 7. Pendências (§16 — NÃO)

1. **`APPWRITE_OPS_API_KEY` ausente** (`rows.read` + `rows.write`). É o artefato
   que falta para o produto sair de somente-leitura em produção: sem ela, as
   telas dizem o estado real (e o QA `/app` mede exatamente esse estado). Com
   ela, os mesmos fluxos são exercitados pelas Server Actions. Não é chave que
   se possa cunhar aqui.
2. **7 divergências `DRIFT_SECURITY` de escopo de function** (`join-challenge`,
   `submit-content`, `moderate-submission`, `adjust-points`, `redeem-reward`,
   `process-outbox`, `rebuild-ranking`): o manifesto espera
   `scopes=[rows.read, rows.write]`, o servidor tem `scopes=[]`. `apply` está
   bloqueado por política e **não** foi usado `--reconcile-security`
   automaticamente — como combinado, isso para e espera autorização explícita.
3. **Resíduo de sonda no staging** (declarado, não apagado): 3 participações, 4
   avisos, 6 eventos de outbox, 6 logs de auditoria + 4 snapshots, 1 transação de
   pontos, 1 conta de pontos, 1 entrada de ranking, 3 linhas de histórico —
   todas com `correlationId` terminando em `-diag`, escritas entre
   17:11 e 17:18 UTC de 06/10 por scripts de diagnóstico desta investigação. Há
   também 2 contas de autenticação no projeto; uma delas **não** é resíduo nosso,
   e por isso nada foi removido. A rodada de integração limpa o que ela mesma
   cria (a limpeza falha alto se ficar incompleta).

## 8. Honestidade — o que NÃO foi provado

- As functions não foram publicadas nem executadas no Appwrite: o que está
  provado é o fluxo do core rodando no servidor Next contra o staging real.
- O app em produção sem a chave de operação nunca grava — por desenho, não por
  acaso. Nenhum botão finge fluxo que não roda.
- A landing pública não foi re-medida nesta rodada além dos gates de Playwright
  que já a cobrem.
