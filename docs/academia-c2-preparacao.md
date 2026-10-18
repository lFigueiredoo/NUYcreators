# Academia C2.0 — fechamento local e preparação da homologação real

**Estado em 18/10/2026:** preparação local e consultas remotas exclusivamente de leitura. `C2_REMOTE_BLOCKED`: nenhum Project ID de staging isolado foi comprovado; não houve escrita, migração, bucket, credencial, flag, deploy ou push. A Academia continua módulo do NUY Creators.

## 1. Git e escopo

`11fb46f` é a base C1. `2b5abd6` é seu filho direto e já contém seis arquivos da arquitetura C1.2: `functions/shared/host.ts`, `src/features/academy/services/operations.ts`, `src/features/academy/services/read.ts`, `src/features/workspace/core/catalog.ts`, `src/features/workspace/core/context.ts` e `src/features/workspace/services/commands.ts`. `0a41da4` é filho de `2b5abd6`, altera cinco arquivos de autenticação e era o HEAD local antes deste fechamento; permanece como `origin/main`. Nenhum trabalho de autenticação ou `.vercelignore` deve entrar em commit da C1.2.

As alterações locais restantes da C1.2/C2.0 estão em `docs/academia-c0-homologacao.md`, `docs/academia-c1.2-arquivamento-escala.md`, este documento, `infra/appwrite/academy-comment-acl-inventory.ts`, `src/features/academy/services/operations.ts`, `src/features/workspace/core/catalog.ts`, `src/features/workspace/services/commands.ts`, `functions/shared/host.ts`, `tests/e2e-app/academy.spec.ts`, `tests/support/appwrite-stub/academy-fixtures.mjs`, `tests/support/appwrite-stub/server.mjs`, `tests/unit/academy-c1.test.ts`, `tests/unit/academy-c12.test.ts`, `tests/unit/academy-challenge-read-race.test.ts`, `tests/unit/academy-comment-acl-inventory.test.ts` e `tests/unit/host-body.test.ts`. `src/lib/appwrite/server.ts` e `.vercelignore` são alterações externas preservadas.

## 2. Arquivamento sem varredura na transação

Com `APPWRITE_ACADEMY_SCHEMA_READY=true` **e** `APPWRITE_ACADEMY_CHALLENGE_ACL_PRIVATE_READY=true` em cada host, o core não consulta nem altera `community_comments` durante fechamento, arquivamento ou troca de status do desafio. Apenas o desafio, requisitos aplicáveis e auditoria entram na transação. O número de comentários não acrescenta operações ao commit. Sem esse atestado, o caminho conservador C1 revoga ACL de até 40 comentários na mesma transação e recusa desafios maiores integralmente; não há queda automática para o modo rápido.

No modo legado, a ausência da flag de schema não dispensa a checagem: o comando consulta a tabela, revoga ACL se ela existir e só pula essa etapa quando a API retorna que a tabela ainda não existe. Erro de leitura ou permissão falha fechado. Esse ajuste protege instalações em que a tabela foi criada mas a flag de schema ficou ausente.

O atestado de ACL só pode ser configurado **depois** de inventário completo, backup, eventual migração e prova direta no projeto alvo. O código por si não consegue transformar um `read("users")` antigo em privado sem escrita; ligar a flag antes da verificação exporia a linha por TablesDB mesmo que a página Next a escondesse. O inventário em `infra/appwrite/academy-comment-acl-inventory.ts` é somente de leitura, percorre todas as linhas por cursor, distingue desafios de aulas, conta status/respostas e recusa total instável ou ACL excessiva. Ele roda **fora** da transação de arquivamento. A tabela deve ter `rowSecurity=true` e `$permissions=[]`; permissões de tabela concedem acesso a todas as linhas mesmo quando a ACL da linha é privada.

A leitura Creator de comentário aprovado continua exclusivamente no servidor, após checagem de sessão e estado `published` antes e depois da consulta. Linhas de desafio recebem `R(owner)` ou nenhuma leitura direta. A autora ainda pode ler seu próprio registro depois do arquivo; outra Creator não pode. Pendentes não entram na resposta pública. As escritas de comentário, resposta, edição, ocultação e aprovação consultam o alvo; as concorrentes relevantes tocam a linha do desafio na mesma transação. Notificações são privadas, de texto genérico, e o ID de referência não concede leitura. A rota `/app/desafios/[slug]` é dinâmica; o E2E local conferiu `Cache-Control: no-store` e nova resposta sem comentários após arquivo. Conteúdo já entregue a um navegador não pode ser apagado retroativamente.

## 3. ACL histórica: inventário e migração condicionais

**Evidência do projeto protegido nesta etapa:** o preflight GET confirmou Appwrite 2.2.0, Project ID `6ac044af0008cbdda070`, 31 tabelas base e nenhum conflito nelas. As dez tabelas Academy, incluindo `community_comments`, e `academy-media` estão ausentes. Assim, **não há linhas históricas de `community_comments` nesse projeto neste momento**; não se extrapola esse resultado para projeto de staging desconhecido, snapshot externo ou implantação futura. Após criação de schema aprovada, repetir o inventário de tabela e linhas antes de atestar prontidão.

Para qualquer projeto onde `community_comments` já exista, a migração de ACL é **não aditiva** e exige aprovação própria:

