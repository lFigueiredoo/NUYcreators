# Sprint 4B — Fechamento completo da experiência pública (PROPOSTA C)

Diretriz: **tudo que é público fecha nesta rodada, na identidade ENTRE CASA & CREATORS** — recuperação, redefinição, verificação, estados de erro/sucesso, onboarding, CTA final, rodapé, responsividade e limpeza do estilo antigo. Nada do Universo NUY (dark luxury, cosmos, violeta, órbitas, glow) pode sobrar em rota pública.

**Não tocado**: Appwrite, Auth (server actions, sessões, cookies, redirects, validações, tokens), database, Functions, permissions, env, API, regras de pontos/níveis, rotas protegidas. O cadastro segue **desabilitado por projeto** (aguarda `NUY_TERMS_VERSION` + `NUY_MINIMUM_AGE`); nenhum valor foi inventado e a proteção não foi contornada. Sem commit, sem push.

## Toques divulgados (fora da zona nova)

| Arquivo                               | Toque                                                    | Por quê                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `next.config.ts`                      | `images.qualities: [75, 88, 90]`, `deviceSizes` com 1448 | As seções novas declaram `quality={88}`; sem o bucket declarado o otimizador serve 75 e a foto perde definição. Nenhuma outra chave mudou. |
| `landing.module.css` (`.creatorCard`) | `flex: 0 0 min(68vw, 356px)` abaixo de 900px             | 68vw em 768px dava 522 css-px para um bitmap de 356 (upscale real). O teto só age onde o 68vw excederia — em 390/375 nada muda.            |
| `landing.module.css` (`.faqFoot`)     | fio duplicado removido                                   | O último item da FAQ já desenha a borda; o pé desenhava uma segunda. Sem mudança de conteúdo.                                              |

Todas as áreas congeladas do §16 (Header, Hero, faixa de benefícios, Creators, Desafio, Comunidade, Recompensas, Login, Cadastro) foram **capturadas antes e depois**: nenhuma mudança de layout, cor, tipografia ou copy.

## 1. Landing desktop final (@1920)

`artifacts/proposta-c/sprint-4b/landing-1920-full.png` · recortes em `crops/` (`conteudos-1920`, `faq-1920`, `cta-final-1920`, `rodape-1920` + ampliados)

| Medida                   | Valor                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Página inteira           | **6914** px (teto do gate: < 7200)                                                                                                                   |
| Seções                   | hero 952 · benefícios 93 · creators 1078 · desafio 646 · comunidade 732 · recompensas 767 · **conteúdos 782 · faq 746 · cta final 812 · rodapé 231** |
| Títulos das seções novas | 46,4 / 46,4 / 51,2 px (h2 editorial, abaixo do h1)                                                                                                   |
| Rodapé                   | `main.nextElementSibling === FOOTER`, footer é o último nó; contiguidade provada por probe (`regua.json`, `contiguo: true`)                          |
| Overflow horizontal      | zero em 1920/1440/1366/1280/1024/768/430/390/375                                                                                                     |

As quatro seções novas entram no ritmo editorial das anteriores — creme → creme-soft → navy → creme → creme-soft/navy do CTA — sem bloco solto e sem faixa de altura vazia.

## 2. Landing mobile final (@390)

`landing-390-full.png` · `crops/conteudos-390.png`, `faq-390.png`, `cta-final-390.png`, `rodape-390.png`

| Medida              | Valor                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Página              | 8218 px (390) · 8239 px (375)                                                                                                                                                  |
| Seções novas        | conteúdos 995 · faq 887 · cta final 685 · rodapé 313                                                                                                                           |
| Overflow horizontal | zero (os 6 "estouros" registrados em 768/430/390/375 são `creatorCard/creatorMedia/creatorImage` **dentro** do trilho `overflow-x: auto` — o carrossel horizontal intencional) |
| Imagem do CTA       | 828×621 servida para 390 css-px @DPR2 → 2,12 px/css, sem upscale                                                                                                               |
| FAQ                 | 8 `<details>` empilhados, ícone `rotate(180deg)` quando aberto, `summary` com 18px de respiro acima e abaixo (área de toque ≈60px)                                             |
| Rodapé              | lockup, 6 links e linha legal empilhados, sem colisão de fios                                                                                                                  |

Os quatro break points pedidos (430, 390, 375 + 768) foram medidos no mesmo build das capturas (`medidas.json`).

## 3. Login

`login-1920.png` · `login-390.png` · `crops/form-login-1920@1.6x.png`

