# Hero: direção de arte com geometria congelada

## Escopo

Somente acabamento do hero/header: luz, cor, serif, lettering NUY existente, flores, órbitas, máscaras egrain. Nenhuma reorganização estrutural ou alteração das regras responsivas aprovadas. `hero-reference.png` é a fonte exclusiva. Não foi usada a prancha como geometria, nem o hero inteiro como background.

Hero permanece estático com `data-static-artboard`. Nenhuma animação adicionada. Outras seções, footer, Appwrite, Auth, env, backend, Functions, banco epermissões não foram editados. Nenhum commit executado.

## Geometria congelada

Baseline: `artifacts/vertical/artboard-final/{1920,1440,390}-geometry.json`. Cada captura desta rodada compara x/y/w/h dos cinco elementos aprovados com esse baseline eaborta em desvio>0.25px.

Shell1920×993.59375; artboard1766.390625×993.59375, x76.8046875. Headlinex179.2421875,y251.375,w900.84375; packshotx1083.6484375,y139.09375,w759.546875,h854.484375; benefíciosx168.6484375,y921.734375,w1586.234375.

Os deltas finais sãozero para shell, artboard, packshot ebenefícios. Headline mantémx/y/w evaria–0.015625px de altura (arredondamento subpixel da altura fixa durante a troca de fonte). Os testes também exigem essas caixas aprovadas, além da proporção1600/900 e ausência deoverflow mobile.

Provas: `artifacts/vertical/direction-final/1920-geometry-freeze.json`, `1440-geometry-freeze.json`, `390-geometry-freeze.json`, com geometrias reais correspondentes.

## Duas passadas executadas

### Passada A — luz, cor, integração

Pasta `artifacts/vertical/direction-pass-A/`, capturada emdev3000 comreduced motion:

- mapa de iluminação com cinco camadas independentes;
- headline lavanda/rosa `#E7D7F1`;
- feather horizontal/vertical ebrightness sutil do packshot;
- comparação visual, grayscale, blur32, histograma eluminância por regiões.

Diagnóstico: centro próximo da referência; direita ebase ainda com luminância inferior. Não houve clareamento uniforme do shell.

### Passada B — tipografia, flores, órbita, detalhes

Pasta `artifacts/vertical/direction-pass-B/`, seguida da captura deprodução limpa em `direction-final/`:

- Bodoni Moda escolhida após teste real lado a lado com Cormorant, não por troca automática;
- caixa do headline congelada; apenas desenho tipográfico, corpo relativo, tracking epeso ajustados;
- duas massas claras dirigidas, uma atrás do espaço entre frascos eoutra emprimeiro plano na base;
- órbita SVG comgradiente ao longo da curva, stroke nítido eblur largo por trás, curva secundária ereflexo inferior;
- luz quente/creme e rosa-violeta na base refinada;
- lettering NUY recortado da arte disponível, alpha extraído do fundo, comCREATORS discreto ao lado; nenhum lettering inventado;
- CTAs creme/outline, bordas leves, benefícios eícones lineares refinados;
- grain em2.7% deopacidade, sem animação.

## Mapa de iluminação

| Camada        | Posição artística (não altera caixas aprovadas) | Função                                             |
| ------------- | ----------------------------------------------- | -------------------------------------------------- |
| productViolet | x44%,y5%,w60%,h80%                              | ambiente violeta atrás dos produtos                |
| productCream  | x43%,y55%,w64%,h43%                             | quente/creme na base, blend screen                 |
| centralLilac  | x34%,y28%,w42%,h61%                             | separação das flores centrais                      |
| upperHalo     | x29%,y–7%,w70%,h53%                             | profundidade azul-violeta superior                 |
| edgeVignette  | periferia do artboard                           | navy preservado nas bordas, sem escurecer o centro |

Arcos ewarmFloor são camadas adicionais deacabamento. Não são gradiente global tentando forçar um histograma. Packshot usa máscara intersectada, luz atrás eflores emfrente; blend screen fica nas luzes, não lava o preto do rótulo.

## Comparação de fontes elogo

`artifacts/vertical/direction-type-study/reference-cormorant-bodoni.png`: referência / Cormorant / Bodoni, nessa ordem. Bodoni trouxe capitulares retas econtraste alto mais próximos da fonte. A versão final usa Bodoni Moda400, primeira linha5.3cqw, segunda6.45cqw, tracking–0.038em, apenas no desktop doHero. Cormorant permanece nas demais seções eno mobile, preservando sua composição. Fonte hospedada localmente (`public/fonts/bodoni-moda-regular.ttf`) comlicença SIL OFL; nenhum fetch emruntime/build.

