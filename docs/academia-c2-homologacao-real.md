# Academia NUY — C2: homologação real no Appwrite staging

**Data:** 19/10/2026. **Resultado:** homologação parcial, com isolamento e testes reais de banco/ACL aprovados; publicação de aula e mídia continuam bloqueadas. Este documento registra somente operações executadas. O projeto de produção permanece protegido e a Academia não foi ativada. O fechamento local autorizado da C2 está resumido na seção 9.

## 1. Alvo, proteção e inventário

| Item | Staging C2 | Produção protegida |
| --- | --- | --- |
| Project ID | `6ad55be5003719f6b399` | `6ac044af0008cbdda070` |
| Nome | `NUY Creators — Academia Staging` | `NUY Creators` |
| Endpoint | `https://api.edocs.phiq.com.br/v1` | mesmo endpoint, projeto lógico distinto |
| Versão lida | Appwrite `2.2.0` | Appwrite `2.2.0` |
| Banco | `nuy-creators` exclusivo de staging | `nuy-creators` existente |
| Tabelas | 10 Academy + 5 tabelas base para desafios fictícios | 31 tabelas protegidas, inalteradas |
| Usuários | 3 contas fictícias `@example.invalid` | nenhum usuário copiado ou criado |

O operador forneceu explicitamente o Project ID de staging. A sessão administrativa do Appwrite Console confirmou ID, nome e endpoint por leitura antes de cada escritor. Os guards em `infra/appwrite/c2-safety.ts` recusam o ID protegido, endpoint/nome/ID divergentes, operação não autorizada, chave ausente, versão diferente de 2.2.0 e falha na prova de escopo. Os escritores usam o ID de staging fixo no código. Quatro testes unitários cobrem esses bloqueios. O teste direto com chave de linhas contra a tabela privada `users` de produção retornou **zero linhas**, como acesso anônimo; com chave de produção a mesma consulta agregada retornou total 3. Isso não demonstrou acesso indevido, mas tampouco deve ser interpretado como prova geral de isolamento de todas as rotas. Nenhum dado pessoal foi impresso.

O preflight somente de leitura do projeto protegido, antes e depois das escritas de C2, retornou o mesmo estado: **31/31 tabelas base**, dez tabelas Academy ausentes, `academy-media` ausente e **zero conflitos**. A conferência final de staging, em modo plano sem `--apply`, retornou `C2_SCHEMA_PLAN_COMPLETE` sem recurso de schema faltando. Não foram alterados buckets, Functions, servidor, Vercel ou flags. `.env.c2.local` contém configuração e segredos temporários somente locais, está ignorado pelo Git e não integra este relatório.

## 2. Schema provisionado e validado

O provisionador C2 leu `infra/appwrite/academy-schema.ts`, criou o banco isolado e confirmou as **dez tabelas** abaixo após criação. Cada tabela tem `rowSecurity=true`, permissões de tabela vazias e colunas/índices do manifesto disponíveis. `academy_courses.searchText` recebeu o FULLTEXT proposto. As linhas sintéticas receberam ACL por linha de acordo com o uso; nenhuma permissão ampla de tabela foi adicionada.

| Tabela | Finalidade | Unicidade e índices do manifesto |
| --- | --- | --- |
| `academy_categories` | categorias e ordem | `slug` único; `active/order/slug`, `order/slug` |
| `academy_courses` | treinamentos, estado e versão | `slug` único; 4 índices de estado/categoria/ordem; FULLTEXT `searchText` |
| `academy_modules` | módulos por curso | `courseId/order` único |
| `academy_lessons` | aulas por módulo | `moduleId/order` único; `courseId/status/order` |
| `academy_materials` | referências a materiais | 3 índices de curso/aula/ordem |
| `academy_media` | estado de validação dos arquivos | `fileId` único; `lessonId/kind`, `status/createdAt` |
| `academy_progress` | conclusão por usuário/aula | `userId/lessonId` único; `userId/courseId`, `courseId` |
| `community_comments` | comentários e moderação | 5 índices de alvo, pai, autor, status e data |
| `community_reports` | denúncias | `commentId/reporterId` único; status/comentário |
| `community_moderation_events` | auditoria da moderação | comentário/data e ator/data |

