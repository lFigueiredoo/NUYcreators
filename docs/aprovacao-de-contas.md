# Aprovação de contas pelo admin

## Fluxo

1. A pessoa cria a conta, aceita os documentos vigentes e confirma o e-mail.
2. Preenche o perfil e as redes que quiser declarar. O cadastro fica `pending_review`.
3. Em **Admin → Aprovar contas**, a equipe com papel `admin` confere a solicitação.
4. Aprovar muda o estado para `active`. Recusar exige motivo e muda para `rejected`.
5. A creator consulta a situação em `/aguardando-aprovacao`. Após aprovação, segue para o painel; na recusa, vê o motivo e o contato de suporte.

Contas já ativas foram preservadas. O formulário público cria uma identidade autenticável para verificar o e-mail e preencher o perfil; isso ainda não libera participação na comunidade. Nenhum e-mail automático de aprovação/recusa é prometido: a decisão está na própria tela de consulta.

## Administração

- A rota `/admin/aprovacoes` e sua action exigem a capacidade `review-creators`, exclusiva do papel `admin` confirmado em `nuy-admins`.
- Moderadoras, fulfillment e creators não podem decidir sobre cadastros.
- Abas: aguardando análise, aprovadas e recusadas.
- Fichas: nome, e-mail, cidade, nicho, tipo de creator e redes declaradas. Rede declarada não equivale a verificação OAuth.
- Perfil incompleto não pode ser aprovado. Uma recusa pode ser revista pelo admin depois que houver perfil completo.
- A página usa cursor e apresenta continuação mesmo quando uma varredura não encontra solicitações. Não exige índice novo.

## Persistência e controles

Não há migração de tabelas/colunas. `users.status` é a fonte de autorização. Os metadados ficam em uma linha privada de `platform_settings`, com chave `creator-application:<userId>` e ID derivado por hash. Preferências editáveis do Auth, cookies, query strings e campos do formulário não concedem aprovação.

A decisão, o motivo e a auditoria são gravados na mesma transação. O onboarding grava perfil e redes transacionalmente e conflita com uma decisão concorrente, impedindo que um envio atrasado substitua o perfil validado. Nenhuma conta de pontos é criada pelo cadastro.

O painel, as actions de participação/Academia e a rota de mídia verificam a conta ativa. As Functions `join-challenge`, `submit-content` e `redeem-reward` precisam executar o host atualizado, que confere usuário ativo e consentimento vigente; a Function `complete-onboarding` cria contas de domínio pendentes, nunca as ativa automaticamente.

## Publicação do backend

O provisionamento e os testes de staging continuam protegidos por `PRODUCTION_PROTECTED`. A rotina separada `infra:deploy:approval:production` publica apenas o código das quatro Functions necessárias ao fluxo, com projeto explícito, SHA completo igual ao HEAD, marker privado e postura de acesso conferidos.

Sem `--apply`, a rotina somente lê. Com `--apply`, extrai o commit para diretório temporário validado, compila e empacota exatamente aquele código, envia quatro deployments inativos, exige todos prontos e reconfere os IDs antigos. Alinha exclusivamente a variável existente `NUY_TERMS_VERSION` da Function de onboarding à versão já publicada e contida no commit, preservando sua visibilidade. A idade mínima é conferida e não é alterada. Ativa primeiro os três gates e por último o onboarding. Não migra schema, altera dados/ACL, muda outras variáveis, altera permissões de execução ou apaga deployments antigos.

Os IDs anteriores e novos são retornados no relatório da publicação. Em falha parcial, a rotina para; não restaura automaticamente uma Function que volte a permitir participação sem a aprovação.

## Verificação

Testes de unidade cobrem papéis, origem, identidade forjada, recusa motivada, perfil incompleto, preservação de contas antigas, paginação, isolamento, conflitos e vínculo do deploy ao commit/projeto. A verificação de navegador usa apenas fixtures locais, sem cadastrar ou decidir sobre pessoas reais em produção.
