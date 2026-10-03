# NUY Creators — auditoria e preparação Appwrite Cloud

Status: **BLOQUEADO ANTES DE PROVISIONAR. Fundação de produção NÃO encerrada.**

## Commit da entrega aprovada

`ca5ce15` — `feat: bootstrap NUY Creators infrastructure, Appwrite foundation, auth and public experience`.

Repositório Git inicializado, `.env` ignorado e conteúdo staged verificado contra a chave local antes do commit. Zero correspondências de segredo. Nenhuma chave neste relatório.

## Identidade corrigida — endpoint compartilhado

`https://api.edocs.phiq.com.br/v1` é o endpoint compartilhado autorizado da infraestrutura Appwrite. O domínio NÃO identifica sozinho um projeto. NUY Creators e eDocs devem usar Project IDs e credenciais diferentes, mesmo quando atendidos pela mesma instância. A identidade operacional é determinada pelo endpoint configurado, Project ID aprovado, chave aceita nesse mesmo Project ID, ambiente autorizado e marker privado da aplicação.

**Histórico técnico:** o guard anterior vinculava identidade a um hostname regional e bloqueou o endpoint compartilhado. Essa proteção estava conceitualmente incorreta e foi substituída, não simplesmente desligada. Não é necessário trocar o endpoint nem escolher outro projeto. O ID local não foi alterado, nenhum projeto foi descoberto/selecionado e nenhum arquivo de ambiente do usuário foi editado.

**Resultado atual:** `.env.local` contém endpoint, Project ID, chave de provisionamento, chave SSR e confirmação explícita de projeto dedicado. `APPWRITE_EXPECTED_PROJECT_ID` está ausente. Por isso, `npm run infra:preflight` parou antes de rede (exit 1). O ID esperado não foi inferido ou copiado automaticamente do ID atual. Nenhum recurso remoto foi criado, alterado ou apagado.

Também estão ausentes `APPWRITE_TEST_API_KEY`, `APPWRITE_TEST_ENVIRONMENT` e `APPWRITE_RUN_INTEGRATION_TESTS`. Configure o ID esperado aprovado e development/staging no ambiente seguro; para fixtures, configure também a chave separada e opt-in. As chaves estão presentes, mas aceitação remota e escopos ainda não foram confirmados. Não enviar secrets pelo chat.

Nome exibido no Console, região física, versão efetiva, identidade remota e permissões do projeto NÃO foram validados. Não inferir região pelo domínio compartilhado. Provisionamento, segunda execução, testes conectados, Auth, emails e probes transacionais aguardam o preflight autorizado. A correção local do guard está coberta por testes; isso não substitui validação do backend real.

## 1. Variáveis necessárias

Para provisionar:

- `APPWRITE_ENDPOINT`: endpoint aprovado da instância, HTTPS e `/v1`; domínio compartilhado permitido.
- `APPWRITE_PROJECT_ID`: ID real do projeto dedicado NUY Creators.
- `APPWRITE_EXPECTED_PROJECT_ID`: ID aprovado informado independentemente. Igualdade exata com `APPWRITE_PROJECT_ID` é obrigatória antes de qualquer requisição.
- `APPWRITE_DATABASE_ID=nuy-creators`: ID reservado do banco a criar, não um projeto existente.
- `APPWRITE_ADMIN_TEAM_ID=nuy-admins`: equipe reservada; manifest fixa esse ID nesta versão.
- `APPWRITE_API_KEY`: chave temporária restrita ao projeto dedicado.
- `APPWRITE_DEDICATED_PROJECT_CONFIRMED=true`: somente após conferir projeto no Console.

Para autenticação e onboarding:

- `APPWRITE_AUTH_API_KEY`: chave web separada com `sessions.write`.
- `APP_URL`: origem exata usada pelo navegador; localhost para desenvolvimento, HTTPS em ambiente público/produção.
- `APPWRITE_FUNCTIONS_ENABLED`: false até deploy seguro do handler.
- `APPWRITE_REGISTRATION_ENABLED`: false até políticas de participação aprovadas.
- `NUY_TERMS_VERSION` e `NUY_MINIMUM_AGE`: políticas aprovadas, também no ambiente da Function. Código atual suporta idade mínima 18+; não adotar esse valor como decisão jurídica automática.
- `AUTH_RATE_LIMIT_VERIFIED`: false até existir proteção compartilhada verificada.
- `APPWRITE_TRANSACTIONS_VERIFIED`: false; flag NÃO comprova transações nem libera funções futuras.

Para testes reais isolados:

- `APPWRITE_TEST_API_KEY`: chave separada somente no ambiente de testes.
- `APPWRITE_TEST_ENVIRONMENT=development` ou `staging`.
- `APPWRITE_RUN_INTEGRATION_TESTS=true`: opt-in explícito para criar e remover fixtures controladas.
- Projeto/endpoint devem corresponder a staging/dev dedicado, nunca produção. Testes usam a base provisionada desse ambiente.

Scripts agora leem `.env` e depois `.env.local`, mantendo prioridade das variáveis já exportadas no processo. Nenhum valor secreto é impresso pelo preflight.

## 2. Escopos da chave temporária de provisionamento

Para o adapter **Databases existente**, conforme nomes do SDK instalado:

```text
databases.read       databases.write
collections.read     collections.write
attributes.read      attributes.write
indexes.read         indexes.write
documents.read       documents.write
buckets.read         buckets.write
teams.read           teams.write
functions.read       functions.write
```

Não requer criação/gestão de projetos, keys.write, users.write, sessões ou todos os escopos. Revogar essa chave após provisionar. Deploy de código da Function ainda é manual; os containers são criados desabilitados. Mudança para DocumentsDB/TablesDB e seus escopos não foi feita sem aprovação.

## 3. Escopo da chave SSR

`APPWRITE_AUTH_API_KEY`: **somente `sessions.write`**, conforme documentação SSR Appwrite. Não reutilizar a chave de provisionamento. As requisições em nome do usuário usam `setSession`, sem API key.

Chave de teste: somente no staging/dev, exige `users.read/write` para cleanup de contas, `sessions.write` para secrets de sessão, `teams.read/write` para memberships de teste, escopos read de collections/attributes/indexes/buckets/functions e `databases.read/write`, `documents.read/write` para probes transacionais e cleanup. Não incorporar essa chave à aplicação web ou à CI pública.

## 4. Endpoint Cloud

Endpoint aprovado: `https://api.edocs.phiq.com.br/v1`. Endpoints regionais e compartilhados são aceitos pela mesma validação de formato, sem associar hostname à marca/projeto. A aplicação usa sempre o endpoint e o Project ID configurados; não há fallback.

Guard local: HTTPS, `/v1`, sem usuário/senha/query/hash na URL; expected ID obrigatório e igual ao ID atual; ID válido; dedicated confirmed true; ambiente development/staging; banco `nuy-creators` e equipe `nuy-admins`, sem adoção de recursos eDocs. URLs com credenciais não são impressas.

Preflight remoto preparado: apenas GET, redirects recusados, timeout, headers com uma única combinação de Project ID/key. A chave de provisionamento deve obter uma listagem válida em `/databases`. A chave SSR é sondada separadamente no mesmo endpoint e projeto: leitura administrativa deve ser negada explicitamente para uma chave autenticada (`applications`, `databases.read`). Um 401 genérico não comprova chave válida. Se a resposta não comprovar a identidade/scoping esperado, parar; não ampliar scopes nem tentar outra chave/projeto. A concessão de `sessions.write` só será comprovada por teste real de sessão posteriormente; essa sondagem de leitura não afirma conhecer todos os scopes da chave.

Se houver chave de teste, sua leitura também deve ser aceita no mesmo projeto. Chaves de provisionamento, SSR e testes precisam ser distintas. Respostas, headers, erros SDK e valores de chaves nunca são registrados.

