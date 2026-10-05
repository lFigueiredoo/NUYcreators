# NUY Creators — direção visual da landing

> Histórico da primeira rodada. A instrução anterior de não buscar pixel-perfect foi revogada. A reconstrução atual, medições, três passadas e evidências comparativas estão em [visual-reconstruction.md](visual-reconstruction.md); esse documento novo prevalece para o target visual atual.

## Diagnóstico antes da reformulação

Referência principal inspecionada: `Universo NUY_ Bem-Estar em Flor.png`. O nome do produto digital permanece **NUY Creators**.

Aplicação existente aberta em localhost:3000, sem interromper o servidor do usuário. Capturas Playwright antes de alterar: 1440×1000, 1920×1080 e 390×844, viewport e página completa. Preservadas em `playwright-report/visual/before-*` (arquivos locais ignorados pelo Git).

- **Composição:** a referência integra produtos, flores, arquitetura e luz; a landing mantém texto e uma pequena imagem oval isolados em duas colunas.
- **Escala:** em 1920px sobra muito navy uniforme; o produto perde presença e as seções se tornam faixas longas, pouco conectadas.
- **Hero:** recorte muito mascarado, órbitas geométricas e flores vetoriais simples dão aparência de template, não de campanha NUY.
- **Paleta:** navy pouco violeta, creme uniforme e quase nenhuma luz dourada. Falta contraste entre planos iluminados e profundos.
- **Tipografia:** Georgia e Arial não oferecem o refinamento editorial da referência. Títulos fortes, mas sem personalidade suficiente.
- **Profundidade/ornamentação:** praticamente restritas ao hero. Faltam flores em primeiro plano, curvas luminosas, textura e detalhes nas transições.
- **Ritmo:** alternância previsível entre faixas claras/escuras, com os mesmos títulos e linhas horizontais em quase toda seção.
- **Elementos genéricos:** estados vazios repetidos (ícone + título + texto), três colunas idênticas de passos, experiências em painéis genéricos e CTA final com um asterisco gigante.
- **Campanha/recompensas/comunidade:** pouca imagem e direção de arte; parecem blocos institucionais. A referência tem conteúdo com grande presença visual.
- **Mobile:** texto empilhado acima de arte pequena; perde a sensação de cena floral integrada que o mockup mantém.

## Limites

Somente apresentação pública, assets e testes visuais. Não alterar Appwrite, Auth, infraestrutura, env, permissões, Functions ou rotas protegidas. Não inventar participantes, campanhas ativas, recompensas ou resultados. Assets derivados da referência são conceituais, não packshots/fotografias oficiais. Backend permanece responsável pelas faixas dos níveis.

## Reformulação realizada

- Hero com produto em grande escala, integrado ao fundo navy/violeta; arco, luz radial, trilhas douradas, textura procedural discreta, pontos de luz e flores em planos diferentes. Texto e CTAs solicitados preservados.
- Manifesto creme com título editorial amplo, espaço negativo e flor surgindo na transição. Texto solicitado aplicado.
- Como funciona com quatro etapas, números grandes e deslocamentos assimétricos; sem quatro cards iguais.
- Destaque tratado como estudo visual de campanha, não uma campanha ativa. Prazo e pontos explicitamente a anunciar/definir; aviso de pré-lançamento e link à rota existente.
- Níveis em trajetória luminosa, halos e símbolos progressivos; vertical no mobile. Nomes de marca aprovados aparecem mesmo sem faixas disponíveis, mas nenhuma regra ou pontuação é inventada.
- Recompensas em tríptico assimétrico: composição de produto, ilustração de ritual e texto editorial. Catálogo em breve, sem ofertas fictícias.
- Comunidade em collage, com ilustração floral, tipografia e natureza-morta em CSS. Sem fotografias de pessoas, nomes ou números inventados; placeholders identificados.
- Ranking vazio com tratamento premium e o texto “O ranking começa com a comunidade.”
- FAQ preservado. CTA final com texto solicitado, flores em primeiro plano, luz violeta e curvas douradas.
- Header e footer mantêm comportamento/rotas; recebem apenas apresentação escopada à landing. Auth e demais páginas não herdam a nova família tipográfica nem as novas regras editoriais.