Para testar o arquivamento de desafios no mesmo projeto, o provisionador criou ainda, a partir de `infra/appwrite/schema.ts`, somente `challenges`, `challenge_requirements`, `notifications`, `audit_logs` e `audit_log_snapshots`. São fixtures de staging, adicionais às dez tabelas da Academia. Não se criou bucket. A relação entre registros usa IDs e validação nos serviços; não foi criada uma relação nativa adicional no Appwrite.

## 3. Contas, fluxo funcional e segurança direta

Foram criados `c2-admin-teste` (ADMIN_TESTE), `c2-creator-a` e `c2-creator-b` em staging, com senhas aleatórias locais. A equipe `nuy-admins` contém somente uma membership **confirmada** com papel `admin` para a conta Admin. Sessões reais confirmaram admin=1 e creators com zero papéis administrativos. As credenciais usadas são efêmeras e separadas por escopo: schema (8 escopos de database/tables/columns/indexes), linhas (2), identidade (4) e sessão (1), duração de uma hora. A primeira tentativa de solicitar uma chave ampla foi rejeitada pela revisão automática; a estratégia foi reduzida a quatro perfis. As chaves expiradas de linhas/schema foram renovadas para finalizar testes, sem expor seus valores.

O seed do serviço criou cinco categorias canônicas na primeira execução e zero na segunda. O serviço Admin criou e editou o curso rascunho `50efbe7a-7996-4344-b767-5221457d763f`, o módulo `81f5dc0e-c4ae-4584-b41e-d38aa68ac5e8` e a aula `2e476aee-c941-40f6-b104-0fa4d49cd799`. A versão do curso avançou após edição. Creator não conseguiu editar o curso; publicação sem mídia validada foi recusada e a transação preservou o rascunho. Creator não conseguiu concluir nem comentar a aula em rascunho. Duas Creators e anônimo receberam 404 ao ler diretamente o curso em rascunho. O cursor de categorias retornou páginas de 2+2, total 5.

Os testes diretos com sessões reais também provaram: Creator A lê o próprio progresso, não lê o de B (404); B não atualiza o progresso de A (401); anônimo não lê progresso; outra Creator e anônimo não leem comentários pendentes ou rejeitados (404); Creator/anônimo não leem material de rascunho (404); Creator não cria curso nem publica aula diretamente (401). O Admin com chave de serviço leu os registros para auditoria. A ACL de linha de dono funcionou mesmo com permissão de tabela vazia, sem abrir todas as linhas. As operações de serviço com chave de linhas utilizaram atores sintéticos cujos papéis foram comprovados separadamente por membership real; não houve E2E no host Vercel.

**Limite funcional:** o curso e a aula ficaram em rascunho. O ID `c2-no-video-uploaded` é uma referência propositalmente não validada; nenhum arquivo existe com esse ID. A publicação, conclusão e comentários de uma aula **publicada**, respostas e moderação de comentários dessa aula não foram executados. Criar um registro `academy_media` falsamente pronto para forçar o fluxo enfraqueceria o gate de segurança. Esse percurso depende da homologação de mídia C3.

## 4. Transações, concorrência e comentários de desafios