Coluna de formulário à direita, foto lifestyle à esquerda (desktop) / faixa reduzida de 220px no topo (390) para o **primeiro campo entrar na dobra** (`primeiroCampoDobra: true`). Primeiro campo a 443px @1920. 2 campos (e-mail, senha), botão "Entrar", "Esqueci minha senha" → `/recuperar-senha`, "Criar conta" → `/cadastro`, links legais no pé. Estado de integração ausente capturado em `login-desconectado-1920.png`: _"O acesso está temporariamente indisponível. Tente novamente mais tarde."_ — declarado, não fingido.

## 4. Cadastro

`signup-1920.png` · `signup-390.png` · `signup-desligado-1920.png`

Título "Seu lugar no NUY Creators começa aqui.", 4 campos (nome, e-mail, senha, aceite), CTA "Criar minha conta". **O gate legal continua ativo**: o aviso âmbar _"O cadastro ainda não está disponível. Estamos preparando o acesso à comunidade."_ aparece no lugar de um botão morto, e o botão renderiza desabilitado. Nenhum `NUY_TERMS_VERSION`/`NUY_MINIMUM_AGE` foi inventado. Primeiro campo a 522px @1920; faixa de 180px @390.

## 5. Recuperação de senha

`forgot-1920.png` · `forgot-390.png` · `crops/form-recuperar-1920@1.6x.png`

"Vamos recuperar seu acesso." / "Informe seu e-mail e enviaremos as instruções para você." / campo E-mail / "Enviar instruções" / "Voltar para entrar". O estado enviado existe no componente (ícone `MailCheck`, "Confira seu e-mail.", "Enviamos as instruções de recuperação para o endereço informado.", ação única "Voltar para entrar") mas **não é fotografável sem integração real** — e por isso não foi fotografado. Reenvio: não existe no fluxo atual; não foi inventado.

## 6. Verificação de e-mail

`verify-1920.png` · `verify-390.png` · `verify-sem-link-1920.png` · `crops/form-verificar-1920@1.6x.png`

Com tokens na URL: "Só falta confirmar seu e-mail." / "Enviamos um link de verificação para o seu endereço." / "Confirmar meu e-mail" / "Ir para o login". **Sem token** (`verify-sem-link-1920.png`): o aviso _"Abra o link que enviamos para o seu e-mail para confirmar o endereço."_ substitui o botão — a tela não oferece confirmar sem token. `redefinir-senha` segue a mesma regra (`reset-sem-link-1920.png`: _"Este endereço precisa do link enviado por e-mail para funcionar."_ + "Solicitar novo link" + "Voltar para entrar").

## 7. Onboarding

`onboarding-1920.png` · `onboarding-390.png`

Identidade nova aplicada, **regras e persistência intactas**: mesmos passos e campos do fluxo existente, nenhuma pergunta nova. Como a autenticação não está conectada neste ambiente, a tela declara o estado honesto — _"O onboarding estará disponível quando a autenticação for conectada. Nenhum perfil foi criado."_ — em vez de exibir um formulário que não grava.

## 8. CTA final + rodapé

`crops/cta-final-1920.png`, `cta-final-acoes-1920@2x.png`, `crops/rodape-1920.png`, `rodape-legal-1920@3x.png` (+ versões 390)

CTA: bloco navy `#0e2a44` com "Faça parte da NUY CREATORS." / "Entre para uma comunidade feita para quem transforma rotina em inspiração." / "Quero fazer parte" → `/cadastro` / "Já tenho uma conta" → `/login`, imagem lifestyle (casa, luz natural, creator, produto, flores) com proporção 4/3 no desktop e 16/11 no mobile, bitmap 828×621 para 826 css-px (1,002 px/css — zero upscale). Contraste pior medido: 7,75 no eyebrow dourado, 14,07 no título, 12,83 no botão contornado.

Rodapé: lockup NUY/CREATORS, nav `Comunidade · Desafios · Recompensas · Conteúdos · FAQ · Entrar`, fio, e abaixo `Privacidade · Termos de uso · © 2026 NUY Creators`. Rodapé 231px desktop / 313px mobile, 3 colunas → empilhado. Contraste pior: 5,99 (copyright sobre creme), 13,49 (nav). Nenhum dígito fora do ano do copyright; deslogado não há link para o painel.

## 9. Estilo antigo removido

