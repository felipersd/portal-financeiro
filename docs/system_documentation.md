# Documentação do Sistema - Portal Financeiro

## 1. Visão Geral do Sistema

O **Portal Financeiro** é uma aplicação web desenvolvida para gerenciamento de finanças pessoais, permitindo o controle de transações (receitas e despesas), categorias e visualização de relatórios.

O sistema foi arquitetado seguindo o padrão de **Microsserviços**, onde diferentes responsabilidades de negócio são separadas em serviços independentes que se comunicam via rede.

### Arquitetura Atual
O sistema é composto pelos seguintes contêineres Docker:

1.  **Frontend**: Aplicação React (SPA) servida via Nginx.
2.  **Gateway (Nginx)**: Ponto de entrada único para o sistema. Recebe as requisições do frontend e as roteia para o serviço adequado.
3.  **Identity Service**: Responsável pela autenticação e gestão de usuários.
4.  **Finance Service**: Responsável pelo núcleo do negócio (transações, categorias, relatórios).
5.  **Database (PostgreSQL)**: Banco de dados relacional compartilhado (com schemas separados).

---

## 2. Tecnologias e Decisões Técnicas

### Frontend
*   **React + Vite**: Escolhido pela alta performance de desenvolvimento (HMR rápido) e ecossistema robusto.
*   **Chart.js**: Para visualização de dados (gráficos de pizza e barras) de forma simples e responsiva.

### Backend (Node.js + Express + TypeScript)
*   **Node.js**: Plataforma leve e eficiente para I/O, ideal para microsserviços que lidam com muitas requisições simultâneas.
*   **TypeScript**: Adiciona tipagem estática, reduzindo bugs e melhorando a manutenibilidade e inteligência da IDE.
*   **Express**: Framework minimalista e flexível, padrão de mercado para APIs Node.js.

### Banco de Dados e ORM
*   **PostgreSQL**: Banco de dados relacional robusto, escolhido pela confiabilidade e suporte a transações complexas (ACID).
*   **Prisma ORM**: Escolhido pela excelente experiência de desenvolvimento (DX), segurança de tipos (type-safety) e facilidade em gerenciar migrações de esquema.

### Autenticação
*   **Auth0**: Serviço de identidade gerenciado.
    *   *Por que?* Delegar a autenticação aumenta a segurança, removendo a complexidade de gerenciar senhas, hashing e sessões manualmente. Suporta padrões modernos como OAuth2 e OIDC.

### Infraestrutura
*   **Docker & Docker Compose**: Garante que o ambiente de desenvolvimento seja idêntico ao de produção, eliminando o problema de "funciona na minha máquina".
*   **Nginx (Gateway)**: Atua como um *Reverse Proxy*.
    *   *Por que?* Simplifica o frontend, que só precisa falar com uma URL (`/api/...`), evitando problemas complexos de CORS e expondo apenas uma porta para o mundo externo.

---

## 3. Estrutura de Pastas e Microsserviços

### Por que `finance-service` e `identity-service` e não apenas `backend`?
Antigamente, aplicações eram construídas como **Monolitos** (uma única pasta `backend` com todo o código). Embora mais simples inicialmente, monolitos tornam-se difíceis de escalar e manter conforme o time e o projeto crescem.

Optamos por separar em **Microsserviços** (`apps/finance-service` e `apps/identity-service`) para:
1.  **Separação de Responsabilidades**: O serviço de identidade não precisa saber sobre transações financeiras e vice-versa.
2.  **Escalabilidade Independente**: Se o serviço de finanças tiver muito tráfego, podemos escalar apenas ele sem gastar recursos no serviço de identidade.
3.  **Manutenção**: Alterações em um serviço têm menos risco de quebrar o outro.

### O que é a pasta `postgres-data`?
Esta pasta é um **Volume Docker**.
*   Contêineres são efêmeros: se você deletar o contêiner do banco de dados, os dados lá dentro somem.
*   Para evitar perder seus usuários e transações ao reiniciar o Docker, mapeamos a pasta interna do banco de dados para esta pasta `postgres-data` no seu computador. Assim, os dados persistem entre reinicializações.

---

## 4. Pontos de Melhoria (Roadmap)

Para elevar o nível do código, segurança e performance, sugerimos as seguintes melhorias:

### A. Qualidade de Código e Arquitetura
1.  **Validação de Dados (Zod/Joi)**: Implementar validação rigorosa nos DTOs (Data Transfer Objects) de entrada para garantir que dados inválidos nunca cheguem aos Use Cases.
2.  **Testes Automatizados**:
    *   *Unitários*: Testar regras de negócio isoladas (Use Cases).
    *   *Integração*: Testar a comunicação entre API e Banco de Dados.
3.  **Padronização de Erros**: Criar um middleware de tratamento de erros global para retornar respostas consistentes (ex: RFC 7807).
4.  **Swagger/OpenAPI**: Documentar as rotas da API automaticamente para facilitar o consumo pelo frontend.

### B. Segurança
1.  **Rate Limiting**: Proteger a API contra ataques de força bruta ou excesso de requisições.
2.  **Helmet**: Adicionar headers de segurança HTTP no Express.
3.  **Segredos**: Usar um gerenciador de segredos (como AWS Secrets Manager ou Vault) em produção, em vez de arquivos `.env` simples.
4.  **Least Privilege**: Criar usuários de banco de dados específicos para cada serviço, limitando o acesso apenas às tabelas necessárias (ex: `finance-service` não deveria conseguir ler a tabela de `users`).

### C. Performance
1.  **Cache (Redis)**: Cachear requisições frequentes (ex: lista de categorias ou resumo financeiro) para reduzir a carga no banco de dados.
2.  **Otimização de Queries**: Analisar consultas lentas no Prisma e criar índices no PostgreSQL para colunas muito buscadas (como `userId` e `date`).
3.  **CDN**: Servir os arquivos estáticos do Frontend (JS, CSS, Imagens) através de uma CDN (Cloudflare, CloudFront) em produção.

### D. DevOps
1.  **CI/CD**: Pipelines automáticos para rodar testes e linting a cada Commit.
2.  **Logs Centralizados**: Enviar logs para uma ferramenta de monitoramento (Datadog, ELK Stack) para facilitar a depuração em produção.
