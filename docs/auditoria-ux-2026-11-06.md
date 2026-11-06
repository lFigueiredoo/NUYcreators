# Revisão funcional e de UX/UI — 06/11/2026

## Escopo e método

Revisão da versão `bd9bb45`, do código das áreas pública, Creator e Admin, dos fluxos de autenticação, consentimento, conteúdos, pontos e Academia. Uso das skills Frontend Design e Playwright, plugin GitHub para conferir a CI, revisão cruzada de código, navegador Chromium, axe e stack Appwrite sintética isolada. A identidade visual NUY foi preservada.

Testes autenticados usam somente fixtures locais. Não houve escrita em dados de produção, migração de ACL, ativação de recursos ou publicação de Appwrite Functions nesta rodada.

## Problemas corrigidos

| Problema reproduzível | Correção | Onde produz efeito |
| --- | --- | --- |
| Login, cadastro, onboarding, perfil e envio perdiam campos após erro tratado pela action React | Campos controlados preservam a edição e o aceite | Deploy web |
| Menu mobile Admin permanecia aberto após escolher seção | Fecha na navegação, Escape e toque externo; Escape restaura o foco | Deploy web |
| Confirmação antiga reaparecia ao voltar a uma tela | Estado é encerrado na mudança de rota; mensagens iguais de uma nova ação são processadas | Deploy web |
| Menu Mais sobrepunha a página sem gestão modal de foco | Dialog nativo, fechamento acessível, restauração de foco/rolagem e fechamento no breakpoint desktop | Deploy web |
| Avatar perdia seu nome acessível quando o texto era ocultado no celular | Nome explícito da conta e retorno de foco no Escape | Deploy web |
| Tabela horizontal do Regulamento não recebia foco por teclado no celular | Região nomeada e focável para rolagem pelas setas | Deploy web |
| Tabela diária longa afastava os desafios publicados no celular | Regras em seção expansível por teclado, mantendo todos os formatos/pontos/limites | Deploy web |
| Cabeçalho da Academia dividia título e ações em colunas muito estreitas no celular | Título e ações empilhados em telas de até 520px | Deploy web |
| Selo de estado do editor da Academia tinha contraste 4,26:1 em texto pequeno | Dourado do texto escurecido, mantendo a paleta e superando 4,5:1 | Deploy web |
| Criadora não recebia o motivo de recusa ou ajuste informado pela equipe | Orientação visível no conteúdo e no detalhe; CTA de revisão; notas de aprovação permanecem internas | Deploy web |
| Editar a pontuação do catálogo alterava o histórico de créditos exibido | Créditos vêm do ledger associado aos envios exibidos; sem crédito, não se inventa pontuação | Deploy web |
| Callback malformado não apagava o token anterior no mesmo path | Expiração do cookie no path exato de recuperação/verificação | Deploy web |
| POST direto nas actions da Academia podia ignorar o reaceite legal | Gate legal antes da operação; equipe com papel confirmado preserva seu acesso | Deploy web |
| Reabrir onboarding permitia sobrescrever perfil concluído e preferência pública | Guardas na página, action e Function antes de gravações | Web imediato; proteção adicional depende da Function |
| Segundo pedido de revisão da mesma publicação colidia na outbox | Identificador do evento inclui a revisão; idempotência do crédito permanece por publicação | Código/bundle pronto; depende de Appwrite Functions |
| Instagram/TikTok eram gravados como plataforma `com` | Identificação do domínio e subdomínios conhecidos | Código/bundle pronto; depende de Appwrite Functions |
| Normalização de URL transformava valores codificados em novos parâmetros | Query é reencodada com URLSearchParams | Código/bundle pronto; depende de Appwrite Functions |
| Admin podia exibir saldo zero para creators recentes após mais de 100 contas | Contas consultadas pelo conjunto de creators da página | Código/bundle pronto; depende de Appwrite Functions |

## Verificações

- Tipagem, lint, build otimizado e empacotamento das nove Functions passaram.
- Suíte unitária: 316 testes passaram; após a revisão cruzada, foi acrescentado e aprovado um teste adicional de extrato com mais de 100 lançamentos. Total atual: 317 testes.
- Regressões finais focadas de consentimento, callback, onboarding e histórico: 29/29 passaram.
- E2E autenticado: 30/30 passaram, incluindo Academia, isolamento, permissões, mídia privada, consentimento, teclado e movimento reduzido.
- E2E público: 74 passaram; 14 cenários desktop foram pulados intencionalmente no projeto mobile.
- Responsividade adicional: nove telas Creator em 375/768/1440px (27 verificações) e sete telas Admin nas mesmas larguras (21 verificações), sem overflow horizontal.
- Menu mobile Admin: seleção de seção e Escape/foco confirmados no navegador; console sem erros.
- Login recusado preserva os campos, confirmado no navegador local.
- Axe na tela de desafios mobile após a correção do avatar: zero violações nas regras WCAG A/AA e 2.1 A/AA verificadas. Esse resultado é daquela tela/estado, não uma certificação do site inteiro.
- Lighthouse da home publicada, mobile: desempenho 91, acessibilidade 100, boas práticas 100, SEO 100; FCP 1,0 s, LCP 3,1 s, TBT 190 ms, CLS 0. Uma medição sintética, sem avisos; não representa todos os dispositivos/conexões.
- Evidências locais de navegador: `output/playwright/` (ignorado no Git).

## Pendências reais e limites

1. **Appwrite de produção:** o projeto permanece marcado `PRODUCTION_PROTECTED`. A publicação Vercel não atualiza as nove Functions. Correções de núcleo listadas acima exigem uma implantação de produção controlada; os bundles estão prontos. Não foi removido o guard.
2. **ACL legada do catálogo:** linhas existentes podem continuar com `read("any")`. O código novo usa `read("users")`, mas ainda é necessário inventário e migração seletiva, paginada, idempotente e com plano antes de aplicar. O provisioner geral não substitui essa migração.
3. **Regulamento:** permanece identificado como minuta. Os dados societários e datas fornecidos não são evidência de aprovação jurídica ou autorização promocional. Não foi declarado juridicamente validado nesta revisão.
4. **Atividades diárias:** a seção apresenta as regras solicitadas. Disponibilidade, aprovação e crédito dependem da operação publicada; não foi criada integração automática com redes sociais nesta revisão.
5. **Limite da prova:** QA com stub prova o comportamento do código e da interface, mas não atesta transações, escopos, permissões ou funcionamento das Functions antigas no servidor real.

Não houve falha reproduzível restante nos fluxos que concluíram os testes desta rodada. Isso não equivale a uma garantia de ausência absoluta de bugs, nem encerra as pendências de produção descritas acima.
