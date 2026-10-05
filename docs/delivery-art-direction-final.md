# Rodada · Direção de Arte Final (A1–A15)

Data: 2026-10-04 · Escopo: 35 seções do brief de polimento final

> Objetivo do brief: "fazer o que já existe parecer CARO, ACABADO e INTENCIONAL" —
> sem novas features, sem backend, sem Auth, sem Appwrite, sem redesenhar a
> arquitetura da página. **Commit NÃO executado** (item 34) — o trabalho segue
> no working tree para revisão.

## Refinamentos por seção

| Seção                    | O que mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hero (A1–A4)**         | Textos técnicos ("Composição conceitual…") removidos da UI pública — notas só em `isDevelopment`; lockup NUY dominante + CREATORS imediatamente abaixo (~10px, tracking alto, alinhamento tinta↔tinta); menu rente ao brand; kicker ganhou ar sobre a headline e a headline sobre o body; body em 3 linhas composadas com max-width menor; botões refinados (Entrar com presença menor); benefícios inferiores subidos (`hairlines`, ícones leves, afastados do pé do viewport); flor esquerda 8–12% fora da viewport com feather maior e segunda camada atrás; composição direita com mask/fade/overflow refinados; transição hero→projeto em fio de ouro com opacidade 0.32, amplitude ±3px. |
| **O projeto (A5)**       | Flor como massa floral natural (nuvem com máscara elíptica emplumada, sangramento −7% fora da viewport); estrela ✧ violeta; parágrafo principal em 1.85/48ch + frase menor 14px/0.78 abaixo — hierarquia de prosa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Como funciona (A6)**   | SVG refeito como **fita caligráfica única e fluida** (um path orgânico que costura os passos, sem contornar caixas nem cantos); passos com número dourado → título serif → texto sans, parágrafos estreitos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Para quem é (A7)**     | Presença por interação: hover/focus desloca o nome 5px, desenha fio violeta→dourado, microcopy das 4 audiências exatamente como o brief pede, glow discreto atrás do item ativo — sem caixas; mobile vira accordion leve (tap abre a microcopy alinhada ao item).                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Benefícios (A8–A9)**   | Ícones em círculo hairline com luz quase imperceptível; hover dá luz ao ícone, desliza o título 2px e ganha contraste na descrição — sem cards; seção compactada −10,5% (409→366px) para o bloco ler como um gesto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Jornada (A9)**         | Linha redesenhada como **feixe de luz**: 3 camadas de stroke compartilhando o mesmo trajeto (penumbra larga 3.2px/blur 3px, halo médio 1.5px, núcleo fino 1px + drop-shadow); progressão Exploradora→Ícone em luminosidade (halos violeta 10→25% e glifos violeta→ouro); nenhum indicador de nível atual; breathing sutil de 5.2s alternando opacidade 0.87↔1; conector mobile vertical com as mesmas duas densidades.                                                                                                                                                                                                                                                                         |
| **Experiências (A10)**   | "Janela em arco" eliminada; cena editorial: texto ~45% à esquerda, massa emplumada à direita sangrando −5% além da grade com máscara elíptica, glow atrás (morre antes das bordas), arco dourado fino com pontas derretidas por máscara; densidade preservada (base exibida 643px ≤ bitmap 688).                                                                                                                                                                                                                                                                                                                                                                                               |
| **FAQ (A11)**            | Largura da coluna estreita para 660px (leitura de revista); título "Conversas / que esclarecem." em line-height 1.05; item hover com hairline violeta; item aberto: summary em luz plena, plus a 45°, fio gradient violeta→dourado no lugar do border neutro, sem fundo de caixa.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **CTA final (A12)**      | Segunda peça de campanha: retrato 124% da coluna, máscara assimétrica elíptica (centro 58%/44%, feather 34→80) — o contorno fotográfico some no navy, sem retângulo nem "janela oval"; fio dourado (trail) erguido ~15 unidades para não raspar o botão outline.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Footer (A13)**         | Mesmo lockup do header; brand à esquerda, frase central em grade `1fr auto 1fr` (offset 0 confirmado), links à direita; linha inferior só com copyright + Privacidade/Termos (a frase "Crie com presença." saiu).                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Textura/tokens (A14)** | Noise ~1.5% (feTurbulence 0.024) nos blocos navy; 9 tokens semânticos `--nuy-*` promovidos ao `:root` do globals com valores idênticos à paleta publicada (zero diff visual) + `--nuy-noise`; microanimações de hover/reveal/linha/FAQ/níveis mantidas.                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Bugs encontrados e corrigidos no QA final

