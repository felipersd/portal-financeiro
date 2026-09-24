# Revisão técnica e contas compartilhadas

> Registro da versão 1.4.0. O estado atualizado dos débitos e das correções do PR #5 está em [Débitos técnicos — 24/09/2026](debitos-tecnicos-2026-09-24.md).

## Resultado proposto para 1.4.0

Membros sem conta continuam disponíveis. Um membro com e-mail pode receber um convite **dentro do Portal**. A resposta não revela ao remetente se aquele e-mail já possui cadastro. O destinatário entra com esse e-mail principal verificado no Clerk e aceita ou recusa o vínculo. O convite vale sete dias; convites expirados podem ser renovados. Vínculos recusados ou encerrados não são reabertos automaticamente.

Depois de salvar uma despesa dividida, o autor usa **Enviar para aceite de [nome]** na lista de lançamentos. Cada parcela/ocorrência precisa ser enviada e aceita individualmente. O destinatário vê descrição, data, total, sua parte e indicação de pagador em Membros; seus demais dados e os outros participantes não são expostos. A conta só entra no saldo e na lista do destinatário após o segundo aceite, pelo valor da parte dele, na categoria Compartilhadas. Aceitar não representa pagamento.

Os convites ficam em Membros, com indicação de novidades na navegação. A consulta atualiza ao retornar à aba, pelo botão Atualizar e a cada minuto enquanto a aba está ativa. Esta versão não envia e-mails, notificações push nem consulta um diretório público de usuários.

Contas pendentes ou aceitas bloqueiam alteração/exclusão do lançamento de origem para evitar que um aceite autorize valores diferentes. Pendentes podem ser canceladas pelo autor. Encerrar o vínculo cancela as pendências e impede novos envios; preserva as contas já aceitas. Correção/estorno consensual de uma conta aceita requer um fluxo posterior. A exclusão completa de uma conta pelo webhook remove também seus registros de compartilhamento.

## Segurança e consistência implementadas

- Identidade do ator deriva da sessão Clerk; o e-mail do destinatário é conferido novamente no provedor no fluxo de compartilhamento. Um e-mail antigo no perfil local não autoriza aceite.
- Receber um novo Clerk ID com um e-mail já existente não vincula automaticamente essa pessoa ao histórico financeiro anterior. Recuperação de identidade deve ser explícita.
- Contratos Zod limitam tamanho, tipo, datas, valores, parcelas, membros e divisões de orçamento. Criação e edição de lançamentos seguem a mesma validação. IDs de participantes são validados contra os membros do autor.
- Valores de compartilhamento são armazenados em centavos inteiros. Divisões iguais distribuem o restante de centavos de forma determinística; soma de partes deve ser exatamente o total. Resumos financeiros somam centavos.
- Respostas privadas usam `Cache-Control: no-store`. O cache TanStack Query é só em memória e pertence à conta autenticada; a troca de conta remonta o cliente.
- Transações PostgreSQL `Serializable` com repetição limitada em conflitos cobrem convite, aceite, revogação, compartilhamento e alteração da origem. A chave única `(transactionId, recipientId)` evita obrigações duplicadas em retries.
- Recorrências são gravadas em lote atômico, limitadas a 120 ocorrências; datas mensais respeitam o último dia do mês. Alteração de conta fixa e futuras ocorrências é atômica.
- Membros usados em lançamentos não podem ser removidos deixando divisões órfãs. O e-mail de um membro já convidado não pode ser trocado por outro destinatário.

## Desempenho e experiência

TanStack Query substitui efeitos encadeados que refaziam autenticação, categorias, membros e transações ao trocar o mês. Transações usam chave por ano; orçamento, por mês. Há cancelamento, timeout, invalidação após gravação e recuperação de conexão. Não há repetição automática de mutações financeiras.

Falhas HTTP deixam um aviso visível e preservam o formulário; remover um item só altera o estado após confirmação do servidor. Cliques durante gravação são bloqueados. Os gráficos, relatórios e textos legais são carregados sob demanda com `React.lazy`/`Suspense`.

Índices adicionados: lançamentos por usuário/data e usuário/recorrência/data, categorias e membros por usuário, além das buscas de convites e compartilhamentos. O build falha explicitamente quando a chave pública do Clerk não está configurada, evitando publicar uma página que não inicializa. A estrutura usa React 19, Vite, Node 24, PostgreSQL e Prisma existentes; não adiciona servidores ou filas sem uma necessidade demonstrada.

## Débitos restantes por prioridade

