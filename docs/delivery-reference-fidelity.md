# Rodada · Fidelidade à referência (mockup editorial)

Data: 2026-10-04 · Escopo: home pública (landing) · **Commit NÃO executado**

Referência: `C:\Users\rdeq1\Downloads\Mockup Editorial NUY Creators Regal.png` (1536×1024,
3 painéis). Copiada para `artifacts/round6/reference.png`. Painel desktop `x 0–866`,
painel médio `x 892–1396` (mesma página, render ~1920), painel mobile `x 1404–1536`
(mockup de device — reproduzir só o conteúdo da tela).

Escala painel→1920: desktop ×2,217 · médio ×3,80.

## Geometria da referência (altura : largura, aplicado a 1920)

| Seção               | Ref (proporção) | Ref @1920 | Atual         | Ação                |
| ------------------- | --------------- | --------- | ------------- | ------------------- |
| 01 Hero (com faixa) | 395/866 = 0,456 | ~876px    | 1080 (100svh) | artboard 1600×730   |
| 02 O projeto        | 170/866 = 0,196 | ~377px    | 407           | ~manter             |
| 03 Como funciona    | 185/866 = 0,214 | ~410px    | 452           | −10%                |
| 04 Para quem é      | 135/866 = 0,156 | ~299px    | 452           | 4 colunas           |
| 05 Benefícios       | 139/866 = 0,160 | ~308px    | 366           | 2×3 col-major       |
| 06 Jornada          | 255/504 = 0,506 | ~968px    | 391           | +148%               |
| 07 Experiências     | 210/504 = 0,417 | ~800px    | 852           | ~manter             |
| 08 FAQ              | 246/504 = 0,488 | ~930px    | 521           | +78% (linhas ~96px) |
| 09 CTA              | ~210/504 = 0,42 | ~805px    | 664           | +21%                |
| 10 Footer           | ~98/504 = 0,194 | ~372px    | 210           | +77%                |

## Divergências objetivas (referência → implementação)

1. **Ritmo**: navy roda contínua Como→Para-quem→Benefícios→Jornada (sem divisórias
   duras); flores atravessando fronteiras em todos os pontos de contato; ranhuras
   hero→projeto (fio dourado ondulado), projeto→como (reta + anel dourado à direita
   do centro), jornada→experiências (costura + flores cruzando à direita).
2. **Headline violeta-lavanda** (não branca); "Bem-vinda ao" ~87px / "NUY CREATORS"
   ~111px @1920 → artboard 4,53cqw / 5,78cqw (atual 101/124); coluna de copy com
   inset ~10,6% (~204px; atual 111px); body ~24px com as 3 quebras da referência;
   kicker ~12,5px; assinatura discreta ~13px.
3. **Buttons**: pílula primária ~335×82 (atual 399×100); "Entrar" = pílula escura
   SÓLIDA com borda (atual ghost transparente).
4. **Header**: logo a ~17,4%w (330px; atual 312 ✓ próximo), nav rente ao logo
   26,8–50,5% (atual 18–46% cedo demais e fontes maiores), underline fino sob
   "O projeto", cluster direito até ~94,4% (atual ~86%).
5. **Faixa do hero**: ícones de linha SEM círculos (~22px), rótulos ~14px,
   separadores verticais hairline visíveis, faixa de ~10,5% até ~80% da largura
   (atual 5,2–95%, sem separadores perceptíveis).
6. **Cena do hero** (garrafas 69–84%w, base ~76,5% da altura, script 83–96%w a
   23–42% de altura, arco escuro 81–96%w, massa de flores 51–72%w, leito de
   flores descendo até a faixa): cena mais central e menor (~26%w de garrafas),
   fundo com radiação quente e roxa (menos uniforme), órbitas douradas
   atravessando a cena; nossa máscara em "janela" vira feather assimétrico.
7. **Como funciona**: 4 passos EM UMA LINHA à direita (título ~30% à esquerda);
   fita entra pela borda inferior-esquerda e sai à direita (atravessa a seção),
   passando PELOS nós: círculos finos com glifo-flor acima de cada passo
   (n1 37,7%/34%, n2 50,7%/30%, n3 68,5%/39%, n4 84%/35% da seção); número
   dourado à ESQUERDA do título (não acima).
8. **Para quem é**: 4 ENTRADAS EM COLUNAS (ícone em círculo fino com linha à
   esquerda + título + microcopy, texto esquerdo); colunas de ~34%→96%w;
   segunda linha do título violeta; entidade inferior esquerda com flor
   atravessando.
9. **Benefícios**: 2 colunas × 3 itens COLUNA-MAJOR (col1: Desafios criativos /
   Produtos e kits / Conteúdos e novidades; col2: Pontos NUY / Experiências
   exclusivas / Comunidade NUY); 2ª linha violeta; flor na base esquerda + pétalas
   à direita.
10. **Jornada**: seção alta (~968px); título topo-esquerda; 5 nós em diagonal
    ascendente espalhados na largura (x 11,7/30,3/48,8/67,4/84,4%w; centros
    73,5/64,2/59,3/52,6/48,2% da seção), nós levemente crescentes, nomes +
    "NUY"; fio atravessa os nós com glow; arco de piso dourado na base; bloom
    no topo-direita e flores na base-direita; glow violeta.
11. **FAQ**: linhas ~96px (atual ~65px), título branco (sem violeta), coluna de
    perguntas de ~38,5% a ~87%w; anel dourado na base-esquerda.
12. **CTA**: ~805px; retrato maior, centro-direita, topo derretendo no navy
    ANTES da seção (cabelo invadindo a zona do FAQ); anéis dourados ao redor da
    cabeça; trail fino; texto 3 linhas serif; botões sobre o feather da foto.
13. **Footer**: ~372px (lockup esquerda + frase central "Pequenos momentos. /
    Novas possibilidades." + links direita; hairline; linha inferior com ©,
    Privacidade, Termos e **"Crie com presença."** à extrema direita — restaurar).
14. **Padrão de títulos**: segunda linha em VIOLETA em todas as seções (exeeto
    FAQ, que é toda branca).
15. **Navy com radiação violeta** (o navy da ref é mais claro/violeta; o nosso é
    uniforme escuro) — via washes por seção, sem trocar tokens globais.
16. **Mobile**: hero com CENA primeiro (garrafas+flores+script ~45% da altura),
    depois kicker, headline, body, 2 CTAs full-width empilhados, benefícios
    verticais com ícones linha + separadores; projeto com leito de flores na
    base e borda curva; como com rail vertical à esquerda (nós-flor).
17. **Textos de desenvolvimento** (`figcaption` "Inspiração visual…" e
    `finalArtNote`) não podem aparecer na experiência final.

## Evidências pré-implementação

- Comparativos lado a lado: `artifacts/round6/comparison-*.png` (12).
- Magnificações da referência: `artifacts/round6/ref-*.png` (17).
- Probes: `scripts/probe-ref.mjs` (perfil por linha), `scripts/probe-pill.mjs`
  (pílulas), `scripts/probe-scene2.mjs` (cena por coluna), `mag-region.mjs`.

_Commit NÃO executado (aguardando aprovação visual)._
