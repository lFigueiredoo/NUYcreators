# NUY Creators — fluxos e invariantes

Status: fluxos aprovados; implementação inicial limitada a autenticação/onboarding, ainda sem testes conectados ao Cloud. Fluxos financeiros abaixo são especificações futuras. Comandos validam Zod e autorização no backend. Erros de integração não são convertidos em dados vazios silenciosamente.

## Autenticação e onboarding

1. Cadastro no Appwrite Auth com email/senha e nome; aceitar termos versionados.
2. Estabelecer sessão SSR segura e enviar verificação de email.
3. Onboarding coleta telefone, cidade, UF, nascimento, nicho, tipo de creator e redes opcionais.
4. Function cria/atualiza os documentos do próprio usuário, com unicidade por authUserId. Conta de pontos inicial é prevista para a etapa financeira posterior, não escrita pelo handler atual.
5. Recuperação usa fluxo Appwrite e redirecionamentos permitidos; respostas não revelam existência de conta.
6. Perfis sociais informados manualmente exibem estado não verificado. Conexão OAuth requer integração autorizada por cada plataforma.

Sem transação entre Auth e Databases, criação de perfil deve ser reexecutável e reconciliada. Não declarar signup inteiro atômico. Conta incompleta retoma onboarding; nenhuma operação financeira depende de perfil parcialmente inicializado.

## Participação no desafio

1. Consultar desafio publicado e autenticar usuário.
2. Backend verifica email/conta habilitada, datas, nível derivado e requisitos.
3. Transação verifica limite, insere participante único e atualiza contador com controle de conflito.
4. Repetição retorna participação existente; excesso de capacidade é rejeitado.

## Submissão e revisão

1. Usuário escolhe link permitido ou upload privado.
2. Backend verifica ownership do participante, prazo, requisitos, limites e integridade da mídia.
3. Normaliza link e calcula fingerprint; índice único bloqueia duplicidade conforme política.
4. Cria submissão pending e histórico na mesma transação.
5. Revisão mantém ID lógico e incrementa revision; conteúdo anterior permanece em histórico privado.

Estados permitidos: pending -> approved/rejected/revision_requested; revision_requested -> pending após reenvio. Reabrir rejeição requer comando administrativo explícito e auditado. Approved é terminal para este fluxo; revogação exige um fluxo separado de reversão, não edição silenciosa.

Upload órfão é limpo por job após retenção segura. Mídia não é pública só porque a submissão foi enviada.

## Moderação e aprovação

1. Verificar role, motivo quando necessário e estado/revisão esperada.
2. Carregar desafio, participante, conta de pontos e regras no backend; não aceitar points/userId de crédito vindos do cliente.
3. Abrir transação e verificar operação idempotente.
4. Aprovar submissão com controle de versão e inserir crédito determinístico por submissão.
5. Atualizar snapshot de saldo/pontos elegíveis e calcular nível com configuração backend.
6. Gravar histórico, audit log e outbox na mesma transação.
7. Commit único; em conflito, revalidar antes de retry limitado. Nenhum crédito parcial.
8. Consumidor outbox atualiza projeção de ranking e cria notificações por eventKey único; falhas são reprocessáveis.

Ranking público pode ter atraso de projeção documentado; a transação garante crédito e evento durável. Saldo e nível usados em elegibilidade vêm da fonte transacional, nunca do ranking eventual.

Rejeição e solicitação de revisão gravam histórico, motivo, auditoria e evento sem gerar pontos. Publicação no feed depende de consentimento e mídia aprovada, não é consequência incondicional de qualquer aprovação.

## Pontos e ajustes

Créditos/débitos são inteiros e imutáveis. Snapshot é alterado apenas junto à transação do ledger. Ajuste administrativo requer role específica, motivo, referência e auditoria; débito que faria saldo negativo é rejeitado.

Reconciliação recalcula saldo/progresso do ledger e detecta divergências. Reparos são controlados, auditados e coordenados com escritores concorrentes, nunca uma sobrescrita cega.

