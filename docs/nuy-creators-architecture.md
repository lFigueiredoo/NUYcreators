# NUY Creators — arquitetura proposta

Status: arquitetura aprovada. Entrega inicial limitada às etapas 1 a 4; consultar `infrastructure.md` para implementação e bloqueios reais.

## Auditoria inicial

- Workspace sem aplicação, manifests, dependências, testes ou repositório Git.
- Único arquivo existente: `Universo NUY_ Bem-Estar em Flor.png`.
- Não existem funcionalidades a modificar ou migrar.
- A referência define direção visual, não dados de produção: números, nomes, ranking e depoimentos nela presentes não serão usados como dados reais.

## Objetivo e limites

Plataforma de comunidade, creators e UGC com aplicação autenticada e administração, além da experiência pública. A Fase 1 entrega infraestrutura, autenticação, layout, dashboard, desafios, submissões, moderação, ledger, ranking, recompensas e resgates em etapas verificáveis.

Feed social completo, badges automáticos, campanhas avançadas, integrações OAuth sociais e relatórios avançados ficam preparados no modelo, mas não serão apresentados como funcionalidades prontas antes da implementação. Menus futuros devem ser explicitamente identificados como indisponíveis, nunca simular operações.

## Arquitetura

- Next.js App Router, TypeScript estrito e renderização server-first.
- Tailwind CSS e shadcn/ui para componentes acessíveis; Lucide para ícones.
- Features isoladas em domain, schemas, services, repositories, components, hooks e types.
- Domínio sem dependência de React ou SDK Appwrite; repositories implementam interfaces do domínio.
- Next.js como camada web/BFF: valida sessão, aplica Zod e encaminha comandos. Não duplica regras financeiras.
- Appwrite Auth, Databases, Storage, Functions, Permissions e Events.
- Appwrite Functions executam comandos sensíveis e verificam identidade e autorização independentemente da camada web.
- Ledger imutável como fonte de verdade; snapshots e ranking são projeções reconstruíveis.
- Eventos assíncronos entregues via outbox persistida na mesma transação do comando. Consumidores idempotentes, com retries e reconciliação.

### Condição de produção: transações

Antes de implementar persistência, verificar a versão efetiva do Appwrite e do SDK e testar suporte a transações entre registros, isolamento, conflitos concorrentes, índices únicos e incremento/decremento condicionado.

Uma Function, sozinha, não torna múltiplas escritas atômicas. Aprovação e resgate só serão liberados após testes de rollback e concorrência no backend real. Se o ambiente não suportar as garantias necessárias, será necessário atualizar o Appwrite ou aprovar uma alternativa transacional. Não usar read-modify-write desprotegido ou compensação eventual como garantia de saldo e estoque.

Snapshots devem ser escritos com controle de versão/conflito. Resgates concorrentes sobre o mesmo usuário ou recompensa devem conflitar e repetir a validação antes do commit. Histórico, ledger, pedido, estoque, auditoria e outbox integram a transação correspondente.

## Estrutura proposta

```text
docs/
src/
  app/
    (public)/               # landing, desafios, recompensas, ranking
    (auth)/                 # login, cadastro, recuperação, onboarding
    (member)/app/           # dashboard, submissões, extrato, resgates
    (admin)/admin/          # administração com autorização server-side
    api/                   # endpoints BFF e sessão
  features/
    auth/
    profiles/
    challenges/
    submissions/
    moderation/
    points/
    ranking/
    rewards/
    redemptions/
    community/
    badges/
    notifications/
    campaigns/
    admin/
    # Cada feature contém apenas as camadas necessárias:
    # domain/, services/, repositories/, components/, hooks/, types/, schemas/
  components/
    ui/
    layout/
    feedback/               # loading, empty, error, unavailable
  lib/
    appwrite/               # clientes browser, sessão server e integração
    env/                    # validação de configuração
    security/
    observability/
  styles/
packages/
  domain/                   # regras compartilhadas com Functions
  contracts/                # schemas Zod de comandos e respostas
functions/
  commands/
  events/
  scheduled/
infra/
  appwrite/                 # provisionamento versionado e seeds de configuração
tests/
  unit/
  integration/
  e2e/
public/
  brand/
```

Route groups organizam layouts sem alterar URLs. Services orquestram casos de uso; repositories cuidam de I/O; componentes não calculam regras financeiras.

## Segurança

- Sessões SSR em cookies HttpOnly, Secure em produção e SameSite apropriado; proteção CSRF/origem nos comandos web.
- API keys somente no ambiente servidor e com escopos mínimos. Não expor em NEXT_PUBLIC, respostas ou logs.
- Admin autorizado por membership/role verificada na equipe Appwrite `nuy-admins`, nunca por campo editável no perfil.
- Document security e file security habilitadas; negar por padrão. Permissões de collection não devem conceder leitura global a dados privados.
- Escritas de negócio apenas por Functions. Usuário edita seus próprios dados permitidos via comando autenticado, sem poder modificar nível, pontos, status ou role.
- Projetar respostas públicas com allowlist: permissões de documento não ocultam campos individuais.
- URLs de conteúdos externas validadas por plataforma; não buscar URLs arbitrárias no servidor. Links com abertura segura.
- Uploads privados em quarentena, tamanho/MIME/extensão validados, inspeção do conteúdo e análise de segurança antes de publicação. Vídeos com limites de processamento.
- Rate limit por usuário/IP/operação, normalização de links, hashes e chaves únicas contra duplicação.
- LGPD: consentimento separado para publicação e marketing, minimização de dados, retenção, exclusão/anonimização e acesso restrito a telefone/data de nascimento.
- Idade mínima e política de menores precisam ser definidas antes de lançar cadastro.