1. **Retrato do CTA ausente nas entregas** — não era bug do site: `loading=lazy`
   não pinta no `fullPage` do Playwright quando a página nunca rolou. O script de
   captura agora força `loading=eager` + `decode()` antes de fotografar.
2. **Benefícios em 2 colunas no mobile (CORTADO na borda direita em 430/390/375)** —
   regra real: o desktop `.flow > .benefits` (0,2,0) vencia o media block `.benefits`
   (0,1,0); o `grid-template-columns: 1fr` do mobile nunca aplicava. Fix: o media
   block usa `.flow > .benefits`. Verificado magnificado em 390.
3. **Cluster de pétalas "flutuando" na cena de Experiências** (borrão oval sobre o
   creme, com risco vertical) — overlay removido; a massa emplumada fica limpa.
4. **Arco dourado começando do nada no ar** — pontas do `sceneArc` derretem com
   máscara linear (8% nas pontas).
5. **Fio dourado do CTA raspando o botão outline "Já tenho uma conta"** — path do
   trail erguido no trecho central (137→120 na unidade 774).
6. **Mask do CTA com leitura de "janela oval" no topo** — feather alongado
   (42→89 virou 34→80, centro 40%→44%): o conteúdo brilhante do topo derrete
   antes da borda do elemento.
7. **Sweep de lazy-load travando o capture** (duas rodadas, sempre em 1024) —
   resolvido eliminando o scroll sweep (eager resolve) e documentado no script.

## Entregáveis (`artifacts/delivery/`)

- `a15-full-{1920,1600,1440,1366,1280,1024,768,430,390,375}.png` — full-page nas
  10 larguras, `scrollWidth ≤ innerWidth` em todas.
- `a15-secao-{hero,projeto,como-funciona,para-quem,beneficios,niveis,experiencias,faq,cta,footer}-1920.png`
  — crops por seção.
- `a15-mag-*.png` — magnificações de verificação (topo do CTA, botões do CTA,
  benefícios @390, borda direita da cena, pétalas removidas).
- Rodadas intermediárias de evidência por item (a7-a14, ~70 arquivos).

## Verificações (build final)

| Checagem                                           | Resultado                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                     | limpo                                                                                                                                                                                                                                                                             |
| vitest                                             | 44 passed (44)                                                                                                                                                                                                                                                                    |
| eslint (arquivos tocados)                          | limpo                                                                                                                                                                                                                                                                             |
| prettier                                           | aplicado                                                                                                                                                                                                                                                                          |
| `next build`                                       | ✓ Compiled successfully                                                                                                                                                                                                                                                           |
| Playwright (produção, playwright.visual.config.ts) | **46 passed / 12 skipped / 0 failed (1.7m)** — inclui 4 gates novos da rodada: fios×texto, lockup, upsampling, clipping + devPhrases + ritmo(7 tetos) + fold/grid/overflow (7 larguras) + 18 checks visuais com as constantes aprovadas (headline 25.9%, benefícios 981.98/36.47) |

## Apontamentos

- Larguras não inspecionadas pixel a pixel (1600/1366/1280/1024) ficam cobertas
  pelos gates E2E de dobra/grade/overflow no build final.
- Servidores: produção temporária :3100 encerrada ao final da rodada; o dev do
  usuário em :3000 nunca foi tocado (seguindo rodando).
- Sem commit (item 34 do brief).
