# Academia NUY — implementação local para revisão

> Registro da V1.0. Os ajustes e a situação atual estão em [academia-v1.1-revisao.md](./academia-v1.1-revisao.md).

**Estado em 13/10/2026.** A Academia é um módulo do NUY Creators existente. As rotas usam os shells, a autenticação e a paleta atuais. O projeto Appwrite `6ac044af0008cbdda070` continua protegido: **nenhuma migração, bucket, Function, credencial, upload, comentário ou progresso foi escrito nele**. A criação de um projeto de staging é útil para QA conectado, mas seu ID não é pré-requisito para desenvolver e revisar estas interfaces.

## Como visualizar

1. No repositório, executar `npm install` se necessário e `npm run dev`.
2. Entrar com uma conta já autorizada no ambiente local. A Creator acessa `/app/academia`; um membro confirmado da equipe com capacidade `manage-catalog` acessa `/admin/academia`.
3. Sem tabelas da Academia, o produto mostra estados de preparação, sem materiais fictícios. Para revisar catálogo, detalhe, aula e editor com **fixtures isoladas**, executar `npx playwright test --config playwright.app.config.ts tests/e2e-app/academy.spec.ts`. O teste sobe somente stub Appwrite local e `next start`, com credenciais de teste em `tests/`.

## Entrega local

| Área    | Operacional agora                                                                                                                                                                                                                                                                          | Bloqueado até migração e validação                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creator | Menu desktop e “Mais” mobile; catálogo; busca e filtro por categoria sobre dados reais/fixture; detalhe de treinamento; percurso por módulo; tela de aula; materiais e conversa em leitura quando o backend estiver ativado.                                                               | Player privado, download de PDF, marcar conclusão, comentar, responder, editar/excluir, denunciar. Os controles aparecem desabilitados e explicam o motivo. |
| Admin   | Menu da Academia restrito a `manage-catalog` e link de comentários restrito a `moderate`; lista de treinamentos; telas de categorias, comentários, denúncias e progresso; editor de título, slug, categoria, resumo, descrição, módulos e aulas; ordenação local de módulos; prévia local. | Salvar, publicar, arquivar, upload de MP4/PDF, respostas/moderação e relatório individual de progresso. Nenhum botão relata sucesso fictício.               |
| Desafio | Seção de conversa integrada ao detalhe existente.                                                                                                                                                                                                                                          | Escrita de comentários/denúncias até a revisão de autoria, permissões e moderação.                                                                          |

`APPWRITE_ACADEMY_ENABLED` é **false por ausência** e não foi colocado em `.env.local` ou na Vercel. Quando desligado, a camada de leitura não consulta tabelas inexistentes. Ligá-lo exige antes a migração e uma revisão da política de linhas. A fixture de E2E o liga apenas no processo do stub local. O código não expõe chave de API ao navegador e não passa MP4 por Vercel Functions.

A tela de aula contém um player HTML5 (`controls`, `playsInline`, `preload="metadata"`) que só é renderizado se receber uma URL privada autorizada. Nenhuma URL é emitida nesta rodada; o estado padrão informa a validação pendente. O PDF segue desabilitado pelo mesmo motivo.

## Migração aditiva proposta — não executada

O arquivo `infra/appwrite/academy-schema.ts` declara oito tabelas adicionais, em separado do manifesto v001 e do `infra:apply` atual:

1. `academy_categories`: taxonomia e ordem.
2. `academy_courses`: catálogo, estado `draft/published/archived`, versão e categoria.
3. `academy_modules`: agrupamento e ordem por treinamento.
4. `academy_lessons`: aulas, ordem, estado e referência ao MP4.
5. `academy_materials`: PDFs e links associados à aula ou ao curso.
6. `academy_progress`: conclusão individual com unicidade `(userId, lessonId)`.
7. `community_comments`: alvo `lesson|challenge`, resposta por `parentId`, autoria e estado.
8. `community_reports`: denúncia única por `(commentId, reporterId)`, status e revisão.

`academy-media` é **apenas proposta**: bucket privado, `fileSecurity=true`, MP4/PDF. Não foi criado. Não adicionar estas tabelas ao provisioner v001 sem revisão de índices, limites de coluna do Appwrite 2.2.0, permissões e rollback. A migration deve ser separada, idempotente, somente aditiva e apontar explicitamente para o Project ID aprovado. O guard `PRODUCTION_PROTECTED` permanece em todos os comandos de provisionamento/QA; não o remover para “fazer funcionar”.