## Visual e acessibilidade

Navy profundo, creme, bege, violetas e dourado suave; tipografia editorial e fotografia real aprovada pela NUY. A referência é um moodboard, não deve virar uma página inteira em imagem.

Hero em camadas com produtos, flores e luz: GSAP/ScrollTrigger apenas para parallax e interação que justifiquem o custo. Motion para microinterações, Swiper para carrosséis, Lenis na experiência pública; preservar scroll nativo em formulários e painéis quando mais apropriado.

Desativar smooth scroll, parallax e movimentos decorativos com prefers-reduced-motion. Teclado, foco, contraste, textos alternativos e navegação móvel são critérios de aceite. Imagens responsivas, lazy loading fora do hero e animações carregadas sob demanda.

Não publicar avatares, depoimentos, métricas ou produtos fictícios como reais. Catálogo vazio recebe estado vazio; falha de integração recebe estado de erro, não zero inventado.

## Funções backend

1. `complete-onboarding`, `update-profile`, `link-social-account`: validar identidade e dados; integração OAuth só quando configurada.
2. `join-challenge`: elegibilidade, prazo, capacidade e unicidade.
3. `submit-content`, `revise-submission`: requisitos, ownership, upload, deduplicação e histórico.
4. `moderate-submission`: aprovar, rejeitar ou solicitar revisão; aprovação atômica com crédito.
5. `adjust-points`: ajuste administrativo motivado e auditado, sem editar o ledger existente.
6. `redeem-reward`: preço/estoque/limites lidos no backend e débito atômico.
7. `update-redemption-status`, `cancel-redemption`: máquina de estados e eventual estorno único.
8. `manage-challenge`, `manage-reward`, `manage-level`: mutações administrativas validadas e auditadas.
9. `process-outbox`: notificações e projeções idempotentes.
10. `rebuild-ranking`, `reconcile-ledger`, `expire-challenges`: jobs agendados, checkpoints e alertas.
11. Futuras: publicação no feed, likes/favoritos, concessão de badges, campanhas e conexão OAuth.

Não criar uma Function por tela; separar handlers e casos de uso, permitindo empacotamento por contexto sem ampliar privilégios.

## Ordem e gates da Fase 1

| Etapa | Entrega                                                    | Validações específicas                                 |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------ |
| 1     | Infraestrutura Next.js, workspace, CI, env, qualidade      | smoke tests e configuração                             |
| 2     | Appwrite, schema, índices, buckets, permissões, transações | acesso direto negado, rollback e corrida concorrente   |
| 3     | Login, cadastro, recuperação e onboarding                  | sessão, ownership, role, recuperação                   |
| 4     | Design system, layouts público/member/admin e landing      | acessibilidade, mobile, reduced motion                 |
| 5     | Dashboard com queries reais                                | vazio versus indisponível, isolamento de usuários      |
| 6     | Desafios e participação                                    | janela, nível, capacidade, duplicidade                 |
| 7     | Submissões e histórico                                     | uploads, URLs, revisão, antifraude                     |
| 8     | Admin/moderação e auditoria                                | autorização, transições, aprovação integrada ao ledger |
| 9     | Ledger, extrato, snapshots e níveis                        | idempotência, limites e reconstrução                   |
| 10    | Ranking geral e mensal                                     | pontos conquistados, timezone, empate                  |
| 11    | Catálogo e gestão de recompensas                           | validade, estoque e publicação                         |
| 12    | Resgates e acompanhamento                                  | saldo/estoque concorrentes, estorno e rollback         |

A etapa 8 necessita do núcleo transacional de pontos; esse núcleo será introduzido junto à aprovação, e a etapa 9 completa extrato, ajustes e reconciliação. Nenhuma aprovação terá crédito provisório em memória.

Em cada etapa: rodar typecheck, testes e build; registrar resultado e corrigir falhas antes de seguir. Testes unitários com Vitest, integração contra Appwrite isolado e E2E com Playwright. Fixtures apenas nos testes. Falta de credenciais deve ser reportada como bloqueio de integração, nunca como sucesso.

## Operação e decisões pendentes

Ambientes dev/staging/produção separados, deploy versionado, backup e teste de restauração, logs estruturados sem PII, correlation IDs, monitoramento de falhas/outbox e reconciliação agendada.

Confirmado: Appwrite Cloud dedicado ao NUY Creators e faixa Ícone a partir de 5.001. Pendentes: endpoint/projeto/versão efetiva; hospedagem; domínio e SMTP; assets oficiais e direitos de uso; política de menores e LGPD; timezone; regras de frete/endereço/cancelamento; regras de pontuação e revogação. Fase 1 registra perfis sociais como declarados, não como contas verificadas.
