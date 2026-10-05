# Reconstrução geométrica — NUY Creators

> **SUPERADO:** a prancha foi interpretada incorretamente como tela única. Colunas61/38 e os critérios geométricos deste relatório não definem mais a landing. Veja [delivery-vertical-landing.md](delivery-vertical-landing.md): hero-reference é a tela-alvo; application-reference é somente biblioteca de direção de arte.

## Medição ANTES de alterar o código da landing

Fonte: `Universo NUY_ Bem-Estar em Flor.png`, **1448×1086 px**, original preservado.

A arte inclui interface desktop, texto explicativo à direita e mockup mobile. A área desktop vai aproximadamente de x=20 a x=1245; o texto explicativo ocupa x=1270–1435. O telefone sobreposto em x=1200–1425 não é um componente do site desktop. Não reproduzir essas anotações como interface nem usar a arte completa no bundle.

| Elemento                   | Bounding box aproximada na fonte | Relação geométrica                                                   |
| -------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Coluna principal           | x20–764                          | 744px, ~61% da interface                                             |
| Coluna lateral             | x776–1245                        | 469px, ~38% da interface                                             |
| Gutter                     | x764–776                         | 12px (~1%)                                                           |
| Hero + header              | x20,y18,w744,h410                | altura/largura = .551; não hero full-screen                          |
| Logo                       | x39,y33,w54,h29                  | 19px da borda esquerda, 15px do topo                                 |
| Navegação                  | x136–466,y45                     | integrada ao hero; fonte ~8px na arte                                |
| Header CTA                 | x626,y32,w122,h28                | pill creme/dourado discreto                                          |
| Texto principal            | x63–455,y102–270                 | ~53% da largura do hero                                              |
| Título da fonte            | x63,y124,w390,h82                | 2 linhas na fonte, ~40–49px; nosso conteúdo obrigatório tem 3 linhas |
| CTAs hero                  | x63,y287,w315,h41                | botão primário174×41; secundário128×37                               |
| Produto/arquitetura/flores | x386–764,y65–428                 | ~51% do hero, frascos x518–662,y109–383                              |
| Rodapé do hero             | x61–565,y402                     | informações discretas sem separador pesado                           |
| Comunidade creme           | x20,y428,w744,h230               | continuidade colada ao hero, não seção full-width                    |
| Progresso escuro           | x20,y670,w744,h193               | gap12; título à esquerda, destaque à direita                         |
| Desafio lateral            | x776,y18,w469,h276               | começa na mesma linha do hero                                        |
| Recompensas creme          | x776,y306,w469,h272              | gap12                                                                |
| Ranking creme              | x811,y590,w353,h272              | inset35 na lateral, bouquet à direita                                |
| Campanha final             | x20,y876,w1225,h210              | full-bleed dentro da área desktop, gap13                             |

### Ornamentação, luz e massas

- Hero: flores pequenas violetas em x405,y127; brancas em x441,y183; bouquet denso creme/violeta em x394–748,y240–425; flores cortadas na borda esquerda y223 e no canto inferior esquerdo. Há blur seletivo na frente.
- Luz principal: âmbar atrás dos frascos em x510–666,y215–367; arco violeta em x460–740,y35–256; curvas douradas tangentes à base y367–413. O lado esquerdo mantém navy escuro para contraste do texto.
- Espaço negativo: principalmente atrás da copy e entre título/subtexto, não grandes áreas vazias acima e abaixo do hero.
- Raios: ~14px nos grandes painéis, ~9px em imagens internas; botões pill. Não usar radius40–60 em todos os blocos.
- Continuidade: hero/comunidade compartilham a borda da coluna; pétalas, folhas e trilhas cruzam os gutters. Arcos e recortes orgânicos são decorativos, não ondas genéricas entre todas as seções.
- Proporção aproximada das massas na interface (sem faixa explicativa): ~60% escuro/arte navy e ~40% creme/branco quente. É uma estimativa geométrica, não uma segmentação automática por cor.
- Alinhamentos: hero e desafio iniciam juntos; painel claro da comunidade começa quando hero termina; progressão e ranking terminam perto de y863; final une as duas colunas.

