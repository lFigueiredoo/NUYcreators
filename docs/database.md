# NUY Creators — modelo Appwrite

Status: modelo aprovado; manifest inicial em `infra/appwrite/schema.ts`, ainda sem provisionamento Cloud. IDs de collections estáveis e migrações versionadas. Campos temporais UTC, pontos e quantidades inteiros. `$id`, `$createdAt` e `$updatedAt` são metadados Appwrite; datas de negócio explícitas quando necessárias.

## Collections solicitadas

| Collection             | Campos principais                                                                                                                                                                         | Relações/índices                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| users                  | authUserId, status, acceptedTermsVersion, consentAt                                                                                                                                       | authUserId único; dados internos, não substitui Auth                        |
| profiles               | userId, name, avatarFileId, phone, city, state, birthDate, niche, creatorType, onboardingCompletedAt, publicProfile                                                                       | userId único; PII privada                                                   |
| social_accounts        | userId, platform, handle, canonicalUrl, externalAccountId, verificationStatus                                                                                                             | userId+platform único; externalAccountId+platform único quando verificado   |
| creator_levels         | name, minPoints, maxPoints nullable, order, active, rulesVersion                                                                                                                          | order único; validar intervalos sem lacunas/sobreposição                    |
| challenges             | slug, name, description, imageFileId, platform, startsAt, endsAt, points, requiredLevelId, participantLimit, participantCount, productId, hashtags, mentions, status, campaignId, version | slug único; status+startsAt; campaignId                                     |
| challenge_requirements | challengeId, type, configJson, order, required                                                                                                                                            | challengeId+order                                                           |
| challenge_participants | challengeId, userId, joinedAt, status                                                                                                                                                     | challengeId+userId único; userId+joinedAt                                   |
| challenge_submissions  | challengeId, participantId, userId, platform, canonicalUrl, contentFingerprint, fileId, status, revision, submittedAt, reviewedBy, reviewedAt, moderationReason                           | fingerprint único conforme política; userId+submittedAt; status+submittedAt |
| point_transactions     | userId, type, amount, referenceId, referenceType, description, createdAt, idempotencyKey, rankingDelta, actorId, reversalOf                                                               | idempotencyKey único; userId+createdAt; referenceType+referenceId           |
| rewards                | name, type, imageFileId, description, pointsCost, stock, perUserLimit, startsAt, endsAt, status, version                                                                                  | status+startsAt                                                             |
| reward_redemptions     | userId, rewardId, pointsCostSnapshot, rewardSnapshotJson, status, idempotencyKey, requestedAt, shippingAddressId, trackingCode, stockRestoredAt, refundedAt                               | idempotencyKey único; userId+requestedAt; status+requestedAt                |
| content_posts          | submissionId, creatorId, caption, publicMediaFileId, categoryIds, productId, publishedAt, status                                                                                          | submissionId único; status+publishedAt; creatorId                           |
| content_likes          | postId, userId                                                                                                                                                                            | postId+userId único                                                         |
| content_saves          | postId, userId                                                                                                                                                                            | postId+userId único; privados                                               |
| badges                 | code, name, description, imageFileId, ruleJson, active                                                                                                                                    | code único                                                                  |
| user_badges            | userId, badgeId, awardedAt, referenceId, periodKey                                                                                                                                        | userId+badgeId+periodKey único para badges recorrentes                      |
| notifications          | userId, type, title, body, referenceId, readAt, eventKey                                                                                                                                  | userId+createdAt; eventKey+userId único                                     |
| campaigns              | name, description, startsAt, endsAt, status                                                                                                                                               | status+startsAt                                                             |
| audit_logs             | actorId, action, entityType, entityId, affectedUserId, beforeJson, afterJson, reason, occurredAt, ip, correlationId                                                                       | entityType+entityId; actorId+occurredAt; append-only                        |

## Collections técnicas adicionais

| Collection              | Finalidade                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| point_accounts          | userId único, availableBalance, qualifyingPoints, levelId, version, lastTransactionId; snapshot privado derivado do ledger |
| ranking_entries         | periodKey+userId único, earnedPoints, lastEarnedAt; projeção pública sanitizada                                            |
| submission_history      | submissionId, revision, previousStatus, nextStatus, actorId, reason, payloadSnapshotJson, occurredAt; append-only          |
| redemption_history      | redemptionId, previousStatus, nextStatus, actorId, reason, occurredAt; append-only                                         |
| operation_keys          | actorId+operation+key único, requestHash, resultId, status; resultado idempotente e detecção de reutilização incompatível  |
| outbox_events           | eventKey único, type, aggregateId, payloadJson, status, attempts, nextAttemptAt; entrega após commit                       |
| public_creator_profiles | userId único, displayName, publicAvatarId, bio, approvedSocialUrls; sem PII                                                |
| shipping_addresses      | userId, recipient, address fields; acesso privado e snapshot de entrega protegido                                          |
| products                | referência oficial dos produtos NUY; slug único                                                                            |
| content_categories      | slug, name, active; slug único                                                                                             |
| platform_settings       | timezone, regras versionadas e configurações públicas separadas das privadas; nunca guardar segredos públicos              |