Marker privado previsto: `platform_settings/application-identity`, key `applicationId`, valueJson com `applicationId: nuy-creators` e o Project ID aprovado, public=false, permissions vazias. O preflight também verifica documentSecurity e permissions efetivas da collection do marker. Criado somente ao terminar o provisionamento; nas próximas execuções deve corresponder exatamente ao projeto e não será reparado automaticamente. Marker divergente, público, duplicado ou desaparecido interrompe o fluxo. Banco existente sem marker e sem receipt legítimo de bootstrap não é adotado automaticamente.

Receipt local não secreto em `.appwrite/` (ignorado pelo Git) registra bootstrap iniciado/concluído por endpoint+Project ID. Permite retomar um bootstrap parcialmente concluído neste workspace, mas nunca substitui o marker remoto ou autoriza outro projeto. Nenhum receipt foi criado nesta execução, bloqueada antes da rede.

## 5. Configurações manuais no Console

1. Criar/conferir projeto **NUY Creators** exclusivo, organização e região.
2. Habilitar autenticação email/senha e políticas de senha, sessões e verificação.
3. Criar chaves separadas de provisionamento, sessões e testes, com escopos mínimos.
4. Cadastrar plataformas Web dos hosts realmente usados.
5. Configurar emails/templates e executar recebimento real em inbox controlada.
6. Após provisionamento, adicionar a equipe real a `nuy-admins`, com memberships confirmadas e somente role necessária.
7. Deploy `complete-onboarding`, runtime compatível disponível, variáveis e escopos dinâmicos de documentos. Ativar execução somente para usuários autenticados após testar identidade JWT e isolamento. Manter demais Functions desabilitadas.

## 6. Plataformas Web

- Desenvolvimento: `localhost`; `127.0.0.1` somente se também usado.
- Staging: hostname real da aplicação de staging, ainda não fornecido.
- Produção: hostname real da aplicação, ainda não fornecido; incluir www apenas se realmente utilizado.
- Console pede hostname, sem protocolo/path/porta. Não inventar domínio da marca nem cadastrar wildcard amplo.

## 7. URLs autorizadas

Verificação: `${APP_URL}/verificar-email`.

Recovery: `${APP_URL}/redefinir-senha`.

Páginas iniciais: `${APP_URL}/login`, `/cadastro`, `/recuperar-senha`, `/onboarding`.

Localmente: `http://localhost:3000/verificar-email` e `http://localhost:3000/redefinir-senha`. No staging/produção substituir apenas pela origem real autorizada. Appwrite valida domínios de redirect pelas plataformas cadastradas. Não há callback OAuth nesta rodada. Convites de equipe devem ser concluídos pelo Console; nenhum callback de convite foi implementado.

## 8. Emails

Configurar templates de verificação e recuperação, idioma pt-BR, identificação NUY Creators e URLs acima. Utilizar serviço de envio disponível no projeto Cloud; para remetente próprio/SMTP customizado, configurar provedor, credenciais somente no Console/secret store, domínio e autenticação SPF/DKIM/DMARC conforme provedor.

São necessários envio real, recebimento em inbox controlada, abertura do link, confirmação de email e redefinição de senha seguida de login. Solicitação HTTP bem-sucedida NÃO é prova de recebimento. Não confundir teste que altera verification por API administrativa com recebimento de email.

**Envio/recebimento não testados.** Fixtures SDK usam `example.invalid` de propósito e não alegam testar entrega. Domínio/inbox real controlada ainda necessário para o fluxo humano/Playwright conectado completo. Tokens nunca devem ser colocados no relatório ou em traces públicos.

## 9. SSR e cookies

Cookie `nuy-session`, host-only, path `/`, HttpOnly, SameSite=Lax, Secure em produção e expiração derivada da sessão Appwrite. Cookie carrega secret de sessão, não uma API key. Clientes SDK por request; sem singleton compartilhado de sessão.

`APP_URL` deve coincidir com o Origin do navegador, pois Server Actions validam origem. Não desabilitar essa checagem para acomodar proxy incorreto. Produção conectada exige HTTPS. Não é necessário domínio customizado Appwrite para SSR-only, pois browser fala com Next.js; não compartilhar esse cookie com scripts.

