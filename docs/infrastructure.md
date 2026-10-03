# Infraestrutura — entrega das etapas 1 a 4

## Stack e execução

Node.js 24 LTS, Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, componentes shadcn/ui (Button), ESLint, Prettier, Vitest e Playwright. Versões exatas de instalação estão no package-lock.json; usar `npm ci`.

```powershell
npm ci
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
npx playwright install chromium
npm run build
npm run test:e2e
```

Sem `.env.local`, a aplicação inicia com cadastro/login indisponíveis e estados vazios explícitos. Não há fixtures na aplicação. A CI executa as verificações e testes E2E em desktop/mobile desconectados.

`AGENTS.md` é gerado pelo Next.js instalado e deve ser preservado. Arquivos de build, node_modules, segredos e resultados Playwright não fazem parte da entrega versionável.

## Projeto Cloud dedicado

O script NÃO cria projeto nem acessa outros projetos. Criar manualmente no Appwrite Cloud um projeto chamado **NUY Creators**, dedicado exclusivamente à plataforma. Copiar endpoint regional (terminado em `/v1`) e project ID do Console.

Configurar no ambiente seguro do servidor ou `.env.local` ignorado pelo Git:

- `APPWRITE_ENDPOINT`: endpoint do novo projeto.
- `APPWRITE_PROJECT_ID`: ID do novo projeto.
- `APPWRITE_DATABASE_ID`: `nuy-creators`.
- `APPWRITE_ADMIN_TEAM_ID`: `nuy-admins` (ID reservado pelo manifest desta versão).
- `APP_URL`: origem exata da aplicação; HTTPS para ambiente conectado em produção.

Adicionar plataforma Web no Console com localhost para desenvolvimento e hostname de produção. Habilitar email/senha, ajustar políticas de senha/sessão, templates e entrega de emails de verificação/recuperação. Configurar URLs de retorno `/verificar-email` e `/redefinir-senha` na origem autorizada.

## Credenciais separadas

1. **Provisionamento temporário:** `APPWRITE_API_KEY`, usado só pelo script. Escopos de Databases/collections/attributes/indexes/documents read/write, buckets read/write, teams read/write e functions read/write conforme nomenclatura do Console. A versão do SDK suporta `databases.read/write`, `collections.read/write`, `attributes.read/write`, `indexes.read/write`, `documents.read/write`, `buckets.read/write`, `teams.read/write`, `functions.read/write`. Não é necessária chave de projeto global, criação de projetos, acesso a outros projetos ou chave com todos os escopos. Revogar após provisionar.
2. **Sessões web:** `APPWRITE_AUTH_API_KEY`, chave diferente, exclusivamente `sessions.write`. Necessária para obter o secret da sessão SSR. Nunca disponibilizada ao navegador; os demais pedidos usam cliente anônimo ou sessão do usuário.
3. **Function onboarding:** chave dinâmica Appwrite com `documents.read/write`, configurada no container. Identidade do usuário verificada através do JWT Appwrite. Não usar a chave de provisionamento na Function.

Chaves de servidor podem ignorar limites de taxa do Appwrite. Antes de habilitar autenticação em produção, configurar e testar rate limits compartilhados na borda/WAF para POSTs nas rotas de auth (incluindo Server Actions), por IP e por janela, com proteção contra brute force e disparo abusivo de email. `AUTH_RATE_LIMIT_VERIFIED=false` mantém auth bloqueada em produção; não é um rate limiter, é um gate operacional. Não marcar true sem a verificação real.

## Provisionamento versionado

```powershell
npm run infra:plan
```

Plano local sem requisições, sem credenciais e sem segredos. Manifest `infra/appwrite/schema.ts`, versão `001`, inclui 30 collections, atributos tipados, índices únicos/de consulta, quatro buckets e equipe `nuy-admins` com `admin`, `moderator` e `fulfillment`.

Depois de conferir o project ID dedicado, definir `APPWRITE_DEDICATED_PROJECT_CONFIRMED=true` no ambiente seguro e executar:

```powershell
npm run infra:apply
```

O script cria recursos ausentes, espera atributos e índices ficarem disponíveis e interrompe diante de permissões/schema divergentes. Não apaga nem sobrescreve recursos existentes. Migração não é transação financeira: falha de provisionamento pode deixar recursos parcialmente criados; repetir após diagnóstico. Evoluções futuras exigem migrações explícitas, não edição silenciosa do manifest aplicado.

Collections têm permissions vazias e documentSecurity habilitada. Buckets têm permissions vazias e fileSecurity habilitada, limites de tamanho e extensão. Documentos públicos recebem `read(any)` individualmente; documentos privados recebem somente `read(user)`. Nenhum cliente ganha create/update/delete. Documentos privados futuros de administração deverão ser expostos por serviços autorizados com roles, não leitura indiscriminada da equipe em toda PII.

