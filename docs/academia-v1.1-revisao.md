# Academia NUY — revisão local V1.1

**Data:** 14/10/2026. A base visual V1.0 foi preservada. Toda a verificação funcional desta rodada usa fixtures e um stub Appwrite locais. Não houve migração, escrita no Appwrite remoto, criação de bucket ou credencial, deploy, commit ou push. A flag `APPWRITE_ACADEMY_ENABLED` continua desligada por ausência fora do teste isolado.

## Ajustes e comparação visual

As 24 capturas atuais estão em `artifacts/academy/`. As 24 capturas anteriores foram preservadas em `artifacts/academy-before-v1.1/`. Há oito telas por viewport: catálogo, detalhe, aula, lista Admin, categorias, comentários, progresso e editor. As dimensões são 375×667, 390×844 e 1440×900.

| Tela | Antes | V1.1 |
| --- | --- | --- |
| Catálogo 375×667 | Hero até aproximadamente y=572; busca começa em y=674; primeiro card começa em y=859. | Hero até aproximadamente y=377; busca começa em y=467; barra de filtros compactada em duas linhas; primeiro card começa perto de y=613. |
| Catálogo 390×844 | O bloco secundário alto ocupava a primeira dobra. | O bloco secundário virou uma frase curta; busca e início do primeiro treinamento aparecem na primeira dobra. |
| Catálogo 1440×900 | Hero editorial em duas colunas. | Mesma composição, tipografia e cores. |

No mobile foram reduzidos apenas espaços do hero do catálogo e a altura da barra de busca/filtro. Navy, creme, dourado e título editorial permanecem. A interface Creator agora usa mensagens simples para aulas e materiais em preparação. Falhas de leitura recebem estado de erro explícito; o estado `pending` da flag desligada tem mensagem própria. Nenhum card usa imagem inventada.

## Editor de treinamento existente

`AcademyEditor` recebe o curso, todas as categorias, módulos, aulas e materiais antes de montar o estado local. Os módulos e as aulas são ordenados por `order` e ID; cada objeto mantém seu ID, vínculo, ordem, status e `videoFileId`. Os materiais preservam ID, `lessonId`, `fileId` e ordem, e aparecem junto à aula vinculada. Novos itens têm IDs locais distintos. A rota de edição só abre o editor quando **todas** as leituras necessárias terminam com `ok`; uma leitura parcial exibe erro. Salvar, publicar, arquivar e upload continuam desabilitados. Portanto, nenhum estado incompleto pode sobrescrever filhos nesta rodada.

Antes de habilitar escrita, o contrato precisa validar que cada aula pertence a um módulo e curso lidos, que cada material aponta para uma aula do curso, que todos os IDs existentes continuam presentes no payload, e que exclusões são ações explícitas. A atualização de ordem com índices únicos deve ser testada no staging, pois uma troca direta de posições pode colidir temporariamente com a unicidade.

## Comentários, moderação e dados pessoais

O mapeamento aceita apenas `pending`, `visible`, `hidden` e `rejected`; qualquer valor desconhecido vira `unknown` e nunca é tratado como visível. Creator recebe apenas comentários `visible` de aulas ou desafios publicados. O ciclo proposto é:

| Origem | Destinos permitidos |
| --- | --- |
| `pending` | `visible`, `rejected` |
| `visible` | `hidden` |
| `hidden` | `visible`, `rejected` |
| `rejected`, `unknown` | nenhum |

O Admin mostra nome público da Creator, título da aula ou desafio, data, estado, conteúdo e razões das denúncias relacionadas. A interface não mostra e-mail, identificador de usuário nem identificador da denunciante. As ações continuam desabilitadas. Quando a mutação for implementada, o servidor deve verificar capacidade `moderate`, o estado atual e a transição, derivar o moderador da sessão, salvar `moderatedBy`, `moderatedAt` e `moderationReason`, e manter trilha imutável de eventos de moderação. Denúncias devem guardar estado de revisão, ator e horário; a leitura falha explicitamente quando uma consulta essencial não está disponível.

## Consultas e paginação