`/app` agora chama `requireSession()` no servidor; `/admin` chama `requireStaff()` e consulta memberships reais de `nuy-admins` pelo cliente de sessão. Essas páginas são shells de validação, NÃO dashboard/admin de domínio. Erro de backend não concede acesso. Role em perfil/payload não autoriza nada.

## Teams e roles

- `admin`: todas as capacidades de domínio previstas, incluindo moderação, catálogo, fulfillment, auditoria e futuro ajuste de pontos.
- `moderator`: apenas moderação; não ajustes livres, catálogo ou fulfillment.
- `fulfillment`: apenas operação de entregas; não moderação ou ajustes de pontos.

No Appwrite, roles são strings da membership, não uma collection global. Membership precisa estar confirmada, na equipe correta e pertencer ao usuário da sessão. `owner` ou roles desconhecidas não viram `admin` implicitamente. Autorização granular deverá ser revalidada em cada comando futuro; a página administrativa não substitui isso.

## Provisionamento e permissões

**Criado remotamente nesta rodada: nada.** Planejados: database `nuy-creators`, 30 collections do manifest, seus atributos/índices, buckets `brand-assets`, `submission-media`, `community-media`, `avatars`, equipe `nuy-admins` e oito containers de Functions.

Permissions planejadas: collection/bucket arrays vazios, documentSecurity/fileSecurity true; documentos privados com read(user) e sem client create/update/delete; níveis públicos com read(any). Permissions efetivas remotas ainda desconhecidas.

Script mantém IDs determinísticos, verifica configurações existentes e interrompe diante de drift sem sobrescrever. Acrescentadas verificações de limites/extensões/encryption/antivirus de bucket, configuração/permissões dos níveis e Functions futuras indevidamente ativadas.

Procedimento pendente após corrigir ambiente:

```text
npm run infra:preflight
npm run infra:apply
npm run infra:apply
npm run test:integration
```

Reexecutar apply e comparar inventário remoto antes/depois; não afirmar idempotência real apenas por análise do código. Probes também verificam total exato de collections/índices contra manifest. O provisionamento de schema não é uma transação financeira e pode ser retomado após falha parcial.

## Transações — investigação pública, não validação do projeto

Documentação oficial consultada em 2026 informa transações multi-collection em DocumentsDB e multi-table em TablesDB, com staging por transactionId, commit/rollback, conflito quando um registro afetado muda externamente e limites por plano. Schema não participa de transação. Documentação DocumentsDB informa 100 operações no Free e 1.000 no Pro; isso NÃO confirma plano/limite deste projeto.

SDK instalado node-appwrite 29 possui métodos transacionais no adapter Databases legado, marcados deprecated em favor de APIs novas. **Presença no SDK não prova compatibilidade com o backend real.** Não houve migração automática de adapter/schema.

Fontes:

- https://appwrite.io/docs/products/databases/documentsdb/transactions
- https://appwrite.io/docs/products/databases/tablesdb/transactions
- https://appwrite.io/docs/products/auth/server-side-rendering

Suíte preparada testa commit/rollback entre collections da aprovação e do resgate, conflito externo, writers simultâneos sobre saldo/estoque, rollback do outbox perdedor, unicidade, limite numérico e replay isolado. Esses são probes de infraestrutura, NÃO implementações de comandos de gamificação. Idempotência concorrente e validações de payload dos comandos futuros permanecem pendentes, além da execução desses probes.

**Versão efetiva, plano, isolamento e transações deste projeto: NÃO VERIFICADOS.** Se API/garantias não funcionarem, parar e relatar limitação, operação afetada e riscos. Alternativas para aprovação posterior: adapter oficial transacional compatível, upgrade/plano apropriado ou serviço transacional externo. Não aplicar compensação eventual para fingir atomicidade de saldo/estoque.

## Rate limit

Não existe solução compartilhada implementada nesta base. Guard `AUTH_RATE_LIMIT_VERIFIED` é somente bloqueio de produção, não proteção contra abuso. API key de sessões ignora limites Appwrite; endpoints anônimos podem compartilhar o IP do servidor. Não usar memória local como garantia distribuída.