Somente os cinco níveis oficiais são seeded, como configuração backend. Não há usuários, desafios, conteúdos, recompensas ou ranking fictícios. Níveis exibidos na landing são consultados no Appwrite; ambiente desconectado não usa fallback hardcoded.

Adicionar usuários administrativos pela Console à equipe dedicada e conceder a role adequada. No Appwrite, roles são strings da membership, não um cadastro global de roles; `admin`, `moderator` e `fulfillment` são o vocabulário restrito adotado pela aplicação e sua matriz de capacidades. O script cria a equipe, mas não concede privilégios a nenhum usuário. Sem membros criados automaticamente, senha padrão ou credencial embutida. O provisionamento cria containers de Functions DESABILITADOS; não faz upload de código nem habilita futuras operações.

## Deploy de onboarding

Consultar `functions/README.md`. Handler real disponível, mas ainda não executado no Cloud. Deploy deve ser em staging dedicado, com entrypoint `src/main.js`. Ativar execução somente para usuários autenticados após verificar JWT injetado, ownership, validação, retries e ausência de escrita direta pelo SDK do cliente.

Configurar `APPWRITE_DATABASE_ID`, `NUY_TERMS_VERSION` e `NUY_MINIMUM_AGE` na Function. Idade mínima aceita pelo código é 18+, parametrizada após decisão jurídica; menores não são liberados implicitamente. Onboarding não escreve ledger/snapshots financeiros e não afirma atomicidade de suas escritas sequenciais. Marker de conclusão é escrito por último e falha parcial permite retry.

Na aplicação web, ativar `APPWRITE_FUNCTIONS_ENABLED` somente após deploy seguro. Cadastro permanece desabilitado por `APPWRITE_REGISTRATION_ENABLED=false`; liberação exige termos e privacidade definitivos, versão legal e idade mínima aprovadas no servidor e na Function. Substituir as páginas legais provisórias antes de liberar. A política de idade é aplicada no onboarding; cadastro Auth incompleto não obtém acesso à gamificação.

## Gate transacional obrigatório — NÃO validado

Não há implementação de aprovação, débito/crédito financeiro, estoque ou resgate nesta rodada. `APPWRITE_TRANSACTIONS_VERIFIED=false` é configuração de intenção, não comprovação automática de segurança. Não habilitar funções futuras apenas alterando uma variável.

Antes das próximas entregas críticas, registrar versão efetiva Appwrite Cloud, testar SDK e APIs transacionais e documentar:

- commit integral e rollback em falhas induzidas;
- conflito de writers no mesmo saldo/estoque e retry com revalidação;
- índices únicos sob corrida;
- mesmo comando/chave e chaves diferentes sobre a mesma referência;
- último item de estoque, saldo insuficiente e limites por pessoa;
- outbox atômica e processamento repetido.

Executar em dados isolados de staging. Os testes locais atuais NÃO validam transações Cloud. Se garantias não estiverem disponíveis, interromper e reportar antes de mudar arquitetura.

## Visual e assets

Interface construída em HTML/CSS/componentes responsivos; imagem inteira de referência não é usada como background. `public/brand/product-concept.webp` é um recorte da imagem fornecida, identificado no hero como arte conceitual. SVGs florais e luzes são decorativos. Não é fotografia de produto final nem prova de disponibilidade comercial.

Fotografias lifestyle, packshots em alta resolução, logo oficial e direitos de uso ainda precisam ser fornecidos/aprovados pela NUY. Não foram usadas pessoas, depoimentos ou estatísticas inventados. Experiências são textos editoriais, não ofertas comerciais.

GSAP/ScrollTrigger apenas no hero, Motion no fluxo de introdução, Lenis apenas na landing e Swiper nas experiências editoriais. Prefers-reduced-motion desativa os efeitos; formulários preservam scroll nativo. Tipografia usa fontes do sistema/Georgia para evitar dependência externa no build; fonts oficiais poderão ser hospedadas localmente.

## Bloqueios reais

- Projeto Appwrite Cloud dedicado ainda não conectado: endpoint, project ID e chaves com escopos acima.
- Provisionamento e permissões precisam ser verificados no projeto real.
- Auth/email e Function onboarding aguardam configuração, deploy e testes integrados.
- Autenticação pública de produção aguarda rate limiting compartilhado verificado.
- Cadastro público aguarda políticas legais definitivas.
- Gate transacional financeiro continua pendente.
- Assets oficiais finais e fotografia lifestyle pendentes; não bloqueiam desenvolvimento local.
