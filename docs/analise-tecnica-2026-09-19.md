# Análise técnica — Portal Financeiro

Data: 19/09/2026. Escopo: código da aplicação web, serviços backend, persistência, autenticação, configuração local, Docker, workflows, backup e configuração dos projetos móveis.

## Parecer

A aplicação compila e a suíte existente passa, mas há falhas de autorização e integridade que precisam ser tratadas antes de considerar o sistema pronto para produção. Os testes atuais cobrem uma parte pequena dos fluxos reais. Os ajustes desta análise ficaram concentrados na execução local; os problemas de negócio e segurança abaixo continuam pendentes, salvo indicação explícita.

## Arquitetura e funcionalidades

| Componente | Implementação e responsabilidade |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, CSS próprio e Chart.js. Dashboard, transações, categorias, membros, acertos, relatórios, metas mensais, preferências de cookies e anúncios. |
| Identity | Express, Clerk, Prisma. Resolve a identidade externa, cria/vincula usuários locais e recebe webhook de exclusão. |
| Finance | Express, Clerk, Prisma, Zod parcial. CRUD financeiro, recorrências, membros, categorias, orçamento e operações internas de inicialização/exclusão. |
| PostgreSQL | Uma base `finance_db`, com schemas `identity` e `finance`. Existem seis tabelas locais: User, UserIdentity, Transaction, Category, GroupMember e BudgetRule. |
| Gateway | Nginx encaminha `/api/*` para os serviços e `/` para a interface. Inclui limites de requisições e suporte a WebSocket. |
| Produção | Compose separado, imagens publicadas por GitHub Actions, Cloudflared, Watchtower, Portainer e backup para R2. Configuração inspecionada, sem iniciar esses serviços. |
| Mobile | Projetos Capacitor 8 para Android/iOS; não foram compilados nesta análise. |

O fluxo autenticado é: Clerk no navegador → token Bearer → `/api/auth/me` → usuário local → consultas financeiras. O finance-service faz SQL direto em `identity."UserIdentity"`; portanto, os serviços têm separação de código e schemas, mas permanecem acoplados ao mesmo banco e ao modelo de identidades.

Há boas bases: camadas de domínio/aplicação/infraestrutura, consultas Prisma parametrizadas, verificações de proprietário nos casos de atualização/exclusão individuais, transação de banco na limpeza financeira e verificação de assinatura Svix no webhook.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Build local frontend | Passou; bundle JS principal de aproximadamente 630 kB, 186 kB gzip. |
| Build local identity | Passou, com geração Prisma. |
| Build local finance | Passou, com geração Prisma. |
| Lint frontend | Passou. |
| Testes frontend | 10 passaram, em 2 arquivos. |
| Testes identity | 14 passaram, em 3 suítes. |
| Testes finance | 23 passaram, em 3 suítes. |
| Compose | Configuração validada e PostgreSQL local saudável. |
| Build Docker | Imagens de frontend, identity e finance construídas com sucesso. |
| Nginx | `nginx -t` passou. |
| HTTP | `/` na porta 8080 e `/health` nas portas 3001/3002 retornaram 200. `/api/auth/me` e `/api/transactions` retornaram 401 sem sessão, como esperado. O proxy direto do Vite na porta 80 também encaminhou `/api/auth/me` corretamente. |
| Navegador | Tela de boas-vindas e formulário real de login Clerk carregaram em `http://localhost:8080`, com a indicação Development mode. |
| Provas isoladas | Confirmadas incompatibilidade de recorrência diária, validações permissivas, salto de mês e orçamento inválido. Sem gravação no banco. |

Total: **47 testes existentes aprovados**. A cobertura exibida por Jest (90,1% de statements no identity e 94,36% no finance) refere-se aos arquivos carregados pelos testes; não representa cobertura integral dos serviços, pois falta `collectCoverageFrom` abrangente. O teste de criação de usuário tentou acessar `finance-service` sem mock de `fetch`, registrou `ENOTFOUND` e ainda passou. O teste de App substitui o provider e o layout por mocks; não exercita autenticação nem dashboard.

## Achados prioritários

