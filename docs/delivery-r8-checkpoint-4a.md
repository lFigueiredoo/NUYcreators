# R8 · Checkpoint 4A — Autenticação pública na identidade da Proposta C (Login + Cadastro)

Escopo desta rodada, como pedido: **implementar primeiro LOGIN + CADASTRO e parar**. Recuperação, redefinição, verificação e onboarding ficaram intactos (camada legada) aguardando a sua aprovação visual.

Camada nova: `src/features/auth/components/auth-access-*` (shell + painel + formulário) e o grupo de rota `src/app/(access)/`. O CSS antigo do Universo NUY **não** foi escondido com `display:none` — simplesmente não é mais usado por essas duas telas (o inventário do que sai depois da aprovação está no item 6).

**Não tocado**: lógica de login, Appwrite, sessions, cookies, recuperação de senha, verificação, validações, redirects, rate limits, backend, permissões, banco, env, área autenticada, rotas `/app/*`. Nenhum commit, nenhum push.

## 1. Login desktop — `login-1920.png` / `login-1440.png`

Divisão **55 / 45** (fotografia / formulário), medida no navegador: `divisao: 0.55` nas duas larguras. Página exata do viewport nas duas (1080 e 1000 css-px, sem rolagem).

- Título `Bem-vinda de volta.` em Playfair Display 48px @1920 (43,2px @1440), com o itálico em `de volta`; lead `Continue sua experiência na comunidade NUY Creators.`
- Campos `E-mail` / `Senha` com rótulo sempre visível, input branco, borda areia `#D8C1AD`, raio 10, altura 52; foco navy `#0E2A44` com anel de 3px a 10% (sem glow).
- CTA `Entrar →` navy cheio, pílula 999px, seta que anda 3px no hover; `Esqueci minha senha` e `Ainda não faz parte? Criar conta` abaixo; `Termos de uso` / `Privacidade` no rodapé da coluna.
- Fotografia de campanha com enquadramento **próprio** (`object-position: 36% 50%` contra `46% 42%` do hero) e a frase `Rotinas reais. Conteúdos que inspiram.` em Playfair itálico creme sobre o véu navy.

## 2. Cadastro desktop — `cadastro-1920.png` / `cadastro-1440.png`

Mesma moldura, campos que a implementação funcional já exige: `Nome`, `E-mail`, `Senha` (com `Pelo menos 8 caracteres.`) e o aceite dos termos com links reais para `/termos` e `/privacidade`. CTA `Criar minha conta →`, rodapé `Já faz parte? Entrar`.

**Sem campo de confirmação de senha** — ele não existe no cadastro de hoje e criá-lo exigiria mexer na validação (fora do "somente camada visual"). Ajuda de senha ganhou `aria-describedby`.

O CTA aparece esmaecido nas capturas porque **o cadastro está desligado de propósito**: `APPWRITE_REGISTRATION_ENABLED=false` e `NUY_TERMS_VERSION`/`NUY_MINIMUM_AGE` vazios ("configurar só depois da aprovação legal") — é o mesmo estado que o seu dev mostra. O CTA real, navy cheio, é o mesmo componente fotografado habilitado no login.

## 3. Login mobile — `login-390.png`

Empilhado (nenhuma divisão 50/50): lockup → faixa de foto **220px** → título → formulário → ações secundárias. Primeiro campo em `y=461` de 844 (dentro do primeiro viewport, sem rolar uma tela inteira). Altura total 873.

## 4. Cadastro mobile — `cadastro-390.png`

O formulário manda: faixa **180px** (menor que a do login, provado no gate `signup.band < login.band`), título, aviso discreto, campos e CTA. Primeiro campo em `y=596` de 844. Altura total 1146 — mais longa que o login por ter 4 campos, sem estourar.

`zoom-faixa-mobile.png` é o recorte ampliado das duas faixas (a memória da casa: texto pequeno se julga ampliado).

## 5. Comparação com a landing nova — `landing-to-login-comparison.png`

Landing (topo) e `/login` na **mesma escala 1:1 a 1920**, com as medidas no rodapé da composição. O que prova a continuidade, além do olho — tudo medido por probe no navegador e travado em teste:

| Medida              | Landing                                                | /login                                                  |     |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------- | --- |
| Lockup NUY/CREATORS | Playfair 15px, 0,12em                                  | idêntico (comparação de estilo computado)               | ✓   |
| Calha do topo       | `clamp(20px, 5.4vw, 104px)`                            | mesma variável: 103,68 @1920 · 77,76 @1440 · 21,06 @390 | ✓   |
| Botão principal     | navy `rgb(14,42,68)`, raio 999px, família e peso       | idênticos                                               | ✓   |
| Tipografia          | Playfair Display + Inter (`document.fonts.check` true) | idem                                                    | ✓   |
| Fotografia          | mesma campanha, enquadramento novo                     | `object-position` diferente do hero                     | ✓   |

## 6. Componentes antigos: o que saiu do caminho e o que sai depois da aprovação

