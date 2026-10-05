# Hero — entrega de movimento para aprovação

O frame estático aprovado permanece a base HTML/CSS. Nenhum commit executado.
Esta rodada altera somente o movimento do Hero, seus hovers e as evidências/testes.
Header não ganhou estrutura sticky. Outras seções, Appwrite, Auth e env não foram editados nesta rodada; alterações anteriores no working tree foram preservadas.

## Animações e tempos

Uma timeline de entrada termina em aproximadamente **1,45s**, com `power2.out`, sem bounce/spring:

| Elemento          | Movimento                                | Duração / início             |
| ----------------- | ---------------------------------------- | ---------------------------- |
| Header/logo       | Fade e Y −5 → 0                          | 0,55s / 0s                   |
| Kicker            | Fade                                     | 0,65s / 0,12s                |
| Headline          | Máscara `clip-path`, sem mudar os glifos | 1,05s / 0,16s                |
| Subtexto          | Fade                                     | 0,7s / 0,38s                 |
| CTAs              | Fade e Y 5 → 0                           | 0,6s / 0,55s; stagger 0,07s  |
| Packshot          | Fade, scale 0,96 → 1, Y 20 → 0           | 1,3s / 0,04s                 |
| Microcopy         | Fade                                     | 0,55s / 0,75s                |
| Linha inferior    | Máscara da esquerda para direita         | 1,1s / 0,3s                  |
| Quatro benefícios | Fade e Y 4 → 0                           | 0,45s / 0,82s; stagger 0,06s |

Estilos temporários da entrada são removidos ao terminar. Há uma janela real de **3s em repouso**, antes dos efeitos ambientes. A captura não desabilita nem pausa artificialmente as animações.

Uma timeline ambiente usa 8s por percurso e yoyo (16s ida/volta):

- Glow adicional transparente respira até opacity 0,1 no desktop e 0,025 no mobile. Os cinco glows aprovados não são alterados. Não há escala de grandes filtros de blur.
- Highlight pequeno com halo SVG percorre a curva existente, sem animar o traço principal ou usar dasharray contínuo. A curva é amostrada uma vez; coordenadas são atualizadas no resize, não a cada frame. O highlight usa transform/opacity e retorna à transparência.
- Somente quatro partículas existentes se movem: Y −10 a −19px; drift lateral −3/+4px. As demais continuam estáticas. Nenhuma partícula foi acrescentada.
- Efeitos ambientes pausam fora do viewport e com a aba oculta. Listeners, timers, tweens e ScrollTriggers são limpos no unmount e nas mudanças de preferência/breakpoint.

## Desktop e scroll

- Cursor somente em desktop com pointer fino e eventos de mouse: packshot limitado a X ±6px, Y ±5px; retorno amortecido de 0,9s ao sair. Sem tilt.
- Flores recebem 0,15x / 0,3x / 0,45x da resposta do cursor. A propriedade independente `translate` preserva as rotações aprovadas e é removida ao retornar à base.
- GSAP + ScrollTrigger, sem pin: ao sair do Hero, headline até −6px, produto até +5px, flores background/midground/foreground até −4/−8/−12px. Scrub 1,2s; retorno quando o scroll volta ao início.
- CTA principal: Y −1px, seta +4px, luz discreta. Secundário: border/glow e seta em fade. Sem escala. Rótulo acessível do secundário preservado.
- Lenis permanece somente na integração anterior, sem nova instância ou scroll-jacking.

## Mobile, reduced motion e sem JavaScript

Mobile mantém a entrada, glow muito suave e highlight lento. Não há cursor tracking, parallax de scroll ou movimento das partículas. A composição mobile não foi alterada.

Com `prefers-reduced-motion: reduce`, nenhuma timeline do Hero é criada; mudanças em runtime revertem os estilos. Sem entrada, cursor, parallax, highlight, partículas ou glow pulsante. Hovers não deslocam CTAs. A integração existente também desativa Lenis.

Sem JavaScript, o HTML/CSS apresenta imediatamente a arte aprovada; os dois novos efeitos decorativos têm opacity 0 por padrão.

## Regressão visual

Comparações contra `artifacts/vertical/direction-final/{width}-hero.png`:

