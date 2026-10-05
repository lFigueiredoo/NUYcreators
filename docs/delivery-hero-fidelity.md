# Fidelidade do hero e QA global da landing — entrega para revisão

## Resultado

As imagens grandes da landing passam a exibir arquivos em resolução equivalente à caixa onde aparecem (sem ampliação perceptível no DPR 1), os tiles da cena foram corrigidos com máscaras reais, e o QA visual da landing inteira virou suíte automatizada. Capturas finais: `artifacts/qafinal-{fold,full}-{390,1440,1920}.png`.

## Regra de aceitação de fidelidade

Uma imagem só é aprovada quando a largura natural do arquivo servido é ≥ a largura renderizada no DPR 1 (margem de 2px). A medição honesta decodifica o `currentSrc` com `createImageBitmap` e compara os pixels do bitmap com o tamanho exibido: `naturalWidth` sob `srcset` reporta valores normalizados pela densidade do slot, e não a largura real do arquivo — leituras por ele haviam marcado falso positivos no loop anterior. Fora da regra estrita: guarnições menores que 200px (camadas de sussurro com blur/opacity por design) e o mobile real (DPR 3, servido com densidade adequada pelo wire). Densidade DPR 2 entra como margem, não como regra testada.

## Assets regenerados

`scripts/extract-hi-res-assets.mjs` gera variantes `-hi` em `public/brand/reference/` a partir do PNG original fornecido (`Universo NUY_ Bem-Estar em Flor.png`), do `product-concept.webp` e do mockup do artboard (origem do wordmark e da faixa de luz — coordenadas desses dois pertencem ao espaço de 744×410). Em uso no código:

| Asset                 | Uso                                                                           |
| --------------------- | ----------------------------------------------------------------------------- |
| hero-composition-hi   | Packshot central do hero (1264×1416, quality 90)                              |
| hero-bouquet-hi       | Buquê em 4 camadas da cena (background, mirrored/reflexo, foreground, corner) |
| hero-environment-hi   | Faixa de entorno do hero (1650×270)                                           |
| hero-white-bloom-hi   | Blooms base/gap do hero                                                       |
| nuy-wordmark-hi       | Logo do header do hero                                                        |
| project-bloom-hi      | Seção 01 / O projeto                                                          |
| experience-concept-hi | Seção 06 / Experiências                                                       |
| final-portrait-hi     | CTA final                                                                     |

`scripts/patch-scene-assets.mjs` aplica, sobre esses recortes: remoção da legenda embutida na arte ("Recompensao reais" — texto estranho nunca pode ficar legível no hero) com remendo da prateleira vizinha, máscaras de gradientes/radiais ao violeta, ground foliage e faixa de entorno, eliminando as junções retangulares dos tiles sobre o fundo navy.

Os tiles antigos de borda (`edge-petals-hi`, `hero-left-foliage-hi`, `hero-ground-foliage-hi`, `hero-violet-flower-hi`) tinham o frame da folha embutido e foram substituídos pelo buquê espelhado sangrando para fora do artboard. Os arquivos continuam no disco, mas o teste proíbe o retorno ao hero. `edge-petals.webp` (baixa) segue apenas como guarnição pequena na seção de níveis.

## Cena e movimento

`scene.tsx` compõe light map, starlight, órbita SVG com marcador de energia, trails, partículas e camadas de flores sobre o packshot `preload`. Comentário no código marca o ponto de troca para packshots oficiais (`imageSrc`/`imageAlt`). `HeroMotion` permanece enhancement: entrada com timeline GSAP (fases `static → entering → rest → ambient` no `data-hero-motion-phase`), cleanup revertendo propriedades, ambient pausado fora de vista/aba oculta e respeitando `prefers-reduced-motion` (mundo estático aprovado continua o frame padrão sem JS).

## Quality loop

`artifacts/quality-loop.json` registra uma passagem com 7 falhas (22/12/12/12/17/7/7 imagens acima da tolerância em 1920/1440/1366/1280/1024/390/375) na auditoria por `naturalWidth`, corrigidas pela regeneração dos assets, pelo ajuste de leitura (`createImageBitmap`) e pelos slots `sizes`. Estado final revalidado hoje, verde em toda a matriz.

## Gates novos — `tests/e2e/landing-quality.spec.ts`

Por largura (1920/1440/1366/1280/1024/390/375):

1. Hero preenche o fold em `100svh` e a próxima seção começa imediatamente após (sem camada creme, sem seam).
2. Sem overflow horizontal nos break points publicados.
3. Sem upsampling real (regra de fidelidade acima), auditando hero e imagens de todas as seções.
4. Nenhum bloco de texto visível cortado pela própria caixa.
5. Frases de desenvolvimento sobre arte conceitual nunca vazam para produção.

Adicionais: fontes editoriais resolvem para web fonts carregadas (não fallbacks), seções mantêm ritmo compacto (tetos por seção), FAQ abre com disclosure animado terminando 100% legível, camadas do hero resolvem para os assets `-hi` regenerados e os tiles aposentados nunca voltam.

## Formatação

Scripts de evidência, `public-header.module.css`, `acquisition.module.css`, `landing.module.css` e o spec foram formatados pelo Prettier. `artifacts/` entrou no `.prettierignore`: os JSONs de evidência são gerados pelos scripts de captura a cada execução e requebrariam `format:check` continuamente.

## Capturas e rechecks

- `artifacts/qafinal-{fold,full}-{390,1440,1920}.png`: fold e páginas completas nas três larguras.
- `artifacts/qafinal/recheck/`: probe de hoje (`scripts/probe-benefit-strip.mjs`): captura imediata × captura com fase `rest`, crop do strip de benefícios e zoom 4×. Diagnóstico aposentado com os spans em opacity 1, transform none, clip none e fontes carregadas — a leitura em miniatura downscaled (glifos de 12px ficam ilegíveis na redução da visualização) chega a parecer "texto faltando"; magnificar antes de julgar texto pequeno em capturas.

## Validação (estado de hoje, após a formatação)

- Typecheck: passou.
- Unitários: 44 passaram, 9 arquivos.
- Playwright: 41 passaram, 11 skips deliberados (projeto mobile pula desktop/touch).
- ESLint e Prettier: passaram.
- Build de produção: passou, regenerado após a formatação.

Os testes continuam bloqueando sessão sem servidor real; não comprovam login/cadastro remoto ou dados operacionais. Servidor de captura isolado/desconectado; o server 3200 subido para o probe foi encerrado.

## Arquivos e limites de escopo

- Assets/pipeline: `scripts/extract-hi-res-assets.mjs`, `scripts/patch-scene-assets.mjs`, `public/brand/reference/*-hi.webp` e `-hi.png`.
- Cena: `scene.tsx`, `hero.tsx`, `landing.module.css`, `hero-artboard.module.css`, `hero-motion.tsx`, `next.config.ts` (apenas `images.qualities`).
- QA: `tests/e2e/landing-quality.spec.ts`, `scripts/capture-qa-visual.mjs`, `scripts/measure-hero-geometry.mjs`, probe e capturas em `artifacts/`.
- Relato anterior integral da experiência pública vs. autenticada: `docs/delivery-experience-architecture.md` (estrutura de rotas, workspace, auth e limites operacionais continuam válidos).

Nenhuma alteração de Appwrite, env, banco, permissões, Functions, seguranças de sessão ou rotas autenticadas nesta rodada. Nenhum commit executado.
