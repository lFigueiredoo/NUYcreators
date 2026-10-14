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

## Schema aditivo proposto

Manifesto em `infra/appwrite/academy-schema.ts`, versão `academy-002-proposal-v2`, ainda fora do provisioner v001. São 10 tabelas: `academy_categories`, `academy_courses`, `academy_modules`, `academy_lessons`, `academy_materials`, `academy_media`, `academy_progress`, `community_comments`, `community_reports`, `community_moderation_events`. `notifications` já pertence ao manifesto atual. Índices e unicidades constam do manifesto; a busca por `academy_courses.searchText` precisa de FULLTEXT separado.

ACL proposta: sem permissão de tabela geral para o cliente. Curso/módulo/aula/material publicados e comentário visível recebem leitura de usuários autenticados; rascunhos ficam restritos à chave de operações. Progresso, comentário pendente/oculto e denúncia têm leitura da própria pessoa; eventos e registro de mídia ficam privados ao servidor. Escritas passam somente pelas ações autenticadas. Revisar limites de índices, soma de `varchar`, escopos da chave e semântica de transações no projeto isolado antes da migração.

## Migração mínima e dependências para produção

1. Confirmar projeto isolado, versão real do Appwrite, limites e escopos. Planejar recursos aditivos e revisar ACL/índices, sem alterar imagens do catálogo.
2. Criar tabelas e bucket privado somente após aprovação. Obter chave exclusiva de operações com `rows.read`/`rows.write`; credenciais de Storage só com escopos necessários. Separar Preview de Production.
3. Homologar upload multipart direto, autorização Admin, limpeza de órfãos, MP4 H.264/AAC e PDF, scanner, Range/seek/mobile, sessão expirada, arquivo ausente e acesso negado. Medir armazenamento e concorrência.
4. Provar notificações e transações no Appwrite real, verificar versão otimista e índices com dados sintéticos. Ensaiar rollback e backup.
5. Só depois considerar habilitar `APPWRITE_ACADEMY_ENABLED` no ambiente aprovado. Nenhuma chave ou arquivo privado deve ir ao bundle cliente.

## Testes

Os testes locais exercitam o stub TablesDB com transações, conflito de versão, idempotência, publicação recusada sem mídia pronta, conclusão, moderação e notificação. O stub emula a verificação de mídia e **não constitui homologação de Storage/Range**. Os resultados executados nesta rodada constam do relatório final da revisão; o E2E visual existente também cobre 1440, 390 e 375 px.
