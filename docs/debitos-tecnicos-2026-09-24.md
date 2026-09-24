# Débitos técnicos: implementação e pendências operacionais

> Atualização operacional posterior: PR #5 integrado pelo usuário e versão 1.5.0 publicada. R2 ativado e restauração remota comprovada em 24/09; consulte [Backup R2](backup-r2.md). As marcações de R2 pendente abaixo descrevem o estado anterior à ativação. Rotação de credenciais antigas e homologação entre duas contas continuam pendentes.

Este documento atualiza a lista de débitos da revisão de 20/09. As alterações de código estão no PR #5, branch `codex/technical-debt`. A aplicação em produção permanece na versão 1.4.0; a nova migração ainda não foi aplicada.

## Correções implementadas no PR

| Área | Resultado |
| --- | --- |
| Dinheiro e participantes | Valores Decimal(16,2), partes em centavos e relações com membros; backfill valida a soma antes de converter os dados antigos. Edições em lote atualizam partes e categorias atomicamente. |
| Categorias | Referências por ID sobrevivem à mudança de nome; categorias utilizadas não podem ser excluídas nem mudar de tipo. Criação simultânea é idempotente, com limite de 200 por conta. |
| Orçamento | Edição restrita ao mês selecionado, histórico de versões e rejeição de gravações com revisão desatualizada. |
| Contas aceitas | Propostas de correção, pagamento e estorno exigem confirmação da outra pessoa. Revisões e transações impedem aceite duplicado ou de valor desatualizado. Registrar pagamento não transfere dinheiro. |
| Históricos | Compartilhamentos e eventos paginados por cursor; lançamentos consultados por mês, com totais anuais calculados no PostgreSQL. A interface reúne as páginas do mês antes de exibir seus totais. |
| Recorrência fixa | Novas séries têm uma regra e materializam apenas os anos consultados. Exclusões individuais não reaparecem; há encerramento explícito da série. |
| Autorização e abuso | Resolução da identidade por API interna autenticada; limite persistente por conta para leitura, escrita e compartilhamento. Respostas privadas não são armazenadas em cache HTTP. |
| Concorrência | Retentativas limitadas para transações comprovadamente revertidas por serialização/deadlock, inclusive no adaptador PostgreSQL. Falhas de conexão ambíguas não são repetidas. |
| Dependências | Express 5, Prisma 7 com adaptador PostgreSQL e correções da cadeia de dependências; migrações e compatibilidade verificadas no CI. |
| Acessibilidade | Diálogos nativos, retorno de foco, rótulos, erros dentro do formulário e controles de navegação/expansão acessíveis por teclado. |
| Exclusão de conta | Validação da assinatura e formato do webhook; remoção transacional das relações, recorrências, versões de orçamento e limites da conta. |

Membros sem cadastro continuam funcionando. Usuários cadastrados precisam aceitar o vínculo e cada conta dividida. As regras de consentimento continuam protegendo a origem de alterações unilaterais.

As séries fixas antigas preservam seus IDs e as ocorrências existentes, inclusive lacunas e compartilhamentos. Não são convertidas automaticamente para geração ilimitada, pois isso poderia recriar exclusões históricas que não foram registradas como marcadores.

## Evidências e limites

- CI executa testes unitários e integração em PostgreSQL descartável, migrações repetidas, comparação de schema, backfill de dados antigos e bloqueio de rollback incompatível. A integração não usa credenciais de produção.
- Verificação local: 55 testes unitários financeiros, 15 testes do frontend e lint aprovados. Os testes de banco são executados no CI, pois não há Docker local disponível.
- [CI da revisão 59f1819](https://github.com/felipersd/portal-financeiro/actions/runs/35950153307) aprovado, incluindo os testes de criação simultânea de categorias e exclusão completa do grafo financeiro. Auditoria completa (`npm audit`, incluindo desenvolvimento) sem vulnerabilidades conhecidas nas três aplicações em 24/09.
- Verificação por navegador com dados fictícios: os diálogos de transação, categoria e orçamento devolvem o foco ao botão de origem após Escape; falhas de gravação permanecem visíveis no formulário.
- O webhook Clerk de produção `user.deleted` foi habilitado em `https://portalfinanceiro.net/api/auth/webhooks`. Uma entrega assinada do Svix recebeu HTTP 200 em 24/09/2026, 02:56 UTC. O identificador de exemplo foi previamente confirmado como ausente, evitando excluir dados de uma pessoa real.
- Em 24/09 foi testado o backup local de 23/09: criptografia com restic, leitura integral de integridade, recuperação byte a byte e restauração real em PostgreSQL isolado, sem rede/portas/volumes de produção. Isso comprova a recuperação local; não comprova armazenamento externo.

## Pendências para publicação e operação

| Estado | Pendência e critério de conclusão |
| --- | --- |
| Preparado, não ativado | Backup R2 criptografado. Criar credencial restrita ao bucket `backup-financas` e ao IP da VPS, configurar repositório dedicado, enviar backup e restaurá-lo a partir do R2. A confirmação específica de criação da credencial no navegador continua pendente. |
| Preparado, não ativado | Instalar o timer de restauração semanal e verificar os marcadores de sucesso. Só então integrar o workflow de monitoramento externo, que também alerta para cópia/restauração atrasadas. |
| Pendente | Rotacionar credenciais que já apareceram no histórico Git e revogar tokens antigos abrangentes após validar seus substitutos. Remover um arquivo do Git não revoga o segredo. |
| Pendente | Homologar login e compartilhamento completo com as duas contas Clerk indicadas pelo usuário; testes automatizados não substituem esse percurso real. |
| Limitação de infraestrutura | Uma VPS e um banco continuam sendo pontos únicos de falha. Cópia externa reduz risco de perda, mas não fornece alta disponibilidade. Redundância requer infraestrutura adicional e custo próprio. |

O PR permanece em rascunho até concluir os pré-requisitos operacionais. Não criar tag nem aplicar a migração financeira antes de verificar o backup externo e sua restauração.

## Migração e rollback

A nova migração estabelece o contrato de dados **2**. Depois de aplicada, voltar as imagens para 1.4.0/1.3.0 é incompatível: essas versões não conhecem as relações financeiras e o livro de acertos. O guard de rollback bloqueia esse caminho mesmo que as tabelas estejam vazias. Use o script da release atual; não contorne o guard com Docker manual ou scripts históricos.

Uma falha após a migração exige correção progressiva ou recuperação planejada em manutenção. Não há restauração automática de banco, que poderia descartar lançamentos posteriores ao backup.
