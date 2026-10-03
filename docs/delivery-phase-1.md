# Entrega inicial — etapas 1 a 4

## Escopo

Infraestrutura local, base Appwrite declarativa, rotas/handlers de autenticação e onboarding e design system/landing responsiva. Não implementados dashboard, submissões, moderação, ledger operacional, ranking operacional ou resgates. As páginas públicas dessas áreas são estados de indisponibilidade, não operações prontas.

## Real versus provisório

- Real: aplicação Next.js executável, layouts, navegação, formulários, validação Zod, Server Actions Appwrite, sessão HttpOnly, handler de onboarding, manifest e script de provisionamento, testes e CI.
- Aguardando Cloud: execução de cadastro/login/verificação/recuperação, persistência do perfil, provisionamento e validação de permissões.
- Provisório: recorte conceitual de produto fornecido pelo usuário, wordmark tipográfico e páginas legais claramente identificadas como pendentes.
- Sem mocks na aplicação: nada de creators, ranking, pontuação, catálogo ou métricas inventadas. Mocks apenas no teste unitário da Function.
- Configuração backend: cinco níveis oficiais; a landing consulta o banco e não usa seed como fallback local.
- Functions futuras: somente containers desabilitados no plano, sem código nem execução simulada.

## Decisões técnicas

Server Components e Server Actions no BFF, credenciais separadas de provisionamento/sessão, permissões negadas por padrão, onboarding reexecutável sem alegação de transação financeira, social links não verificados, bloqueio de cadastro até políticas aprovadas e bloqueio de autenticação de produção até rate limiting compartilhado verificado.

Tailwind 4/shadcn Button com Radix Slot, fontes locais do sistema, GSAP somente no hero, Lenis somente na landing, Motion para introdução e Swiper para experiências editoriais. Formulários não recebem smooth scroll. Fotografia lifestyle e assets oficiais finais ainda pendentes.

## Verificações locais

Executadas ao final da entrega: typecheck, Vitest (25 testes em 6 arquivos), ESLint, Prettier, build Next.js, build da Function e Playwright (4 testes desktop/mobile) contra build de produção. O plano Appwrite foi executado sem rede. Não foram executados provisionamento Cloud, integração Auth/Function, auditoria de permissões real nem testes transacionais financeiros.

Os E2E cobrem identidade, navegação para cadastro, estados vazios, ausência de overflow, reduced motion e indisponibilidade explícita de login/onboarding. Não são um E2E de autenticação conectada.

## Arquivos versionáveis criados nesta implementação

```text
.env.example
.gitignore
.prettierignore
.prettierrc.json
.github/workflows/ci.yml
AGENTS.md                         # gerado pelo Next.js
CLAUDE.md                         # gerado pelo Next.js
components.json
eslint.config.mjs
next.config.ts
package.json
package-lock.json
playwright.config.ts
postcss.config.mjs
README.md
tsconfig.json
vitest.config.ts
docs/infrastructure.md
docs/delivery-phase-1.md
functions/README.md
functions/complete-onboarding/main.ts
functions/complete-onboarding/package.json
functions/complete-onboarding/package-lock.json
infra/appwrite/provision.ts
infra/appwrite/schema.ts
public/brand/product-concept.webp
src/app/error.tsx
src/app/layout.tsx
src/app/page.tsx
src/app/(auth)/layout.tsx
src/app/(auth)/cadastro/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/onboarding/page.tsx
src/app/(auth)/recuperar-senha/page.tsx
src/app/(auth)/redefinir-senha/page.tsx
src/app/(auth)/verificar-email/page.tsx
src/app/(public)/layout.tsx
src/app/(public)/desafios/page.tsx
src/app/(public)/privacidade/page.tsx
src/app/(public)/ranking/page.tsx
src/app/(public)/recompensas/page.tsx
src/app/(public)/termos/page.tsx
src/components/feedback/empty-state.tsx
src/components/layout/footer.tsx
src/components/layout/header.tsx
src/components/ui/button.tsx
src/features/auth/components/auth-form.tsx
src/features/auth/schemas/auth.ts
src/features/auth/services/actions.ts
src/features/community/components/experiences.tsx
src/features/community/components/faq.tsx
src/features/community/components/floral.tsx
src/features/community/components/hero.tsx
src/features/community/components/how-it-works.tsx
src/features/community/components/landing.tsx
src/features/community/components/levels-section.tsx
src/features/community/components/public-motion.tsx
src/features/community/services/public-data.ts
src/features/profiles/components/onboarding-form.tsx
src/features/profiles/schemas/onboarding.ts
src/lib/utils.ts
src/lib/appwrite/server.ts
src/lib/env/schema.ts
src/lib/env/server.ts
src/lib/security/permissions.ts
src/styles/globals.css
tests/e2e/public.spec.ts
tests/unit/auth.test.ts
tests/unit/environment.test.ts
tests/unit/infrastructure.test.ts
tests/unit/legal-gate.test.ts
tests/unit/onboarding-function.test.ts
tests/unit/permissions.test.ts
```

## Documentos existentes alterados

```text
docs/nuy-creators-architecture.md
docs/database.md
docs/flows.md
```

Atualizados para registrar aprovação, Appwrite Cloud dedicado e faixa Ícone confirmada; arquitetura/fluxos financeiros mantidos como especificação, não funcionalidades executadas.

## Arquivos gerados, ignorados e não versionáveis

`.next/`, `node_modules/`, `functions/complete-onboarding/node_modules/`, `functions/complete-onboarding/src/main.js`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, screenshots e artefatos em `test-results/`. A imagem original de referência não foi alterada.

## Próxima conexão necessária

Criar projeto NUY Creators dedicado no Cloud, fornecer endpoint e ID na configuração segura, chave temporária para provisionamento e chave web separada somente `sessions.write`. Procedimento e escopos em `infrastructure.md`. Não enviar secrets pelo chat. Deploy onboarding e testes de isolamento antecedem ativação.

Transações financeiras seguem bloqueadas até testes reais de atomicidade, rollback, concorrência, conflitos, índices únicos e idempotência. Não houve mudança de arquitetura para contornar esse gate.

Commit sugerido (não executado; workspace ainda não é Git):

`feat: bootstrap NUY Creators infrastructure, Appwrite foundation, auth and public experience`
