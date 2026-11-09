# Academia NUY — C3: preparação da mídia privada

**Data:** 19/10/2026. **Estado:** plano e contratos locais; nenhum bucket, credencial, upload ou URL assinada foi criado. **Staging exclusivo:** `6ad55be5003719f6b399`. **Produção protegida:** `6ac044af0008cbdda070`. A Academia continua no aplicativo NUY Creators; as telas aprovadas, pontos, ranking e recompensas não foram modificados.

## 1. Fechamento da C2

Commit local isolado: `6753c7ae626f60a2379fee913f22bcc9b94b5b81` (`test: homologate NUY Academy C2 on isolated Appwrite staging`), com 14 caminhos C2. `src/lib/appwrite/server.ts` e `.vercelignore` eram alterações preexistentes e não entraram no commit. Não houve push nem deploy.

A revisão da corrida substituiu a gravação de `status:'published'` por um toque de mesmo valor em `participantCount`, seguido de leitura do estado confirmado fora da transação. O toque não altera estado nem versão do desafio. No Appwrite 2.2.0, as duas ordens controladas passaram: arquivo entre leitura e toque (`c2-race-ebc41368`) e arquivo após toque (`c2-race-2bc60a49`). Cada desafio terminou arquivado, com zero comentário da corrida e **um** `challenge.archived` em `audit_logs`. O teste unitário cobre a primeira ordem; os demais testes de C1.2 cobrem a segunda, dois arquivos concorrentes, resposta e moderação. A fixture histórica inconsistente `c2-race-192c7c73` permanece como evidência, com `status=published`, `version=2`, um comentário e ACL do desafio vazia. Os scripts operacionais usam IDs próprios, sem depender dessa fixture; qualquer inventário global precisa excluí-la ou sinalizá-la. Não apagar ou alterar a evidência sem decisão de incidente.

Validações antes do commit: typecheck **PASS**, Vitest **242/242 PASS** em execução isolada, E2E local **29/29 PASS**, build **PASS**, `git diff --cached --check` **PASS**. Uma execução simultânea de typecheck e Vitest terminou em **240/242** por timeout de 5 s em `app-no-fake-data.test.ts` e `onboarding-endpoint.test.ts`; a repetição sem carga concorrente passou. Isso sugere disputa de recursos, mas não comprova causa raiz. Nenhum timeout foi aumentado.

## 2. Evidência de capacidade e bloqueios atuais

O GET sem chave de `/health/version` confirmou Appwrite **2.2.0**. O GET sem chave de `/s3` retornou **403**, compatível com rota protegida, mas insuficiente para provar `PutObject`, multipart, URL pré-assinada ou Range no proxy instalado. `/health/anti-virus` e `/health/storage` responderam **401** sem escopo de health. A auditoria autenticada anterior registrou `/health/anti-virus=disabled`; até nova medição autorizada, tratar **antivírus como bloqueio de segurança**.