Nada foi apagado ainda — o pedido é remover **depois** da validação. O que já está morto (zero imports/referências/uso, conferido por varredura):

| Peça                                                                                                           | Situação                                   | Quem ainda usa                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/app/(auth)/login`, `(auth)/cadastro`                                                                      | **substituídos** (moveram para `(access)`) | ninguém                                                                             |
| `globals.css`: `.auth-layout`, `.auth-editorial`, `.auth-flower`, `.auth-panel`, `.back-link` (+ bloco mobile) | **órfãos** — zero referências em TSX       | ninguém                                                                             |
| `/brand/reference/hero-composition-hi.webp`, `hero-bouquet-hi.webp`                                            | órfãos fora do layout legado               | `(auth)/layout.tsx` (ainda vivo)                                                    |
| `src/features/auth/components/auth-experience.module.css` + SVG `orbit` (viewBox 0 0 800 1000)                 | **ainda em uso**                           | `(auth)/layout.tsx` → recuperar-senha, redefinir-senha, verificar-email, onboarding |
| `src/features/auth/components/auth-form.tsx` (legado)                                                          | **ainda em uso**                           | as mesmas três telas                                                                |
| `/brand/reference/nuy-wordmark-hi.png`                                                                         | **fica**                                   | header/footer do site público                                                       |

Ou seja: o Universo NUY antigo ainda existe **apenas** nas telas que você mandou não tocar agora. Quando você aprovar, o CP4B migra as três telas + onboarding para o `AuthLayout` novo e aí a remoção (CSS órfão, `auth-experience.module.css`, `auth-form.tsx`, os dois assets de hero antigos) acontece de uma vez, com a conferência de que nada disso é compartilhado com a área autenticada.

## 7. Confirmação de que o auth funcional não mudou

| Item do seu checklist            | Como está provado                                                                                                                | Falta você validar                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Login válido / inválido          | mesmas server actions (`loginAction`), mesmos `name` de campo (`email`, `password`), mesmo `method="POST"` com a action do React | o vai-e-vem real com o Appwrite (precisa do ambiente conectado) |
| Cadastro                         | mesmas `signupAction`, campos `name`, `email`, `password`, `terms`                                                               | idem                                                            |
| Validação de formulário          | `required`, `type=email`, `minLength=8`, `maxLength` nativos preservados; `aria-describedby` na ajuda                            | —                                                               |
| Esqueci / redefinir senha        | telas não tocadas nesta rodada                                                                                                   | —                                                               |
| Verificação de e-mail            | tela não tocada nesta rodada                                                                                                     | —                                                               |
| Redirect autenticado / deslogado | gate `every workspace URL and legacy operational URL requires a server session` verde nos dois projetos                          | —                                                               |
| Logout                           | `actions.ts` não foi tocado (mtime 03/10; as alterações desta rodada são só os arquivos do item 8)                               | —                                                               |

Duas observações honestas:

- **O botão de mostrar/ocultar senha é novo.** O formulário antigo não o tinha; o pedido dizia "manter", então registrei a diferença. Ele só alterna `type` no cliente, com `aria-label`/`aria-pressed` e foco visível — não toca em validação nem em envio.
- **Os estados de erro/sucesso não aparecem em nenhuma captura** porque só existem depois de um envio de verdade (e enviar significaria bater no Appwrite, que está fora do escopo). As cores declaradas têm contraste calculado: erro `#7D332D` sobre `#FBEEEC` = 7,78:1; sucesso `#2F5B46` sobre `#EEF5F0` = 7,01:1; aviso navy sobre bege = 10,86:1 (este sim medido no bitmap). Nada de caixa vermelha de SaaS: ícone pequeno + texto + fundo suave, com `role="alert"`/`aria-live` no erro.

## 8. Arquivos alterados

