# Academia NUY — Fase C0: plano de homologação Appwrite

> **Atualização C1:** os gates locais e o checklist revisado estão na [seção 10](#10-atualização-c1--gates-locais-antes-da-migração-15102026). As lacunas descritas nas seções C0 anteriores são o histórico da análise original.

**Data:** 15/10/2026. **Base local:** `5378883d4b7d4993ad3a373adee1b878f6125c05`. **Estado:** preparação; nenhuma migração, escrita remota, bucket, credencial, deploy, push ou commit nesta fase. A Academia é um módulo do mesmo NUY Creators e usa o banco do projeto aprovado, sem alterar ledger, autenticação ou imagens do catálogo. `APPWRITE_ACADEMY_ENABLED` permanece falso.

## 1. Evidência real e limite da conclusão

Consultas **GET** nesta rodada, sem leitura de linhas de usuários: `GET /health/version` retornou `2.2.0`; `GET /project` confirmou o projeto `Nuy`, ID `6ac044af0008cbdda070`, marcado localmente como `PRODUCTION_PROTECTED`. A listagem TablesDB retornou **31 tabelas** existentes e **nenhuma** das 10 tabelas da Academia. Todas as 31 retornaram `rowSecurity=true` e zero permissões gerais de tabela. Há quatro buckets (`avatars`, `brand-assets`, `community-media`, `submission-media`), nenhum `academy-media`; todos retornaram `fileSecurity=true` e zero permissões gerais. `notifications` já existe, com índices `u_eventKey_userId` UNIQUE e `i_userId_createdAt` KEY, ambos disponíveis. `GET /health/storage` e `/health/storage/local` retornaram `pass`; `/health/anti-virus` retornou **`disabled`**. Os health checks não informam espaço livre, backend efetivo, `_APP_STORAGE_LIMIT`, limite do proxy ou capacidade de tráfego. A configuração local lida para a sonda mantém a flag da Academia falsa; nenhum valor de chave foi exibido.

O [release 2.2.0](https://github.com/appwrite/appwrite/releases/tag/2.2.0), a [documentação TablesDB](https://appwrite.io/docs/products/databases/tablesdb/transactions) e as assinaturas do `node-appwrite` instalado são compatíveis com `createTransaction`, operações de linha com `transactionId`, commit/rollback e detecção de conflito. A documentação atual não substitui teste de escrita **na instalação 2.2.0**: esta fase não mediu commit, read-your-writes, limite de operações, criação de coluna/índice, ACL efetiva ou S3 `Range` nela. Compatibilidade funcional permanece **condicional**.

## 2. Convenções e inventário das 10 tabelas propostas

Fonte exata: `infra/appwrite/academy-schema.ts`, versão `academy-002-proposal-v2`, **fora** do provisionador v001. Nas listas abaixo, `v(n)` = `varchar` de n caracteres, `i` = inteiro, `b` = booleano, `dt` = datetime; `?` = opcional. `U` = UNIQUE, `K` = índice KEY; `FT` = FULLTEXT adicional. IDs de outras tabelas são **relações lógicas**, sem foreign key no manifesto. Cada tabela nova exige `rowSecurity=true`, permissão de tabela `[]` e escrita apenas por comando servidor autenticado. `R(users)` significa leitura por usuárias autenticadas da linha publicada, `R(owner)` leitura da própria autora/Creator; ambos devem ser confirmados na API real. A chave de servidor ignora ACL de linha, logo todo uso dela exige autorização no serviço. [Permissões TablesDB](https://appwrite.io/docs/products/databases/tablesdb/permissions), [chaves de servidor](https://appwrite.io/docs/advanced/security/permissions).

### 2.1 `academy_categories` — classificação de cursos

- **Colunas:** `slug v(255)`, `name v(255)`, `description v(1000)?`, `order i`, `active b`. Soma `varchar`: **1.510**.
- **Índices:** `U(slug)`; `K(active,order,slug)`; `K(order,slug)`. Relação lógica: `academy_courses.categoryId → academy_categories.$id`.
- **Uso/ACL:** catálogo Creator lê apenas categorias ativas; Admin lista todas; `saveEditorDraft` e publicação exigem categoria ativa. Categoria ativa: `R(users)`; inativa: somente servidor. A tela Admin de categorias **não grava**: botão desabilitado. Sem categoria inicial aprovada, o primeiro curso não pode ser salvo. Não importar categorias de `content_categories` automaticamente.
- **Rollback:** antes de haver cursos, remover somente seeds sintéticas/da Academia após conferência; com referência existente, manter tabela e desativar módulo. Nunca tocar em `content_categories`.

### 2.2 `academy_courses` — treinamento e estado editorial

- **Colunas:** `slug v(255)`, `title v(255)`, `summary v(1000)`, `searchText v(2000)`, `description v(6000)?`, `categoryId v(255)?`, `coverFileId v(255)?`, `status v(255)`, `order i`, `publishedAt dt?`, `version i`. Soma `varchar`: **10.275**.
- **Índices:** `U(slug)`; `K(status,order,slug)`, `K(categoryId,status)`, `K(categoryId,status,order,slug)`, `K(order,slug)`; **`FT(searchText)` ainda não expresso pelo provisionador v001**. Relações: categoria; filhos módulos, aulas e materiais.
- **Uso/ACL:** Admin cria/edita via `saveEditorDraft`, publica/arquiva via `setCourseStatus`, lista rascunhos com chave após `requireStaff('manage-catalog')`; Creator consulta somente `status=published` por sessão. Curso publicado: `R(users)`; rascunho/arquivado: `[]`. `version` sustenta concorrência otimista; slug único também é imposto pelo índice.
- **Rollback:** desligar flag e preservar linhas; se ainda vazio, eventual remoção é operação separada e aprovada. Não reverter curso publicado por drop ou alteração do schema atual.

### 2.3 `academy_modules` — ordenação dos módulos

- **Colunas:** `courseId v(255)`, `title v(255)`, `summary v(1000)?`, `order i`. Soma `varchar`: **1.510**.
- **Índices:** `U(courseId,order)`; sem outros. Relação: `courseId → academy_courses.$id`; aulas apontam para módulo.
- **Uso/ACL:** `saveEditorDraft`/`saveModule` preservam IDs existentes e conferem curso; publicação/arquivamento trocam ACL junto com o curso. Admin lê via chave após guarda; Creator lê somente filhos de curso publicado com permissão de linha. Publicado: `R(users)`; caso contrário: `[]`.
- **Rollback:** preservar módulos referenciados; eventual remoção só após inventário dos filhos e aprovação.

### 2.4 `academy_lessons` — aula e vínculo de vídeo

- **Colunas:** `courseId v(255)`, `moduleId v(255)`, `title v(255)`, `summary v(2000)?`, `durationSeconds i?`, `videoFileId v(255)?`, `status v(255)`, `order i`, `publishedAt dt?`. Soma `varchar`: **3.275**.
- **Índices:** `U(moduleId,order)`; `K(courseId,status,order)`. Relações: curso, módulo e `videoFileId → academy_media.fileId`/Storage; progresso, materiais e comentários referenciam aula.
- **Uso/ACL:** `saveEditorDraft`/`saveLesson` validam curso e módulo; troca de vídeo força rascunho e revoga leitura de aula, comentários e materiais; publicação exige mídia `ready` da mesma aula; `completeLesson` verifica aula **e** curso publicados. Publicada: `R(users)`; rascunho/arquivada: `[]`.
- **Rollback:** revogar emissão de novas URLs e desligar flag; conservar metadados e objeto para auditoria. Exclusão posterior exige reconciliar referências.

### 2.5 `academy_materials` — PDF ou link de aula

- **Colunas:** `courseId v(255)`, `lessonId v(255)?`, `title v(255)`, `kind v(255)`, `fileId v(255)?`, `url v(2048)?`, `order i`. Soma `varchar`: **3.323**.
- **Índices:** `K(courseId,order)`; `K(lessonId,order)`; nenhuma unicidade. Relações: curso, aula, `fileId → academy_media.fileId`/Storage para PDF.
- **Uso/ACL:** Admin salva pelo editor/`saveMaterial`; link exige HTTPS, PDF exige arquivo; publicação confere PDF `ready` da aula; troca/movimentação do PDF revoga leitura até nova publicação. Publicado: `R(users)` somente se a aula está publicada; demais: `[]`.
- **Bloqueio de schema:** `lessonId` é opcional no manifesto, embora os comandos de gravação exijam aula. `creatorAcademyCourse` ainda aceita material sem `lessonId`, e a publicação não valida a relação de todos os links. **Antes de aplicar**, revisar a proposta para `lessonId` obrigatório e adicionar validação completa de vínculo/HTTPS na publicação. Não há tabela existente a alterar.
- **Rollback:** manter metadados e objetos; nunca apagar PDF referenciado. Limpeza exige verificação dupla e janela de retenção.

### 2.6 `academy_media` — registro privado de arquivo

- **Colunas:** `fileId v(255)`, `lessonId v(255)`, `kind v(255)`, `status v(255)`, `mimeType v(255)`, `sizeBytes i`, `sha256 v(64)?`, `createdBy v(255)`, `createdAt dt`, `verifiedAt dt?`. Soma `varchar`: **1.594**.
- **Índices:** `U(fileId)`; `K(lessonId,kind)`; `K(status,createdAt)`. Relações: aula e arquivo do futuro `academy-media`; `academy_lessons.videoFileId` e `academy_materials.fileId` apontam para ele.
- **Uso/ACL:** publicação apenas lê linha `ready` do tipo e aula esperados. Não existe fluxo real de upload/verificação que crie `ready` nesta V2. A tabela fica `[]` para clientes; só o serviço autorizado pode ler/gravar. A condição de `ready` deve depender de inspeção real, não de metadados enviados pelo navegador.
- **Rollback:** interromper emissão de assinaturas e uploads; preservar registro/objeto durante investigação, abortar multipart pendente e excluir órfãos apenas com novo inventário aprovado.

### 2.7 `academy_progress` — conclusão individual

- **Colunas:** `userId v(255)`, `courseId v(255)`, `lessonId v(255)`, `completedAt dt`. Soma `varchar`: **765**.
- **Índices:** `U(userId,lessonId)`; `K(userId,courseId)`; `K(courseId)`. Relações: usuário Auth, curso e aula.
- **Uso/ACL:** `completeLesson` deriva `userId` da sessão e ID determinístico de usuário/aula; repetição é idempotente. Creator lê suas linhas com sessão + filtro do próprio ID; Admin vê apenas contagem agregada. `R(owner)`; nenhuma escrita do cliente nem no ledger de pontos.
- **Rollback:** preservar progresso da usuária; desligar módulo sem apagar ou converter pontos.

### 2.8 `community_comments` — conversa moderada de aula/desafio

- **Colunas:** `targetType v(255)`, `targetId v(255)`, `parentId v(255)?`, `authorId v(255)`, `body v(4000)`, `status v(255)`, `createdAt dt`, `editedAt dt?`, `moderatedBy v(255)?`, `moderatedAt dt?`, `moderationReason v(1000)?`. Soma `varchar`: **6.530**.
- **Índices:** `K(targetType,targetId,status,createdAt)`, `K(parentId)`, `K(authorId,createdAt)`, `K(status,createdAt)`, `K(createdAt)`; sem UNIQUE. Relações: aula ou `challenges` existente; comentário pai; autor e moderador Auth.
- **Uso/ACL:** criação e edição entram em `pending` com `R(owner)`; lista Creator consulta apenas `visible`. Aprovar confere alvo publicado e concede `R(users)`; rejeitar/ocultar retorna a `R(owner)`; cada transição gera evento. Admin usa chave somente após capacidade `moderate`.
- **Bloqueio de integração:** o ciclo de publicação/arquivamento de **desafios existentes** não revoga ACL de comentários ligados a desafios. Antes de habilitar comentários em desafios no projeto protegido, provar ou implementar a revogação sem alterar suas regras atuais. Estado desconhecido nunca deve receber `R(users)`; verificar por API direta, não só filtro da interface.
- **Rollback:** preservar comentários e auditoria; revogar leitura geral dos comentários de aulas ao retirar aulas; nenhuma exclusão em massa.

### 2.9 `community_reports` — denúncia por usuária/comentário

- **Colunas:** `commentId v(255)`, `reporterId v(255)`, `reason v(1000)`, `status v(255)`, `reviewedBy v(255)?`, `reviewedAt dt?`. Soma `varchar`: **2.020**.
- **Índices:** `U(commentId,reporterId)`; `K(status,commentId)`; `K(commentId)`. Relações: comentário, denunciante e revisora Auth.
- **Uso/ACL:** `reportComment` só aceita comentário visível de outra autora, com alvo publicado; ID determinístico evita duplicação. `adminAcademyReports` lê fila após guarda Admin. `R(owner)` para denunciante; nenhuma leitura geral.
- **Rollback:** preservar denúncias e trilha; não apagar relatos quando o módulo é desativado.

### 2.10 `community_moderation_events` — trilha de moderação

- **Colunas:** `commentId v(255)`, `actorId v(255)`, `fromStatus v(255)`, `toStatus v(255)`, `reason v(1000)?`, `createdAt dt`. Soma `varchar`: **2.020**.
- **Índices:** `K(commentId,createdAt)`; `K(actorId,createdAt)`; sem UNIQUE. Relações: comentário e moderador Auth.
- **Uso/ACL:** `moderateComment` cria evento na mesma transação da mudança de estado; somente servidor lê/grava; `[]` para clientes. O código só adiciona eventos, mas o schema/escopo não impõe imutabilidade física: documentar retenção e controle operacional de chave antes de ativar.
- **Rollback:** nunca apagar eventos para “desfazer” moderação; reverter estado por novo evento autorizado e manter histórico.

**Dependências existentes usadas sem alteração:** `notifications` recebe aviso privado de resposta aprovada com chave de idempotência; `challenges` valida alvo de comentários; `public_creator_profiles` fornece apenas nome público na fila Admin; a equipe `nuy-admins` define capacidades. `users`, `profiles`, Auth, ledger (`point_accounts`, `point_transactions`) e buckets atuais permanecem intocados.

## 3. Avaliação de schema e índices antes de migração

As dez somas `varchar` calculadas acima ficam abaixo do orçamento **16.108** medido anteriormente no host para uma tabela v001. Isso não prova que todos os índices sejam aceitos. Três índices compostos têm vários `varchar(255)` — especialmente `academy_courses(categoryId,status,order,slug)` e `community_comments(targetType,targetId,status,createdAt)` — e podem esbarrar em comprimento de chave/charset. Confirmar nomes, ordem, prefixos exigidos, FULLTEXT em `searchText`, português, unicidade e estado `available` na instância 2.2.0 **antes** de dados reais. A [documentação de tabelas](https://appwrite.io/docs/products/databases/tablesdb/tables) observa limites de indexação de `varchar`; esta avaliação é estática.

Definir também: categoria inicial aprovada; `academy_materials.lessonId` obrigatório; política de status válidos; limite de filhos/linhas por transação e paginação (o serviço recusa acima de 5.000 linhas). O editor permite até 100 módulos × 100 aulas e 500 materiais, maior que limites usuais por transação descritos na [documentação atual](https://appwrite.io/docs/products/databases/tablesdb/transactions). Medir o limite real do projeto e reduzir o máximo aceito pelo comando antes da ativação. Nenhum índice/coluna de tabela existente é necessário para esta proposta; se um ensaio mostrar o contrário, **parar** e apresentar mudança separada.

## 4. Plano de migração exclusivamente aditiva

**Pré-condições:** aprovação do projeto alvo e janela; login de produção validado; chave de provisionamento com escopo mínimo e guard `PRODUCTION_PROTECTED` preservado; inventário das 31 tabelas/4 buckets e ACL/índices salvo para comparação; backup consistente **e restauração testada** em ambiente isolado, incluindo banco, Storage, configuração, segredos necessários à restauração e metadados de Auth. A existência/verificação desse backup não foi comprovada nesta fase. Medir espaço, limite de colunas/índices e transação sem modificar infraestrutura produtiva. Não usar `infra:apply` v001 para criar Academia, pois o manifesto V2 não é importado por ele.

**Sequência proposta para a execução futura, sujeita a aprovação separada:**

1. Repetir identidade e inventário read-only imediatamente antes da janela. Registrar hash do plano, Project ID, contagens, ACL e índices atuais. Abortar se não coincidirem com a revisão aprovada.
2. Criar **somente** as 10 tabelas novas com `permissions=[]`, `rowSecurity=true` e colunas do manifesto revisado. Criar índices U/K e FULLTEXT separadamente; aguardar `available`. Nenhum `updateTable` nas 31 tabelas existentes.
3. Conferir por GET cada coluna, tipo, obrigatoriedade, tamanho, índice, unicidade e ACL. Inserir apenas categorias aprovadas na tabela nova, com IDs conhecidos e `R(users)` se ativas; nenhuma cópia de usuárias, sessões, tokens ou conteúdo real para staging.
4. Checkpoint: comparar novamente as 31 tabelas/4 buckets anteriores, Auth, notificações e ledger. Alteração inesperada encerra a janela sem ativar a flag. Registrar recursos novos individualmente para reversão.
5. Somente depois de testes de dados e Storage, tratar ativação como mudança **independente**. Migração de schema não implica publicar curso ou abrir acesso.

**Rollback seguro:** antes de linhas reais, manter flag falsa; recursos novos e vazios podem ser removidos apenas após inventário e aprovação explícita, em ordem inversa de dependência. Depois de qualquer linha/objeto real, rollback operacional = flag falsa, parar novas assinaturas/uploads, invalidar credenciais de teste se cabível e **preservar** tabelas/arquivos para recuperação e auditoria. Restaurar backup completo só em plano de incidente aprovado; não usar drop/reset nem restaurar parcialmente sobre dados existentes. Nunca alterar ledger de pontos, Auth, permissões existentes ou buckets de catálogo para “desfazer” a Academia.

## 5. Fluxos de segurança e evidência local

| Fluxo | Controle presente | Evidência / lacuna |
| --- | --- | --- |
| Admin cria/edita/publica | Server Action verifica Origin, sessão HttpOnly e membership real em `nuy-admins`; capacidade `manage-catalog`; Zod; transação, vínculos e `version`. | Unitários negam Creator e testam conflito/rollback no stub; papel deve ser confirmado novamente com sessão real. |
| Creator lê cursos/aulas | Leitura com sessão Appwrite, filtros `published`, ACL por linha e vínculo de curso/aula. | E2E local nega Admin e oculta rascunhos; sessão real e leitura direta da API ainda pendentes. |
| Creator conclui | Identidade vem da sessão; só aula e curso publicados; ID usuário/aula único; linha `R(owner)`. | Stub prova idempotência e recusa aula não publicada; testar corrida com arquivamento no Appwrite real. |
| Comentário/denúncia | Comentário novo/editado `pending` e `R(owner)`; aprovação requer `moderate`, status esperado, alvo publicado e evento na mesma transação. | Unitários cobrem transições/autoria; UI filtra `visible`; verificar ACL direta para `pending`, `rejected`, `unknown` e challenge arquivado. |
| Notificação | Resposta aprovada cria linha própria em `notifications` existente, dentro da transação, com `eventKey` único. | Stub prova criação; schema e entrega real precisam de teste no projeto aprovado, sem modificar tabela atual. |
| MP4/PDF | Hoje nenhuma URL de arquivo é emitida; botões de player/PDF desabilitados; publicação exige registro `ready` em tabela privada. | **Não há prova local de proteção de bytes reais**: Storage real não foi usado. Manter bloqueio até teste de ACL, URL e expiração no navegador. |

Nesta C0: `npm test -- --maxWorkers 4` passou **199/199**; `npm test` padrão passou **199/199** nesta execução; oito arquivos de testes de Academia/Admin/permissões passaram **48/48**. O fechamento V2 anterior executou E2E Academia **6/6** e suíte completa **27/27** com stub. A tentativa de repetir o E2E nesta C0 **não foi executada**: a revisão automática da elevação necessária ao Playwright retornou limite de uso, sem julgamento de segurança. Não contornar essa revisão. Resultados locais provam contratos do código e do stub; não provam ACL, transações ou Storage do servidor real.

## 6. Storage `academy-media`: especificação para aprovação

Bucket novo e exclusivo, ainda inexistente: ID `academy-media`, `fileSecurity=true`, permissões de bucket `[]`, extensões `mp4` e `pdf`, compressão `none`, sem leitura pública. **Alvo de limite por arquivo:** 200 MiB (`209.715.200` bytes), igual ao contrato V2 para MP4; PDF limitado adicionalmente no serviço a 25 MiB. `allowedMimeTypes` no objeto `academyBucketProposal` é verificação de **aplicação**, não parâmetro nativo do bucket usado pelo provisionador. Antes de criar, medir `_APP_STORAGE_LIMIT`, proxy, backend, espaço/backup e tráfego; não aumentar limites nesta C0. A documentação de [Storage self-hosted](https://appwrite.io/docs/advanced/self-hosting/configuration/storage) descreve o limite global. A documentação de [buckets](https://appwrite.io/docs/products/storage/buckets) informa que arquivos acima de 20 MB não recebem a criptografia nativa; a proteção do volume/backend e TLS devem cobrir esses objetos.

**Upload futuro:** Admin com membership/capacidade confirmada recebe autorização restrita a uma aula, tipo, tamanho, chave opaca nova e prazo curto. MP4 em multipart direto navegador → S3 Appwrite; PDF em PUT direto ou multipart. A Server Action troca só metadados, nunca o MP4/PDF. URL de upload assinada para método, bucket/objeto e parte; segredo no servidor, nunca no browser. Conferir conclusão, hash, assinatura de PDF, container/codec H.264/AAC/faststart, tamanho, extensão e MIME **no arquivo real**; registrar `pending`, promover a `ready` apenas após inspeção. O endpoint de antivírus atual está `disabled`; mesmo quando habilitado, a documentação de [Storage](https://appwrite.io/docs/references/cloud/server-graphql/storage) informa exceções de análise acima de 20 MB. Exigir scanner equivalente comprovado para MP4 e PDFs acima desse limiar antes de publicar.

**Entrega futura:** serviço autentica sessão, verifica curso e aula publicados, relação exata de `academy_media`/material e emite `GetObject` SigV4 curto para **um objeto**; `<video controls playsInline preload="metadata">` e PDF acessam o Appwrite diretamente. TTL inicial para ensaio: 10 minutos, sem cache compartilhado; renovar durante reprodução sem perder posição. Testar `Range`/206, seek, pause, mobile, expiração/403, arquivo ausente/404, sessão expirada, objeto de aula não publicada, outra Creator e URL copiada. A [API S3](https://appwrite.io/docs/products/storage/s3) documenta multipart, URL pré-assinada e `Range`, mas nada disso foi testado com MP4/PDF na instalação atual. URL assinada é portadora e não revoga imediatamente no logout; se revogação imediata for requisito, este desenho não atende.

**Órfãos:** usar candidatos com janela mínima de 24 h; antes de apagar, reler `academy_media`, aulas, materiais e Storage, verificar nenhuma referência, upload concluído/abortado, retenção e trilha de auditoria. Exclusão remota requer autorização específica. Não tocar em imagens ou buckets atuais.

**Capacidade inicial indicativa:** 10 MP4 no teto = 2.000 MiB, 30 = 6.000 MiB; acrescentar PDFs, versões substituídas, staging temporário, backup e margem. Cem reproduções a 2–4 Mbit/s exigiriam aproximadamente 200–400 Mbit/s de saída (25–50 MB/s), antes de overhead. São cenários de dimensionamento, não medição do host. Sem espaço, egress e teste de concorrência medidos, não aprovar upload.

## 7. Timeout intermitente de onboarding

Histórico: `npm test` padrão terminou **198/199 duas vezes** no fechamento V2; `onboarding-endpoint.test.ts` excedeu 5 s (6,7 s e 5,3 s). Nesta C0, o arquivo isolado passou **2/2**, primeiro teste em **2,1 s**; suíte completa com quatro workers e timeout padrão passou **199/199** em 7,07 s; suíte padrão sem ajuste passou **199/199** em 8,14 s. O teste substitui `fetch` por mock e fornece adaptadores de Account/TablesDB; não há chamada externa real nele. Ele usa `vi.resetModules()` e importação dinâmica de `functions/complete-onboarding/main`, que importa SDK e `functions/shared/host`. A suíte isola 26 arquivos/workers e transforma módulos em paralelo. Isso torna contenção de CPU/importação uma **hipótese plausível**, não uma causa raiz demonstrada. Não modificar timeout, teste ou comportamento apenas porque passou com 15 s. Próximo diagnóstico não destrutivo: coletar duração por teste e uso de CPU em várias execuções padrão e com `--maxWorkers 4` no mesmo host, sem processos concorrentes, e medir tempo de importação versus handler; corrigir só após reprodução causal.

## 8. Duas opções de homologação

| Opção | Pré-condições | Risco e alcance | Recomendação |
| --- | --- | --- | --- |
| **A. Projeto staging logicamente isolado, mesma instalação** | Project ID distinto e verificado, chaves/contas técnicas próprias, Preview apontando só para staging, backup da instalação, limites/antivírus do host conhecidos. | Isola tabelas, Auth e buckets por projeto, mas compartilha CPU, disco, rede e serviços do host; carga e mudanças globais ainda podem afetar produção. Não copiar dados/usuárias reais. | Preferida para provar schema, transações, ACL, S3 e navegador. Um novo ID não é necessário para **este plano**, apenas para executar esta opção. |
| **B. Projeto atual `PRODUCTION_PROTECTED`** | Aprovação explícita separada, backup **restaurado em ensaio**, janela/monitoramento, plano idempotente apenas aditivo, escopos mínimos, contas técnicas separadas, inventário antes/depois, rollback operacional e aceite do risco. | Escritas de teste, índices, quotas e erro de ACL ocorrem no projeto com dados reais; uma chave de API tem alcance por projeto. Não executar automaticamente; evitar teste de carga ou arquivos suspeitos aqui. | Só considerar se A for inviável e cada gate for aprovado; manter flag falsa até conclusão. |

## 9. Sequência de homologação e autorização de ativação

1. Resolver os bloqueios de schema/integração (categoria inicial, `lessonId`, validação de links, ciclo de desafios e limite transacional). Revisar plano e diff de migração sem escrita.
2. Escolher A ou B; confirmar identidade, backup/restauração, escopos e limite do host. Aprovar separadamente toda escrita futura.
3. Criar somente tabelas novas; conferir colunas, índices, unicidades, ACL e ausência de drift nas 31 existentes. Testar commit/rollback/conflito e falha parcial no Appwrite 2.2.0.
4. Usar contas técnicas para provar Admin/Creator/visitante por sessão **e por API direta**; publicação, arquivamento, comentários, notificações, progresso e auditoria. Nenhum dado real em staging.
5. Com autorização própria, criar bucket e homologar upload, scanner, codec, URL curta, `Range`, mobile, expiração, acesso negado e cleanup. Medir 10/30 aulas e 100 reproduções simultâneas.
6. Conferir login de produção, métricas e rollback. Só então solicitar aprovação separada para ativar `APPWRITE_ACADEMY_ENABLED`; ligar primeiro em ambiente homologado e acompanhar, sem ativação implícita pela migração.

**Bloqueios atuais para ativação:** antivírus desabilitado; limites/backup/capacidade não medidos; transações, índices e ACL não exercitados no projeto real; tabela de categorias sem escrita Admin e sem seed aprovada; lacunas de vínculo de materiais e ciclo de comentários em desafios; bucket/credenciais/upload/entrega privada inexistentes; login de produção e rollback restaurado não verificados nesta fase. A decisão permanece pendente de aprovação.

## 10. Atualização C1 — gates locais antes da migração (15/10/2026)

Esta seção prevalece sobre as marcações históricas de bloqueio nas seções 2, 3, 5 e 9. A C1 altera somente arquivos locais. **Não houve nova leitura do Appwrite real nesta fase**, migração, criação de bucket/chave, alteração de Vercel, deploy ou ativação de `APPWRITE_ACADEMY_ENABLED`. O inventário 31 tabelas/4 buckets e Appwrite 2.2.0 é a evidência read-only da C0, a ser reconfirmada no preflight aprovado.

### Gate 1 — categorias

`infra/appwrite/academy-seeds.ts` define cinco IDs/slugs estáveis: `cat-primeiros-passos` / `primeiros-passos`, `cat-criacao-de-conteudo` / `criacao-de-conteudo`, `cat-produtos-nuy` / `produtos-nuy`, `cat-vendas-e-divulgacao` / `vendas-e-divulgacao`, `cat-boas-praticas` / `boas-praticas`. `planAcademyCategorySeeds` separa pendentes e conflitos de ID/slug. `seedInitialCategories` exige capacidade Admin, usa transação e IDs fixos; uma repetição não duplica. **Nenhuma Action ou rota chama o executor de seeds**: executá-lo exige aprovação separada após criar e conferir as tabelas. A tela Admin permite criar, editar nome/descrição/ordem e desativar; mantém slug estável e recusa desativação de categoria vinculada a curso publicado. Action confirma Origin, sessão e membership real. A flag atual mantém o formulário sem gravação operacional.

### Gate 2 — materiais e ACL

O manifesto C1 `academy-003-proposal-c1` mantém **dez tabelas novas** e torna `academy_materials.lessonId` obrigatório, com `K(courseId,lessonId)` adicional. Em Appwrite 2.2.0, esses vínculos são verificados pelo serviço; o manifesto não declara foreign keys. `saveMaterial` verifica aula, módulo e curso no mesmo encadeamento. Publicação verifica cada material de aula do próprio curso, HTTPS para links e mídia `ready` para PDF; material órfão aborta o commit. Leitura Creator exige curso publicado, aula publicada ligada a módulo do curso e material com aula válida. Edição de aula/vídeo, movimentação de material e arquivamento revogam leitura de linha; novo material nasce privado. **Nenhum PDF/MP4 é entregue ou enviado operacionalmente** e a proteção dos bytes reais ainda não foi homologada.

### Gate 3 — orçamento do editor

`saveEditorDraft` conta as gravações estagiadas e recusa acima de **50 writes por salvamento**, teto **local conservador**, não limite remoto atribuído ao Appwrite. O mínimo é 1 curso + módulos + aulas + materiais; revogação de ACL por troca de vídeo também conta. O teste local criou 1 curso + 1 módulo + 48 aulas (= 50), recusou 49 aulas antes da transação, provou rollback após falha tardia de material, manteve `version` e IDs, e não removeu filhos ausentes do payload. Conflito concorrente já é coberto pelo teste V2. O teto implica que um curso maior deve ser salvo em etapas compatíveis; não há particionamento atômico de um único salvamento acima desse orçamento. Na homologação medir em transações reais Appwrite 2.2.0: 1, 10, 25 e 50 writes; quantidade de reads, tempo de commit, 409 por concorrência, 400 por limite, rollback e read-your-writes. Só ajustar o teto após evidência real. Publicação/arquivamento e revogação de ACL de aulas também podem acumular writes; esses fluxos precisam de ensaio e orçamento antes de cursos grandes.

### Gate 4 — comentários de desafios

O comando de desafio agora oferece `challenge.archive` além de `challenge.close`. `archived` é **estado específico do desafio**, sem ampliar os três estados compartilhados usados por campanhas/recompensas. No mesmo commit que encerra ou arquiva, o core muda comentários e respostas para `R(owner)` e mantém as linhas para auditoria com chave Admin. Arquivamento revoga também a ACL do desafio e requisitos; `closed` continua visível para histórico de participação, mas sem comentários públicos ou novos comentários. Publicar novamente um desafio fechado restaura apenas `visible` para `R(users)`. A leitura server-side da página e `challengeComments` só serve comentários de desafio `published`; `createComment` e moderação recusam alvo não publicado. O teste com sessão de terceira Creator confirmou 404 por ID direto após revogação; rascunho e desafio arquivado também negam acesso, e a tentativa de resposta tardia é recusada.

A revogação de desafio tem teto local de **40 comentários incluindo respostas** por transição; acima disso a transição inteira falha e o desafio mantém estado/ACL anteriores. Não apagar comentários. O host Next e a Function passam `academyCommentsReady` quando `APPWRITE_ACADEMY_SCHEMA_READY=true` ou `APPWRITE_ACADEMY_ENABLED=true`. Após criar as dez tabelas, configurar a flag de schema em ambos os hosts e mantê-la durante um rollback da flag de produto; isso conserva a revogação de ACL de desafios mesmo com a interface da Academia desligada. **Antes de ativar comentários**, é obrigatório implantar a versão nova da Function Admin e provar a transição real. Não arquivar/encerrar desafios com comentários existentes usando Function antiga ou sem a flag de schema: revogar ACL em procedimento aprovado ou manter o caminho novo ativo. Existe uma janela de corrida entre checar alvo e criar um novo comentário pendente; ela não libera leitura pública, mas a recusa estrita simultânea deve ser ensaiada no Appwrite real.

### Preflight somente GET

`infra/appwrite/academy-preflight.ts` prepara leitura de `/project`, `/health/version`, banco, lista de tabelas/buckets e detalhes apenas das tabelas Academy existentes e de `notifications`. Confere Project ID, inventário completo das 31 tabelas protegidas, ACL delas, índices necessários de notificação, colisões de IDs, colunas/índices/ACL das dez novas tabelas se já existirem e postura de `academy-media` se existir. Erro, paginação parcial ou divergência deixam `ready=false` ou encerram a sonda. **Não há caminho de apply nesse arquivo**. Ele ainda **não foi executado contra o projeto real na C1**; a função pura foi testada com leitores locais simulados. Com autorização de leitura e chave de escopo mínimo, executar `node --env-file-if-exists=.env --env-file-if-exists=.env.local --import tsx infra/appwrite/academy-preflight.ts`, salvar apenas o relatório sem chaves e conferir com o inventário C0. O projeto `PRODUCTION_PROTECTED` pode ser inspecionado por GET; qualquer escrita requer uma aprovação diferente.

### Checklist executável para homologação futura

1. **Escolha A, staging isolado:** verificar Project ID diferente, chaves e contas técnicas exclusivas, Preview apontando só para staging; nenhuma cópia de usuárias/sessões/dados reais. **Escolha B, projeto protegido:** exigir autorização explícita própria, janela, escopos mínimos e plano de reversão aprovado. Nenhuma opção foi executada na C1.
2. Produzir backup consistente do banco, Auth, Storage e configuração; restaurar uma cópia em ambiente isolado e documentar hash, horário, contagens e tempo de recuperação. Sem restauração comprovada, não começar.
3. Rodar preflight GET, comparar 31 tabelas/4 buckets e seus acessos com C0, exigir zero conflito. Registrar Project ID e versão 2.2.0; abortar diante de divergência. Não usar `infra:apply` v001.
4. Após aprovação de escrita, criar apenas as dez tabelas Academy com `rowSecurity=true` e ACL geral `[]`; aguardar cada coluna e índice (`UNIQUE`, `KEY`, `FULLTEXT`) em estado disponível. Conferir manifesto C1 por GET, incluindo `lessonId` obrigatório e `K(courseId,lessonId)`. Não alterar tabela existente.
5. Executar seeds idempotentes aprovadas uma vez, repetir para provar `created=0`, verificar cinco slugs/ordens e ACL ativas. Usar apenas dados sintéticos.
6. Medir transações reais de editor em vários tamanhos, conflito, rollback, limite efetivo e read-your-writes. Testar cadeia Material→Aula→Módulo→Curso e leitura direta negada a Creator para rascunho, aula rascunho e arquivado.
7. Implantações e flags são mudanças separadas: antes de qualquer comentário de desafio, implantar Function Admin C1 e configurar `APPWRITE_ACADEMY_SCHEMA_READY=true` em ambos os hosts e validar encerramento, arquivamento, respostas, ACL direta, limite de 40 e acesso de auditoria. Testar comentário pendente, aprovação/rejeição, notificação privada e progresso individual. Confirmar login de produção.
8. Storage permanece **BLOQUEADO**: `_APP_STORAGE_LIMIT`, limite de proxy/bucket, espaço, backend, capacidade, scanner/antivírus (`ANTIVIRUS_DISABLED` na C0), multipart/S3, SigV4, PDF e MP4 H.264/AAC, `Range`/206, expiração e limpeza de órfãos precisam de prova real específica. Não criar bucket, chave ou URL operacional antes dela; não declarar streaming aprovado.
9. Checkpoint pós-migração: 31 tabelas/4 buckets existentes, ledger, Auth, índices/ACL e login sem drift. Para reversão, manter flag falsa, parar novas gravações/URLs, preservar linhas e objetos novos para auditoria. Remoção de recursos novos só se vazios, inventariados e aprovada em operação separada; nunca drop/reset/restauração parcial do projeto protegido.
10. Ativar `APPWRITE_ACADEMY_ENABLED` somente após aprovação própria de todos os gates de mídia, transação, ACL, Function, backup e rollback. Migração de schema não ativa o módulo por si.

### Testes C1 e limites da evidência

- `npm run typecheck`: PASS. `npm run build`: PASS. `npm run functions:bundle`: PASS após permissão local para subprocesso do esbuild; nenhum deploy. `git diff --check`: PASS, com avisos de conversão LF/CRLF do Git sem erro de whitespace.
- Testes focados de C1, schema e preflight: PASS; casos de seeds, Admin, vínculos, teto de 50, rollback, ACL por URL direta e leitura de rascunho. `npm test` padrão: **FAIL intermitente conhecido** em `onboarding-endpoint.test.ts` por timeout de 5 s (duas execuções C1: 204/206 e 205/206; a primeira incluiu a regressão de estado global já corrigida). `npm test -- --maxWorkers 4`: **208/208 PASS** após a correção, os testes de seeds e o limite de comentários. Não alterar timeout sem causa raiz comprovada.
- `npm run test:e2e:app`: **28/28 PASS** via execução local autorizada; sete cenários da Academia passaram, inclusive criação/ordenação e guard de categorias Admin. A primeira tentativa em sandbox terminou `spawn EPERM` e não executou testes. Os E2E usam stub, não Appwrite remoto.
- Compatibilidade 2.2.0, ACL real, teto transacional remoto e Storage continuam **pendentes de homologação**. `academy-preflight.ts` não foi rodado no remoto. Este resultado não autoriza migração, upload, flag ou deploy.




### Inventário de arquivos da C1

| Grupo | Arquivos locais alterados ou criados |
| --- | --- |
| Schema e preparação | `infra/appwrite/academy-schema.ts`, `infra/appwrite/academy-seeds.ts`, `infra/appwrite/academy-preflight.ts` |
| Academia: domínio, serviços e Admin | `src/features/academy/domain.ts`, `src/features/academy/services/operations.ts`, `src/features/academy/services/actions.ts`, `src/features/academy/services/read.ts`, `src/features/academy/components/admin.tsx`, `src/features/academy/components/category-controls.tsx` |
| Rotas | `src/app/(protected)/admin/academia/categorias/page.tsx`, `src/app/(protected)/app/desafios/[slug]/page.tsx` |
| Ciclo de desafios e autorização | `src/features/workspace/core/catalog.ts`, `src/features/workspace/core/context.ts`, `src/features/workspace/core/index.ts`, `src/features/workspace/domain/catalog.ts`, `src/features/workspace/services/commands.ts`, `functions/admin-console/main.ts`, `functions/shared/host.ts` |
| Testes e stub | `tests/unit/academy-c1.test.ts`, `tests/unit/academy-preflight.test.ts`, `tests/unit/academy-schema.test.ts`, `tests/e2e-app/academy.spec.ts`, `tests/support/appwrite-stub/server.mjs` |
| Documento | `docs/academia-c0-homologacao.md` — já estava não rastreado no início da C1 e foi preservado/atualizado. |

Estado Git ao fim: **18 modificados e 6 não rastreados**, sem staging, commit ou push. Nenhum `.env`, artifact, ZIP ou backup foi adicionado à árvore de mudanças.

## 11. Fechamento auditado da C1 e procedimento proposto para C2 (15/10/2026)

### Auditoria dos gates

| Gate | Resultado local e limite |
| --- | --- |
| Categorias | `saveCategory` e `seedInitialCategories` exigem `manage` derivado de membership real no host. Slug existente é estável; categoria de curso publicado não pode ser desativada; cinco seeds usam IDs fixos e repetem sem duplicar. A interface continua sem gravação enquanto a flag está falsa. |
| Material → aula → módulo → curso | Escrita e publicação verificam o encadeamento; `academy_materials.lessonId` é obrigatório. Leitura Creator filtra por módulo e curso publicados. Bytes privados de PDF/MP4 ainda não foram homologados. |
| Editor | O orçamento local de 50 conta criações e atualizações, inclusive revogações por troca de vídeo. **Não há exclusão de filhos no editor:** filhos omitidos são preservados, logo este fluxo não chama `deleteRow`. Recusa antes ou durante a transação conserva curso, IDs, vídeo e ACL anteriores. O limite real do Appwrite precisa de medição na C2. |
| Desafios | Encerrar/arquivar até 40 comentários atualiza desafio, requisitos, comentários/respostas e auditoria no mesmo commit. Testes com 0 e 1 concluíram; 50 e 100 retornaram `limit_reached` sem transição, alteração de ACL ou novo log. **O desafio continua publicado nesses casos**, pois a solicitação foi recusada integralmente. |

O teste de corrida reteve uma resposta entre a checagem do alvo e a criação. O arquivamento ocorreu antes da criação: a resposta final ficou `pending` e legível só pela autora; outra Creator recebeu 404, uma nova resposta após o commit foi recusada e a moderação não pode publicar para alvo arquivado. A recusa estrita da resposta que já estava em curso ainda requer teste e possível ajuste em Appwrite real. O stub não prova serialização remota.

**Mais de 40 comentários:** manter a recusa segura do comando atual. Para permitir retirada de publicação em escala, projetar e aprovar um fluxo de manutenção que suspenda novas aprovações/respostas, revogue `R(users)` em lotes auditados, comprove por leitura paginada zero linhas públicas e finalize estado/ACL do desafio em transação. O comando atual teria de ser adaptado: ele recusa mais de 40 linhas mesmo após revogação prévia. Se um lote falhar, não marcar o desafio como arquivado nem apagar linhas; reconciliar a operação antes de prosseguir. Alternativa a avaliar: leitura de comentários por serviço que confira o alvo, sem `R(users)` direto nas linhas. Nenhuma estratégia foi executada nesta fase.

### Preflight e validação

O preflight continua exclusivamente de leitura. Agora também exige `status=available` em cada índice Academy esperado; o teste local de índice `processing` recusa o plano. O guard `PRODUCTION_PROTECTED` do provisionamento permanece intacto. Não houve consulta remota nesta auditoria. As dez tabelas novas são `academy_categories`, `academy_courses`, `academy_modules`, `academy_lessons`, `academy_materials`, `academy_media`, `academy_progress`, `community_comments`, `community_reports` e `community_moderation_events`; `academy-media` continua proposta.

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm test` | **214/214 PASS**, 28 arquivos, timeout padrão de 5 s e 7 workers padrão nesta máquina de 8 processadores disponíveis. As falhas anteriores 205/206 de `onboarding-endpoint.test.ts` continuam registradas na seção 10. |
| `npm test -- --maxWorkers 4` | **214/214 PASS**, mesmos arquivos/filtro/timeout. Duas tentativas no sandbox pararam antes dos testes por `spawn EPERM`; a repetição com permissão para subprocesso passou. |
| Foco Academia/Admin/ACL | **65/65 PASS**, 10 arquivos, incluindo escala 0/1/50/100, corrida de resposta, orçamento tardio, material, schema e preflight. |
| `npm run test:e2e:app` | **28/28 PASS** com stub local. Primeiro comando parou antes dos testes por `spawn EPERM`; repetição autorizada passou. |
| `npm run build` | Primeira tentativa compilou e passou TypeScript, mas o worker de coleta saiu com código Windows `3221226505`; repetição idêntica **PASS**, sem edição intermediária. Causa não comprovada. |
| `git diff --check` | PASS; apenas avisos LF/CRLF sem erro de whitespace. |

O teste de onboarding usa `vi.resetModules`, import dinâmico da Function e `fetch` simulado; não depende de rede externa. O Vitest usa `vitest.config.ts` e o filtro `tests/unit/**/*.test.ts` nas duas modalidades. O paralelismo 7 versus 4 é diferença observada e hipótese de disputa de recursos, não causa comprovada. Não houve aumento de timeout.

### Procedimento C2 para aprovação separada — não executado

1. **Identidade:** priorizar o projeto `NUY Creators — Staging` isolado. Seu Project ID **não consta da evidência local**; o operador deve informá-lo, confirmar `GET /project` e compará-lo com `6ac044af0008cbdda070` e com Production vigente. O endpoint previsto é `https://api.edocs.phiq.com.br/v1`; confirmar Appwrite 2.2.0. Preview não pode receber testes de escrita enquanto apontar para Production. A opção de migrar no projeto atual exige aprovação específica de escrita.
2. **Backup:** registrar ID/local, horário, hash/manifesto e responsável por cópia consistente de banco, Auth, Storage e configuração. **Nenhum backup restaurado foi comprovado na C1.** Restaurar em isolamento, conferir contagens, ACL, login e tempo de recuperação antes da primeira escrita. Salvar inventário read-only de Production antes/depois de qualquer homologação em staging.
3. **Plano e escopos:** congelar hash do manifesto `academy-003-proposal-c1`, dez IDs, colunas, UNIQUE/KEY/FULLTEXT e permissões. Só após aprovação, obter credenciais exclusivas do Project ID alvo, separadas por preflight de leitura, provisionamento, operações e Storage; verificar nomes de escopo aceitos no Console 2.2.0. Não copiar chave, usuárias, sessões ou dados reais para staging.
4. **Checkpoint GET:** executar o preflight de leitura no projeto protegido somente para comparar o inventário C0, sem escrever. Em staging vazio, confirmar primeiro sua identidade e inventário; o preflight Academy exige as 31 tabelas base e dará conflito esperado antes do provisionamento base. Usar ID esperado explícito e relatório sem segredos; abortar por colisão, paginação incompleta ou identidade divergente. O preflight não aplica migração; `infra:apply` v001 não cria Academia.
5. **Schema em staging após aprovação:** provisionar banco/marker e as 31 tabelas base no projeto isolado conforme plano próprio, se ainda ausentes, sem dados reais. Executar novamente o preflight Academy e exigir zero conflito no baseline de tabelas, quatro buckets, ACL e índices de `notifications`. Criar só as dez tabelas aditivas, `rowSecurity=true`, ACL geral `[]` e índices do manifesto; esperar `available` e repetir o preflight. Aplicar cinco seeds aprovadas e confirmar repetição `created=0`. `academy-media` fica em checkpoint próprio até limites, capacidade e antivírus aprovados. Não mudar as 31 tabelas existentes em Production.
6. **Provas reais:** com dados sintéticos, medir 1/10/25/50 writes, read-your-writes, conflito 409, limite, TTL e rollback sem gravar parcialmente; confirmar ACL via sessões Creator/Admin e 404 por ID direto de rascunhos/materiais privados. Repetir 0/1/40/50/100 comentários e corrida de resposta; verificar membership Admin, auditoria, notificações privadas e progresso individual.
7. **Mídia e flags em checkpoint separado:** medir `_APP_STORAGE_LIMIT`, proxy/bucket, espaço, backend, backup, scanner/antivírus e 100 reproduções simultâneas. Só depois aprovar bucket privado e credenciais de mídia; testar MP4 H.264/AAC, PDF, `Range`/206, seek/mobile, expiração e órfãos. Implantar Function Admin C1 antes de comentários; manter `APPWRITE_ACADEMY_ENABLED=false` até aceite dos gates, login de produção e rollback. `APPWRITE_ACADEMY_SCHEMA_READY` só acompanha schema existente e hosts atualizados.
8. **Rollback:** desativar/manter falsa a flag de produto, suspender escritas/URLs novas, preservar registros e comparar inventários. Em staging, remover só recursos novos comprovadamente vazios e mediante aprovação. Em Production, não apagar dados, fazer drop/reset ou restauração parcial; isolar a funcionalidade e executar eventual restauração integral apenas pelo plano aprovado. Preservar imagens, ledger, Auth e ACL atuais.

**Bloqueios C2:** Project ID de staging verificado, backup restaurado, escopos/ACL e transações reais, capacidade/antivírus e mídia privada, Function/flags e solução para retirada de publicação acima de 40 comentários. A C1 não autoriza migração, bucket, credenciais, flags, deploy ou push.

## 12. Adendo C1.2 — arquivamento de desafios em escala (proposta local)

O diagnóstico de C1 acima permanece como histórico do estado anterior. A implementação local C1.2 e o procedimento proposto para migração estão em [academia-c1.2-arquivamento-escala.md](academia-c1.2-arquivamento-escala.md). Comentários de desafio novos/aprovados passam a ter somente `R(owner)`, e a leitura dos aprovados exige checagem do desafio publicado no servidor antes e depois da consulta com chave de operações. O fechamento com `APPWRITE_ACADEMY_CHALLENGE_ACL_PRIVATE_READY=true` varre as ACLs por cursor e altera estado/auditoria sem gravar cada comentário. Com a flag ausente/falsa permanece a recusa conservadora acima de 40.

**O gate C2 mudou:** antes da flag, aprovar e executar separadamente a migração idempotente das ACL legadas, congelar escritores, verificar ACL de tabela e linhas por API direta, conferir a versão nova de Next e Function, backup restaurável e prova de conflito/TTL/paginação no Appwrite 2.2.0. Se qualquer linha ainda tiver `R(users)` ou a tabela tiver leitura global, não liberar a flag nem declarar arquivamento em escala. Repetir 0/1/50/100/500/1000 comentários e corrida de criação/arquivo em ambiente real autorizado. A C1.2 não autoriza alteração remota, deploy ou ativação.

**Atualização C2.0:** o procedimento corrente e a evidência de leitura do projeto protegido constam em [academia-c2-preparacao.md](academia-c2-preparacao.md). O modo privado remove a varredura do caminho transacional, mas permanece bloqueado até a certificação separada da ACL; o texto C1.2 acima descreve o estado anterior.