## Tipografia e paleta

**Cormorant Garamond** (serif editorial, normal e itálico verdadeiro) + **DM Sans** (interface). Fontes variáveis WOFF2 Latin hospedadas localmente via next/font/local, com acentos portugueses, display swap e licenças SIL OFL em `public/fonts/`. Sem requisições a Google Fonts no navegador e sem dependência de download de fontes no build. Os arquivos WOFF2 substituem os TTF completos usados na primeira iteração.

Tokens centralizados em `landing.module.css`, inclusive para os SVGs botânicos:

| Uso           | Valores          |
| ------------- | ---------------- |
| Navy          | #071632, #0B1D3A |
| Violeta       | #6046A8, #8062CC |
| Lavanda       | #C8B8EA          |
| Creme         | #F6F0E7, #EFE5D8 |
| Dourado       | #C9A66B, #D9BF8B |
| Branco quente | #FBF9F5          |

Os detalhes usam color-mix a partir desses tokens. Não houve mudança em globals.css, botão compartilhado, root layout ou design de Auth.

## Movimento e acessibilidade

- GSAP/ScrollTrigger: entrada escalonada do texto do hero, produto entrando em escala suave, flores em camadas, parallax leve somente no desktop, resposta discreta ao mouse, textos/números revelados, imagens entrando por máscara e trilhas SVG desenhadas.
- Trajetória dos níveis desenhada no scroll, horizontal no desktop e vertical no mobile.
- CSS: glow respirando, partículas pulsando, botões com deslocamento de seta, collage/painéis com elevação e rotação mínima apenas em dispositivos com hover.
- Lenis somente na landing, apenas com ponteiro fino e sem reduced motion; integração com o ticker GSAP e ScrollTrigger. Mobile conserva scroll nativo. Âncoras mantêm href funcional.
- Cleanup de listeners, ticker, instância Lenis, tweens de cursor e contextos GSAP ao navegar ou trocar a preferência.
- Reduced motion elimina animações/transições e Lenis. Conteúdo não depende de JS para aparecer; ornamentos são decorativos para leitores de tela. Focus visible, controles com tamanho mínimo de toque e estrutura semântica preservados.
- Testado funcionamento de âncora por teclado sem JavaScript; corrigido espaçamento acessível entre nome do nível e “NUY” no mobile.

## Segunda rodada de refinamento

Os screenshots da primeira implementação foram reabertos e comparados à referência. Refinamentos efetivamente aplicados, não apenas planejados:

1. Mobile inicialmente mostrava o produto tarde demais: título/espaçamentos e altura da cena foram recalibrados para trazer os frascos ao primeiro viewport de 390×844.
2. Flores inicialmente arredondadas demais: pétalas foram redesenhadas, com pontas, nervuras, folhas e gradientes creme/violeta mais botânicos.
3. Em 1920px, flores de fundo encostavam no título: reposicionadas e reduzidas.
4. Legenda conceitual recebeu tamanho maior e contraste no desktop.
5. Fontes substituídas por WOFF2 locais, com itálico editorial real.

Resultado comparado visualmente nos três tamanhos: cena mais dominante, navy mais profundo, luz dourada, flora e serif compartilhando a linguagem da referência. O layout mantém o conteúdo honesto e editorial em vez de reproduzir o dashboard com pessoas/atividade fictícia presente no mockup. Não é alegada fidelidade pixel-perfect.

## Screenshots

Diretório local: `playwright-report/visual/`.