## Comparação inicial

Aplicação aberta em localhost:3000. Screenshots atuais antes de editar: `artifacts/visual/before/1440.png`, `1920.png` e páginas completas correspondentes. A landing anterior usa hero full-width de ~890–970px com header externo, produto enorme e muitas faixas verticais. Isso altera a silhueta inteira: a fonte exige uma **coluna hero/editorial de 61% com campanha lateral de 38%**, header dentro do painel e densidade maior. Esse é o erro estrutural principal a corrigir, antes de ornamentação ou animação.

## Protocolo de comparação

Serão preservadas capturas V1, V2 e V3. Overlays 50/50 e diferenças absolutas de cor não serão usados como pontuação de aceitação. O overlay integral inclui a faixa explicativa e o telefone da fonte, por transparência; comparação registrada adicional usa somente o hero da fonte (x20,y18,w744,h410), com a caixa HTML do hero normalizada à mesma dimensão. Conteúdo textual diferente continua visível como diferença; não é apagado para melhorar métricas.

Na comparação registrada da área desktop (1225×1068), o recorte HTML remove **somente o padding externo** do canvas, equivalente à margem de apresentação removida na referência. Usa resize contain, preservando proporção, sem esticar imagens ou mascarar conteúdos divergentes. O overlay integral não usa essa remoção e permanece disponível separadamente.

## Passadas realmente executadas

1. **Antes:** `artifacts/visual/before/` — capturas atuais e overlay inicial, evidenciando o hero full-width e escalas erradas.
2. **Hero V1:** `v1-hero/` — header integrado, proporção744/410, coluna61%, produto/flores da referência. Comparação mostrou copy abaixo do alinhamento e um rodapé rasterizado indevido no recorte.
3. **Hero V2/V3:** `v2-hero/`, `v3-hero/` — copy reposicionada; badges fictícios da arte removidos da imagem; arcos reduzidos; flores e bordas suavizadas. Só depois de rever o hero as demais seções foram reconstruídas.
4. **Layout V1:** `v1-layout/` — montagem das colunas, painéis claros, progressão e campanha final. Geometria medida detectou desafio24px, recompensas20px e comunidade12px mais altos que o target escalado em1440.
5. **Layout V2:** `v2-layout/` — alturas corrigidas, line-height de captions ajustado; overlay e comparativo desfocado reabertos.
6. **V3 estático/final:** `v3-static/`, `v3/` — escala do bouquet lateral corrigida, flores cortadas, folhagem em primeiro plano, assinatura manuscrita, cores amostradas e copy mais bem alinhada. Desktop final revisto em1440 e1920; mobile adaptado após essas passadas.

Movimento foi ajustado **depois** da validação estática. As capturas finais usam reduced motion e um servidor de produção isolado/desconectado, sem indicador Next dev nem edição de env. A primeira tentativa de servidor de captura através do PowerShell não preservou variáveis vazias e encontrou o guard existente de HTTPS; foi encerrada. O servidor foi reiniciado com valores vazios explícitos no processo Node, como no E2E, sem alterar a proteção ou arquivos locais. Captura em página de erro não é considerada evidência e o script agora recusa esse estado.

A inspeção final em1920 identificou ainda uma borda retangular da imagem, causada por object-fit dentro de uma caixa maior que o recorte visível. A caixa foi ajustada à proporção real do asset (42,6% da largura do hero); agora a máscara atua nas bordas da imagem e não no espaço vazio da caixa. Mobile recebeu ajuste correspondente. Build e toda a suíte foram reexecutados após essa correção, antes de regenerar V3.

## Geometria final observada

1440×1000: padding22/20, gutter14. 1920×1080: padding28/24, gutter18. Sem max-width que comprima a composição.