Produção bloqueada até WAF/edge ou serviço compartilhado aplicar limites em cadastro, login, recuperação, reenvio, onboarding e futuros comandos, por IP/usuário/janela apropriados, com logs sem PII/credenciais e testes sob múltiplas instâncias. Nenhuma solução nova foi escolhida sem conhecer hospedagem.

## Testes e limites desta rodada

- Preflight atualizado: bloqueou a ausência de expected ID antes de rede (exit 1); não bloqueou o domínio compartilhado.
- Unit tests: guard de identidade, expected ID, ambiente, chaves distintas, ausência de fallback, leitura sem redirects, marker privado/divergente, bootstrap e scopes de leitura, além dos testes anteriores.
- Playwright desconectado: público, estados honestos, `/app` e `/admin` sem sessão redirecionam server-side; sem conexão ao endpoint informado.
- Integration Cloud: comando preparado, mas bloqueado pelo preflight, não skipped como sucesso. Nenhuma fixture criada.
- Suite real preparada: inventário, isolamento A/B, escrita direta negada, signup/session SDK, duplicidade, senha incorreta, usuário inexistente, tokens inválidos, logout/login, roles reais e probes transacionais.
- Pendentes: token realmente expirado (não apenas inválido), sessão naturalmente expirada, emails recebidos, onboarding Function executado, cookies/shells autenticados via Playwright Cloud e fluxos reais completos. Não confundir sessão revogada com expiração natural.

Resultados locais após a correção do guard (não são aprovação do projeto remoto):

| Verificação                             | Resultado                                                              |
| --------------------------------------- | ---------------------------------------------------------------------- |
| typecheck                               | passou                                                                 |
| unit tests                              | 41 passaram, 8 arquivos                                                |
| Playwright desktop/mobile desconectado  | 6 passaram                                                             |
| ESLint                                  | passou                                                                 |
| Prettier check                          | passou                                                                 |
| build Next.js                           | passou, incluindo os shells protegidos                                 |
| Function build                          | passou                                                                 |
| infra:preflight                         | BLOQUEADO antes de rede                                                |
| infra:apply                             | não iniciado; preflight bloqueou os requisitos locais                  |
| test:integration                        | BLOQUEADO antes de rede, exit 1, não aprovado/não skipped como sucesso |
| recursos remotos criados                | zero                                                                   |
| idempotência remota após duas execuções | não validada                                                           |
| auth/email/onboarding/roles Cloud       | não validados                                                          |
| garantias transacionais Cloud           | não validadas                                                          |

Typecheck, unit tests, Playwright desconectado, ESLint, Prettier, build Next.js e Function build foram reexecutados e passaram. Esses resultados locais NÃO significam aprovação de produção ou aceitação remota de keys. Não houve testes Appwrite conectados: expected ID aprovado e ambiente ainda estão ausentes. Integração retornou exit 1 por bloqueio local; não foi classificada como teste remoto aprovado.

## Arquivos desta rodada

```text
.env.example
.gitignore
package.json
playwright.config.ts
vitest.integration.config.ts
infra/appwrite/provision.ts
infra/appwrite/safety.ts
infra/appwrite/preflight.ts
infra/appwrite/identity.ts
src/lib/env/schema.ts
src/features/auth/services/actions.ts
src/lib/security/memberships.ts
src/lib/security/authorization.ts
src/app/(protected)/app/page.tsx
src/app/(protected)/admin/page.tsx
tests/unit/cloud-safety.test.ts
tests/unit/project-identity.test.ts
tests/unit/environment.test.ts
tests/e2e/public.spec.ts
tests/integration/preflight.ts
tests/integration/run.ts
tests/integration/cloud.test.ts
docs/delivery-appwrite-cloud.md
docs/infrastructure.md
```

Landing e identidade visual não foram redesenhadas. Nenhuma feature de dashboard, desafios ou gamificação foi iniciada.

Commit sugerido para esta rodada (não executado automaticamente):

`fix: validate shared Appwrite project identity and enforce private application marker`
