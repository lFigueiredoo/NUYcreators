# Fechamento público (Sprint 4B) — três decisões

Fecha as pendências do Sprint 4B: destino pós-login, remoção dos órfãos
comprovados e smoke visual final. Nada aqui é nova direção de arte.

## 1. Destino pós-login — `/onboarding` ou `/app`

O login pergunta ao perfil se o onboarding terminou.

- **Fonte de verdade:** o documento privado `profiles/{userId}` no Appwrite, onde
  a função `complete-onboarding` grava `onboardingCompletedAt` **por último** —
  o marcador nunca existe em perfil parcial. Nenhum estado novo foi criado; a
  regra só lê o que a função já escreve.
- **Leitura:** `readOwnProfile()` em `src/lib/appwrite/server.ts`, com a sessão
  do próprio usuário (o documento nasce com `read(user:userId)`, então não
  precisa de key de admin). Documento ausente devolve `null` — perfil ainda não
  criado é estado normal, não erro.
- **Regra:** `postLoginRoute()` (`src/features/auth/services/onboarding-gate.ts`)
  manda para `/app` **somente** quando existe um `onboardingCompletedAt` string
  não vazia. Documento ausente, campo ausente ou leitura indisponível caem todos
  em `/onboarding`, que é resumível e regrava por upsert — repetir é seguro,
  mandar para `/app` quem não concluiu não é. Falha de leitura **não derruba o
  login já feito**: o destino conservador é assumido.
- O cadastro continua indo direto para `/onboarding` (não há perfil ainda).

Coberto por `tests/unit/auth.test.ts` → `describe('post-login destination')`.

## 2. Assets órfãos — 22 removidos, 23 mantidos

Critério aplicado aos 45 sem referência de runtime: **menção ao caminho
completo** (`brand/reference/<nome>.webp`) em `src/`, `public/`, `tests/`,
`scripts/`, `docs/` + README/package/tsconfig/next.config — 288 arquivos de
texto varridos (`node_modules`, `.next`, `artifacts`, `.git` fora). Zero
import, zero path string (inclusive em template literal de script), zero leitura
por script, zero doc, zero teste dependente.

**Removidos (22, todos rastreados no Git — a remoção é reversível):**
`campaign-crown`, `campaign-interior`, `como-floral-r`, `cta-bloom-l`,
`edge-petals-hi`, `experience-concept-hi`, `faq-bloom-corner-feathered`,
`final-portrait-hi`, `final-portrait`, `hero-composition-art`,
`hero-ground-foliage-hi`, `hero-ground-foliage`, `hero-left-foliage-hi`,
`hero-left-foliage`, `hero-violet-flower`, `hero-white-bloom-hi`,
`journey-bouquet-tr-feathered`, `journey-orchid-l-feathered`, `journey-ribbon`,
`project-bloom-hi`, `ranking-bouquet`, `reward-ritual` (todos em
`public/brand/reference/`).

**Mantidos como UNCERTAIN (23):** o caminho aparece no caminho montado de um
script (`faq-bloom-corner`, `journey-bouquet-tr`, `journey-orchid-l`,
`para-quem-floral`, `benefits-floral`, `project-floral-l`, `how-floral-l`,
`journey-bouquet-tr-r7`, `hero-violet-flower-hi`, `hero-environment-hi`,
`polish/hero-products`, `polish/experience-still-life`, `polish/cream-bloom`),
no destino do pipeline canônico (`nuy-creators-v2/reference/proposal-c`,
`imagens-a-utilizar`) ou em doc de rodada / README de proveniência
(`edge-petals`, `project-bloom-mass`, `reward-products`, `reference/README.md`),
além das 4 licenças OFL das fontes em uso. Na dúvida, preservado.

Nada foi movido para backup nem para pasta "old".

## 3. Smoke visual final

`scripts/pc-smoke-final.mjs` — build de produção, porta 3125, dois ambientes
(acesso ligado; Appwrite zerado para `/onboarding`). 12 telas: landing 1920/390,
login, cadastro, recuperar-senha, verificar-email, onboarding (1920 + 390 cada).

Verificações objetivas, todas por máquina: erro de JS/página e de console
(inclui hidratação), imagem quebrada (`complete && naturalWidth === 0`),
overflow horizontal, texto cortado, contraste WCAG (texto sobre fotografia fica
fora do teste), CTA morto (submit fora de form / link vazio / `#` / botão sem
nome), header presente com lockup, 404 de asset, e varredura de classe legada.

Resultado: **sem problemas objetivos** — nenhuma ocorrência em nenhuma tela,
zero erro de JS/hidratação, zero 404. O único botão desabilitado é o CTA de
cadastro, que está desabilitado de propósito (proteção legal mantida).

Destinos conferidos (`/`: Entrar → `/login`, Fazer parte → `/cadastro`; telas de
acesso: Voltar ao site → `/`, Criar conta → `/cadastro`, Entrar → `/login`) e as
rotas `/`, `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`,
`/verificar-email`, `/termos`, `/privacidade` respondem 200.

**PUBLIC EXPERIENCE — FROZEN.** Nenhuma alteração de UI foi feita nesta rodada.

## 4. Segurança e escopo do commit

`.env.example` voltou a placeholders: o arquivo trazia o endpoint `standard_…`
(token embutido) e o project ID real; nenhum dos dois é versionado agora.
Varredura por nome de arquivo (sem imprimir segredo) nos rastreados e nos não
ignorados: zero ocorrência de token, project ID real ou atribuição não vazia de
API key. `artifacts/` (e `debug.log`) entram no `.gitignore` — evidência de
captura não é versionada.

Fora do commit, intactas: `src/features/workspace/`, `src/app/(protected)/**` e
demais alterações de rodadas anteriores da área autenticada.