- Catálogo Creator e lista Admin: 24 cursos por página, filtros no Appwrite, ordenação por `order` e `slug`, com `pagina` na URL. Busca no servidor usa `searchText` apenas a partir de três caracteres e depende do índice FULLTEXT proposto. O stub local testou 107 cursos publicados e a quinta página. O campo `searchText` precisará ser atualizado junto de título, resumo e outros termos aprovados em futuras mutações.
- Detalhe Creator: consulta por `slug` e `status=published`; editor Admin: leitura direta por ID. Módulos, aulas e materiais são buscados por `courseId`, em lotes de 100, com ordenação estável por `order` e `$id`.
- Comentários Creator: filtro por alvo e `visible`; fila Admin: 24 itens por página, com nomes e títulos enriquecidos apenas para os IDs da página. Progresso Admin: contagem agregada na tabela, sem carregar todos os registros.
- Conjuntos necessários para uma tela são lidos até o fim. Um limite de proteção local de 5.000 linhas produz `unavailable` em vez de mostrar um conjunto truncado como completo. Para volumes maiores, a evolução prevista é paginação/cursor por módulo e comentário. `offset` atende ao pequeno volume inicial, mas páginas profundas devem ser medidas antes de escalar.

As consultas permanecem atreladas à sessão da Creator e às permissões de linha. A lista Admin usa cliente operacional somente após o guard da rota. Índices de ordenação e FULLTEXT precisam ser validados na instalação real antes de ligar a flag.