| Prioridade | Débito e impacto | Próxima ação |
| --- | --- | --- |
| Alta | Webhook de exclusão Clerk e backup fora da VPS ainda pendentes na operação | Configurar assinatura/entrega `user.deleted`, testar cascata e definir cópia externa com retenção/restauração |
| Alta | Segredos já constaram em commits antigos | Rotacionar no provedor; remover arquivos atuais não revoga credenciais históricas |
| Alta | `Transaction.amount` legado usa Float e `splitDetails` JSON sem relações | Migrar para centavos/Decimal e tabela de participantes com backfill, conciliação dos valores existentes e janela de rollback própria |
| Alta | Estorno, edição consensual e pagamento de contas aceitas não têm livro de acertos | Implementar propostas versionadas e eventos de pagamento/estorno; evitar confundir aceite com quitação |
| Média | Recorrência fixa gera dez anos de linhas | Modelar regra com horizonte de geração e execução idempotente; preservar IDs já compartilhados |
| Média | Categorias são referenciadas por nome e alterações de orçamento propagam para meses futuros | Migrar para IDs estáveis e versões explícitas das regras; edição de categoria hoje preserva o tipo original |
| Média | Identidade e finanças compartilham banco e leitura direta do schema identity | Definir limites de módulo; manter transações locais enquanto não há necessidade real de bancos separados |
| Média | Convites/lista de compartilhamentos retornam até 200 itens, e lançamentos retornam um ano inteiro | Adicionar paginação por cursor, agregação no servidor e pesquisa para históricos maiores |
| Média | Rate limit principal depende de IP de proxy; não há orçamento por usuário persistido para compartilhamento | Configurar proxies confiáveis e limites por conta, com métricas de abuso |
| Média | Sem monitor externo/alertas de indisponibilidade, restore agendado ou alta disponibilidade | Definir SLO, alertas e testes periódicos de restauração; uma VPS continua sendo ponto único de falha |
| Média | Prisma 5 e Express 4; avisos moderados na cadeia Capacitor/iOS | Atualizações principais separadas, com compatibilidade de migrações/SDK e testes; remover dependências legadas sem uso |
| Média | Acessibilidade incompleta em telas antigas | Associar labels, navegação por teclado, foco de modais, anúncios de estado e testes de leitor de tela |
| Média | Validação real de login entre duas contas Clerk ainda depende de contas de teste | Executar roteiro homologado sem usar dados financeiros reais; integração automatizada cobre banco e autorização de domínio |

## Validação e publicação

Testes cobrem contratos inválidos, divisão dos centavos, recusa, isolamento de terceiro, convite expirado, vínculo obrigatório, aceite por conta, duplicidade simultânea e corrida entre revogação e aceite. A integração usa PostgreSQL descartável, habilitada somente por `INTEGRATION_TESTS=1`; não aponta para produção. O CI aplica todas as migrações, reaplica e verifica diferenças no schema.

A migração adiciona tabelas e índices, sem importar dados locais nem modificar tabelas existentes de forma destrutiva. Revisar o PR e os checks antes de integrar. A tag `v1.4.0` publica pelo fluxo já configurado. **Após aplicar a migração de compartilhamento, o rollback para 1.3.0 é bloqueado pelos scripts desta versão:** ela não conhece os bloqueios de consentimento e pode alterar/excluir origens. O bloqueio usa a presença da tabela, mesmo vazia, para evitar corrida com novos aceites. Use sempre o `rollback.sh` da release atual; scripts históricos ou comandos Docker manuais não possuem essa proteção. Em falha do primeiro deploy após migrar, o gateway é interrompido se a versão anterior for incompatível. Recuperação deve usar uma correção progressiva ou uma janela de manutenção com plano explícito. Entre releases com o mesmo contrato de compartilhamento, o rollback continua disponível. Banco indisponível ou resposta desconhecida bloqueiam a restauração incompatível.

A conferência visual local utiliza dados fictícios, sem autenticação real ou acesso à produção. Foram verificados os estados de vínculo/conta e a divisão de R$ 100 em R$ 33,34 + R$ 33,33 + R$ 33,33 na interface. Essa conferência complementa os testes; não substitui o roteiro com duas contas Clerk reais. O guard de rollback possui teste de compatibilidade, incompatibilidade e banco indisponível no CI.

Referências técnicas: [Prisma: transações e concorrência](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions), [OWASP: autorização por objeto](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/), [TanStack Query: políticas de cache](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [React: carregamento sob demanda](https://react.dev/reference/react/lazy).
