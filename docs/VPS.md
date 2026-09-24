# Operação da VPS

O Portal usa `portalfinanceiro.net`, uma base PostgreSQL nova e serviços separados do One Piece. O Caddy do One Piece é o ponto de entrada HTTPS compartilhado. O gateway do Portal participa da rede externa `onepiece-library_default`; apenas `127.0.0.1:8081` é publicado para verificações locais. APIs e banco não publicam portas.

## Fluxo de entrega

1. Abra um PR para `main`. O workflow verifica frontend, APIs, auditoria de dependências, migrações em banco vazio, reaplicação e diferenças do schema.
2. Atualize `VERSION` e integre o PR. Crie e envie a tag correspondente, por exemplo `v1.3.0`.
3. O GitHub Actions constrói quatro imagens Linux amd64 e publica no GHCR com metadados de procedência e SBOM.
4. O job do ambiente `production` envia somente os manifestos e scripts à VPS via SSH com chave dedicada e host verificado. O código compilado chega nas imagens; não há checkout de código na produção.
5. A VPS baixa as imagens pelos digests, faz backup, aplica `prisma migrate deploy`, aguarda saúde e confere revisão de frontend e APIs. A publicação é serializada com `flock` e concorrência do Actions.

Não use `latest`, Watchtower ou `prisma db push` na produção. Alterações de schema devem ser compatíveis com a versão anterior. Em falha na migração/inicialização/verificações locais, o script tenta voltar às imagens anteriores. O banco nunca é restaurado automaticamente. Uma falha da verificação HTTPS externa marca o workflow como falho e requer diagnóstico.

## Configuração

- GitHub secrets: `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`.
- GitHub variables: `VPS_HOST`, `VPS_USER`, `CLERK_PUBLISHABLE_KEY`, `PUBLIC_DNS_READY=true` quando o DNS estiver ativo.
- Runtime: `/srv/portal-financeiro/config.env`, conforme `deploy/.env.vps.example`.
- Segredos: arquivos em `/srv/portal-financeiro/secrets`, diretório privado. As chaves Clerk backend e senhas não entram nas imagens, no Git ou nos logs do workflow.
- `CLERK_WEBHOOK_SECRET` deve ser o segredo do endpoint Clerk `https://portalfinanceiro.net/api/auth/webhooks`, assinando `user.deleted`. Sem ele, a exclusão de conta no Clerk não remove automaticamente os dados locais; o handler rejeita eventos sem assinatura válida.
- O DNS raiz deve apontar para o IP da VPS, substituindo o CNAME do túnel antigo. Preserve os registros Clerk. Use SSL Cloudflare Full (strict), com certificado público emitido pelo Caddy.

O bootstrap exige root uma vez (`deploy/bootstrap.sh`). O usuário `portal` opera Docker e portanto tem privilégios equivalentes a root via Docker: mantenha sua chave somente no secret do repositório. A proteção de `main` e revisões obrigatórias podem ser configuradas conforme a equipe.

No Caddy compartilhado, adicione `import /data/sites/*.caddy` e instale `deploy/portalfinanceiro.caddy` no volume persistente `/data/sites`. Esse import deve permanecer no repositório One Piece para sobreviver às próximas releases.

## Inspeção e recuperação

Na VPS, como `portal`:

```bash
release=$(cat /srv/portal-financeiro/current-release)
docker compose --env-file /srv/portal-financeiro/config.env --env-file "$release/images.env" -f "$release/compose.vps.yml" ps
bash /srv/portal-financeiro/backup.sh
bash "$release/rollback.sh"
```

O rollback usa `previous-release`, preserva o volume e requer que as imagens anteriores continuem disponíveis localmente. Não remova volumes para resolver uma falha de aplicação. Migrações destrutivas exigem um plano específico de recuperação, porque voltar imagens não desfaz schema nem restaura dados.

## Backups

`portal-backup.timer` executa diariamente às 06:30 UTC, além do backup anterior a cada release. Os dumps em formato PostgreSQL custom e seus checksums ficam em `/srv/portal-financeiro/backups`. O script verifica se o arquivo pode ser listado; isso não substitui teste de restauração.

Para testar recuperação, crie um banco separado, restaure com `pg_restore --exit-on-error`, confira tabelas e contagens e só então remova o banco de teste. Nunca teste restauração sobre a base ativa. Backups nesta mesma VPS não protegem contra perda do servidor; configure cópia externa e retenção conforme a política desejada. O antigo serviço R2 não está ativo neste Compose.

## Limites e manutenção

Uma VPS com Compose permite operação simples e reproduzível, mas não oferece alta disponibilidade nem garante interrupção zero durante atualizações. Atualize imagens base periodicamente por uma nova release e monitore espaço, timer e healthchecks. Node das APIs roda sem root, filesystem somente leitura, limites de recursos e sem capabilities.

As credenciais que já estiveram em commits antigos precisam de rotação no provedor; retirar arquivos da árvore atual não apaga o histórico. Auditorias bloqueiam vulnerabilidades altas/críticas. As correções de dependências e o estado das pendências estão no [registro de débitos de 24/09/2026](debitos-tecnicos-2026-09-24.md).

## Backup externo preparado no PR #5

O webhook Clerk de exclusão já foi ativado e recebeu uma entrega assinada com HTTP 200. Os scripts de R2 abaixo ainda exigem configuração; a presença dos arquivos no repositório não significa que o backup externo esteja funcionando.

1. Criar uma credencial R2 de objetos com leitura/escrita apenas em `backup-financas`, restrita ao IP da VPS. Usar o prefixo dedicado `portal-financeiro/restic`.
2. Instalar `restic` pelo repositório oficial do sistema. Configurar `/srv/portal-financeiro/secrets/restic.env` conforme `deploy/restic.env.example`, proprietário `portal`, modo `0600`. Manter a senha de criptografia em arquivo privado separado e guardar uma cópia de recuperação fora da VPS; sem essa senha os arquivos externos são irrecuperáveis.
3. Como `portal`, carregar as variáveis do arquivo e inicializar o repositório com `restic init` somente se ele ainda não existir. Nunca registrar credenciais no terminal, histórico Git ou logs.
4. Instalar `backup.sh`, `offsite-backup.sh` e `restore-check.sh` em `/srv/portal-financeiro`. Executar o backup e depois a restauração isolada; ambos devem concluir com sucesso antes da migração da aplicação.
5. Instalar/habilitar os serviços e timers de backup/restauração fornecidos em `deploy`. O backup mantém 14 diários, 8 semanais e 12 mensais; a restauração semanal também recupera espaço com `prune` após sucesso.
6. Conferir `/srv/portal-financeiro/backups/offsite-last-success` e `restore-last-success`. O monitor no GitHub exige cópia externa com menos de 26 horas e restauração com menos de 8 dias. Integrá-lo somente depois desses testes reais.

`restore-check.sh` restaura em um container PostgreSQL descartável sem rede, portas ou volumes de produção. O teste local de 24/09 comprovou a recuperação do dump disponível, mas o teste remoto com R2 continua pendente. Após a migração do contrato 2, o rollback para 1.4.0 é bloqueado; consulte o registro de débitos antes de publicar.

Referências: [publicação de imagens no GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Compose em produção](https://docs.docker.com/compose/how-tos/production/), [imports do Caddy](https://caddyserver.com/docs/caddyfile/directives/import).