| Viewport  | Pixels diferentes | Diferença média RGB | Erros JS |
| --------- | ----------------- | ------------------- | -------- |
| 1920×1080 | **0**             | **0**               | **0**    |
| 1440×1000 | **0**             | **0**               | **0**    |
| 390×844   | **0**             | **0**               | **0**    |

O repouso também é pixel a pixel idêntico à captura atual sem JavaScript nos três tamanhos. Caixas shell/artboard/headline/packshot/benefícios conferidas com limite de 0,25px; screenshots sem divergências.

No primeiro estudo mobile apareceu uma diferença de rasterização textual. A mesma diferença existia sem JavaScript. Reproduzir a sequência original (viewport → full-page → Hero) eliminou-a: era o pipeline de captura do Chromium, não alteração de fonte ou composição. O script final conserva essa sequência e falha se houver pixels diferentes.

Evidências autoritativas em `artifacts/vertical/motion-final/`:

- `review.html`: vídeos e comparação com labels **STATIC APPROVED | ANIMATED REST STATE**.
- `hero-motion-desktop.webm`, `hero-motion-mobile.webm`: gravações reais com GPU ativa.
- `{width}-rest-hero.png`, `{width}-rest-viewport.png`: repouso normal após entrada.
- `{width}-approved-vs-animated-rest.png`, `{width}-rest-diff.png`, `{width}-comparison.json`.
- `{width}-rest-geometry.json`, `{width}-current-no-js.png`, `{width}-no-js-vs-rest.json`.
- `1920-ambient-hero.png`: exemplo durante movimento, não baseline de repouso.

Arquivos com `study`/`amplified`, `390-reduce.png`, `390-noJS.png` e `performance-sample.json` são diagnósticos intermediários, não a comparação final.

## Performance e limitações

Passagem inicial encontrou custo excessivo ao animar glows filtrados e SVG grande. A passagem final manteve as camadas estáticas e isolou o highlight pequeno e o glow transparente, com `will-change` aplicado somente depois da entrada.

Em Chromium visível com **Intel UHD Graphics**, após warm-up, 180 intervalos rAF com ambiente ativo: **59,70Hz**, média **16,75ms**, P95 **16,8ms**, 1 intervalo acima de 25ms, **zero long tasks** e **zero erros JS**. Evidência: `performance-hardware-desktop.json`.

O Chromium headless desta máquina usa composição/rasterização por software: **8,50Hz** na mesma amostra (`performance-software-headless.json`). Esse ambiente não representa a aceleração gráfica desktop e não atende 60fps. Não há garantia universal de desempenho nem medição abrangente da entrada, cursor, scroll ou dispositivos móveis físicos; a amostra rAF não é um trace de frames GPU. Os vídeos foram gravados com GPU ativa, não no headless lento.

## Arquivos desta rodada

- `src/features/community/components/hero.tsx`: monta a camada de movimento e identifica ações; mantém o guard do controlador antigo para impedir animação duplicada.
- `src/features/community/components/scene.tsx`: efeitos decorativos transparentes por padrão.
- `src/features/community/components/hero-motion.tsx`: timelines, cursor, scroll, media queries e cleanup.
- `src/features/community/components/hero-motion.module.css`: camada de efeito, hover e reduced motion.
- `tests/e2e/hero-motion.spec.ts`: repouso, erros JS, reduced motion em runtime, limites do cursor/retorno e ausência de profundidade em touch.
- `scripts/capture-hero-motion.mjs`, `scripts/record-hero-motion.mjs`, `scripts/probe-hero-motion.mjs`.
- Este relatório e evidências em `artifacts/vertical/motion-final/`.

## Validação

- Typecheck: passou.
- Unit tests: **41 passaram**, 8 arquivos.
- Playwright: **20 passaram**, 4 skips deliberados de combinações desktop/touch redundantes ou inaplicáveis.
- ESLint e Prettier: passaram.
- Build de produção Next.js: passou.
- Captura final: repouso sem erros JS, nenhuma divergência de pixels nos três tamanhos.

Servidores de testes/captura usam Appwrite desconectado por variáveis do processo, sem editar env. Servidor do usuário em 3000 preservado. Nenhum commit; animação aguarda aprovação.