| Removido nesta rodada                                                                                    | Nota                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/globals.css` — **−1099 linhas**                                                              | O bloco público legado inteiro saiu: chrome `site-header`/`site-footer`, `auth-layout`/`auth-panel`/`auth-flower`, `footer-*`, `form-*`, `text-link`, `eyebrow`, `empty-state`. Ficaram (com comentário novo): Tailwind + `@theme`, reset base, `section[id]`, `.public-inner` (**ainda montado por `/admin`**) e `.fallback-page` (pelo `error.tsx` global), `.skip-link`, `prefers-reduced-motion`. |
| `src/app/(auth)/` — 7 arquivos                                                                           | Grupo de rota antigo (cadastro, layout, login, onboarding, recuperar-senha, redefinir-senha, verificar-email). Substituído por `src/app/(access)/` com o shell novo.                                                                                                                                                                                                                                  |
| `src/components/layout/`: `header.tsx`, `footer.tsx`, `public-navigation.ts`, `public-header.module.css` | Chrome público antigo, sem import restante.                                                                                                                                                                                                                                                                                                                                                           |
| `src/features/auth/components/auth-form.tsx`                                                             | Formulário legado das três telas; nada o importava depois da migração.                                                                                                                                                                                                                                                                                                                                |
| `src/components/feedback/empty-state.tsx`                                                                | Só era usado pelo estado vazio antigo.                                                                                                                                                                                                                                                                                                                                                                |
| `src/features/community/services/public-data.ts`                                                         | Dados públicos do Universo NUY.                                                                                                                                                                                                                                                                                                                                                                       |
| `tests/unit/public-navigation.test.ts`                                                                   | Testava o módulo de navegação antigo.                                                                                                                                                                                                                                                                                                                                                                 |

Já constavam removidos no `git status` de abertura (rodadas anteriores deste fechamento): `tests/e2e/hero-motion.spec.ts` (→ `landing-reveal.spec.ts`) e os componentes `src/features/community/components/*` do Universo NUY, exceto `landing-fonts.ts` — que **continua**, porque a área autenticada ainda o importa.

Verificação por contrato: o teste `nenhuma classe da experiência pública antiga voltou` varre `/`, `/login` e `/termos` com regex ancorada nas 31 classes legadas e exige lista vazia; o crawl de links percorre as 9 rotas públicas e exige que **nenhum `href` seja `#`, `javascript:` ou vazio** e que todo destino interno responda < 400. Assets: nada removido — ver abaixo.

## 10. Pendências reais

1. **Captura de estados que exigem integração** — o estado "instruções enviadas" da recuperação e os passos reais do onboarding só existem com Appwrite conectado. Ficaram fora das imagens de propósito: fotografar exigiria forjar integração (§17).
2. **45 assets sem referência** em `public/` (inventário em `artifacts/proposta-c/sprint-4b/assets-public.txt`: 85 arquivos = 19 usados pelo app, 16 só por scripts de geração, 5 só citados em docs, 45 sem referência). Nada foi removido: os docs de rodada citam vários como evidência e os `.txt` OFL são obrigação de licença. Decisão de limpeza fica para quando o material histórico puder sair junto.
3. **`loginAction` redireciona para `/app`** (`src/features/auth/services/actions.ts`, 1 linha) — modificação **já presente no working tree de abertura**, não tocada por esta rodada. Fica o registro para quando o onboarding for de verdade: alguém precisa decidir se o login cai em `/onboarding` ou em `/app`.
4. **O working tree carrega trabalho de outras rodadas na área autenticada** (`(protected)/app/*`, `.env.example`, `tsconfig.json`): preservado sem alteração, fora do commit.

## 11. Testes

| Gate                                                           | Resultado                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                                 | ✓ limpo                                                                                                 |
| `next build`                                                   | ✓ exit 0                                                                                                |
| `vitest run`                                                   | ✓ 46/46 (9 arquivos)                                                                                    |
| `eslint .`                                                     | ✓ 0 erros (23 warnings, todos em scripts legados de rodadas anteriores — nenhum em `src/**`/`tests/**`) |
| `prettier --check` em `src/**`, `tests/**` e scripts da rodada | ✓                                                                                                       |
| `playwright test` (suite completa, porta 3124)                 | ✓ **61 passou / 15 skipped / 0 falha**                                                                  |

Contratos novos/atualizados nesta rodada: inventário exato dos 7 ids da landing; contrato do rodapé (6 links + legal + `main.nextElementSibling === FOOTER`); crawl de links mortos; páginas legais com âncora absoluta; estados honestos de recuperação/redefinição/verificação sem token; auditoria de conteúdo que proíbe dígitos e dados de conta nas seções 08-11; tetos de altura e de tipografia das seções novas; upscale audit por bitmap servido (não `naturalWidth`).

Capturas mandatadas: `landing-1920-full.png`, `landing-390-full.png`, `login-1920/390`, `signup-1920/390`, `forgot-1920/390`, `reset-1920/390`, `verify-1920/390`, `onboarding-1920/390` — mais os estados honestos (`reset-sem-link`, `verify-sem-link`, `login-desconectado`, `signup-desligado`). Servidor efêmero em 3125 encerrado; o dev server do usuário não foi tocado.

Nenhum commit executado.
