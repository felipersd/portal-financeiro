# Experiência, compartilhamentos e segurança — 25/09/2026

Esta revisão corresponde à branch `codex/experience-redesign`. As mudanças precisam ser integradas e publicadas pelo workflow de release para aparecerem em produção. A prévia local usa dados fictícios e não substitui a homologação autenticada.

## O que mudou

| Pedido | Implementação |
| --- | --- |
| Identidade visual e navegação | Marca vetorial própria, verde discreto, superfícies claras, navegação lateral compacta e navegação inferior no celular. Valores em reais, estados vazios, foco e controles com rótulos acessíveis. |
| Receitas recorrentes | O formulário de receita oferece repetição, inclusive mensal fixa. A geração preserva tags e não depende de o titular abrir o Portal. Datas no fim do mês são limitadas ao último dia válido. |
| Categorias e tags | Categorias amplas para contas novas, mantendo o histórico e as categorias personalizadas existentes. Tags opcionais, sete sugestões na primeira ativação, criação/edição/exclusão, até 100 por conta e cinco por lançamento. Excluir uma tag preserva os lançamentos. |
| Dashboard e relatório | Entradas, despesas pessoais, resultado mensal, comparação com o mês anterior quando disponível, evolução diária, gastos por categoria, fixos/variáveis, maiores despesas e distribuição por tags. Exportação CSV com proteção contra fórmulas. |
| Membros | Pessoas cadastradas pelo titular e convites recebidos têm espaços próprios. Vínculos recíprocos aceitos são apresentados sem duplicar a mesma pessoa. Membros sem conta continuam disponíveis. |
| Contas divididas | Área separada com pendências, recebidas, enviadas, histórico e controle pessoal. Salvar uma despesa com um membro vinculado envia a solicitação automaticamente; somente o destinatário aceita ou recusa. |
| Correções | Uma parte propõe o novo valor da participação e a outra responde. O total e as participações de terceiros são preservados. Novas propostas de pagamento/devolução foram removidas; registros antigos aceitos continuam no histórico. |
| Notificações | Central no Portal e Web Push opcional para despesas e correções. O aviso na tela bloqueada não contém nomes, descrições nem valores. |
| Perfil | Foto, nome, e-mail, senha e sessões pelo painel oficial do Clerk. O Portal apresenta os dados atuais do Clerk. Tabela privada `UserContact` preparada para telefone/endereço, sem coleta, formulário ou endpoint público. |
| Relatórios de contas recebidas | Após o aceite, a participação recebida entra com categoria e tags da despesa original; não fica agrupada apenas como “Compartilhadas”. |

O saldo mostrado é o resultado dos lançamentos do mês, incluindo datas futuras cadastradas; não é um saldo bancário sincronizado. Em despesas divididas, gráficos e relatórios consideram a parte do próprio usuário. Uma despesa com várias tags aparece em cada uma delas, de modo que os grupos de tags podem se sobrepor; a interface explica isso.

O consentimento de vínculo continua sendo por direção. Aceitar receber de alguém não autoriza essa pessoa a receber contas em seu nome; para enviar no sentido inverso, ainda é necessário criar/aceitar o vínculo correspondente. A deduplicação visual não amplia permissões.

## Regras e proteção dos dados

- Lançamento, participantes, tags, compartilhamento e notificação são gravados na mesma transação. Falhas não deixam pedidos órfãos.
- IDs de tags, membros, cursores, assinaturas de push e ações são restritos ao usuário autenticado. A autorização existente, os limites por conta e o cache privado continuam aplicados às novas rotas.
- Contas pendentes/aceitas não podem ser alteradas unilateralmente. Aceites e correções usam revisões, transações serializáveis e retentativas limitadas. Uma recusa não dispara novo envio em uma simples edição.
- Categoria e nomes das tags são fotografados no compartilhamento. Renomear ou excluir uma tag na origem não reescreve o que a outra pessoa aceitou.
- Ocorrências fixas geradas para meses futuros não enviam todos os pedidos de uma vez: o worker libera cada mês quando ele chega. Lançamentos criados explicitamente pelo usuário são enviados ao salvar.
- A entrega push usa fila persistente no PostgreSQL, lotes de cinco, bloqueio `SKIP LOCKED`, prazo de posse, timeout e até cinco tentativas. Endpoints aceitos são limitados aos provedores suportados, evitando chamadas para URLs arbitrárias.
- Até cinco dispositivos por conta; assinaturas expiradas são removidas. Trocar a conta de uma assinatura remove entregas antigas. Logout tenta remover a assinatura daquele usuário. Notificações expiram em 90 dias; entregas concluídas/falhas, em sete dias.
- O service worker trata push e abertura do Portal. Não armazena páginas, respostas da API ou dados financeiros para navegação offline.
- Exclusão de conta também remove as novas tabelas e suas relações.

Os gráficos são carregados sob demanda e usam uma única biblioteca (Recharts). Foram removidos Chart.js e componentes antigos de relatório/acerto sem uso. Funções de análise financeira usam centavos e possuem testes próprios; organização, notificações e entrega push foram separadas por responsabilidade, sem introduzir uma infraestrutura de mensageria adicional nesta etapa.