### P0 — Vínculo público de identidade permite acesso indevido a contas

`apps/backend/identity-service/src/server/server.ts:41` expõe `POST /users` sem middleware de autenticação. O gateway publica essa rota em `/api/users`. O `UserController` aceita email, provider e providerId do corpo, e `GetOrCreateUser.ts:12` vincula a identidade recebida ao usuário encontrado por email, sem demonstrar a posse daquele email.

Impacto: alguém que conhece o email de uma conta pode tentar associar sua própria identidade Clerk a ela. O middleware financeiro passa a resolver essa identidade para o usuário da vítima. É um problema de autorização identificado pelo encadeamento do código; nenhuma conta real foi alterada para demonstrá-lo.

Correção: remover a rota legada se não for necessária ou exigir sessão Clerk e derivar identidade/email verificado do provedor, sem confiar nesses campos enviados pelo cliente. Testar isolamento entre duas contas.

### P0 — Segredos presentes em arquivos rastreados pelo Git

`git ls-files` confirmou os `.env.local` dos dois backends no índice; eles contêm `CLERK_SECRET_KEY`, `JWT_SECRET` e, no identity, `CLERK_WEBHOOK_SECRET`. Os valores não foram reproduzidos no relatório. A regra atual do `.gitignore` não protege esses arquivos.

Correção: retirar os segredos do versionamento, criar exemplos sem valores sensíveis, ignorar arquivos locais e rotacionar as credenciais expostas. Apenas adicionar `.gitignore` não remove arquivos já rastreados nem apaga o histórico. As chaves públicas Clerk do frontend não têm o mesmo caráter secreto. Não houve rotação ou alteração do histórico nesta execução.

### P1 — Operações internas sem autenticação e credenciais em logs

`finance-service/src/server/server.ts:145` e `:158` permitem seed e exclusão completa por userId sem credencial entre serviços. A exclusão usa uma transação válida, mas qualquer cliente com acesso direto à API pode acioná-la. O Compose de desenvolvimento antes publicava as portas em todas as interfaces; agora as restringe a localhost. O Compose de produção inspecionado não publica diretamente as portas dos backends, reduzindo a exposição externa, mas isso não substitui autorização interna.

`identity-service/src/server/server.ts:47` e `:68` registram todos os headers, incluindo Authorization e Cookie, em requisições/erros de autenticação. Remover ou mascarar esses campos e autenticar as operações internas.

### P1 — Alteração de recorrências não isola todos os registros por usuário

`TransactionController.ts` aceita `recurrenceId` do cliente. `PrismaTransactionRepository.ts:131` busca recorrências futuras apenas por recurrenceId e data; `UpdateTransaction.ts:49` propaga alterações para todos os resultados. A verificação inicial do proprietário protege só a transação de entrada.

Impacto: caso um identificador de recorrência de outro usuário seja conhecido, uma recorrência construída com esse valor pode alcançar dados alheios. Gerar o identificador no servidor e incluir userId em todas as consultas e alterações em lote. Achado estático; não foi explorado contra registros locais.

### P1 — Atualização do orçamento pode persistir estado inválido

`UpdateBudgetRule.ts:15` altera `divisions` diretamente, sem repetir a validação do construtor `BudgetRule`. O repositório escreve os dados antes de reconstruir a entidade. Assim, uma soma inválida pode chegar ao banco e depois provocar erro na resposta e nas leituras seguintes.

Prova isolada: o caso de uso encaminhou ao repositório uma divisão de **250%**. Validar DTO e entidade antes de qualquer escrita, incluindo percentuais, quantidade, IDs e mapeamentos. A expressão de mês atual também aceita valores como `2026-99`. Tornar a atualização do mês e dos meses futuros atômica.

### P1 — Datas, parcelas e valores têm validação incompleta

`TransactionController.ts:11–20` aceita qualquer string como data, usa `parseFloat` permissivo, não limita recurrenceCount a inteiro positivo e deixa splitDetails como `any`. O PUT não reaproveita o validador do POST.

