# R8 — Hero V2 calibrado ao mockup oficial (checkpoint A fechado)

Rodada: 05/10/2026 · Branch `master` · **sem commit nesta rodada** (workflow: commit só a pedido)
Escopro tocado: `src/features/public-landing-v2/*`, `tests/e2e/{hero-motion,landing-visual,landing-quality}.spec.ts`, `scripts/r8-*` (probes/capturas). Nada fora do escopo da landing pública.

---

## Objetivo

Fechar o checkpoint A do hero V2 (`public-landing-v2`) contra o mockup oficial
(`artifacts/r8/reference/source-mockup.png`, painel desktop 864×410 → ×2,2222 = 1920×911 de
projeto): tipografia, cadeia vertical, pills, faixa de benefícios e header calibrados por
**varredura de bandas programática** (não por leitura visual de grade — método que já provou
viesado em rodadas anteriores).

## Tabela-alvo (referência @1920) e resultado final

| Item                                  | Referência (banda/X)     | V2 final                 | Δ            |
| ------------------------------------- | ------------------------ | ------------------------ | ------------ |
| Altura do hero                        | 911                      | 911 (47,45vw)            | 0            |
| Coluna de copy (kicker/h1/desc/pills) | x 206-207                | 206                      | ~0           |
| Lockup do header (x)                  | ~335                     | 335 (17,45vw)            | ~0           |
| Nav (início)                          | ~505-510                 | 510                      | ✓            |
| Header CTA pill                       | ~1619-1771 (h~56)        | 1634-1783 (h60)          | ✓ aceito     |
| Kicker                                | 203-217, w472, ls≈0,31em | 204-214, w474            | +2 px        |
| H1 linha 1 "Bem-vinda ao"             | 240-315, w518            | 238-309, w522            | +4 px (0,8%) |
| H1 linha 2 "NUY CREATORS"             | 337-418                  | 335-421                  | ±2 px        |
| Descrição L1/L2/L3 (Y)                | 470/511/556              | 471/511/558              | ≤2 px        |
| Descrição (largura L1)                | 622                      | 611                      | −1,8%        |
| Pill primária                         | 618-699, w345, x206-550  | 618-702, w344,5 x205-549 | 0/0          |
| Pill "Entrar" (texto)                 | 652-665, x649-704        | 652-666, x649-705        | 0/1 px       |
| Faixa de benefícios (Y)               | 801-830                  | 801-827                  | ≤3 px        |

Decisão tipográfica: a fonte do mockup é ~8-10% mais estreita por cap-height que a Bodoni Moda
usada no V2. As duas restrições (largura de linha e cap-height) não batem simultaneamente com
tracking único — a calibração prioriza **largura/posição** (ritmo óptico da página) e aceita
−5% de cap com tracking −0,06em (L1) / −0,055em (L2); nenhuma colisão de glifos em 2×
(`artifacts/r8/v2-headline-2x.png`).

## Correções aplicadas (além da calibração)

1. **Vazamento de especificidade** (reincidente do padrão já registrado na memória): o
   `.experience p { font-size:12px }` do módulo legado (0,1,1) anulava kicker e descrição do
   V2 (0,1,0). Fix: regras promovidas a `.hero .kicker` / `.hero .description` (0,2,0),
   inclusive nas media queries.
2. **`border-radius` do botão primário**: duas edições seguidas de `old_string` contendo a linha
   do radius renderam o pill retangular (detectado por crop 1:1 + probe de computed style =
   `0px`; o CSS compilado confirmou a ausência). Reescrito e verificado no compilado.
3. **Menu hambúrguer invisível ≤760**: `.accountZone { display:none }` no mobile escondia o
   `menuButton` (que mora dentro dele). Fix: accountZone permanece flex, links/CTA escondidos.
4. **Overflow mobile (390)**: `.copy` relativo herdava `left: var(--v2-gutter)` (42px @390) →
   push de +42px e corte de "NUY CREATORS". Fix: `left: auto`; headline forte 11,8vw e kicker
   10px/0,2em no 760.
5. **Upscale da cena no mobile**: `sizes` do packshot 100vw → 118vw (a cena exibida é 118vw no
   760; o srcset servia 384 para 443 exibidos, agora ≥640).
6. **Capturas robustas** (`scripts/r8-capture-v2-hero.mjs`): kill-loop da porta 3123 agora só
   atua em linhas `LISTENING` e tolera taskkill negado (TIME_WAITS/PIDs de sistema derrubavam
   a rodada; órfaos em :3123 serviam chunks apagados por rebuild → página sem CSS nos
   screenshots).

## Evidências

- `artifacts/r8/checkpoint-a/hero-reference-vs-v2.png` — lado a lado ref × V2 @1920 DPR1 (final)
- `artifacts/r8/checkpoint-a/v2-hero-{1920,1440,390}.png` + crops 1:1 (logo, florais, produto, benefícios)
- `artifacts/r8/scan-final.json` (última varredura) e `scan-pass{2,3,4}.json` (histórico)
- `artifacts/r8/v2-headline-2x.png` — tracking sem colisão de glifos
- `artifacts/r8/v2-pill-1to1.png` — pill primário stadium (pós-fix de radius)
- `artifacts/r8/ref-header-{left,right}-1to1.png` — medidas do header da ref
- Scripts de medição: `scripts/r8-scan-bands.mjs`, `r8-scan-ref-final.mjs`, `r8-grid-overlay.mjs`,
  `r8-grid-ref-1920.mjs`, probes (`r8-probe-v2-full.mjs`, `r8-probe-v2-text.mjs`)

## Gates

- `npm run build` — OK (exit 0)
- `vitest run` — **44/44** ✓
- `playwright test` — **50 passed / 0 failed** (10 skips por projeto/largura, by design)
  - specs atualizados à geometria calibrada (0,453→0,4745; 870→911) e ao contrato de estático:
    camadas pictóricas marcadas `data-static-art` (bokeh/cena) mantêm opacity/transform fixos
    em CSS; a invariante testada passa a ser "sem transição/anim agendada" — que é o
    contrato §17 (nada amanhece animado).
- `npm run lint` — 0 erros; 15 warnings (todos `no-unused-vars` em `scripts/*.mjs`, padrão
  pré-existente + scripts de medição desta rodada)

## Notas pendentes (fora do checkpoint A)

- Metade esquerda do V2 ligeiramente mais escura que a ref (camadas de haze violeta).
  Ajuste de cor, não de geometria — candidato à rodada de colorimetria.
- Separadores da faixa de benefícios ficam mais afastados nas posições 2-3 do que na ref
  ( gaps de ref são desiguais: 99/116/68; o flex uniforme usa ~95 — compromisso aceito).
- `docs/` desta rodada: **não commitado**. Rondas anteriores (auth/protected/workspace e o
  polimento R7) continuam no worktree sem commit.