## Publicação e recuperação

As migrações acrescentam tags, preferências, notificações, fila de push, controle de envio das recorrências e a tabela privada de contato. O backfill preserva valores, preenche a categoria de compartilhamentos antigos e cancela somente propostas antigas de pagamento/devolução ainda pendentes.

O contrato financeiro passa a **3**. Depois da migração, o guard impede voltar às imagens do contrato 2 (incluindo 1.5.0). Uma falha exige correção progressiva ou recuperação planejada em manutenção; restaurar um backup automaticamente poderia perder lançamentos posteriores.

O fluxo de release continua exigindo backup e verificação externa no R2 antes de migrar. A release gera uma identidade VAPID uma única vez em `/srv/portal-financeiro/secrets/vapid_keys` e monta o arquivo no serviço financeiro. A partir da correção 1.7.1, o arquivo mantém o proprietário do deploy, grupo do usuário da imagem e permissão 0640, dentro do diretório privado 0700. A leitura e o formato são verificados usando o usuário real da imagem antes de migrar. A chave privada não entra no Git, no frontend ou nos logs; somente a chave pública é fornecida ao navegador para a inscrição. Preserve o arquivo nas operações de recuperação; trocá-lo exige novas inscrições dos dispositivos. A configuração também respeita `SECRETS_DIR` quando personalizado.

Em desenvolvimento, configure as duas variáveis opcionais `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, ou `VAPID_CONFIG_FILE`. Sem as chaves, a central funciona e a inscrição de push informa indisponibilidade. `VAPID_SUBJECT` usa a URL pública; não depende de inventar um e-mail de suporte.

No smartphone, ativar push exige uma ação explícita do usuário. No iPhone/iPad, o Portal deve ser aberto como aplicativo adicionado à Tela de Início em sistema compatível; ver [documentação WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). O wrapper nativo Capacitor requer integração própria com APNs/FCM e não foi equiparado ao Web Push nesta entrega.

## Verificação

- Build e testes do frontend, identidade e financeiro, lint do frontend e auditoria de dependências de produção.
- Integração em PostgreSQL 15 descartável: isolamento entre contas, aceite, concorrência, tags, envio automático, snapshots, fila atômica, recusa, recorrências e paginação de pendências antigas.
- Migrações aplicadas duas vezes e comparação do banco com o schema sem divergência. CI também valida dados legados, contrato de rollback e sintaxe/configuração do deploy.
- Revisão no navegador com dados fictícios, incluindo dashboard, relatório, pesquisa, membros, tags, notificações e receita recorrente em telas de 360/390 pixels e desktop.

## Pendências explícitas

| Prioridade | Pendência | Critério de conclusão |
| --- | --- | --- |
| Alta — operacional | Homologação autenticada entre as duas contas Clerk já indicadas | Executar vínculo, criação, recusa, aceite e correção pela interface; verificar os dois extratos e relatórios. Os testes de integração já cobrem as regras, mas não comprovam o percurso real do Clerk. |
| Alta — operacional | Recebimento push em aparelhos físicos | Publicar a release, ativar no Android e no iPhone instalado na Tela de Início, testar com Portal fechado, recusa de permissão e troca de conta. Testes do worker não comprovam a entrega pelo sistema operacional. |
| Alta — segurança preexistente | Credenciais históricas | Rotacionar/revogar os segredos antigos abrangentes após confirmar os substitutos; retirar do Git não revoga uma credencial. |
| Média — adiada pelo usuário | E-mail real de suporte e privacidade | Criar a caixa, confirmar recebimento e publicar o contato. O usuário informou que ainda não existe e pediu para manter como débito. O endereço de exemplo foi retirado da página pública. |
| Média — produto | Revisão da política e termos | Validar os textos com o responsável e publicar o canal de atendimento quando criado; esta revisão técnica não certifica conformidade jurídica. |
| Média — identidade | Sincronização do espelho local do perfil | A interface e os novos compartilhamentos leem o Clerk atualizado. O cadastro local criado anteriormente ainda guarda os dados iniciais; sincronizar por evento verificado antes de depender dele para novos usos. |
| Evolução de capacidade | Carga, disponibilidade e observabilidade | Definir SLO e volume-alvo; medir p95/p99, filas, banco e memória com carga representativa. Uma única VPS/banco continua sendo ponto único de falha. Não há capacidade numérica comprovada nem alta disponibilidade nesta entrega. |
| Evolução de capacidade | Meses com quantidade excepcional de lançamentos | O frontend reúne as páginas do mês para totais completos; migrar a análise mensal para agregações no servidor conforme medições, mantendo filtros e detalhamento paginados. |
| Evolução de canal | Push no aplicativo nativo | Integrar APNs/FCM especificamente ao wrapper Capacitor se ele for distribuído; o site instalável já tem implementação Web Push. |

O backup externo e a restauração R2 já foram comprovados na revisão anterior. Isso reduz risco de perda, mas não substitui redundância, gestão de credenciais ou uma cópia independente da senha de recuperação em cofre.