| Prova no Appwrite 2.2.0 | Resultado observado |
| --- | --- |
| Commit de alteração de categoria | persistiu; cerca de 1–1,2 s na execução observada |
| Rollback explícito | alteração não persistiu |
| Falha parcial | linha incompleta foi aceita no stage, recusada no **commit**; rollback preservou linha anterior |
| Duas alterações sobre a mesma linha | segunda confirmou; a primeira retornou conflito HTTP 409 |
| Atualização com mesmo valor | provocou conflito 409 depois de alteração concorrente |
| `updateRow(data: {})` sem ACL | HTTP 400; comportamento diferente do stub |
| `updateRow(data: {}, permissions: [...])` | aceito para migração de ACL; o rollback de prova preservou o estado |
| Oito criações staged em uma transação | aceitas; rollback não deixou registros; cerca de 2,65 s no lote observado |
| Seed repetido | 5 criadas, depois 0; nenhum duplicado |
| Paginação cursor | duas páginas de 2 registros, total 5 |

O teste de oito operações fornece somente **limite inferior observado**, não limite máximo da instalação. Não houve estresse. O timeout TTL usado nos testes foi 120 s; expiração real de transação não foi medida. As relações curso→módulo→aula permaneceram presentes após a edição e rollback da publicação.

Um desafio fictício publicado recebeu comentário pendente, aprovação para `visible` e leitura pela autora; outra Creator/anônimo receberam 404 na leitura direta mesmo após aprovação. O inventário de ACL privada retornou `ready=true`. O arquivamento real gravou `status=archived`, `version=2` e ACL vazia no desafio; outra Creator não leu o desafio, a autora conservou somente sua leitura permitida do comentário, uma nova resposta foi recusada e um segundo arquivamento retornou conflito. Uma linha fictícia com ACL legada `read("users")` foi lida por Creator B; o inventário detectou `excessivePermissions=1`. Após migração **somente dessa linha fictícia** para ACL da autora, o inventário voltou a `ready=true` e B recebeu 404. Nenhuma ACL de produção foi migrada.

A primeira corrida segurou o commit de criação de comentário **depois** do toque transacional. O arquivamento confirmou primeiro; ao liberar o comentário, seu commit retornou `conflict` e a consulta ao alvo encontrou **zero comentários** (`c2-race-ec452289`). Uma segunda corrida, entre a leitura do desafio e o toque, encontrou a falha descrita abaixo. Com o toque neutro final, ambas as ordens foram repetidas: `c2-race-ebc41368` (antes do toque) e `c2-race-2bc60a49` (depois do toque) permaneceram arquivadas, com zero comentários; a criação recebeu `missing` e **exatamente um** registro `challenge.archived` por desafio em `audit_logs`. Isso não cobre todas as combinações de resposta, moderação e edição concorrentes. O modo legado deve permanecer protegido até inventário e homologação próprios do alvo de produção.

## 5. Falha corrigida e diferenças para o stub

O servidor real recusou `updateRow({data:{}})` sem mudança de permissões com HTTP 400. Quatro caminhos de comentário de desafio usavam esse toque para conflitar com arquivamento; assim, poderiam falhar antes do commit. `src/features/academy/services/operations.ts` passou a escrever `status:'published'` na mesma linha da transação. O Appwrite real confirmou que uma escrita com o mesmo valor participa do conflito 409. O stub anteriormente aceitava o `data:{}` vazio e por isso não expunha a incompatibilidade.

**Falha real da primeira correção:** quando o arquivo confirmava **entre a leitura e o toque**, o toque com `status:'published'` podia restaurar o estado publicado. O teste pré-correção retornou sucesso indevido; a auditoria posterior encontrou a fixture `c2-race-192c7c73` com `status=published`, `version=2` e um comentário. Sua ACL de desafio continuou vazia depois do arquivo, mas o estado persistido está inconsistente. A fixture foi mantida como evidência e deve ser corrigida/removida somente após revisão do incidente. Para fechar a janela observada, o serviço agora faz um **toque de mesmo valor em `participantCount`**, sem escrever `status` ou `version`, seguido de leitura **fora da transação**. Se o estado confirmado já for arquivado, recusa; um arquivo posterior ao toque provoca conflito da escrita staged. Os dois interleavings controlados passaram depois dessa mudança; o caso ganhou teste de regressão em `tests/unit/academy-c12.test.ts`. A correção foi local; não houve deploy ou commit. Repetir essa prova no gate de produção antes da ativação.

