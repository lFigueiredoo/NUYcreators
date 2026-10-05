# Experiência pública × autenticada — entrega para revisão

## Resultado

A home agora é uma landing de aquisição, não um dashboard. Hero → projeto → como funciona → para quem é / benefícios → jornada → experiências → FAQ → CTA final → footer.

Foram retirados da home o ranking (inclusive empty state), a campanha/desafio operacional, prazo/pontos/requisitos, galeria conceitual de creators e o teaser de conteúdos enviados. Não há saldos, barras de progresso, preços em pontos ou catálogo operacional público.

- Projeto: composição editorial, com o título/texto solicitados e sem cards SaaS.
- Como funciona: Faça parte → Participe → Crie → Conquiste.
- Para quem é: clientes NUY, creators UGC, influenciadores e pessoas apaixonadas por casa, perfume, rotina e bem-estar. Sem perfis ou avatares inventados.
- Benefícios: seis possibilidades conceituais, sem números.
- Jornada: cinco níveis NUY, sem pontos ou progresso pessoal; configuração não é mais consultada pela home.
- Experiências: categorias, inspiração visual e CTA “Faça parte para descobrir”. Sem ofertas ou resgates públicos.
- FAQ: oito perguntas solicitadas, com details/summary acessíveis.
- CTA final: copy solicitada e links “Quero fazer parte” / “Já tenho uma conta”. Retrato continua identificado como arte conceitual, não creator publicado.

## Hero e header

`hero-artboard.module.css`, `landing-fonts.ts` e as camadas aprovadas de produto/flores/órbita/luz não foram editados nesta rodada. Movimento da rodada anterior permanece.

CTA secundário é “Entrar” → `/login`. Seu texto de medição invisível e `aria-hidden` preserva exatamente a caixa original, sem interferir no rótulo acessível. Primário continua “Fazer parte agora” → `/cadastro`.

Header público: O projeto / Como funciona / Benefícios / FAQ. Visitante recebe Entrar + Fazer parte. Sessão confirmada via `currentUser()` no servidor recebe somente Ir para meu painel; nenhum saldo/ponto no header público. Menu mobile fecha na navegação.

Capturas conferem **delta zero** de posição/largura/altura de shell, artboard, headline, packshot e benefícios nas três larguras. Caixas dos CTAs também mantidas:

| Largura | CTA primário           | CTA secundário        |
| ------- | ---------------------- | --------------------- |
| 1920    | 413,328125 × 97,140625 | 342,78125 × 97,140625 |
| 1440    | 336,953125 × 79,1875   | 275,09375 × 79,1875   |
| 390     | 218 × 44               | 218 × 44              |

Comparação pixel a pixel contra o Hero aprovado: zero diferenças fora de header/CTAs e da faixa terminal de 8px. Essa faixa é reportada separadamente: a nova seção creme adjacente altera a rasterização na borda inferior do Hero (3854/2453/685 pixels em 1920/1440/390). Portanto, esta rodada **não afirma igualdade integral de pixels**: header e CTAs mudaram por solicitação, e a transição para o projeto é diferente. As camadas da arte e sua geometria permanecem intactas.

## Home mais curta

| Viewport  | Antes  | Agora  | Redução |
| --------- | ------ | ------ | ------- |
| 1920×1080 | 5855px | 4756px | 18,8%   |
| 1440×1000 | 5689px | 4501px | 20,9%   |
| 390×844   | 7579px | 5877px | 22,5%   |

Passagem A: separação editorial e navegação. Passagem final: FAQ compacto, quatro passos em duas colunas no mobile, integração visual do produto no auth e correção do nome acessível do campo Senha. Captura final carrega as imagens lazy antes do full-page, evitando espaços vazios artificiais no teaser e no CTA final.

## Estrutura de rotas

```text
Público / aquisição
/
/login
/cadastro
/recuperar-senha
/verificar-email
/termos
/privacidade
/redefinir-senha              fluxo de recuperação existente, preservado

Sessão obrigatória
/app                         Início
/app/desafios                Desafios
/app/conteudos               Meus conteúdos
/app/pontos                  Pontos
/app/recompensas             Recompensas
/app/ranking                 Ranking
/app/notificacoes            Notificações
/app/perfil                  Meu perfil

Compatibilidade: sem telas operacionais públicas
/desafios     → /app/desafios
/recompensas  → /app/recompensas
/ranking      → /app/ranking

Fluxos anteriores preservados
/onboarding                  após cadastro, com os gates existentes
/admin                       autorização staff existente, sem alterações
```

Arquivos em `src/app/(protected)/app/`, com layout compartilhado e **guard no layout e nas páginas**; não dependem somente de uma navegação client-side. Visitantes são redirecionados para `/login`. Os arquivos das rotas antigas ficam apenas como redirecionamentos, preservando URLs já compartilhadas.