| Caixa HTML             | Em1440 (aprox.)     | Em1920 (aprox.)      |
| ---------------------- | ------------------- | -------------------- |
| Hero                   | x22,y20,w848,h467   | x28,y24,w1132,h624   |
| Coluna lateral/desafio | x884,y20,w534,h316  | x1178,y24,w714,h416  |
| Comunidade             | x22,y487,w848,h262  | x28,y648,w1132,h350  |
| Recompensas            | x884,y350,w534,h310 | x1178,y458,w714,h413 |
| Jornada                | x22,y763,w848,h223  | x28,y1016,w1132,h294 |
| Ranking                | x924,y674,w403,h306 | x1232,y889,w539,h407 |

JSONs de caixas reais estão em `artifacts/visual/v3/{1440,1920,390}-geometry.json`. Testes E2E agora também verificam proporção das colunas, aspect ratio do hero, topo hero/desafio e continuidade hero/comunidade.

## Assets e elementos reais

A referência original nunca é alterada ou importada pela aplicação. `scripts/extract-visual-assets.mjs` produz recortes de **regiões de arte**, não de painéis completos. Produto/arquitetura, bouquet, flor violeta, pétalas de borda, folhagem, flores da campanha, ambiente, produtos, ritual, bouquet lateral e retrato conceitual são imagens independentes em `public/brand/reference/`. Máscaras alpha eliminam bordas e strips com badges de atividade da fonte.

Header, navegação, títulos, textos, CTAs, painéis, galeria, níveis, linhas e estados vazios são HTML/SVG/CSS. Não há screenshot integral como background. Não há cards de usuários, pontos acumulados, likes, nomes de creators ou ranking copiados da arte. O retrato final pertence à referência e está explicitamente identificado como arte conceitual, não como creator publicado.

`Scene` aceita imageSrc/imageAlt para substituir a arte por packshots oficiais. Os recortes são de baixa resolução porque a fonte é um mockup1448×1086; a limitação fica visível em1920. Fontes Cormorant Garamond (serif), DM Sans (interface) e Caveat (assinatura manuscrita), todas WOFF2 locais com SIL OFL. Nenhuma fonte exige acesso externo em runtime/build.

Amostras de pixels da referência, antes dos ajustes finais: navyRGB(4,15,38), creme(248,240,230), dourado do botão(253,230,197). Tokens correspondentes: `#040F26`, `#F8F0E6`, `#FDE6C5`, mantendo violeta/lavanda/dourado de iluminação. Amostras são regiões pequenas e não uma promessa de igualdade global de cor.

## Movimento final

- GSAP: entrada do texto, produto surgindo com profundidade leve, bouquet entrando separado, imagens reveladas por máscara.
- ScrollTrigger: produto12px, bouquet–12px, pétalas–18px no desktop, glow diminuindo suavemente com scroll, trilhas desenhadas e caminho SVG dos níveis progredindo.
- Mobile: caminho SVG vertical próprio, scroll nativo, sem parallax/mouse. Hero mantém produto, flora, luz e serif.
- Lenis apenas na landing com ponteiro fino e sem reduced motion, integrado ao ticker GSAP. Cleanup ao navegar/trocar preferência. Cursor desloca a cena no máximo poucos pixels.
- Hover de imagens muito discreto, só com hover/fine pointer/no-preference. Não altera caixas do layout.
- Reduced motion mantém tudo visível sem animação; navegação e conteúdo funcionam sem JS. Áreas de toque dos CTAs principais≥44px, foco visível, ornamentos com alt vazio/aria-hidden.

## Evidência final

Todos os arquivos abaixo existem localmente, fora do bundle e ignorados pelo Git:

| Evidência                                          | Arquivo                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Original intacto                                   | `artifacts/visual-reference.png`                                       |
| Desktop1440×1000                                   | `artifacts/visual/v3/1440.png`                                         |
| Desktop1920×1080                                   | `artifacts/visual/v3/1920.png`                                         |
| Mobile390×844                                      | `artifacts/visual/v3/390.png`                                          |
| Páginas completas                                  | `artifacts/visual/v3/{1440,1920,390}-full.png`                         |
| REFERÊNCIA / HTML                                  | `artifacts/visual/v3/1440-application-side-by-side.png`                |
| Overlay50/50 registrado                            | `artifacts/visual/v3/1440-application-overlay.png`                     |
| Diff registrado                                    | `artifacts/visual/v3/1440-application-diff.png`                        |
| Grandes massas desfocadas                          | `artifacts/visual/v3/1440-application-masses.png`                      |
| Hero comparado isoladamente                        | `artifacts/visual/v3/1440-hero-{overlay,diff,side-by-side,masses}.png` |
| Comparação integral, sem remover anotação/telefone | `artifacts/visual-overlay.png`, `artifacts/visual-diff.png`            |

