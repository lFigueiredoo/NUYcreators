# Correção: landing vertical, não prancha/dashboard

## Referências com funções diferentes

- `artifacts/visual/hero-reference.png`: target geométrico do hero desktop.
- `artifacts/visual/application-reference.png`: prancha conceitual; somente linguagem visual de seções. Não define posições/colunas da home.

A interpretação anterior da prancha como tela única estava errada. As regras de colunas61/38, hero744×410 como painel e testes dessa proporção foram revogadas. Os artefatos antigos permanecem somente como histórico.

## Correção executada

Primeiro o hero foi retirado do grid e reconstruído full-width, antes de reorganizar os demais blocos. Capturas dessa etapa: `artifacts/vertical/hero-first/`. Header integrado sem caixa, headline grande em três linhas, produto/flores à direita, glow, trilhas e faixa de benefícios sem cards. CTA: “Fazer parte agora”.

Depois, a landing passou a fluxo vertical: hero → comunidade → como funciona → desafio → recompensas → níveis → ranking → conteúdos/comunidade (inclui FAQ preservado) → CTA final → footer. Nenhum aside/sidebar/dashboard grid público. Seções amplas sem bordas e raios de grandes painéis; cards permanecem somente para imagens/categorias. Estados de pré-lançamento preservados, sem creators/métricas inventadas.

Desktop: hero100% largura, altura100svh–24px, mostrando somente24px da próxima seção. Em1920×1080: hero1920×1056; em1440×1000: hero1440×976. Mobile390×844: hero390×820. A composição visual é independente da camada de texto, sem max-width comum ao hero.

## Screenshots finais de produção

Servidor de captura isolado/desconectado na porta3101; reduced motion para capturas estáticas sem indicador Next dev. Nenhum arquivo env ou guard alterado.

- `artifacts/vertical/hero-reference.png`: referência do hero copiada sem alteração.
- `artifacts/vertical/final/1920-viewport.png`:1920×1080.
- `artifacts/vertical/final/1440-viewport.png`:1440×1000.
- `artifacts/vertical/final/390-viewport.png`:390×844.
- `artifacts/vertical/final/1920-full.png`, `1440-full.png`, `390-full.png`: páginas completas.
- `artifacts/vertical/final/{1920,1440}-hero-comparison.png`: referência à esquerda, hero HTML à direita.
- `artifacts/vertical/final/{1920,1440}-hero-overlay.png`:50/50.
- `artifacts/vertical/final/{1920,1440}-hero-diff.png`: diferenças RGB absolutas.
- `artifacts/vertical/final/{1920,1440,390}-geometry.json`: caixas observadas.

Comparação somente com hero-reference, nunca com a geometria da prancha. Resize contain preserva proporção e mostra barras quando necessário; não distorce a captura para melhorar similaridade. Não há score de aprovação ou promessa de pixel-perfect. Script reproduzível: `node scripts/capture-vertical-landing.mjs final http://localhost:3101`.

## Limitações preservadas

Arte extraída da referência continua conceitual e de baixa resolução; ampliação em1920 deixa essa limitação visível. Texto obrigatório tem três linhas diferentes da fonte. Logo tipográfico provisório. Algumas flores e arquitetura fazem parte do recorte modular; não há packshots oficiais transparentes. Nenhuma imagem completa de landing é usada como background.

## Validação

- Typecheck: passou.
- Unitários:41 testes/8 arquivos passaram.
- Playwright:14 passaram,2 combinações redundantes desktop no projeto mobile excluídas.
- ESLint: passou.
- Prettier: passou.
- Build Next: passou.

Testes geométricos agora exigem hero100% largura, altura próxima ao viewport, comunidade imediatamente abaixo, desafio/recompensas/ranking fora do primeiro viewport, seções ordenadas verticalmente e ausência de aside no main. Reduced motion, cleanup, leitura sem JS e navegação continuam testados. O seletor do teste de navegação foi atualizado para o novo CTA.

Alterados nesta correção: `hero.tsx`, `landing.tsx`, `landing.module.css`, `tests/e2e/landing-visual.spec.ts`, script de captura e documentação. Sem alterações em Appwrite, Auth, env, banco, Functions, permissões, segurança ou rotas autenticadas. Trabalho anterior preservado. Nenhum commit executado.