Também foi observado que uma linha incompleta em transação pode passar pela etapa de stage e falhar apenas no commit. Serviços não devem tratar o stage como sucesso persistido. O teste parcial confirmou ausência da linha após falha/rollback.

## 6. Matriz de homologação

| Gate | Estado | Evidência/limite |
| --- | --- | --- |
| Identidade e separação lógica staging/produção | **PASS** | IDs distintos, Console e endpoint conferidos; guard por operação |
| Schema Academy real | **PASS** | 10 tabelas, colunas, índices e ACL conferidos; plano final sem pendências |
| Fixtures de desafio | **PASS** | 5 tabelas base adicionais somente staging |
| Admin real e contas sintéticas | **PASS** | membership confirmado; Creators sem papel admin |
| Seed, rascunho, edição, segurança de publicação | **PASS** | categorias idempotentes; curso/módulo/aula e rollback persistidos |
| Isolamento direto de progresso/comentário/material | **PASS** | respostas 401/404 e leituras autorizadas conferidas |
| Transações e concorrência descritas acima | **PASS** | commit, rollback, falha parcial, 409 e corrida comentário×arquivo |
| Corrida entre leitura e toque, versão anterior | **FAIL** | restaurou `published` e gravou 1 comentário em fixture sintética; evidência preservada |
| Corrida após a correção local | **PASS** | duas ordens controladas: desafio arquivado, 0 comentários |
| Fluxo de desafio e ACL legada fictícia | **PASS** | comentário, moderação, arquivo, inventário e migração sintética |
| Publicação e consumo de aula real | **BLOCKED** | requer mídia validada; publicação corretamente recusada |
| PDF/MP4, antivírus, MIME/codec, upload, URL temporária, Range | **NOT_EXECUTED** | C2 não autorizou upload; antivírus constava `disabled` na auditoria anterior; C3 necessária |
| Bucket `academy-media` | **NOT_EXECUTED** | não criado em staging nem produção |
| E2E no Vercel Preview/produção e login de produção | **NOT_EXECUTED** | nenhum deploy ou alteração Vercel autorizados |
| TTL expirado e teto máximo de operações por transação | **NOT_EXECUTED** | testados TTL configurado e lote pequeno, sem estresse |
| Inventário protegido antes/depois | **PASS** | 31 tabelas; Academy/bucket ausentes; zero conflitos nas duas leituras |
| Migração, flag e ativação em produção | **NOT_EXECUTED** | nenhuma escrita no projeto protegido; `APPWRITE_ACADEMY_ENABLED` não ativada |

## 7. Riscos, rollback e próxima decisão

O projeto staging contém fixtures sintéticas e permanece disponível para revisão. Não apagar automaticamente. Para encerrar C2 depois de aprovado, revogar/aguardar expiração das chaves efêmeras e remover os segredos do arquivo local ignorado; qualquer limpeza remota deve conferir novamente ID, nome e endpoint e requerer decisão específica. Em falha de teste, interromper escritores, preservar o inventário e remover apenas IDs `c2-*` identificados, quando aprovado. Não copiar staging para produção nem restaurar ACL pública legada. O rollback de produção exige backup restaurável, inventário novo, plano aditivo e aprovação separados.

A fixture inconsistente `c2-race-192c7c73` fica fora das provas operacionais: os scripts de fluxo usam IDs próprios e o teste de corrida cria sempre um ID novo; a auditoria isolada `c2-race-audit.ts` enumera as fixtures de corrida. Não usar listagens globais de desafios como critério de aceite enquanto essa fixture estiver presente.

Antes de qualquer migração/ativação: homologar antivírus e mídia privada em C3, upload/entrega PDF e MP4 com Range e expiração; executar fluxo completo de aula publicada e moderação; verificar as variações restantes de concorrência; medir limites reais/TTL sem carga prejudicial; conferir backup/restauração e índices/ACL no projeto alvo; validar login em produção e Preview corretamente isolado; revisar flags por host. A ausência de prova de exposição no teste de chave cruzada não dispensa revisão operacional do escopo das credenciais e do proxy Appwrite.