1. Confirmar endpoint, versão, Project ID e escopos de leitura; congelar writers de comentários/moderação e versões antigas de Next/Function. Fazer backup consistente e ensaiar restauração isolada.
2. Consultar metadados da tabela e inventariar **todas** as linhas por cursor estável, registrando contagens de desafios por status, `pending`, `visible`, respostas, `R(owner)`, ACL vazia e permissões excessivas. Aulas são contadas, mas suas ACLs não são alteradas por esta migração. Erro, mudança de total, cursor inválido ou linha sem autora tornam o inventário incompleto.
3. Para cada linha **de desafio** com ACL divergente, aplicar `R(user:<authorId>)` em lotes pequenos. Guardar checkpoint do último cursor e IDs de lote em registro restrito **após** confirmação. Repetição relê a linha e pula as já corretas; falha parcial retorna ao último checkpoint confirmado. Não alterar corpo, status, autoria, aulas ou notificações; não apagar dados.
4. Fazer nova varredura completa com escritores ainda congelados. Confirmar `rowSecurity=true`, ACL de tabela vazia, zero permissões excessivas, e testar `getRow`/`listRows` com outra Creator, anônimo, autora e Admin. Só então registrar atestado do projeto e liberar o gate em Next e Function. Se surgir uma linha nova ou Writer antigo, invalidar o atestado.
5. Em rollback, suspender escritores e manter ACLs já privatizadas. **Nunca restaurar `R(users)`**. Restaurar backup integral apenas em incidente aprovado, após avaliar linhas criadas depois do backup.

## 4. Concorrência real a homologar no Appwrite 2.2.0

Somente em projeto isolado, com dados sintéticos e aprovação de escrita, testar: (a) comentário × arquivo; (b) resposta × arquivo; (c) aprovação × arquivo; (d) leitura entre duas checagens do estado; (e) dois arquivos simultâneos; (f) edição/ocultação × arquivo. Segurar uma operação antes do commit, arquivar na outra, soltar a primeira e exigir conflito ou recusa sem comentário/aviso tardio. Medir também commit/rollback, read-your-writes, `updateRow(data:{})` como linha tocada, erro 409 real, TTL e limite de transação. O stub prova apenas a lógica local; **não prova** o comportamento da instalação 2.2.0. Se `data:{}` não provocar conflito, trocar o marcador por alteração de versão do desafio antes da liberação, com nova revisão.

## 5. Ambientes e produção

- **Local:** `.env.local` aponta ao endpoint `https://api.edocs.phiq.com.br/v1` e ao Project ID protegido `6ac044af0008cbdda070`, embora `APPWRITE_TEST_ENVIRONMENT=staging` esteja escrito no arquivo. O **ID**, não o rótulo, define o alvo. Nenhuma flag Academy verdadeira foi comprovada localmente; valor ausente é tratado como falso pelo código. Nenhum arquivo de ambiente foi alterado.
- **Appwrite remoto:** preflight somente GET passou para o projeto protegido, com versão 2.2.0 e 31 tabelas existentes. Não há Project ID de staging comprovado nas configurações disponíveis. Não listar projetos ou afirmar isolamento sem credencial/identidade adequada. `C2_REMOTE_BLOCKED` até obter ID explícito, confirmar diferença de `6ac044af0008cbdda070`, separação de credenciais e dados, e backup restaurável. Nenhuma escrita no projeto protegido.
- **Vercel:** o conector listou o projeto `nuycreators`, mas a leitura detalhada de projeto/deploy recebeu **403** por escopo de equipe; a CLI local não concluiu a consulta. Não foi possível identificar o SHA ativo, env vars de Production/Preview, flags efetivas nem acessibilidade dos endpoints. `origin/main=0a41da4` não prova deploy. Nenhuma configuração foi modificada.

## 6. Checklist executivo C2 — requer aprovação separada

1. Obter Project ID de staging **explicitamente** e confirmar identidade/versão, projeto diferente do protegido, contas e chaves exclusivas; nunca copiar usuárias, sessões ou dados reais.
2. Confirmar backup completo e restauração testada em isolamento; medir espaço, tempo de recuperação e responsabilidade de operação.
3. Conferir Preview apontando exclusivamente a staging e inspecionar o deploy ativo/flags de Production por acesso autorizado. Não iniciar escrita em Preview enquanto apontar ao projeto protegido.
4. Aprovar schema aditivo, provisionar em staging apenas após autorização, conferir colunas/índices/`rowSecurity`/ACL da tabela. Repetir o inventário completo de comentários; migrar ACL legada somente se existir e mediante aprovação própria.
5. Testar ACL por API direta, fluxo Creator/Admin, notificações, concorrência real, TTL e escala 0/1/50/100/500/1000. Só depois atestar o gate privado nos dois hosts; manter `APPWRITE_ACADEMY_ENABLED=false` até os gates de mídia, login, backup e rollback.
6. Revisar diff e resultados, aprovar separadamente qualquer implantação, migração no projeto protegido, flag de produto e bucket. Nenhuma dessas ações é automática.

## 7. Testes locais da C2.0

`npm run typecheck`: PASS. `npm test`: **237/237 PASS** com timeout padrão após o teste de schema flag ausente. `npm test -- --maxWorkers 4`: **237/237 PASS**; a tentativa no sandbox foi barrada por `spawn EPERM` antes dos testes, e a repetição autorizada passou sem alterar timeout. O timeout intermitente histórico de `onboarding-endpoint.test.ts` **não ocorreu** nessas duas execuções; isso não comprova causa raiz corrigida. `npm run test:e2e:app`: **29/29 PASS**, incluindo Academia, ACL privada, desafio após arquivo, Admin, Creator e rotas do catálogo. `npm run build`: PASS após o último ajuste de código.

Os testes de escala 0/1/50/100/500/1000 confirmam que o modo privado não faz **GET nem PATCH** de `community_comments` durante o arquivo; o modo legado conserva o teto 40. O inventário local percorreu 1.000 linhas em 11 páginas e recusou ACL excessiva de tabela/linha ou total instável. Corridas de comentário, resposta, moderação, leitura e dois arquivos passaram no stub. Nenhuma dessas provas substitui transação, ACL e cache no Appwrite/Vercel reais.
