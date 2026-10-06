# R9 · Checkpoint A — Header + Hero (V3, nova referência oficial)

Diretriz: a referência enviada (`Downloads/Landing page luxuosa NUY Creators com flores e produtos.png`, artboard 1024×1536) **vence**. Camada nova e limpa em `src/features/public-landing-v3/`, sem reutilizar o CSS visual legado. Base de escala: banda hero 0-385 do artboard → ×1,875 → **1920×722 css-px** (37,6vw a 1920, clamp 540-800). Estático por contrato (sem animações; camada de motion volta depois do visual aprovado).

**Não tocado**: Auth, Appwrite, database, Functions, permissions, env, rotas autenticadas, lógica de negócio. Sem commit, sem push (aguardando aprovação visual).

## Evidências (artifacts/r9/checkpoint-a/)

| Arquivo                            | Conteúdo                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference-hero.png`               | bandeira da referência: banda hero 1024×0-385 ampliada ×1,875 = 1920×722                                                                     |
| `v3-hero-1920.png`                 | V3 @1920 DPR1 (hero 1920×722)                                                                                                                |
| `v3-hero-1440.png`                 | V3 @1440 (hero 1440×541 — 37,6vw mantém proporção)                                                                                           |
| `v3-hero-390.png`                  | V3 mobile 390 (hero dobrado 1010px: logo/menu, kicker, headline, texto, CTA+Entrar, assinatura, cena com produto, flores, chips em grid 2×2) |
| `reference-vs-v3-hero.png`         | lado a lado: referência (topo) vs V3 (baixo)                                                                                                 |
| `edge-left.png` / `edge-right.png` | zoom das bordas do recorte da cena (penas + florais alinhados)                                                                               |

## Checklist do checkpoint

1. **Referência mostrada** — `reference-hero.png` (prato 1920×722 da banda 0-385).
2. **Hero 1920** — `v3-hero-1920.png`.
3. **Lado a lado** — `reference-vs-v3-hero.png` (rótulo identifica topo/baixo).
4. **Mobile 390** — `v3-hero-390.png` (layout próprio, não empilhado do desktop; chips 2×2 no frame).
5. **Assets utilizados** — ver tabela abaixo.
6. **Resolução original** — a cena vem da fonte nativa `hero-composition-hi` (1264×1416, IA) → R8 trim → `hero-scene-v2` 1264×1204 → V3 = **a mesma arte 1264×1204 com a aurora pintada** (compositing sharp, sem re-render/upscale).
7. **Zero upscale confirmado** — sim (auditoria no otimizador, log `artifacts/r9/round15.log`):
   - cena: display 632×602 @DPR1 → bucket servido 632 (≤ nativo 1264); @DPR2 display 632×2 = **1264 = nativo exato**; única diferença registrada é arredondamento sub-pixel (632,06 medido vs 632 servido, Δ 0,06px).
   - garland: display 169,9 ≤ bucket 256 (nativo 260). floralRight: display 142 = nativo 284 @0.5.
8. **Fontes carregadas** — `document.fonts.check` true; headline resolve a família web `v3HeroEditorial` (Bodoni Moda) — `headline family: {"family":"v3HeroEditorial","bodoni":true,"count":13}`. Kicker/chips/copy na variante interface; nenhum fallback system no herói (gate e2e de fontes verde).
9. **Nenhum texto cortado** — gate "no visible text block is vertically clipped" verde nos 8 viewports (1920/1440/1366/1280/1024/430/390/375); sem overflow horizontal.

## Assets (todos derivados da mesma arte-fonte, corte nativo)

| Asset                               | Dimensões | Uso                                                     | Relação display              |
| ----------------------------------- | --------- | ------------------------------------------------------- | ---------------------------- |
| `public/brand/v3/scene-hero.webp`   | 1264×1204 | arco+aurora, frascos, script, fitas (arte inteira @0.5) | 632 @DPR1 / 1264 exato @DPR2 |
| `public/brand/v3/garland-left.webp` | 260×964   | coluna floral esquerda (nativo, recorte da cena)        | ~170 css-px                  |
| `public/brand/v3/floral-right.webp` | 284×780   | flores da borda direita **na mesma escala 0,5 da cena** | 142 css-px                   |
| wordmark NUY (v2)                   | 322×183   | logo do header                                          | ~118 css-px                  |

Gerador: `scripts/r9-make-v3-assets.mjs` (inventário em `artifacts/r9/v3-assets-inventory.json`). A aurora da referência foi **pintada no asset** (sharp composite: interior do arco em creme-quente 0,92 + buracos borrados nos frascos) — a ref re-renderizou a arte com camadas de luz que o bitmap V2 não tem.

## Medida feita na referência (checagens por probe)

- Hero: 722 @1920 (37,6vw). Gutter editorial: 252 (13,125vw). Kicker y≈159, headline L1 y≈185, CTAs y≈488 h71 (w302/202), assinatura y≈580, chips y≈658-695.
- Cena: escala **0,5 da arte nativa** fechada por trigger head (contraste máximo) + bloco de frascos; `left` 56,5vw alinha o trigger ao centro x≈1319 da ref; `top` 2,9vw assenta a mesa em ≈651 (frascos terminam acima da linha dos chips, como na ref).

## Deltas conscientes (variante da arte na referência)

1. **Abertura do arco**: a ref re-renderizou a arte com arco mais largo (abertura ~410px) — o asset nativo tem abertura ~230 @0.5; mantida a arte original (transform affine não reproduz a variante).
2. **Script "Mais que limpeza, é uma aura"**: na ref está ~160px mais à direita.
3. **Flores até o chão**: a ref desce flores até y≈721; a arte termina ~678 — o chão da V3 completa com aura/glow do fundo (sem patch).

Estes três são do re-render da própria ref, não do layout; se aprovado assim, seguem como decisão de registro nos próximos checkpoints.

## Correções desta rodada

- **Cache do otimizador de imagens servindo asset velho** (mesma URL, conteúdo trocado): os otimizadores de `.next/cache/images` foram limpos — o audit flagrou natural 632×**677** (aspecto de asset antigo) antes da limpeza; agora 632×602 (aspecto exato da arte 1264×1204). Lição registrada: purgar `.next/cache/images` ao trocar o conteúdo de asset mantendo dimensões/URL.
- **Florais de borda estavam em escala dupla da cena** (0,99×/0,65× vs 0,5×) — as espirais dobravam de tamanho no seam; alinhados a 0,5.
- **Penas de máscara** nas bordas verticais da cena (o recorte do muro/arco funde no navy; a ref esconde o muro).
- **Captura de clip**: em viewport 390×844 o clip não passa do viewport (hero dobrado 1010px) — viewport 390×1020 para a captura.

## E2E atualizados para a geometria V3 (gates verdes com servidor próprio :3124)

- `landing-visual.spec.ts`: aspect 1/0,376; régua 0,131; cena 0,28-0,4 da largura com x>0,5; sangramento pela borda direita nos florais; chips 0,8-0,95 da largura.
- `landing-quality.spec.ts`: fold desktop `max(540, min(800, w×0,376))` (piso/teto do clamp V3); banda 761-1024 `max(560, min(760, w×0,52))`; fonte-cena `/brand/v3/scene-hero` (query encoded no currentSrc — casar pelo nome).
- `hero-motion.spec.ts`: data attrs `[data-v3-hero]`; contrato estático mantido (nenhuma transição/animada no frame).

## Gates

| Gate                                             | Resultado                              |
| ------------------------------------------------ | -------------------------------------- |
| `next build`                                     | ✓ (produção, rotas renderizam)         |
| `npm run lint`                                   | ✓ 0 erros (19 warnings pré-existentes) |
| `vitest run`                                     | ✓ 44/44                                |
| `playwright` (suite completa, config porta 3124) | ✓ 50 passou / 10 skipped / 0 falha     |

Servidores efêmeros em 3123/3124 foram desligados; o dev server do usuário (:3000) não foi tocado. Nada commitado.

## Aguardando aprovação visual do checkpoint A

Próximo passo após aprovação: **Checkpoint B — 02 O PROJETO + 03 COMO FUNCIONA** (mesmo processo: medir → assets → construir → capturas → PARE). Seções B-E concluem a ordem 01-10 acordada, substituindo o fluxo legado por componentes V3 novos.