O logo não é arquivo oficial vetorial novo. É o lettering NUY existente na referência, reutilizado sem redesenhar glifos, comresolução original limitada. O branco tem alpha calculado para remover o fundo navy. `scripts/extract-artboard-assets.mjs` reproduz os recortes e máscaras. Novo bloom é recorte isolado da imagem floral existente, não fotografia oficial.

## Diagnóstico final de luminância

Valores deluminância linear média Rec.709, escala0–1. Regiões fixas doframe normalizado1920×1080, incluindo faixas deregistro. Base sobrepõe os três terços; método eversão codificada0–255 também estão noJSON.

| Região   | Referência | Passada A | Final B |
| -------- | ---------- | --------- | ------- |
| Esquerda | 0.1033     | 0.0996    | 0.1006  |
| Centro   | 0.1505     | 0.1420    | 0.1483  |
| Direita  | 0.2100     | 0.1775    | 0.1985  |
| Base     | 0.1561     | 0.1342    | 0.1558  |

O bin RGB navy mais frequente foi de40.19% noframe aprovado anterior para31.50% nesta rodada; referência25.54%. Isso édiagnóstico, **não** percentual de“navy total”, meta forçada ou score deaceite. As massas são avaliadas visualmente nos arquivos blur egrayscale.

## Evidência final

Pasta única atual: `artifacts/vertical/direction-final/`.

- `hero-reference-vs-final.png`.
- `hero-blur-comparison.png` (32px).
- `hero-reference-grayscale.png`, `hero-final-grayscale.png`, `hero-grayscale-comparison.png`.
- `region-header-comparison.png`, `region-headline-comparison.png`, `region-packshot-comparison.png`, `region-flowers-comparison.png`, `region-light-comparison.png`, `region-benefits-comparison.png`.
- `color-histogram-final.json`, `luminance-regions.json`.
- `geometry-final-1920.json`, `geometry-final-1440.json`, `geometry-final-390.json`, `*-geometry-freeze.json`.
- `hero-final-1920.png`, `hero-final-1440.png`, `hero-final-390.png`.

Sempre referência à esquerda, HTML à direita. Resizecontain sem distorção, mesmas coordenadas decrop emambos osframes, sem remover conteúdos divergentes para elevar similaridade. JSONs registram coordenadas, método evalores reais. Referência original preservada.

Captura final emservidor deprodução isolado/desconectado3101, sem indicadorNext dev. Variáveis vazias apenas noprocesso, não emenv no disco; dev3000 preservado. Script `node scripts/capture-vertical-landing.mjs direction-final http://localhost:3101`.

## O que ainda difere

A direita continua ligeiramente menos luminosa que areferência. As órbitas são vetoriais reconstruídas, não a curva rasterizada idêntica. Fonte escolhida éaproximação, não identificação certificada daoriginal. Logo eraster deprodutos/flores têm baixa resolução. Recortes dewhite bloom repetem parte daarte e algumas bordas são suavizadas por máscara. Textos/nomes mudam osglifos. A geometria congelada doartboard preserva osinsets já aprovados, diferentes doframefonte. Não há declaração deigualdade pixel-perfect nemaceite visual automático.

## Validação earquivos

Typecheck passou;41 testes unitários/8 arquivos passaram;14 Playwright passaram,2 combinações desktop redundantes noprojeto mobile excluídas; ESLint, Prettier ebuildNext passaram. Passadas mantidas para inspeção, não só screenshots finais.

Código alterado: `hero-artboard.module.css` (acabamento, sem modificar regras do shell/artboard/anchors); `scene.tsx` (camadas); `hero.tsx` (variável da fonte); `landing-fonts.ts` (export local usado somente noHero); `header.tsx` (logo somente na variante editorial); testevisual; scripts decaptura/extração/estudo. Assets: Bodoni/licença, `nuy-wordmark-art.png`, `hero-white-bloom.webp`.

`.prettierignore` ganhou apenas `artifacts/**/*.rar`: oarquivo binário preexistente `artifacts/vertical/vertical.rar` fez Prettier falhar tentando lê-lo como texto. Oarquivo foi preservado, não removido/alterado. Esse ignore não exclui osJSONs ou relatórios gerados das verificações deformatação.