Scripts reproduzíveis em `artifacts/README.md`. Diff é diferença absoluta por canal RGB, sem threshold favorável, percentual de aprovação ou remoção de textos para elevar score. Overlays são precisamente média50/50.

## Diferenças que permanecem — não ocultadas

- Headline e branding obrigatórios são diferentes: três linhas “Crie. Compartilhe. Conquiste.” vs duas linhas do mockup. A posição/espaço da copy foi medido, mas os glifos e CTAs não podem ter igualdade pixel a pixel com texto diferente.
- O logo é tipográfico provisório; não foi obtido um logo oficial vetorial. A serif é uma aproximação do desenho da fonte, não identificação certificada da fonte usada no mockup.
- Galeria mostra arte, não os rostos, nomes, likes e números fictícios da fonte. Ranking está vazio. Jornada substitui o saldo/coroa de um usuário fictício por estágios aprovados, sem gamificação funcional.
- Alguns brilhos, arquitetura e flores permanecem juntos no recorte principal; foregrounds e luzes adicionais são camadas independentes. Não existem originais transparentes oficiais para separar cada frasco/pétala com qualidade de estúdio.
- O final usa um recorte mascarado do retrato e não o fundo inteiro da seção. Extensão do tecido/flores não é idêntica à fonte.
- Faixa explicativa e telefone de apresentação não são parte da página HTML. Isso explica diferenças grandes no diff integral; o diff registrado evidencia a área aplicável sem escondê-las.
- Manifesto, passos e FAQ ficam depois da composição desktop principal para manter conteúdo e funcionalidade. A fonte não traz essas seções completas; não são alegadas como reprodução do mockup.

Essas diferenças continuam visíveis nas evidências. Não se declara aprovação de marca, igualdade pixel-perfect global ou aceite final do usuário.

## Validação final

| Comando                                                  | Resultado                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| npm run typecheck                                        | passou                                                                     |
| npm run test                                             | 41 testes/8 arquivos passaram                                              |
| npx playwright test --config playwright.visual.config.ts | 14 passaram; 2 combinações desktop redundantes no projeto mobile excluídas |
| npm run lint                                             | passou                                                                     |
| npm run format:check                                     | passou                                                                     |
| npm run build                                            | passou                                                                     |

E2E de produção desconectado inclui os fluxos existentes, overflow nos três tamanhos, geometrias medidas, CTA touch, âncora, cleanup de movimento, troca para reduced motion e navegação/leitura sem JS. Não houve testes Appwrite ou Function builds, pois essa rodada não toca o backend.

## Escopo e arquivos

Nesta rodada: `src/app/page.tsx`, `src/components/layout/header.tsx` (variante editorial opcional), componentes públicos `hero`, `landing`, `levels-section`, `scene`, `public-motion`, `landing-fonts`, `landing.module.css`; `tests/e2e/landing-visual.spec.ts`; fontes Caveat/licença; assets em `public/brand/reference/`; scripts de extração/evidência; `artifacts/README.md`/ignore local; este relatório e nota histórica em `docs/delivery-visual.md`.

Trabalho anterior não commitado foi preservado. `.env.example` e `docs/delivery-appwrite-cloud.md` já tinham mudanças e não foram editados nesta rodada. Não houve alterações em Auth, Appwrite, banco, permissões, Functions, segurança, env ou infraestrutura. Nenhum dashboard/ranking financeiro/gamificação funcional foi construído.

Commit sugerido, não executado: `feat: reconstruct NUY landing geometry from visual reference`.
