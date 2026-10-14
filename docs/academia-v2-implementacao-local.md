# Academia NUY V2 — implementação local para revisão

Estado: código local, sem migração ou provisionamento remoto. A ativação geral continua condicionada a `APPWRITE_ACADEMY_ENABLED=false` fora do stub isolado. Nenhum bucket, chave ou tabela foi criado no Appwrite real.

## Operações e entradas

- `saveAcademyDraftAction`: cria/edita curso, módulos, aulas e materiais em uma única transação TablesDB. Mantém IDs existentes, recusa IDs repetidos ou relações cruzadas e preserva filhos ausentes do formulário. O curso carrega `version` para impedir sobrescrita concorrente.
- `setAcademyCourseStatusAction`: publica ou arquiva curso e ACLs dos filhos em transação. Publicação exige categoria ativa, módulo, aula e mídia registrada como privada e pronta. Arquivamento remove leitura geral de curso, módulos, aulas, materiais e comentários daquelas aulas.
- `completeAcademyLessonAction`: conclusão com ID determinístico por usuário/aula; repetição retorna a mesma linha. Confere aula e curso publicados. Não toca no ledger de pontos.
- `postAcademyCommentAction`, `editAcademyCommentAction`, `hideAcademyCommentAction`, `reportAcademyCommentAction`: validam identidade, alvo publicado, autoria, status e dados com Zod. Comentário novo ou editado entra em `pending`. Chave UUID de idempotência evita envio duplicado do mesmo formulário. Denúncia é única por usuário/comentário.
- `moderateAcademyCommentAction`, `replyAsAcademyStaffAction`: exigem capacidade `moderate`; registram evento de auditoria na mesma transação. Resposta da equipe também entra em moderação. A aprovação de uma resposta cria notificação privada para a autora do comentário original.

As Server Actions conferem Origin, sessão HTTP-only, membership da equipe e capabilities em cada chamada. A chave de operações permanece no servidor. Erros de validação, conflito, falta de acesso e indisponibilidade viram mensagens sem afirmar sucesso. O stub é o único ambiente usado para escritas nos testes.

## Fluxo de interface

Admin prepara rascunho no editor existente, salva, vincula IDs de MP4/PDF já homologados, publica e modera a conversa. Creator acessa somente curso e aula publicados, registra conclusão e envia comentários sujeitos a aprovação. A tela de Admin mantém a fila, permite aprovar, rejeitar, ocultar e responder. O progresso e as notificações usam as tabelas existentes/propostas.

O editor mostra campos de vínculo para IDs de arquivos verificados; **não recebe o binário**. Os botões de upload e abertura de PDF permanecem bloqueados. Nenhuma rota entrega MP4 pelo Vercel. O player HTML5 só recebe URL quando um mecanismo privado de entrega tiver sido comprovado; hoje não recebe URL.

## Contrato de mídia e bloqueio atual

Bucket proposto: `academy-media`, privado, `fileSecurity=true`, extensões MP4/PDF, sem leitura pública. `media-contract.ts` rejeita permissão de leitura, bucket errado, partes incompletas, MIME/extensão divergentes e tamanho acima dos limites **propostos** de 200 MiB para MP4 e 25 MiB para PDF. Isso valida apenas metadados: não prova H.264/AAC, integridade do conteúdo, antivírus, byte-range, seek, acesso expirado ou limite real do host.

A tabela privada `academy_media` representa `pending`/`ready`, `fileId`, aula, tipo, MIME, tamanho, hash e verificação. A publicação exige `ready` associado à mesma aula. Em staging, implementar upload direto autorizado para Admin sem chave no navegador, validação real do arquivo e da ACL, scanner/codec, substituição atômica e coleta de órfãos. Só depois habilitar entrega privada curta por usuário/aula se a versão instalada provar essa capacidade. Não usar Server Action ou Vercel Function como transporte de MP4. Enquanto não houver esse caminho, upload, player e PDF estão **bloqueados por segurança**.

Trocar o `fileId` de uma aula publicada coloca a aula em rascunho e revoga sua leitura geral, a dos comentários e a dos materiais vinculados até nova publicação. Trocar ou mover o PDF revoga sua leitura. A moderação recusa tornar público um comentário cujo alvo deixou de estar publicado. `orphanedMediaCandidates` apenas aponta arquivos antigos sem referência depois de uma janela de 24 horas; não exclui nada sem nova conferência do banco e Storage.

## Schema aditivo proposto

Manifesto em `infra/appwrite/academy-schema.ts`, versão `academy-002-proposal-v2`, ainda fora do provisioner v001. São 10 tabelas: `academy_categories`, `academy_courses`, `academy_modules`, `academy_lessons`, `academy_materials`, `academy_media`, `academy_progress`, `community_comments`, `community_reports`, `community_moderation_events`. `notifications` já pertence ao manifesto atual. Índices e unicidades constam do manifesto; a busca por `academy_courses.searchText` precisa de FULLTEXT separado.