Referências da API: [paginação TablesDB](https://appwrite.io/docs/products/databases/tablesdb/pagination) e [consultas TablesDB](https://appwrite.io/docs/products/databases/tablesdb/queries).

## Capas privadas

O domínio preserva `coverFileId` e a interface só renderiza `<img>` quando recebe `authorizedCoverUrl` gerada após autorização da sessão para aquele curso. Sem URL autorizada, aparece o fallback editorial existente. Nesta rodada o resolver retorna `null`, pois não existe fluxo privado de entrega validado; isso evita revelar IDs como URLs públicas ou usar o bucket do catálogo. O próximo teste em staging deve comprovar autorização, expiração, resposta para arquivo ausente e revogação. Upload continua bloqueado.

## Schema aditivo revisado — proposta, não migração

`infra/appwrite/academy-schema.ts` continua fora do manifesto/provisioner v001 e propõe nove tabelas. A versão local é `academy-001-proposal-v1.1`.

| Tabela | Integridade e índices propostos |
| --- | --- |
| `academy_categories` | `slug` único; `(active, order, slug)` e `(order, slug)` para listagem. |
| `academy_courses` | `slug` único; `searchText` obrigatório e FULLTEXT separado; `(status, order, slug)`, `(categoryId, status, order, slug)` e índices de categoria/lista. |
| `academy_modules` | `(courseId, order)` único. |
| `academy_lessons` | `(moduleId, order)` único; `(courseId, status, order)` para leitura Creator. |
| `academy_materials` | `(courseId, order)` e `(lessonId, order)`. |
| `academy_progress` | `(userId, lessonId)` único; índices por usuário/curso e curso para contagem. |
| `community_comments` | alvo/status/data, autor/data, pai, status/data e data; campos de moderação. |
| `community_reports` | `(commentId, reporterId)` único; índices por estado/comentário e comentário. |
| `community_moderation_events` | Evento imutável com comentário, ator, estado anterior e novo, motivo e horário; índices por comentário/data e ator/data. |

**Referências e exclusão:** o manifesto descreve IDs em colunas, não chaves estrangeiras. As futuras ações de escrita devem validar categoria, curso, módulo, aula, material, alvo e comentário pai no servidor, no mesmo projeto, antes de gravar. Rejeitar ciclos de resposta, alvo divergente, aula fora do curso e duplicidades de progresso/denúncia. Arquivar curso/aula preserva histórico. Excluir fisicamente apenas por rotina administrativa aprovada, com prévia de dependências; preferir tombstone para comentários moderados e manter a auditoria. Limpar arquivo privado somente após provar que não existe referência ativa e registrar o resultado, sem afetar imagens do catálogo NUY.

**Permissões propostas:** tabelas e bucket privados, sem leitura pública; linhas publicadas legíveis apenas à sessão Creator elegível; rascunhos, comentários em revisão, denúncias e auditoria limitados ao Admin com capacidade pertinente; progresso legível apenas pelo titular e por resumo mínimo Admin autorizado. Escritas ocorrem no servidor com ator derivado da sessão e escopos mínimos, nunca com IDs de usuário ou status aceitos diretamente do navegador. A política de linha, os índices, limites de coluna, unicidade, comportamento de exclusão e o acesso aos arquivos precisam de ensaio no staging isolado antes da migração. Nenhuma chave foi criada.

## Verificações locais

| Verificação | Resultado |
| --- | --- |
| Typecheck | Passou. |
| Vitest | 24 arquivos, 195 testes passaram com `npx vitest run --maxWorkers=4`. Inclui contrato de schema e transições de moderação. |
| Build | Passou em Next.js 16.3.8, com as nove rotas da Academia. |
| E2E Academia | 5 cenários passaram no stub local, nos três viewports. Inclui curso com filhos e IDs estáveis, estados seguros de comentário, 107 cursos publicados, quinta página e busca global. |
| E2E de permissões | Cenário da suíte Academia passou: visitante é redirecionado ao login; Creator não entra na lista, fila de comentários nem no editor Admin. |
| Overflow e mobile | Checagem automatizada sem overflow horizontal; busca e primeiro curso posicionados perto da primeira dobra mobile. As capturas atuais foram conferidas visualmente. |

O E2E é prova local de UI, queries e guards contra o stub. Não prova ACL, índice FULLTEXT, mídia privada, byte-range, expiração nem comportamento de escrita no Appwrite instalado.

A primeira repetição de `npm test` com 24 workers teve 194 sucessos e um timeout de cinco segundos em `onboarding-endpoint.test.ts`, uma sonda local de endpoint já sensível à concorrência na V1.0. A suíte inteira passou duas vezes com quatro workers; não houve alteração nesse teste. O E2E completo passou com cinco cenários após a compactação final; o cenário de permissões também passou isoladamente após ampliar as rotas protegidas.

**Gate do commit local (14/10/2026):** `npm run typecheck` e `npm run build` passaram; `npx vitest run --maxWorkers=4` teve novamente 194 sucessos e o mesmo timeout de cinco segundos em `onboarding-endpoint.test.ts`. A repetição com `--maxWorkers=2 --testTimeout=15000` passou com 195/195 testes. O E2E completo da Academia passou com 5/5 cenários no stub local. Nenhum teste conectado ao Appwrite remoto foi executado.

## Arquivos e próximos passos

Arquivos desta V1.1: `src/features/academy/domain.ts`, `services/read.ts`, `components/creator.tsx`, `components/admin.tsx`, `components/editor.tsx`, `academy.module.css`; rotas Creator e Admin de Academia; `infra/appwrite/academy-schema.ts`; `tests/e2e-app/academy.spec.ts`, `tests/support/appwrite-stub/academy-fixtures.mjs`, `tests/support/appwrite-stub/server.mjs`, `tests/support/stack.d.mts`, `tests/unit/academy-schema.test.ts`, `tests/unit/academy-moderation.test.ts`; este relatório e referência no relatório V1.0. As alterações preexistentes fora da Academia foram preservadas.

Após aprovação separada: validar schema/índices/ACL e referências no projeto de staging explicitamente identificado; testar URLs privadas de MP4, PDF e capa no navegador; implementar mutações com auditoria, integridade e proteção de exclusão; executar E2E conectado. Não ativar Preview se ainda apontar para Production. A migração e a criação de bucket permanecem bloqueadas nesta entrega.

### Pendências da integração Appwrite

- Implementar ações **Aprovar** e **Rejeitar** na moderação, com transições autorizadas e evento de auditoria imutável.
- Impedir que materiais de aulas não publicadas sejam listados ou abertos por Creators, inclusive ao acessar uma URL direta.
- Definir e validar indicadores agregados do Admin, sem apresentar contagens da página como totais globais.
- Validar os índices propostos, a integridade referencial de aplicação e as ACL por linha no Appwrite instalado.
- Validar upload e entrega privada de MP4/PDF, autorização por aula, expiração, reprodução, seek e acesso mobile; manter arquivos grandes fora das Vercel Functions.
- Implementar comentários e progresso persistentes com autoria derivada da sessão, moderação prévia e proteção contra duplicidade.
- Executar testes conectados ao Appwrite real em staging isolado, incluindo usuários sem autorização, sessão expirada, arquivos ausentes e cleanup.