`src/features/workspace/components/` prepara navegação, dashboard, áreas e perfil:

- Nome/email/verificação vêm da conta confirmada pelo Appwrite, nunca de fixtures. Avatar usa ícone de fallback enquanto foto não é carregada.
- Nível, saldo, progresso, posição, desafios, conteúdos, recompensas e notificações **ainda não estão conectados aos respectivos dados operacionais**.
- Essas áreas exibem estados de indisponibilidade/integração pendente, não “zero” ou “nenhum registro” como se uma consulta real tivesse retornado vazia.
- Conteúdos prevê enviados, em análise, aprovados, revisão solicitada e rejeitados. Essas etiquetas descrevem a organização futura, não simulam status de conteúdos existentes.
- Prazo/pontos/requisitos e catálogo/custo/estoque/resgate ficam no escopo privado. Não foram adicionados botões de participação/envio/resgate com operações fictícias.

## Login e cadastro

Layout editorial 50/50 no desktop: navy/violeta, produto, flores, curva e glow de um lado; formulário creme do outro. Mobile recebe cabeçalho artístico compacto, depois o formulário.

- Login: “Bem-vinda de volta.”, email/senha, Entrar, recuperação e Criar conta.
- Cadastro: “Seu lugar no NUY Creators começa aqui.”, nome/email/senha e consentimento já existente. Dados de perfil continuam no onboarding.
- Validação, cookies, gates legais, verificação, recuperação e chamadas SDK existentes preservados.
- Única alteração em `src/features/auth/services/actions.ts`: o redirecionamento **após login bem-sucedido** passa de `/onboarding` para `/app`. Cadastro continua indo para `/onboarding`. Isso é roteamento de experiência; nenhuma chamada Appwrite, permissão, banco ou Function foi alterada.
- Dashboard oferece link para completar perfil no onboarding.

## Screenshots

Revisão visual: `artifacts/experience/final/review.html`.

```text
artifacts/experience/final/
  home-1920-full.png
  home-1440-full.png
  home-390-full.png
  login-1920-full.png
  login-390-full.png
  cadastro-1920-full.png
  cadastro-390-full.png
  {home,login,cadastro}-{width}-viewport.png
  hero-{1920,1440,390}.png
  evidence.json
```

Os screenshots mobile de login/cadastro incluem o conteúdo completo, além das versões viewport 390×844. Capturas em reduced motion mostram composição estabilizada. Avisos/botões desabilitados refletem o servidor de testes **desconectado**, sem encenar sucesso de autenticação. Não foram produzidos screenshots de dashboard com sessão falsa.

## Arquivos e limites de escopo

- Home: `src/app/page.tsx`; componentes `landing.tsx`, `acquisition.module.css`, `hero.tsx`, `how-it-works.tsx`, `levels-section.tsx`, `faq.tsx`.
- Navegação: `src/components/layout/{header.tsx,footer.tsx,public-header.module.css,public-navigation.ts}`; layout público e redirecionamentos antigos.
- Auth: layout, páginas login/cadastro, `auth-form.tsx`, `auth-experience.module.css`, redirecionamento pós-login em `actions.ts`.
- Workspace: layout/páginas privadas e `src/features/workspace/components/*`.
- Testes: `tests/unit/public-navigation.test.ts`, `tests/e2e/experience-boundary.spec.ts` e atualização das expectativas públicas/visuais anteriores.
- Evidências: `scripts/capture-experience.mjs`, screenshots e este relatório.

Não houve alteração de infraestrutura, env, banco, permissions, Functions ou regras de pontos. Alterações anteriores do usuário, inclusive `.env.example` e relatórios Appwrite, foram preservadas. Nenhum commit.

## Validação

- Typecheck: passou; o build regenerou os tipos de rota para o novo layout `/app`.
- Unit tests: **44 passaram**, 9 arquivos, incluindo navegação pública visitante/logado.
- Playwright: **26 passaram**, 4 skips deliberados desktop/touch.
- Cobertura: ausência de funcionalidades operacionais na home, oito FAQ, signup com três campos, acessibilidade Senha, links de auth, todos os oito caminhos privados e três legados sem sessão, ausência de overflow/erros JS, geometria congelada, reduced motion e cleanup do Hero.
- ESLint, Prettier e build de produção: passaram.

Os testes bloqueiam acesso sem sessão; **não comprovam login/cadastro remoto, sessão autenticada real, carregamento de dados privados ou integrações operacionais**. Nenhum usuário, email, conteúdo ou resgate remoto foi criado. Servidores de testes usam variáveis desconectadas apenas no processo; o servidor do usuário em 3000 foi preservado.