### Permissões e fluxo após aprovação

- Catálogo: linhas publicadas legíveis apenas por sessões autenticadas elegíveis; rascunhos/arquivados lidos por chave server-side após `requireStaff('manage-catalog')`. Não conceder leitura pública a `academy_progress`, `community_reports` ou arquivos.
- Progresso: servidor deriva `userId` da sessão, valida que a aula está publicada e grava uma linha única; Creator lê somente o próprio progresso; Admin recebe resumo mínimo autorizado.
- Comentários: servidor deriva autor da sessão, verifica alvo publicado e visível, valida tamanho/estado, e verifica autoria para editar/excluir. Respostas usam alvo do comentário pai; denúncia impede auto denúncia e duplicidade; `moderate` verifica membership confirmada e registra auditoria. Não aceitar `authorId`, `userId` ou estado de moderação enviados pelo cliente.
- Mídia: upload somente por Admin autorizado, direto ao Appwrite por fluxo chunked/S3 se a instância 2.2.0 suportar. Acesso temporário deve comprovar sessão e vínculo à aula. Testar play, pause, seek, byte-range, mobile, expiração e arquivo inexistente antes de liberar. Nenhum endpoint Vercel deve retransmitir o MP4 inteiro.

## Gates restantes

1. Revisar schema/permissões e obter autorização explícita da migração; não executar contra o projeto protegido nesta rodada.
2. Validar capacidade do host, antivírus, limites de upload e suporte a byte-range/S3 no ambiente de QA. O estado anterior era `anti-virus: disabled`.
3. Criar chave exclusiva e mínima para cada função somente após a aprovação; preparar o bucket privado e a migração aditiva no projeto selecionado.
4. Implementar e validar as mutações server-side por capacidade/autoria, upload direto e assinatura temporária. Então habilitar `APPWRITE_ACADEMY_ENABLED` em um ambiente de QA isolado, rodar E2E conectado e revisar Production separadamente.

## Verificações locais

Repetidas em 13/10/2026 após a inclusão das três rotas administrativas adicionais (categorias, comentários e progresso):

- `npm run typecheck`: passou.
- `npm test`: 23 arquivos, 193 testes passaram. Uma execução anterior falhou por tempo limite em `onboarding-endpoint.test.ts` sob os 23 workers em paralelo; o arquivo passa isolado e a suíte completa passou na repetição — sonda de rede real sujeita a contenção, não regressão.
- `npm run build`: passou, com as nove rotas da Academia no manifesto (`/app/academia` e subrotas; `/admin/academia`, `novo`, `[id]`, `categorias`, `comentarios`, `progresso`).
- `npx playwright test --config playwright.app.config.ts tests/e2e-app/academy.spec.ts`: 4 testes passaram contra o build acima (`next start`), incluindo permissões e checagem de overflow. Capturas regravadas em `artifacts/academy/` para 1440×900, 390×844 e 375×667, com renderização equivalente à rodada anterior.

## Arquivos desta implementação

- `src/app/(protected)/app/academia/` e `src/app/(protected)/admin/academia/`: nove rotas integradas aos layouts existentes.
- `src/features/academy/`: componentes, estilos, tipos e leituras condicionadas pela flag.
- `src/features/workspace/components/navigation.tsx`, `src/features/admin/components/nav-items.ts`, `src/app/(protected)/app/desafios/[slug]/page.tsx` e `src/features/workspace/components/challenges-screen.tsx`: navegação e conversa nos desafios.
- `infra/appwrite/academy-schema.ts`: proposta aditiva sem execução; `.env.example`: flag desativada por padrão.
- `tests/unit/academy-schema.test.ts`, `tests/e2e-app/academy.spec.ts` e `tests/support/appwrite-stub/academy-fixtures.mjs`: validação local com fixture isolada. O E2E produz 24 capturas em `artifacts/academy/`.

Outros arquivos já apareciam modificados no workspace antes desta implementação; este inventário cobre a entrega da Academia.

**Ponto de parada:** revisar telas e proposta de migração. Nenhuma ação remota está autorizada por este documento.