Para limitar tamanho e manter histórico pesquisável, evitar arrays ilimitados e snapshots extensos. Tokens OAuth futuros ficam em armazenamento de segredos protegido, nunca em perfis ou documentos públicos.

## Relacionamentos

- Auth account 1:1 users 1:1 profiles e point_accounts.
- User 1:N social_accounts, participants, submissions, transactions, redemptions, notifications e badges.
- Challenge 1:N requirements e participants; participant 1:N revisões/submissões conforme regra do desafio.
- Submission 1:N submission_history e no máximo 1 content_post publicado.
- Uma aprovação elegível gera um crédito único no ledger referenciado pela submissão.
- Reward 1:N redemptions; cada resgate possui débito único e no máximo um estorno.
- Campaign 1:N challenges; product 1:N challenges/content_posts.
- Post N:N users por likes/saves; badge N:N users por user_badges.

Usar IDs explícitos e validação de integridade no backend para previsibilidade de permissões e transações. Não assumir foreign keys ou cascatas automáticas. Exclusão de entidade referenciada deve ser bloqueada ou convertida em arquivamento; ledger e auditoria não sofrem cascata.

## Permissões

Todas as collections sem escrita direta do cliente. Document security ativada. Functions usam credenciais com escopos mínimos e revalidam o usuário; API key ignora permissões de usuário e exige disciplina adicional.

| Dados                                                                                                                         | Leitura pelo cliente                                               | Escrita                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| users, profiles, social_accounts, point_accounts, transactions, participants, submissions, históricos, redemptions, addresses | proprietário, equipe administrativa autorizada quando necessário   | comandos autenticados; campos permitidos por caso de uso |
| notifications                                                                                                                 | proprietário                                                       | Function; marcar lida via comando de ownership           |
| saves                                                                                                                         | proprietário                                                       | comando autenticado                                      |
| levels, categorias, produtos publicados                                                                                       | público, somente configuração publicável                           | admin via Function                                       |
| challenges, rewards, content_posts                                                                                            | público apenas em documentos publicados                            | admin/moderação via Function                             |
| ranking_entries, public_creator_profiles                                                                                      | público sanitizado e conforme consentimento                        | Function                                                 |
| badges ativos                                                                                                                 | público                                                            | admin via Function                                       |
| user_badges, likes                                                                                                            | projeção pública apenas quando prevista; dados privados protegidos | Function                                                 |
| campaigns, audit_logs                                                                                                         | equipe administrativa com role apropriada                          | Function; auditoria append-only                          |
| operation_keys, outbox_events, settings privadas                                                                              | backend; acesso administrativo restrito por serviço                | backend                                                  |

Admin usa equipe `nuy-admins` e roles como `admin`, `moderator` e `fulfillment`. Moderador não ajusta pontos livremente; fulfillment não modera nem acessa PII desnecessária. Middleware e layouts não substituem verificação nos comandos.

Storage: `brand-assets` público e escrito apenas pela equipe; `submission-media` privado em quarentena; `community-media` público somente após aprovação e consentimento; `avatars` com publicação explícita. Nunca tornar público o bucket inteiro de submissões.

## Pontos, níveis e ranking

- Ledger append-only; correções são novas transações compensatórias referenciando as originais.
- availableBalance = soma de amount. Não pode ficar negativo.
- qualifyingPoints é derivado dos créditos elegíveis e reversões; gasto em recompensa não rebaixa nível.
- rankingDelta explícito evita que estornos de compra ou ajustes não elegíveis inflem ranking.
- Ranking geral soma rankingDelta elegível; mensal usa período em timezone configurado, inicialmente proposto America/Sao_Paulo.
- Revogação de crédito deve corrigir o período original por referência, sem manipular mês corrente. A política de revogação após gasto precisa ser definida; até lá, bloquear ajuste que produza saldo negativo.
- Empate: maior earnedPoints, depois quem atingiu a pontuação primeiro, depois userId estável.

Seed somente de configuração, não de atividade fictícia:

| Nível           | Mínimo |     Máximo |
| --------------- | -----: | ---------: |
| Exploradora NUY |      0 |        500 |
| Criadora NUY    |    501 |       1500 |
| Inspiradora NUY |   1501 |       3000 |
| Embaixadora NUY |   3001 |       5000 |
| Ícone NUY       |   5001 | sem limite |

Ajuste aprovado para eliminar sobreposição em 5000. Configuração vem do backend, nunca de regras hardcoded no frontend.

## Antifraude e idempotência

Canonicalizar identificadores de posts por plataforma, remover tracking e normalizar host. Hash de arquivo detecta duplicação exata; hash perceptual/sinais adicionais ficam preparados para reutilização transformada. Não alegar prevenção completa de contas múltiplas apenas com email único.

Índices únicos são barreira final, não apenas consultas antes de inserir. Clientes enviam chave de intenção; backend vincula a identidade/operação e requestHash. Repetir a mesma intenção retorna o mesmo resultado; payload diferente com a mesma chave gera conflito. Crédito de aprovação tem também chave determinística por submissão para impedir duplicidade com outra chave de request.

Provisionamento deve validar limites reais de índices/atributos e capacidades da versão Appwrite escolhida antes de aplicar o schema.