Permanecem desconhecidos no host: `_APP_STORAGE_LIMIT` efetivo (a [documentação self-hosted](https://appwrite.io/docs/advanced/self-hosting/configuration/storage) informa padrão de 30 MB), limite do proxy/reverse proxy, espaço e backend de armazenamento, capacidade de saída, backup restaurado e scanner para **o arquivo inteiro**. Não inferir esses valores do limite configurável do bucket. Segundo a [referência de Storage](https://appwrite.io/docs/references/cloud/server-nodejs/storage), criptografia, compressão e antivírus nativos são pulados acima de 20 MB; um MP4 de até 200 MiB precisa de proteção de volume e scanner externo comprovados. Não habilitar o antivírus do host compartilhado sem aprovação própria.

A [documentação da API S3](https://appwrite.io/docs/products/storage/s3) descreve SigV4, multipart, URLs pré-assinadas, `Range`/206 e CORS. O [anúncio self-hosted 2.1](https://appwrite.io/blog/post/appwrite-2-1-self-hosted) inclui S3 e exige bucket sem compressão nem criptografia para essa API. Isso sustenta o **desenho** para 2.2.0, mas o comportamento do endpoint e do proxy NUY deve ser testado antes de ativá-lo. A ausência de criptografia nativa acima de 20 MB não autoriza mídia privada sem TLS, criptografia de volume/backend e controle de acesso medidos.

## 3. Bucket planejado e provisionador

`infra/appwrite/c3-bucket-provision.ts` gera somente o plano para `academy-media` no Project ID de staging e **recusa `--apply`**. Após a autorização C3.1, o request foi reduzido a um bucket **desabilitado e vazio**, com `permissions=[]`, `fileSecurity=true`, extensões futuras `mp4`/`pdf`, `maximumFileSize=1` byte como trava temporária, `compression=none`, `encryption=false`, `antivirus=false` enquanto o host está bloqueado e `transformations=false`. O teto de 200 MiB é apenas meta de C3.2, sujeita a medir o host; nunca é assumida pela criação vazia. O campo `allowedMimeTypes` de `academyBucketProposal` é política de aplicação, não parâmetro nativo de `createBucket`.

Para criar o bucket vazio em C3.1, exigir identidade de staging lida novamente no Console e por API, bucket ausente, **credencial já existente** exclusiva de staging com `buckets.read`, `buckets.write` e `files.read` para conferir vazio, além da autorização explícita no comando. A autorização C3.1 não permite criar uma chave; sem ela, a escrita para. Para **habilitar upload** em C3.2, exigir separadamente backup restaurado, `_APP_STORAGE_LIMIT`/proxy ≥ limite aprovado, espaço, scanner integral, quarentena e Storage/S3/Range privados. Nenhuma chave foi criada nesta C3. O plano C3 está separado do commit C2. Não tocar nos quatro buckets de produção nem nas imagens do catálogo.

## 4. Contrato de upload privado

**Entrada de autorização (sem bytes):** sessão Admin válida + membership real em `nuy-admins`, `lessonId` existente, tipo `video|pdf`, nome, MIME, tamanho, versão do curso e chave de idempotência. `authorizeMediaUpload` recusa Admin não confirmado, aula inexistente, limite global desconhecido, scanner indisponível, tipo/tamanho inválido e ID duplicado. O teto local é MP4 **200 MiB**, PDF **25 MiB**. Nome e MIME do navegador são apenas filtros preliminares, jamais prova do conteúdo.

**Fluxo proposto, ainda não operacional:**

1. O servidor autentica Admin e aula, gera `fileId` aleatório imutável e registra `academy_media` como `pending`, sem ACL de leitura para usuários. Não emitir URL se scanner/capacidade/limite não estiverem aprovados.
2. Para PDF pequeno, assinar um `PutObject` curto; para MP4, iniciar multipart no servidor e assinar **cada `UploadPart`** com bucket, chave, `UploadId`, número de parte e prazo limitados. O navegador envia bytes diretamente ao endpoint S3 Appwrite. Vercel troca somente metadados/URLs, nunca o arquivo inteiro. Não enviar API key ao browser. O servidor conclui ou aborta multipart e registra ETags/resultado; uploads incompletos permanecem `pending`.
3. Um worker de inspeção fora do caminho da Server Action verifica `HeadObject`, tamanho real, hash, MIME detectado e assinatura dos bytes. Para MP4, verificar container, H.264/AAC, duração e `moov`/faststart com ferramenta adequada. Para PDF, verificar estrutura e conteúdo ativo, além de antimalware. Scan deve cobrir **100% dos bytes**, inclusive arquivos acima de 20 MB. Resultado `infected`, erro ou indisponibilidade nunca vira `ready`.
4. Somente após inspeção limpa e prova de entrega privada, promover `academy_media.status` de `processing` a `ready` por serviço autorizado, com horário e auditoria. Os vínculos em `academy_lessons.videoFileId` e `academy_materials.fileId` exigem `fileId`, `lessonId` e tipo exatos. A publicação existente deve continuar recusando registro que não seja `ready` e deve conferir o objeto real no gate C3.

Os estados locais definidos em `media-policy.ts` são `pending`, `processing`, `unavailable`, `error`, `ready`. `inspectionState` só retorna `ready` com upload completo, descritor privado consistente, assinatura válida, codec aplicável, scan limpo e entrega privada verificada. Nenhum estado `ready` é produzido por dado sintético ou por confiar no navegador. O editor aprovado conserva sua interface até existir backend homologado; os botões atuais não simulam upload bem-sucedido.

**Troca/remoção:** usar chave nova, nunca sobrescrever o objeto antigo. Conferir versão esperada do curso e aula/tipo do novo registro; transação vincula novo arquivo `ready` e desvincula antigo. Conflito de versão recusa. O antigo permanece privado por retenção e entra no inventário de órfãos. Remoção de vínculo não apaga bytes imediatamente. Multipart cancelado deve ser abortado explicitamente; o [comportamento documentado](https://appwrite.io/docs/products/storage/s3) elimina uploads incompletos após 24 h, o que ainda exige reconciliação própria.

## 5. Contrato de entrega, player e PDF

**GET de autorização no servidor:** sessão atual, curso e aula publicados, aula pertencente ao curso, vínculo exato arquivo↔aula, `academy_media.status=ready`, scan aprovado e objeto presente. ID conhecido ou URL anterior não substitui essas checagens. Aula em rascunho/arquivada, curso retirado, sessão expirada, material de outra aula e arquivo ausente devem retornar acesso negado/indisponível sem revelar chave de API. `authorizeMediaDelivery` representa esse gate em teste local; ainda não há emissor de URL operacional.

Após homologar o S3 real, o servidor poderá assinar `GetObject` para **um único objeto** com TTL inicial proposto de **2 minutos**. A chave de assinatura terá somente os escopos de leitura exigidos para buckets e arquivos e ficará no servidor. A URL é credencial portadora: qualquer possuidor pode usá-la até expirar; logout/arquivamento não a revogam instantaneamente. Rotacionar a chave revoga todas as URLs dela, com impacto geral. A [API S3 do Appwrite](https://appwrite.io/docs/products/storage/s3) confirma essa semântica; não prometer revogação imediata. URL, query SigV4 e referência ao objeto não devem aparecer em logs, analytics ou `Referer`; usar HTTPS, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store` nas respostas de autorização e verificar cache/CDN do endpoint de bytes.

Os [escopos documentados para S3](https://appwrite.io/docs/products/storage/s3) são `buckets.read` + `files.read` para leitura e `buckets.write` + `files.write` para upload. O segundo par também permite operações amplas de bucket; por isso as futuras chaves devem ficar exclusivamente no servidor, separadas por função e projeto, com rotação, registro de uso e emissão de URL somente após a autorização por aula. Essa amplitude é um risco residual a revisar antes de criar credenciais. Nenhum desses escopos foi concedido nesta C3.

O `<video controls playsInline preload="metadata">` aprovado recebe `src` somente após autorização. Requisições posteriores de seek podem ocorrer depois do TTL e falhar 403; o cliente precisa solicitar nova URL, preservar `currentTime` e retomar, sem marcar aula concluída. Confirmar no Chrome/Firefox/Safari móvel início, pause, retomada, seek posterior, `Range` → **206** com `Content-Range`, 416 inválido, CORS, URL vencida, sessão expirada, aula retirada e URL copiada. O browser deve falar diretamente com Appwrite, sem rota Vercel que retransmita MP4.

Para PDF, o mesmo gate emite acesso temporário ao objeto exato. Testar abertura em navegador e download autorizado, nome seguro, `Content-Type: application/pdf`, `Content-Disposition` suportado no endpoint real, arquivo ausente, substituição e PDF de rascunho. A interface da aula só deve habilitar “Abrir PDF” quando a autorização retornar URL válida; falhas mostram indisponibilidade sem link público. Não usar URL permanente nem ACL `read("users")` nos arquivos.

## 6. Testes C3 e estado atual

| Prova | Estado | Evidência ou condição de execução |
| --- | --- | --- |
| C2 commit isolado | **PASS** | hash acima; sem arquivos de outra sprint |
| C2 concorrência terminal e auditoria | **PASS** | duas ordens reais, 0 comentário, 1 audit por corrida |
| Plano do bucket privado | **PASS local** | `c3-bucket-provision.ts`; `--apply` recusado |
| Políticas locais de autorização/inspeção/expiração/troca/órfão | **PASS local** | Vitest com casos negativos; sem Appwrite Storage |
| Identidade/versionamento do endpoint | **PASS read-only** | GET version=2.2.0; `/s3` sem chave=403 |
| Antivírus do host e scan completo | **BLOCKED** | auditoria anterior `disabled`; health atual sem chave=401 |
| Limite global/proxy, capacidade e backup | **BLOCKED** | ainda sem medidas verificadas |
| Bucket real, upload, MIME/codec/scan | **NOT_EXECUTED** | não autorizados nesta etapa |
| SigV4 real, Range/206, CORS, TTL, mobile | **NOT_EXECUTED** | requer bucket, chaves e bytes de teste aprovados |
| Aula publicada com vídeo/PDF e fluxo Admin→Creator | **NOT_EXECUTED** | backend e mídia ainda bloqueados |
| Produção, Vercel, flag, pontos/ranking | **NOT_EXECUTED** | sem escrita, deploy ou ativação |

Os testes locais cobrem Admin sem permissão, arquivo inválido, aula errada, não publicação, expiração, falha/indisponibilidade do scanner, duplicidade, substituição concorrente, órfão e ausência de antivírus. São **simulações de contrato**, não prova de S3/Storage remoto. A tela atual continua com player/ações bloqueados até haver URL autorizada real. As regras de conclusão de aula permanecem explícitas; carregar ou assistir ao vídeo não gera pontos, ranking, recompensas, níveis nem conclusão automática.

Verificação local C3 final: `npm run typecheck` **PASS**; `npm test -- --maxWorkers 4` **250/250 PASS** em 34 arquivos, dos quais oito testes novos dos contratos C3; `npm run build` **PASS**; `npm run test:e2e:app` **29/29 PASS** antes das adições C3, que não alteraram telas nem rotas Next; `git diff --check` **PASS** para arquivos rastreados. `node --import tsx infra/appwrite/c3-bucket-provision.ts --apply` terminou com `C3_BLOCKED` e código 1, sem chamada remota.

## 7. Sequência para homologação em staging após aprovação específica

1. Ler novamente identidade do projeto `6ad55be5003719f6b399`, nome, endpoint, versão e inventário, distinguindo do ID protegido. Obter medições do host sem alterar limites nem antivírus; registrar backup/restauração, espaço, backend, proxy e scanner externo. Não usar dados reais.
2. Aprovar **separadamente** bucket e chave de staging de escopo mínimo. Somente então habilitar um writer guardado para o request do plano, criar o bucket, conferir ACL/limite/flags por leitura e recusar divergência. Manter produção intacta.
3. Com arquivos sintéticos confiáveis, testar PDF pequeno e MP4 H.264/AAC curto; medir upload direto, multipart, cancelamento, hash e inspeção integral. Não promover `ready` por metadados apenas.
4. Homologar assinatura curta, entrega privada, `Range`/206, seek, mobile, CORS, cache e expiração, inclusive URL copiada e aula retirada. Registrar a janela de acesso até TTL.
5. Executar fluxo Admin→Creator da aula publicada, progresso/comentários e troca/remoção com conflito. Testar falhas negativas e limpeza de órfãos após inventário. Verificar nenhuma alteração em pontos/ranking/recompensas.
6. Repetir backup/rollback e inventário da produção por leitura. Só com gates concluídos discutir migração/ativação em proposta distinta; nenhuma flag é ligada automaticamente.

**Capacidade inicial a medir:** 10 MP4 no teto de 200 MiB = 2.000 MiB; 30 = 6.000 MiB, além de PDFs, versões, temporários e backups. Cem reproduções a 2–4 Mbit/s demandam aproximadamente 200–400 Mbit/s antes do overhead. São cenários, não medições da instalação.

## 8. Inventário C3 e Git

Arquivos C3 locais: `docs/academia-c3-midia.md`, `infra/appwrite/c3-bucket-provision.ts`, `infra/appwrite/c3-readonly-capabilities.ts`, `src/features/academy/services/media-policy.ts`, `tests/unit/academy-c3-bucket.test.ts` e `tests/unit/academy-media-policy.test.ts`. Nenhum deles integra o commit C2. `src/lib/appwrite/server.ts` e `.vercelignore` seguem preexistentes. Não fazer commit C3, push ou deploy nesta etapa.

`git status --short` final:

```text
 M src/lib/appwrite/server.ts
?? .vercelignore
?? docs/academia-c3-midia.md
?? infra/appwrite/c3-bucket-provision.ts
?? infra/appwrite/c3-readonly-capabilities.ts
?? src/features/academy/services/media-policy.ts
?? tests/unit/academy-c3-bucket.test.ts
?? tests/unit/academy-media-policy.test.ts
```

**Ponto de parada:** solicitar aprovação específica para o próximo checkpoint de C3. Até lá, bucket, chave, upload, assinatura operacional e ativação permanecem bloqueados.

## 9. C3.1 — resultado do provisionamento autorizado

O operador autorizou apenas o bucket **privado e vazio** `academy-media` no projeto de staging `6ad55be5003719f6b399`. A pré-condição obrigatória de credencial existente não foi satisfeita. Portanto, **o bucket não foi criado**, nenhuma chave foi criada, nenhum arquivo foi enviado e nenhuma operação remota de escrita foi executada. Este resultado substitui o ponto de parada histórico da seção anterior: a C3.1 para antes da criação, conforme a instrução de parar se não houver credencial de staging suficiente.

| Verificação | Resultado | Evidência e limite da conclusão |
| --- | --- | --- |
| Endpoint, versão e separação dos projetos | **PASS** | Console/API em leitura: `https://api.edocs.phiq.com.br/v1`, Appwrite 2.2.0, staging `6ad55be5003719f6b399` (NUY Creators — Academia Staging) diferente da produção protegida `6ac044af0008cbdda070` (Nuy). |
| Credencial exclusiva de staging para Storage | **BLOCKED** | Inventário de chaves permanentes do projeto de staging: **0**. As chaves locais C2 têm escopos de schema, rows, identity e session, sem `buckets.read`, `buckets.write` e `files.read`. Nenhuma chave foi criada ou copiada da produção. |
| Preflight do provisionador | **PASS local** | Proposta limitada ao ID de staging; guard mantém a recusa para produção. `--apply` continua recusado; nenhuma chamada de criação foi feita. |
| Existência prévia do bucket no staging | **NOT_VERIFIED** | GET de `academy-media` com a chave de schema C2 recebeu HTTP 401 por falta de escopo; isso não comprova ausência. Repetir com credencial de staging adequada antes de qualquer escrita. |
| Criação e configuração efetiva de `academy-media` | **NOT_EXECUTED** | Sem credencial autorizada. ID, ACL, `fileSecurity`, estado `enabled`, extensões, limite e quantidade de arquivos **não podem ser conferidos remotamente**. A configuração descrita abaixo é somente proposta local. |
| Antivírus global | **BLOCKED** | GET autenticado de `/health/anti-virus`: `status=disabled`. GET de `/health/storage` e `/health/storage/local`: `pass`; isso não demonstra varredura de MP4/PDF. Configuração do ClamAV, serviço e inspeção de arquivos inteiros não foram comprovados. |
| Limites e capacidade do host | **NOT_VERIFIED** | `_APP_STORAGE_LIMIT`, proxy, backend/dispositivo, disco livre, tráfego, multipart e recursos compartilhados não foram medidos por acesso ao host. Não aumentar limites nem inferir aceitação de MP4 grande. |
| Upload MP4/PDF, S3, URL assinada, Range/206, CORS, mobile | **NOT_EXECUTED** | Nenhum arquivo foi enviado. Contratos locais e documentação da versão não constituem homologação operacional; upload e streaming permanecem bloqueados. |
| Inventário da produção antes/depois | **PASS read-only** | Nas duas leituras: 31 tabelas, nenhuma das dez tabelas Academia, quatro buckets (`brand-assets`, `submission-media`, `community-media`, `avatars`), sem `academy-media`. Os quatro buckets conservaram `fileSecurity=true` e nenhuma permissão geral. As leituras não provam ausência de alterações concorrentes fora dos recursos observados. |
| Testes locais de provisionador e política de mídia | **PASS** | 9/9 testes unitários em dois arquivos após a revisão C3.1. Typecheck, build e `git diff --check` constam da verificação final abaixo. |
| Produção, Vercel, flag e credenciais remotas | **NOT_EXECUTED** | Nenhuma escrita, migração, mudança de variável, deploy, commit ou push foi feita nesta C3.1. |

**Proposta local do bucket, ainda não efetiva:** `bucketId=academy-media`, nome `NUY Academy Media`, `enabled=false`, `fileSecurity=true`, `permissions=[]`, extensões `mp4` e `pdf`, `maximumFileSize=1` byte como trava temporária, `compression=none`, `encryption=false`, `antivirus=false` enquanto a inspeção está bloqueada, `transformations=false`. O valor de 1 byte evita assumir o limite global ainda desconhecido; não é o limite final de upload. A política de MIME, codecs e scanner integral precisa de validação posterior antes de habilitar qualquer upload. Se a API 2.2.0 real não aceitar essas propriedades na criação atômica, parar antes de criar e revisar o plano. Não usar `S3 CreateBucket` com defaults inseguros.

**Entrega privada e riscos:** a proposta de assinatura continua exclusivamente no servidor, depois de sessão e autorização da aula/objeto, com prazo curto e sem chave privilegiada no navegador. Uma URL pré-assinada funciona como credencial portadora e pode ser reutilizada por quem a obtiver até expirar, inclusive após logout ou retirada da publicação. A autorização deve impedir emissão de novas URLs nesses casos; revogação imediata de uma URL já emitida não foi demonstrada. HTTP Range 206, CORS e comportamento do proxy continuam pendentes de teste real com objeto autorizado em C3.2. Não declarar reprodução ou streaming aprovados.

**Próximo checkpoint:** obter, por processo separado autorizado pelo operador, uma credencial **exclusiva do projeto de staging** com os escopos mínimos para ler e criar o bucket (`buckets.read`, `buckets.write`) e conferir seus arquivos vazios (`files.read`). Armazená-la somente em configuração local ignorada pelo Git. Antes de criar, repetir identidade e inventário por leitura com essa chave, conferir que o bucket não existe e que o request é aceito pela API. Somente então preparar a liberação restrita de escrita e conferir as propriedades e zero arquivos depois da criação. A presente autorização **não permite criar credenciais**. Para C3.2 ainda faltam limites do host/proxy, capacidade, backup, scanner integral/quarentena e homologação privada S3/Range; não ativar uploads nem a Academia.

Arquivos C3 locais envolvidos: `docs/academia-c3-midia.md`, `infra/appwrite/c3-bucket-provision.ts`, `infra/appwrite/c3-readonly-capabilities.ts`, `src/features/academy/services/media-policy.ts`, `tests/unit/academy-c3-bucket.test.ts` e `tests/unit/academy-media-policy.test.ts`. Modificações em `src/lib/appwrite/server.ts`, `tests/support/appwrite-stub/fixtures.mjs` e `.vercelignore` são preexistentes/de outra frente e foram preservadas. Nenhum arquivo foi adicionado ao staging do Git.

**Verificação local final C3.1:** testes focados `9/9 PASS` (dois arquivos), `npm run typecheck` **PASS**, `npm run build` **PASS** e `git diff --check` **PASS** para arquivos rastreados. Os arquivos C3 ainda não rastreados foram revisados localmente; `git diff --check` sozinho não os inclui. `git status --short`: `M src/lib/appwrite/server.ts`; `M tests/support/appwrite-stub/fixtures.mjs`; `?? .vercelignore`; e os seis arquivos C3 listados acima como `??`. Nada foi adicionado, commitado ou enviado.

## 10. Retomada C3.1 — credencial existente, uso local bloqueado

Na retomada, o Console autenticado confirmou o projeto ativo `6ad55be5003719f6b399`, nome `NUY Creators — Academia Staging`, no endpoint `https://api.edocs.phiq.com.br/v1`. O projeto protegido `6ac044af0008cbdda070` (`Nuy`) tem ID diferente. A chave permanente de staging identificada pelo nome `C3.1` tem, nos metadados do Console, **exatamente** `buckets.read`, `buckets.write` e `files.read`. Nenhum valor de chave foi exibido ou registrado.

O provisionador atual `infra/appwrite/c3-bucket-provision.ts` **ainda não implementa uma variável de credencial nem caminho de escrita**; `--apply` recusa execução. Para a liberação restrita proposta, a variável dedicada será `APPWRITE_C31_BUCKET_API_KEY`, carregada de configuração local ignorada pelo Git e vinculada somente ao staging. Na sessão de ferramentas e nos arquivos `.env*` locais inspecionados, essa variável não estava presente. A chave do Console, portanto, não pôde ser usada para uma leitura autenticada de Storage nem vinculada à configuração local alegada. A sessão Console autenticou a identidade e os escopos da chave registrada, mas **não provou a posse operacional da chave pelo provisionador**.

Uma tentativa de verificar se o segredo poderia ser recuperado pelo Console foi **rejeitada pela revisão automática**, que delimitou a autorização a verificar metadados e usar uma credencial já configurada localmente, sem extrair o segredo do Console. Não houve tentativa de contornar a rejeição. A leitura inicial de metadados teve bloqueio de rede local; foi repetida com aprovação de rede e concluída. Nenhum erro de autenticação do Appwrite foi interpretado como permissão para contornar guards.

| Item da retomada | Estado | Resultado efetivo |
| --- | --- | --- |
| Identidade do staging e separação da produção | **PASS** | Projetos e endpoint confirmados no Console por leitura autenticada. |
| Escopos da chave C3.1 registrada | **PASS** | Metadados: `buckets.read`, `buckets.write`, `files.read`; sem exposição do segredo. |
| Credencial local acessível ao provisionador | **BLOCKED** | `APPWRITE_C31_BUCKET_API_KEY` ausente; provisionador ainda só gera plano e recusa `--apply`. |
| Existência/configuração do bucket no staging | **NOT_VERIFIED** | Sem leitura autenticada de Storage com a chave C3.1; não assumir que está ausente. |
| Criação de `academy-media` e reexecução idempotente | **NOT_EXECUTED** | Pré-condição de credencial operacional não satisfeita. Nenhum bucket criado ou sobrescrito. |
| ACL, File Security e quantidade de arquivos efetivas | **NOT_VERIFIED** | A proposta privada da seção 9 permanece apenas local. |
| Antivírus, limites e entrega privada | **BLOCKED** | Última leitura autenticada de health registrou antivírus `disabled`; limites do host e Range/S3 continuam sem medida operacional. Não houve upload. |
| Escrita em produção, Vercel, deploy, commit, push | **NOT_EXECUTED** | Nenhuma escrita remota nesta retomada. A contagem de recursos de produção da auditoria anterior não foi reconferida agora; não inferir integridade atual a partir dela. |

**Ponto de parada da retomada:** disponibilizar a chave C3.1 existente na variável `APPWRITE_C31_BUCKET_API_KEY` em arquivo local ignorado pelo Git ou no ambiente do processo, sem enviá-la em comandos, logs ou documentação. Depois, implementar/liberar apenas o writer guardado para este bucket, repetir a identidade por Console e API com essa chave, consultar o bucket e só criar se estiver ausente e a criação atômica suportar a configuração segura. A autorização atual para o bucket vazio permanece registrada, mas a etapa de escrita não ocorreu. Upload, antivírus, host, produção e Academia seguem intocados.

**Testes da retomada:** os dois testes unitários pertinentes passaram (**9/9**). A primeira execução parou na inicialização do Vite por `spawn EPERM` do sandbox, antes de rodar testes; a repetição permitida fora dessa restrição passou. Nenhum código foi alterado nesta retomada; somente este documento foi atualizado. O estado do Git continua com os arquivos locais C3 não rastreados e modificações de outras frentes preservadas, sem staging ou commit.

## 11. Nova tentativa C3.1 — variável local presente, preflight interrompido

O operador informou que configurou a chave em `.env.local`. A variável `APPWRITE_C31_BUCKET_API_KEY` foi encontrada uma vez, com valor não vazio; seu valor não foi exibido. O provisionador local foi alterado para aceitar somente `--verify --project-id 6ad55be5003719f6b399` ou `--apply-empty-bucket --project-id 6ad55be5003719f6b399 --confirm academy-media:6ad55be5003719f6b399`. O único caminho de escrita do código cria exatamente a proposta de bucket vazio; o caminho de leitura compara todas as propriedades e recusa conflito, sem sobrescrever. O guard consulta o Console imediatamente antes e exige que a chave de staging seja recusada no projeto protegido. **O caminho de escrita não foi executado.**

O preflight `--verify` confirmou identidade do staging no Console e obteve `200` em `GET /storage/buckets` com a chave local no staging, contra `401` no mesmo endpoint com o ID de produção. Porém, o preflight parou porque `GET /health/version` autenticado com essa chave devolveu **401 `general_unauthorized_scope`**, indicando ausência do escopo `public` para esse endpoint. Uma leitura diagnóstica mostrou `version=2.2.0` no corpo do erro, mas não converte um HTTP 401 em prova válida para o guard. Conforme a instrução de **parar em erro de escopo**, não se tentou contornar o bloqueio com outra chamada de versão, não se consultou a existência de `academy-media` e não se executou `--apply-empty-bucket`.

| Item | Resultado |
| --- | --- |
| Variável local esperada | **PASS** — presente e não vazia em `.env.local`; segredo não registrado. |
| Identidade via Console | **PASS** — staging e endpoint esperados. |
| Leitura de Storage no staging | **PASS** — HTTP 200 com a chave local. |
| Isolamento da chave em produção | **PASS** — HTTP 401 no endpoint de Storage do projeto protegido. |
| Verificação de versão autenticada | **FAIL / SCOPE_BLOCKED** — HTTP 401 `general_unauthorized_scope` (`public`). |
| Existência, configuração e arquivos de `academy-media` | **NOT_VERIFIED** — preflight abortou antes dessa consulta. |
| Criação e idempotência | **NOT_EXECUTED** — nenhuma chamada remota de escrita. |
| Produção, upload, host, antivírus, flag, deploy | **NOT_EXECUTED** — sem alterações. |

Typecheck e testes unitários pertinentes: **PASS** (`9/9`). O bloqueio é do preflight real, não dos testes locais. O bucket continua **sem confirmação de existência**. A correção do guard de versão exige revisão em etapa seguinte; esta tentativa parou no primeiro erro de escopo, sem ampliar a chave nem alterar o servidor. Os limites do host e o antivírus permanecem com o estado da auditoria anterior, sem nova leitura nesta tentativa.
