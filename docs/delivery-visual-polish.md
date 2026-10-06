# Polimento visual da landing — recortes nativos e ajuste de composição

Data: 2026-10-05 · Rodada posterior ao commit `4584fcc` (fidelity pass R7)

## Resultado

A landing pública teve seis áreas revisadas: header, hero, "O projeto",
jornada, transição jornada/experiências, experiências e CTA. Todas as trocas
partem exclusivamente do arquivo disponível
`public/brand/product-concept.webp` (930×1011) — **sem resize, upscale ou
sharpening**; a suavidade da arte conceitual permanece o limite de detalhe
(rotulos/pétalas sob DPR 2/3).

Novos recortes nativos em `public/brand/polish/` (gerados por
`scripts/build-polish-assets.mjs`, descritos em `public/brand/polish/README.md`):

- `hero-products.webp` (930×940) — recorte dos produtos com bordas
  direcionais; exclui a legenda da arte de origem.
- `experience-still-life.webp` (930×875) — packshot isolado com contorno dos
  frascos e feather periférico da vegetação.
- `cream-bloom.webp` (300×285) — flor única com alpha no contorno das pétalas
  (usada no hero, jornada, FAQ e níveis).
- `lilac-floral.webp` (207×255) — floral para cantos navy (hero e níveis).

Trocas de referência no código:

- `scene.tsx` — `hero-products.webp` como recorte principal; florais
  lilás/creme nas bordas em lugar das camadas raster com blur.
- `landing.tsx` — `cream-bloom.webp` no bloco "O projeto" (substitui
  `project-bloom-mass.webp`) e `experience-still-life.webp` nas experiências
  (substitui `experience-scene-ref.webp`).
- `levels-section.tsx` — florais nos cantos com os novos recortes.
- `faq.tsx` — `cream-bloom.webp` na transição FAQ/CTA.

Ajustes de composição (CSS: `acquisition.module.css`,
`hero-artboard.module.css`, `landing.module.css`; JSX: `scene.tsx`,
`landing.tsx`, `levels-section.tsx`, `faq.tsx`): lockup do header a 9,9%,
flor do projeto sangrando pelo canto superior direito sem máscara radial,
floral da jornada presa ao canto, fita inferior em SVG, teto de 60vw para o
retrato do CTA (máx. 1152px), órbitas/névoa/bloom atenuados e flores de
transição menores.

Galeria comparativa antes/depois (mesma página, 1920/390px, com links para
screenshots integrais e `after/audit.json` com CSS, DPR, currentSrc, sizes e
bitmap entregue por imagem): abrir `artifacts/visual-polish/index.html`.

Limpeza residual da rodada anterior: o arquivo residual `640` detectado na
raiz após o commit `4584fcc` não existe mais na árvore; a evidência da
anomalia permanece em `artifacts/qa-visual/stray-640.png`.

## Validação

Rodada original (capturada em produção para as imagens finais; baseline
"antes" veio do dev server, onde o indicador do Next.js nas PNGs não faz
parte da landing):

- `npm run build` e `npm run typecheck`: aprovados.
- Vitest: 14 testes aprovados.
- Playwright (qualidade da landing + movimento do hero): 28 aprovados;
  10 skips previstos entre projetos desktop/mobile.
- ESLint dos componentes e do teste alterados: aprovado.
- Auditoria em 1920, 1440, 1024, 768, 390 e 375px, incluindo DPR 2/3: sem
  overflow horizontal ou texto cortado.

Revalidação desta sessão (2026-10-05, árvore atual, após remoção do arquivo
residual `640`):

- `npm run typecheck`: aprovado.
- Vitest completo: 9 arquivos, 44/44 aprovados.
- `npx prettier --check .`: aprovado (`artifacts/` segue no
  `.prettierignore`).
- `npm run build`: aprovado.
- `npm run test:e2e` completa (servidor de produção próprio em :3000,
  Appwrite desconectado por env do processo): **48 aprovados, 12 skips**
  previstos (cenários exclusivos de desktop ou mobile), incluindo o teste
  atualizado "hero uses native crops instead of enlarged mockup layers".
- `npm run lint`: 0 erros; 11 warnings de `no-unused-vars` — todos em
  scripts de probe/captura pré-existentes (`compose-review*.mjs`,
  `probe-round7.mjs`, `probe-projeto-bounds.mjs`, `review-capture.mjs`),
  nenhum nos scripts novos da rodada.

Limitações registradas (`artifacts/visual-polish/README.md`):

- O retrato da CTA continua derivado do recorte original 330×220 (antes
  ampliado para 1155×770). A exibição em tela diminuiu, mas a suavidade de
  origem permanece; substituição nítida depende de arte melhor.
- `product-concept.webp` é arte conceitual preexistente, não fotografia
  oficial: os novos recortes não adicionam nem recuperam microdetalhes de
  rótulos/pétalas.
- Os pequenos florais de Como funciona/Para quem/Benefícios seguem limitados
  pela arte anterior — não eram o foco desta rodada.
- As seis imagens citadas pelo usuário não chegaram anexadas à sessão da
  rodada; o diagnóstico partiu da landing e da descrição das áreas críticas.

## Escopo

Somente apresentação da landing pública, seus recortes e verificações visuais:
`src/features/community/*`, `tests/e2e/landing-quality.spec.ts`,
`scripts/build-polish-assets.mjs`, `scripts/capture-polish.mjs`,
`scripts/compare-polish.mjs`, `public/brand/polish/` e evidências em
`artifacts/visual-polish/`. Nada de Appwrite, env, banco, permissões,
Functions, Auth ou rotas autenticadas foi editado nesta rodada — as
modificações de `src/features/auth/*`, `src/app/(auth)/*`,
`src/app/(protected)/*`, `src/features/workspace/` e `.env.example`
permanecem no working tree de rodadas anteriores, fora de qualquer commit.

Nenhum commit executado.