Provas isoladas: `date='not-a-date'`, `recurrenceCount=-2` e `amount='10xyz'` chegaram ao caso de uso; o último virou 10. Isso não significa que o banco aceitou todos os valores: a prova usou repositórios simulados para testar o contrato. Validar também a soma dos rateios, membros pertencentes ao usuário, pagador, categoria e limite de recorrências.

### P1 — Inicialização de produção aceita perda de dados

Os `package.json` e Dockerfiles dos backends executam `prisma db push --accept-data-loss`. Uma mudança de schema pode remover dados durante uma reinicialização. O identity possui somente uma migração antiga baseada em `auth0Id`, incompatível com o modelo atual; finance não possui histórico de migrações.

**Mitigado somente no Compose local:** os comandos agora usam db push sem a opção destrutiva. Scripts npm e imagens de produção ainda exigem correção, migrações versionadas e processo de validação/restauração.

### P1 — Exclusão de conta pode deixar dados financeiros órfãos

`DeleteUserAccount.ts:17` exclui primeiro usuário e identidades. Se a chamada seguinte ao finance falhar, o erro é apenas registrado, e o webhook pode responder sucesso. Uma repetição encontra o usuário ausente e retorna sem retentar a limpeza.

Correção: fluxo idempotente com tarefa persistida/outbox ou outra estratégia de retentativa que preserve o identificador necessário até a confirmação da exclusão financeira. Também há seed não confiável: a criação de usuário continua após falha de comunicação, sem mecanismo persistente de recuperação.

### P1 — Backup pode informar sucesso após falha no dump

`apps/backup/backup.sh:12` executa `pg_dump | gzip`, mas verifica apenas o status do último comando. Se pg_dump falhar e gzip terminar normalmente, um arquivo sem dump válido pode ser enviado como backup bem-sucedido.

Correção: verificar separadamente o dump ou usar pipeline com propagação de falhas compatível com o shell, validar artefato e testar restauração. Não foram disparados dumps ou uploads externos nesta análise.

### P2 — Recorrência diária da interface é recusada pela API

`TransactionModal.tsx:321` oferece `daily`, mas o enum do controller aceita apenas none, monthly e fixed. Prova isolada retornou **400**, antes de chegar ao caso de uso, embora o caso de uso já implemente datas diárias.

### P2 — Recorrência no fim do mês pula fevereiro

`CreateTransaction.ts:37` usa `Date.setMonth` sem limitar o dia ao último dia do mês. Prova com três parcelas a partir de 31/01/2026 gerou **31/01, 03/03 e 31/03**. Definir regra explícita para fim do mês e anos bissextos. O loop também grava parcelas uma a uma, permitindo criação parcial se uma escrita falhar.

### P2 — Interface pode indicar sucesso após falha HTTP

`FinanceProvider.tsx:123–140`, `:169` e `:202` não verificam `response.ok` em diversas mutações. Uma resposta 400/500 não rejeita a Promise de fetch; exclusões retiram o registro do estado mesmo com falha no servidor, e os modais podem fechar após uma gravação rejeitada.

Correção: centralizar tratamento de status, apresentar erros e atualizar estado apenas após confirmação. Isso também torna visível o erro atual da recorrência diária.

### P2 — Categorias e membros não preservam todas as relações

A interface permite alterar o tipo de categoria, mas `CategoryController.handleUpdate`, `UpdateCategory` e o repositório persistem apenas o nome. Transações e mapping do orçamento usam o nome da categoria; renomeá-la não atualiza essas referências.

Excluir membros remove apenas GroupMember; as transações mantêm referências em payer/splits, e `getSummary` calcula saldos somente para membros existentes. Uma exclusão pode fazer um saldo pendente desaparecer dos relatórios. Definir arquivamento ou regras de integridade e adotar identificadores estáveis para categorias.

### P2 — Valores monetários, consultas e carregamento precisam de revisão

`Transaction.amount` é Float; cálculos e rateios usam number e arredondamento na apresentação. Isso permite diferenças de centavos. Usar centavos inteiros ou Decimal com política de arredondamento consistente.

