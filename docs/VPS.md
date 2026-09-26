# Operação da VPS

O Portal usa `portalfinanceiro.net`, PostgreSQL e serviços separados do One Piece. O Caddy do One Piece é o ponto de entrada HTTPS compartilhado. Os gateways dos slots blue/green participam da rede externa `onepiece-library_default`, sem publicar portas. O gateway legado usa `127.0.0.1:8081` até sua retirada. APIs e banco não publicam portas.

## Fluxo de entrega

1. Atualize `VERSION`, faça commit e push diretamente em `main`, sem PR por padrão, e crie/envie a tag anotada correspondente (por exemplo `v1.8.1`).
2. **Verify and prepare release** executa as verificações e, para tags, constrói quatro imagens Linux amd64 no GHCR com procedência e SBOM. Salva o artefato `release-manifest`, vinculando os digests ao commit. Nenhum job desse workflow acessa a VPS.
3. Após a preparação concluir com sucesso, abra **Actions → Deploy production → Run workflow**. Mantenha `main` no seletor de branch, informe a tag no campo `tag` e clique em **Run workflow**. Esta é a única entrada de deploy; enviar/reexecutar uma tag não publica automaticamente.
4. O deploy verifica tag, versão e inclusão do commit em `main`, localiza a preparação bem-sucedida daquela tag/commit e valida os quatro digests do artefato. Usa as imagens já construídas, sem recompilar. Preparação ausente, falha, em andamento ou artefato indisponível impede acesso à VPS.
5. O job do ambiente `production` envia os scripts da tag e os digests à VPS por SSH. A VPS confere o schema, faz backup local/R2, inicia a candidata e troca o tráfego pelo Caddy após as verificações. `flock` e a concorrência `portal-production` serializam publicações.

O manifesto é retido por 90 dias (sujeito aos limites do repositório). Se expirar, reexecute a preparação original da tag e depois solicite o deploy manual. Tags anteriores a 1.8.1 não têm esse artefato e não são aceitas pelo novo fluxo. Para rollback de uma versão já implantada, use o procedimento blue/green abaixo.

Workflows de tags antigas mantêm a configuração que existia naquele commit: não reexecute um deploy antigo esperando que o novo bloqueio manual se aplique retroativamente.

Não use `latest`, Watchtower ou `prisma db push` na produção. O deploy de aplicação **não aplica migrações**: uma migração pendente ou alterada bloqueia a publicação, preservando o serviço ativo. Alterações de schema exigem uma operação separada e compatível com a aplicação em execução. Falhas após a troca acionam tentativa de recuperação da rota anterior; o banco nunca é restaurado automaticamente. Consulte [sequência, limites e operação blue/green](blue-green.md).

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
slot=$(cat /srv/portal-financeiro/runtime/active-slot)
DEPLOYMENT_SLOT="$slot" docker compose -p "portal-financeiro-$slot" --env-file /srv/portal-financeiro/config.env --env-file "$release/images.env" -f "$release/compose.slot.yml" ps
bash /srv/portal-financeiro/backup.sh
bash "$release/rollback.sh"
```

Os comandos acima se aplicam após a ativação blue/green. O rollback usa `previous-release` e `deployment/previous-slot`, verifica os containers preservados e troca o tráfego. Na primeira transição a versão anterior ainda pode ser legada; use sempre o script novo, conforme o [guia de recuperação](blue-green.md#inspeção-e-rollback). Não remova volumes para resolver uma falha de aplicação. Voltar a aplicação não desfaz schema nem restaura dados.

## Backups

`portal-backup.timer` executa diariamente às 06:30 UTC, além do backup anterior a cada release. Os dumps em formato PostgreSQL custom e seus checksums ficam em `/srv/portal-financeiro/backups`. O script verifica se o arquivo pode ser listado; isso não substitui teste de restauração.

Para testar recuperação, crie um banco separado, restaure com `pg_restore --exit-on-error`, confira tabelas e contagens e só então remova o banco de teste. Nunca teste restauração sobre a base ativa. Backups nesta mesma VPS não protegem contra perda do servidor; configure cópia externa e retenção conforme a política desejada. O antigo serviço R2 não está ativo neste Compose.

## Limites e manutenção

Blue/green preserva a aplicação durante a preparação da candidata e permite trocar o tráfego sem reiniciar o proxy. Uma única VPS continua sem alta disponibilidade contra falhas do host ou do banco. Atualize imagens base por uma nova release e monitore memória, conexões, espaço, timers e healthchecks. Node das APIs roda sem root, filesystem somente leitura, limites de recursos e sem capabilities.

As credenciais que já estiveram em commits antigos precisam de rotação no provedor; retirar arquivos da árvore atual não apaga o histórico. Auditorias bloqueiam vulnerabilidades altas/críticas. As correções de dependências e o estado das pendências estão no [registro de débitos de 24/09/2026](debitos-tecnicos-2026-09-24.md).

## Backup externo R2

O webhook Clerk de exclusão já foi ativado e recebeu uma entrega assinada com HTTP 200. O backup R2 e a restauração remota foram ativados e verificados em 24/09/2026, depois da publicação de 1.5.0. Consulte [evidências e recuperação](backup-r2.md). Os passos abaixo descrevem a configuração para manutenção/reinstalação.

1. Criar uma credencial R2 de objetos com leitura/escrita apenas em `backup-financas`, restrita ao IP da VPS. Usar o prefixo dedicado `portal-financeiro/restic`.
2. Configurar `/srv/portal-financeiro/secrets/restic.env` conforme `deploy/restic.env.example`, proprietário `portal`, modo `0600`. Manter a senha de criptografia em arquivo privado separado e guardar uma cópia de recuperação fora da VPS; sem essa senha os arquivos externos são irrecuperáveis.
3. Instalar `restic.sh`: ele executa a imagem oficial fixada por digest em container com saída IPv4, preservando a restrição de IP do token. Como `portal`, executar `bash /srv/portal-financeiro/restic.sh init` somente se o repositório ainda não existir. Nunca registrar credenciais no terminal, histórico Git ou logs.
4. Instalar `backup.sh`, `offsite-backup.sh`, `restore-check.sh` e `restic.sh` em `/srv/portal-financeiro`. Executar o backup e depois a restauração isolada; ambos devem concluir com sucesso antes da migração da aplicação. O script de release também verifica no R2 o dump anterior à migração e atualiza os scripts operacionais após a publicação.
5. Instalar/habilitar os serviços e timers de backup/restauração fornecidos em `deploy`. O backup mantém 14 diários, 8 semanais e 12 mensais; a restauração semanal também recupera espaço com `prune` após sucesso.
6. Conferir `/srv/portal-financeiro/backups/offsite-last-success` e `restore-last-success`. O monitor no GitHub exige cópia externa com menos de 26 horas e restauração com menos de 8 dias. Integrá-lo somente depois desses testes reais.

`restore-check.sh` restaura em um container PostgreSQL descartável sem rede, portas ou volumes de produção. A restauração a partir do R2 foi comprovada em 24/09. Após a migração do contrato 2, o rollback para 1.4.0 é bloqueado; consulte o registro de débitos antes de publicar.

Referências: [publicação de imagens no GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [Compose em produção](https://docs.docker.com/compose/how-tos/production/), [imports do Caddy](https://caddyserver.com/docs/caddyfile/directives/import).