## 8. Verificações locais e Git

`npm run typecheck`: **PASS**. `npm test -- --maxWorkers 4`: **242/242 PASS**, 32 arquivos, incluindo o novo teste de regressão. A primeira execução no sandbox falhou antes dos testes por `spawn EPERM`; repetição autorizada passou sem alterar timeout. `npm run build`: **PASS** após a correção final. `git diff --check`: **PASS**, apenas avisos de conversão LF/CRLF de arquivos existentes. O timeout histórico de `onboarding-endpoint.test.ts` não foi reproduzido nesta rodada e sua causa raiz não foi afirmada como resolvida.

Arquivos C2 locais: `infra/appwrite/c2-safety.ts`, `c2-academy-provision.ts`, `c2-identities.ts`, `c2-seed-categories.ts`, `c2-academy-smoke.ts`, `c2-real-security.ts`, `c2-challenge-real.ts`, `c2-challenge-race.ts`, `c2-race-audit.ts`, `scripts/c2-create-staging-key.ps1`, `tests/unit/appwrite-c2-safety.test.ts`, o teste adicional em `tests/unit/academy-c12.test.ts`, a correção em `src/features/academy/services/operations.ts` e este relatório. `src/lib/appwrite/server.ts` e `.vercelignore` são alterações preexistentes de outro trabalho e permanecem intocados. Nenhum arquivo foi adicionado ao staging do Git; não houve commit, push ou deploy.

`git status --short` final:

```text
 M src/features/academy/services/operations.ts
 M src/lib/appwrite/server.ts
 M tests/unit/academy-c12.test.ts
?? .vercelignore
?? docs/academia-c2-homologacao-real.md
?? infra/appwrite/c2-academy-provision.ts
?? infra/appwrite/c2-academy-smoke.ts
?? infra/appwrite/c2-challenge-race.ts
?? infra/appwrite/c2-challenge-real.ts
?? infra/appwrite/c2-identities.ts
?? infra/appwrite/c2-race-audit.ts
?? infra/appwrite/c2-real-security.ts
?? infra/appwrite/c2-safety.ts
?? infra/appwrite/c2-seed-categories.ts
?? scripts/c2-create-staging-key.ps1
?? tests/unit/appwrite-c2-safety.test.ts
```

**Ponto de parada:** revisão e aprovação explícita antes de qualquer C3, migração, bucket, flag ou publicação.

## 9. Fechamento local autorizado após a revisão C2

Na revisão posterior, o toque transacional foi reduzido a uma escrita de mesmo valor em `participantCount`; ele não escreve mais `status` nem `version`. A leitura fora da transação continua exigindo desafio publicado. Duas corridas adicionais no Appwrite staging passaram, com desafio final arquivado, zero comentário criado e exatamente uma entrada de auditoria `challenge.archived` cada. A fixture inconsistente anterior foi preservada e os testes usam IDs próprios para não depender dela.

Validações finais antes do commit local: `npm run typecheck` PASS; `npm test -- --maxWorkers 4` PASS **242/242** em execução isolada; `npm run test:e2e:app` PASS **29/29**; `npm run build` PASS. Uma execução de Vitest concorrente com o typecheck terminou em **240/242** por timeouts de 5 s em `app-no-fake-data.test.ts` e `onboarding-endpoint.test.ts`; a repetição sem carga concorrente passou, sem mudança de timeout. A causa raiz não foi demonstrada e o resultado falho permanece registrado.

Esta revisão autoriza apenas o commit local isolado dos arquivos C2. O plano de Storage C3 e seus arquivos são trabalho posterior, fora desse commit. Nenhum push, deploy, bucket, mídia remota ou alteração do projeto protegido foi autorizado.
