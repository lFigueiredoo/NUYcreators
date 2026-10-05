# R7 §14–§15 — Textos de desenvolvimento e badge "1 Issue"

Data: 2026-10-04 · Rodada R7 (Fidelity Pass final)

## §14 — Textos de desenvolvimento removidos

Varredura completa do código público encontrou **um único** texto de
desenvolvimento em runtime:

- `src/app/(auth)/layout.tsx` — bloco `<small class="artNote">Composição
conceitual NUY.</small>` rendizado apenas em
  `process.env.NODE_ENV === 'development'` no aside de arte /cadastro e /login.

Ação aplicada:

- O bloco foi **removido do JSX** (não apenas escondido por CSS).
- As regras `.artNote` foram excluídas de
  `src/features/auth/components/auth-experience.module.css`
  (regra desktop substituída por comentário de registro; removida do media
  block de 760px).

Os demais termos listados no §14 ("referência visual", "não fotografia
oficial", "Inspiração visual", "categorias, não ofertas disponíveis", "Arte
conceitual") **nunca existiram no código** — existiam apenas na documentação
de delivery. A cópia pública atual usa texto editorial neutro (ex.: as
categorias de experiência são apresentadas como nomes próprios, sem nota de
contexto). Cobertura regressiva: o teste
`tests/e2e/landing-quality.spec.ts` (`devPhrases`) varre o `innerText`
do `<main>` em 8 larguras e falha se qualquer frase voltar.

## §15 — Badge "1 Issue" (Next.js dev overlay / canto da tela)

Apuração R7 — probe Playwright limpo (`scripts/badge-probe-round7.mjs`,
Chromium com `--disable-extensions`, leitura apenas):

- **dev :3000** — existe um `<nextjs-portal>` no DOM (elemento custom do
  Next.js Dev Tools); todo o badge ("1 Issue") vive **dentro do shadow DOM
  desse portal** (`[data-next-badge-root]` / `[data-issues-open]`), fora do
  React tree da aplicação. Console limpo, zero page errors, zero
  `[data-nextjs-error]`.
- **prod :3102** — **não existe `<nextjs-portal>`**; console limpo, zero
  page errors. O badge não entra no build servido por `next start`.
- Conclusão: o badge é o **indicador de Issues do Next.js Dev Tools** do
  `next dev` — overlay do dev-server, não da aplicação. Não é extensão de
  navegador (Chromium limpo reproduz) e não é parte da aplicação
  (PROD não o renderiza). Sem correção aplicável na aplicação; sem
  esconderijo: o badge dev-only é comportamento padrão do Next.js 15/16 e
  não acompanha o deploy.

Evidência: `artifacts/round7/badge-probe/dev-3000-fold.png` (dev, com o
portal no DOM) e `artifacts/round7/badge-probe/prod-3102-fold.png` (produção,
sem portal). Capturas de produção sem badge:
`artifacts/round6/review/` e as pranchas R7 (`artifacts/round7/review/`).

## Nota relativa — "hairline vertical" do footer

Investigação R7: a linha vertical observada na fatia 10 do mockup pertence à
**borda do painel do celular** do artboard oficial (faixa direita
x892–1396), visível na fatia da REF; nenhuma regra de borda vertical existe
no CSS do footer da impl (varredura em `globals.css` + `landing.module.css`).
Decisão: nenhum elemento inexistente foi "removido"; a divergência era de
leitura da prancha. Evidência: `artifacts/round6/review/impl-footer-1920.png`.