Faltam índices nos filtros principais como `(userId, date)` e recorrência por usuário, além de paginação. `FinanceProvider` aciona `checkAuth` quando selectedDate muda e também faz consultas em outro effect, repetindo trabalho. Não há cancelamento de consultas antigas ao trocar rapidamente o período. Categorias e membros são cacheados por cinco minutos na API, mas suas mutações não invalidam esse cache HTTP, podendo trazer dados antigos em uma leitura posterior.

### P2 — Configuração, mobile e privacidade

O gateway força `X-Forwarded-Proto https` inclusive no HTTP local, e combina CORS curinga com o CORS dos backends. Revisar origens e headers por ambiente. O identity confia irrestritamente em proxies. O Vite aceita qualquer host; a restrição atual de portas a loopback limita sua exposição local.

Docker/CI usam Node 20, mas a versão instalada do Capacitor CLI 8 declara Node >=22; o build Docker emitiu EBADENGINE. Os projetos móveis permitem tráfego sem TLS (`cleartext` e `NSAllowsArbitraryLoads`). Um build móvel com API relativa `/api` precisa de configuração própria, pois não terá o Nginx local da aplicação web.

`AdBanner` injeta o script de anúncios mesmo após a escolha “Apenas Essenciais”, alterando apenas a personalização. Esse comportamento deve ser reconciliado com o que a interface promete ao usuário. Trata-se de observação do código, não de avaliação jurídica de conformidade.

## Dependências

Resultados de `npm audit --json` em 19/09/2026, incluindo dependências de desenvolvimento e transitivas:

| Pacote | Baixas | Moderadas | Altas | Críticas | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frontend | 1 | 4 | 16 | 4 | 25 |
| Identity | 3 | 6 | 11 | 1 | 21 |
| Finance | 3 | 5 | 11 | 1 | 20 |

As contagens são por árvore, não vulnerabilidades únicas somáveis. Incluem ferramentas de build/teste; não equivalem a exploração comprovada em produção. O audit aponta atualizações que exigem mudança principal de versão em parte do backend, especialmente Clerk e uuid. O npm também informou depreciação de `@clerk/clerk-react`. Atualizar com revisão de compatibilidade e testes de autenticação; nenhuma atualização automática de dependência foi aplicada.

## Ajustes realizados para execução local

- Docker Desktop iniciado e volume PostgreSQL existente preservado.
- `docker-compose.yml`: serviços aguardam o healthcheck do banco; inicialização usa Prisma sem `--accept-data-loss`; portas publicadas somente em loopback; Portainer passa a ser opcional no profile `admin`.
- `vite.config.ts`: proxy preserva `/api` e usa destino separado `VITE_API_PROXY_TARGET`, com `http://gateway` no Docker e `http://localhost:8080` fora dele.
- README atualizado com Clerk, stack real e comandos de operação local.

Não houve alteração de regras de negócio, rotação de segredos, publicação, atualização de produção ou execução de exclusões de contas.

Os cinco serviços ficaram em execução ao concluir. O banco confirmou que ambos os schemas já estavam sincronizados, sem necessidade de alteração estrutural. Acesse **http://localhost:8080**. Para parar sem apagar dados, execute `docker compose stop` na raiz. Para iniciar novamente, `docker compose up -d`. O login completo e as operações autenticadas continuam dependendo de uma sessão do usuário; nenhum bypass foi criado.

## Ordem sugerida de correção

1. Fechar a vinculação pública de identidades, tratar segredos e remover tokens dos logs.
2. Autenticar chamadas internas e garantir isolamento por usuário nas recorrências.
3. Validar orçamento/transações antes de persistir e corrigir tratamento de falhas na interface.
4. Implantar migrações, retentativas de exclusão/seed e validação de backups.
5. Corrigir recorrências, relacionamentos, precisão monetária, cache e concorrência.
6. Atualizar dependências e ampliar testes de integração/autorização, incluindo PostgreSQL e duas contas distintas.

## Limites da verificação

Revisão ampla de código e configuração, builds, lint, testes existentes, probes isolados e validação do ambiente local. Não inclui auditoria externa do tenant Clerk, autenticação com uma conta fornecida pelo usuário, pentest em produção, restauração de R2, ensaio de carga ou compilação Android/iOS. Configurações e versões declaradas foram distinguidas dos resultados realmente executados.