| Tabela | Campos principais | Unicidade e índices principais |
| --- | --- | --- |
| `academy_categories` | slug, name, description, order, active | slug único; active/order/slug |
| `academy_courses` | slug, title, summary, searchText, description, categoryId, coverFileId, status, order, publishedAt, version | slug único; status/order/slug; categoryId/status/order/slug; FULLTEXT searchText |
| `academy_modules` | courseId, title, summary, order | courseId/order único |
| `academy_lessons` | courseId, moduleId, title, summary, durationSeconds, videoFileId, status, order, publishedAt | moduleId/order único; courseId/status/order |
| `academy_materials` | courseId, lessonId, title, kind, fileId, url, order | courseId/order; lessonId/order |
| `academy_media` | fileId, lessonId, kind, status, mimeType, sizeBytes, sha256, createdBy, createdAt, verifiedAt | fileId único; lessonId/kind; status/createdAt |
| `academy_progress` | userId, courseId, lessonId, completedAt | userId/lessonId único; userId/courseId |
| `community_comments` | targetType, targetId, parentId, authorId, body, status, createdAt, editedAt, moderatedBy, moderatedAt, moderationReason | targetType/targetId/status/createdAt; parentId; authorId/createdAt |
| `community_reports` | commentId, reporterId, reason, status, reviewedBy, reviewedAt | commentId/reporterId único; status/commentId |
| `community_moderation_events` | commentId, actorId, fromStatus, toStatus, reason, createdAt | commentId/createdAt; actorId/createdAt |

Todas as tabelas devem ter `rowSecurity=true` e permissão geral vazia. IDs de curso, módulo, aula, material, usuário e arquivo são relações lógicas: validar a integridade no serviço e na migração, pois o manifesto não define chaves estrangeiras. A tabela existente `notifications` mantém a unicidade `eventKey/userId`. A publicação e a auditoria dependem de transações; sem confirmação no Appwrite instalado, não ativar a flag.

ACL proposta: sem permissão de tabela geral para o cliente. Curso/módulo/aula/material publicados e comentário visível recebem leitura de usuários autenticados; rascunhos ficam restritos à chave de operações. Progresso, comentário pendente/oculto e denúncia têm leitura da própria pessoa; eventos e registro de mídia ficam privados ao servidor. Escritas passam somente pelas ações autenticadas. Revisar limites de índices, soma de `varchar`, escopos da chave e semântica de transações no projeto isolado antes da migração.

## Inventário da V2

Código de domínio e servidor: `src/features/academy/domain.ts`, `services/read.ts`, `services/operations.ts`, `services/actions.ts`, `services/media-contract.ts`. Interface: `components/editor.tsx`, `creator.tsx`, `comments.tsx`, `admin.tsx`, `lesson-progress.tsx`, `moderation-controls.tsx` e `academy.module.css`. Rotas: Admin `/admin/academia`, `/novo`, `/[id]`, `/comentarios`; Creator `/app/academia/[slug]` e `/aulas/[lessonId]`; conversa de desafios integrada em `challenges-screen.tsx`. Proposta de infraestrutura: `infra/appwrite/academy-schema.ts`. Testes locais: `tests/unit/academy-operations.test.ts`, `academy-media-contract.test.ts`, `academy-schema.test.ts`, `tests/e2e-app/academy.spec.ts` e stub em `tests/support/appwrite-stub/academy-fixtures.mjs`, `server.mjs`, `server.d.mts`.

## Migração mínima e dependências para produção

1. Confirmar projeto isolado, versão real do Appwrite, limites e escopos. Planejar recursos aditivos e revisar ACL/índices, sem alterar imagens do catálogo.
2. Criar tabelas e bucket privado somente após aprovação. Obter chave exclusiva de operações com `rows.read`/`rows.write`; credenciais de Storage só com escopos necessários. Separar Preview de Production.
3. Homologar upload multipart direto, autorização Admin, limpeza de órfãos, MP4 H.264/AAC e PDF, scanner, Range/seek/mobile, sessão expirada, arquivo ausente e acesso negado. Medir armazenamento e concorrência.
4. Provar notificações e transações no Appwrite real, verificar versão otimista e índices com dados sintéticos. Ensaiar rollback e backup.
5. Só depois considerar habilitar `APPWRITE_ACADEMY_ENABLED` no ambiente aprovado. Nenhuma chave ou arquivo privado deve ir ao bundle cliente.

## Testes