| Arquivo                                                                         | O que é                                                                                                    |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/features/auth/components/auth-access.module.css` (novo, ~500 linhas)       | o sistema visual do acesso: só classes, tokens próprios da paleta NUY                                      |
| `src/features/auth/components/auth-access-shell.tsx` (novo)                     | `AuthLayout` (header + divisão + painel) · `AuthVisualPanel` · `AuthFormShell`                             |
| `src/features/auth/components/auth-access-form.tsx` (novo, cliente)             | formulário de login/cadastro: mesmas actions, mesmos campos, camada visual nova                            |
| `src/app/(access)/login/page.tsx`, `src/app/(access)/cadastro/page.tsx` (novos) | as duas rotas na identidade nova                                                                           |
| `src/app/(auth)/login/page.tsx`, `src/app/(auth)/cadastro/page.tsx`             | **removidos** (moveram para `(access)`)                                                                    |
| `tests/e2e/auth-identity.spec.ts` (novo, 6 testes)                              | contrato da identidade: creme, lockup, foco, geometria, fiação, bitmap                                     |
| `tests/e2e/experience-boundary.spec.ts`                                         | **mudança de contrato**: o rótulo do campo virou `E-mail` (era `Email`) — a asserção antiga foi atualizada |
| `scripts/pc-auth-capture-cp4a.mjs` (novo)                                       | capturas + probes + contraste medido no bitmap + auditoria de resolução                                    |

Nada mais foi tocado — em especial `actions.ts`, `(auth)/layout.tsx`, `globals.css` e todo o resto da árvore que já estava modificada antes desta rodada continua como estava.

## 9. Testes

| Gate                                                   | Resultado                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                    | limpo                                                                                            |
| `npm test` (Vitest)                                    | 44/44                                                                                            |
| `npm run lint`                                         | 0 erros (avisos restantes são de scripts antigos)                                                |
| `npm run format:check`                                 | arquivos do CP4A formatados                                                                      |
| `npx next build`                                       | verde, 22 rotas (`/login`, `/cadastro`, legadas, `/termos`, `/privacidade`)                      |
| `npx playwright test --config=playwright.r9.config.ts` | **50 passaram, 14 pulados, 0 falharam** (`artifacts/proposta-c/gates-playwright-cp4a-final.txt`) |
| Gate novo `auth-identity`                              | 6 testes × 2 projetos verdes                                                                     |

Números que o gate novo trava, para não regredirem: fundo do shell `rgb(249,245,239)`; foto sem `/brand/reference/` e sem órbitas; enquadramento diferente do hero; foco navy + anel 3px; toggle de senha com estado anunciado; divisão 0,50–0,58 no desktop e faixa 160–260px com formulário no primeiro viewport no mobile; campos exatamente `['email','password']` e `['name','email','password','terms']`; **zero bitmap ampliado** (auditado no arquivo realmente servido, não no `naturalWidth`).

Zero upscale, conferido no otimizador: `hero-lifestyle.webp` serve 1080×810 para uma caixa de 1056 css-px @DPR1 (1,023 px/css) e 828×621 para 390 css-px @DPR2 (1,062 px/dpx) — sempre ≥ 1.

## Contraste medido no bitmap renderizado

| Alvo                                                | Medida                                                        |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Título navy sobre creme                             | 13,49:1                                                       |
| Lead                                                | 5,99:1                                                        |
| Rótulo                                              | 13,49:1                                                       |
| CTA creme sobre navy (habilitado)                   | **14,07:1**                                                   |
| Frase sobre a fotografia (linha a linha, pior caso) | desktop 5,04–9,73:1 · mobile **6,78–8,02:1**                  |
| Aviso navy sobre bege                               | 10,86:1                                                       |
| CTA desabilitado (cadastro hoje)                    | 3,64:1 — estado desabilitado, isento; o CTA real é o do login |

A primeira linha da frase no mobile media **4,47:1** (limite do AA) sobre as partes claras da foto: o véu da faixa curta foi reforçado e a linha passou a **6,78:1**. O recorte ampliado das duas faixas (depois do ajuste) está em `zoom-faixa-mobile.png`.

## Respostas às perguntas de validação

1. **Parece continuação da Proposta C?** Sim — e não só no olho: lockup, calha, família tipográfica, raio e navy do botão são **idênticos por medição** entre `/` e `/login` (§5).
2. **Parece premium?** A aposta é editorial: 55% de fotografia de campanha real, Playfair Display grande, creme/areia, zero glow, zero gradiente roxo, zero card flutuante. Sem pixelização (auditado) e com contraste medido.
3. **Parece NUY?** Sim: mesma marca, mesma paleta, mesma fotografia, mesma voz ("Rotinas reais. Conteúdos que inspiram.").
4. **Tem algum elemento do antigo Universo NUY?** **Não** nas duas telas novas — provado por teste: nenhuma imagem de `/brand/reference/`, nenhuma classe `.auth-editorial/.auth-flower/.auth-panel`, nenhuma órbita `viewBox="0 0 800 1000"`. (O universo antigo continua vivo nas telas legadas que você mandou não mexer.)
5. **É uma tela genérica de SaaS?** Não: composição editorial em duas colunas com foto de campanha, sem botões falsos de Google/Instagram/TikTok (não existe login social implementado e eu não inventei), sem caixa vermelha de erro, sem formulário centralizado em fundo gradiente.
6. **O mobile prioriza o formulário?** Sim: faixa de 220px (login) / 180px (cadastro) e primeiro campo dentro do primeiro viewport nas duas (`y=461` e `y=596` de 844).

## Pendências honestas

- **Recuperação, redefinição, verificação e onboarding** seguem na camada legada (visual antigo) — de propósito, esperando sua aprovação.
- **Round-trip real com Appwrite** (login válido/inválido, cadastro completo) precisa do ambiente conectado — no seu dev, `/login` já aparece com o CTA habilitado e `/cadastro` com o aviso, como nas capturas.
- **Estado de erro/sucesso** só é fotografável num envio real; ficou com contraste declarado (§7).
- Aviso já existente sobre `quality={88}` em quatro componentes da landing congelada (valor fora de `images.qualities: [75, 90]`) — não mexi.
- Remoção do CSS/componentes órfãos do item 6: **só depois da sua aprovação**, junto com o CP4B.

Nenhum commit executado.