## Ranking

Consultar ranking_entries por período geral ou mensal. Somar apenas créditos elegíveis e reversões atribuídas ao período correto. Débito de recompensa não reduz pontos conquistados; estorno de resgate não aumenta ranking.

Timezone e desempate são definidos pelo backend. Jobs podem reconstruir projeções do ledger e finalizar períodos. Sem participantes elegíveis, apresentar ranking vazio.

## Resgate

1. Mostrar catálogo real; usuário escolhe recompensa e confirma a intenção.
2. Backend valida identidade, disponibilidade, janela, limite por pessoa e endereço se exigido.
3. Ler preço e estoque atuais no backend. Se preço mudou desde confirmação, pedir nova confirmação em vez de cobrar silenciosamente.
4. Transação disputa escrita/versionamento da conta, estoque e contador de limite por pessoa.
5. Verificar saldo >= custo, estoque > 0 e limite disponível; inserir pedido requested, débito único, snapshot da recompensa/endereço, histórico, auditoria e outbox.
6. Commit; caso contrário rollback integral. Repetição da intenção retorna o mesmo pedido.
7. Notificar usuário e encaminhar processamento após commit.

Status: requested -> processing -> shipped -> delivered. Cancelamento permitido em requested/processing segundo política; shipped/delivered não voltam silenciosamente para cancelled.

Cancelamento válido cria estorno único, repõe estoque uma única vez conforme política e atualiza pedido/histórico/auditoria/outbox em transação. Estorno tem rankingDelta zero. Dados de frete e contatos são privados.

## Administração

Dashboard consulta métricas agregadas reais: cadastrados, creators ativos, recebidos/aprovados, desafios concluídos, pontos distribuídos e resgates. Definir creator ativo como participação/submissão no período selecionado, sem confundir conta cadastrada com ativa.

Gráficos agregam intervalos e usam timezone configurado. Sem atividade, estado vazio; backend indisponível, estado de erro. Cada comando sensível registra ator verificado, ação, alvo, valores relevantes antes/depois, motivo, data, correlationId e IP confiável quando disponível. Não aceitar IP/actorId informados livremente pelo cliente; mascarar PII e nunca registrar tokens.

## Notificações e eventos

Eventos preparados: aprovação, recusa, revisão solicitada, novo desafio, mudança de nível, resgate, envio e Top 10. Consumidores verificam estado canônico e usam chave de entrega única. Broadcasts de novo desafio são paginados e opt-in quando aplicável. Top 10 deve ter política de período fechado para evitar notificações repetidas por oscilação do ranking.

## Testes obrigatórios

- Aprovação repetida/concurrente gera exatamente um crédito e um histórico de transição válido.
- Falha no meio da aprovação reverte todas as escritas transacionais.
- Resgates concorrentes com saldo insuficiente: apenas operações financiadas fazem commit.
- Última unidade de estoque: somente um pedido confirmado.
- Limite por pessoa continua válido sob concorrência.
- Mesmo request com chave diferente não duplica crédito de aprovação; mesma chave/payload retorna resultado existente.
- Cancelamento repetido não duplica estorno nem estoque.
- Ranking ignora débitos e estornos de compra, respeita período/timezone e empate.
- Limites de níveis testados em 0, 500, 501, 1500, 1501, 3000, 3001, 5000 e 5001 com configuração backend.
- Usuário não acessa perfil privado, submissão, extrato, favorito ou pedido alheio.
- Usuário não consegue escrever ledger/status/estoque via SDK direto.
- Moderador/fulfillment não ganham privilégios administrativos gerais.
- URLs duplicadas, upload inválido e replay incompatível são rejeitados.
- E2E: cadastro -> onboarding -> participação -> submissão -> moderação -> extrato -> resgate.

Testes de concorrência, rollback e permissões precisam do Appwrite real em ambiente isolado. Mocks unitários não comprovam garantias transacionais de produção.