- Antes: `before-hero-1440x1000.png`, `before-hero-1920x1080.png`, `before-hero-390x844.png`; páginas completas `before-{largura}x{altura}.png`.
- Primeira iteração: `pass1-*`; refinamento mobile intermediário: `pass2-hero-390x844.png`.
- Final: `after-chromium-1440x1000-hero.png`, `after-chromium-1920x1080-hero.png`, `after-chromium-390x844-hero.png`; páginas completas sem o sufixo `-hero`.
- Mobile com emulação touch/DPR: `after-mobile-390x844-hero.png` e `after-mobile-390x844.png`.

Snapshots finais usam reduced motion para captura determinística e completa. Movimento foi validado em teste separado, com a preferência normal e troca de preferência em runtime. Os screenshots são evidências locais, não baselines pixel-diff aprovadas.

## Validação

| Validação  | Resultado final                                                                 |
| ---------- | ------------------------------------------------------------------------------- |
| Typecheck  | passou                                                                          |
| Vitest     | 41 testes, 8 arquivos, passaram                                                 |
| Playwright | 14 passaram; 2 combinações desktop no projeto mobile intencionalmente excluídas |
| ESLint     | passou                                                                          |
| Prettier   | passou                                                                          |
| Next build | passou                                                                          |

Comando E2E: `npx playwright test --config playwright.visual.config.ts`. Esse arquivo usa uma porta independente (3100), o mesmo ambiente desconectado do E2E existente e dois workers, sem editar a configuração original ou o env do usuário. Inclui os testes existentes de rotas/estados vazios e novos testes de viewport, overflow, área de toque, âncoras, cleanup de movimento e leitura sem JS.

Na primeira tentativa houve timeout ao rasterizar screenshots desktop sob emulação mobile de DPR elevado. As combinações redundantes foram excluídas: desktop continua coberto em 1440/1920, mobile em 390. Depois, o teste sem JS identificou falta de espaço semântico no título de nível mobile; o componente foi corrigido e a suíte foi reexecutada. Não foi mascarada uma falha funcional com retries.

Não houve execução de integração Appwrite, provisionamento ou Function builds nesta rodada exclusivamente visual. Nenhum desses sistemas foi modificado. Não se afirma validar autenticação conectada ou produção do backend com esses E2E desconectados.

## Arquivos desta rodada

```text
src/app/page.tsx
src/features/community/components/landing.tsx
src/features/community/components/hero.tsx
src/features/community/components/how-it-works.tsx
src/features/community/components/levels-section.tsx
src/features/community/components/public-motion.tsx
src/features/community/components/landing.module.css
src/features/community/components/landing-fonts.ts
src/features/community/components/botanical.tsx
src/features/community/components/scene.tsx
public/fonts/cormorant-garamond-latin.woff2
public/fonts/cormorant-garamond-italic-latin.woff2
public/fonts/dm-sans-latin.woff2
public/fonts/OFL-Cormorant-Garamond.txt
public/fonts/OFL-DM-Sans.txt
tests/e2e/landing-visual.spec.ts
playwright.visual.config.ts
docs/delivery-visual.md
```

Edições pré-existentes em `.env.example` e `docs/delivery-appwrite-cloud.md` não pertencem a esta rodada e foram preservadas. Não incluir automaticamente em um commit visual.

## Pendências de direção de arte

- Packshots oficiais em alta resolução, fotos lifestyle, logo final e conteúdos autorizados de creators ainda necessários. O recorte original tem texto rasterizado e resolução limitada; não é tratado como fotografia oficial ou material final de campanha.
- `Scene` aceita imageSrc/imageAlt para substituir o asset conceitual sem refazer a composição. Legendas conceituais devem ser revisadas junto com a entrega dos assets oficiais.
- Não há campanhas, catálogo ou ranking reais nesta apresentação. Os avisos de pré-lançamento devem permanecer até integração pública apropriada em rodada separada.
- Não foi realizada auditoria externa de acessibilidade, Lighthouse ou aprovação de marca; os resultados acima são verificações locais observadas.

Commit sugerido, não executado: `feat: align NUY Creators landing with floral editorial reference`.