Os testes locais exercitam o stub TablesDB com transações, conflito de versão, idempotência, publicação recusada sem mídia pronta, conclusão, moderação e notificação. O stub emula a verificação de mídia e **não constitui homologação de Storage/Range**. O E2E visual cobre 1440, 390 e 375 px.

Resultados da implementação anterior: typecheck e build passaram; E2E Academia passou com 6/6; Vitest chegou a 199/199 com o timeout de 15 s. Houve timeout intermitente de 5 s em `onboarding-endpoint.test.ts`; sua causa não foi provada.

### Fechamento local de 14/10/2026

- `git diff --check` e `npm run typecheck`: passaram.
- `npm test` padrão: duas execuções terminaram com 198/199; o mesmo teste de `onboarding-endpoint.test.ts` excedeu 5 s (6,7 s e 5,3 s). Não é teste da Academia. `npm test -- --testTimeout 15000`: 199/199. A primeira tentativa desta repetição encontrou `spawn EPERM` no sandbox; repetida com permissão de processos locais, passou. O timeout padrão continua como limitação conhecida, sem diagnóstico definitivo.
- Testes unitários específicos de Academia, Admin e permissões: 48/48 com `--testTimeout 15000`.
- `npm run test:e2e:app`: primeira tentativa no sandbox encontrou `spawn EPERM`. Executado com permissão para processos locais: 26/27; o cenário de resposta da equipe recarregava a Creator antes de esperar a aprovação concluir. O teste passou a aguardar o estado `Visível`. Depois, E2E Academia isolado: 6/6; suíte completa repetida: 27/27. Tudo usa o stub local, não Appwrite remoto.
- `npm run build`: passou, incluindo compilação TypeScript e geração das rotas.

### Hipóteses para homologação Appwrite 2.2.0

O SDK `node-appwrite` instalado expõe `createTransaction`, `updateTransaction`, `deleteTransaction` e `transactionId` nas operações de linhas. A documentação atual do Appwrite descreve commit atômico, leitura das alterações staged e conflito no commit. Isso confirma o desenho da API, mas não prova o comportamento da instância 2.2.0 nem o limite de operações do projeto. O salvamento do grafo, a publicação e a revogação de ACL devem ser repetidos em projeto isolado, incluindo conflito simultâneo, falha no meio da transação e comparação do estado antes/depois. O provisioner v001 não importa o manifesto `academy-002`; os 10 esquemas, `rowSecurity=true`, permissões de tabela vazias, índices UNIQUE/KEY e FULLTEXT, tipos e tamanhos precisam de revisão e plano aditivo próprio. A soma de `varchar` de cada tabela deve ser conferida contra o limite medido do host antes de qualquer apply.

### Plano de homologação real, pendente de aprovação separada

1. Confirmar Project ID de staging diferente de `PRODUCTION_PROTECTED`, endpoint 2.2.0, credenciais exclusivas e plano de rollback. Fazer inventário somente de leitura de tabelas, índices, permissões e limites.
2. Revisar e aprovar migração aditiva das 10 tabelas, sem alterar o provisioner v001 nem dados atuais. Criar índices KEY/UNIQUE e FULLTEXT exigidos e verificar `rowSecurity=true`, ausência de permissões gerais e integridade lógica de curso, módulo, aula, material e arquivo.
3. Usar contas técnicas sem dados reais para testar Admin, Creator e visitante: rascunho, publicação, alteração de vídeo/PDF, arquivamento, moderação, denúncias, progresso próprio, idempotência, conflito e rollback. Conferir ACL via API direta com cada sessão, inclusive comentários pendentes, rejeitados e status desconhecido. Verificar auditoria e notificações.
4. Aprovar separadamente o bucket privado `academy-media`, quota/limites de host, credenciais de escopo mínimo, backup e limpeza. Verificar que `community-media` e imagens do catálogo permanecem intocados.
5. Implementar e testar upload direto autorizado a Admin, MP4 H.264/AAC e PDF válidos, upload interrompido/multipart, tamanho real, hash, codec, scanner/antivírus, quarentena e substituição segura. O stub atual não disponibiliza mídia.
6. Com URLs curtas emitidas após autorização por usuário/aula, testar no navegador play, pause, seek, mobile, `Range`/206, expiração/403, arquivo ausente/404, usuário sem acesso e vazamento por URL copiada. Nenhum MP4 deve atravessar Vercel Functions.
7. Ativar a flag somente no staging isolado após esses gates, observar erros e latência sob carga, depois pedir decisão separada para produção. Rollback operacional começa desligando `APPWRITE_ACADEMY_ENABLED`, revogando URLs/chaves de staging se necessário e preservando tabelas/arquivos para investigação; remoção de recursos exige inventário e aprovação específicos.
