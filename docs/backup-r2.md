# Backup externo e recuperação

Ativado em 24/09/2026 para a produção 1.5.0. O token de conta `portal-financeiro-restic` tem permissão de objetos com leitura/escrita apenas no bucket `backup-financas`, restrito ao IPv4 `2.25.160.99`. O bucket continua privado. O repositório criptografado usa o prefixo `portal-financeiro/restic`; os objetos antigos fora desse prefixo não são alterados.

O host também possui IPv6. Uma tentativa nativa por IPv6 foi recusada pelo R2, conforme a restrição. `restic.sh` usa a imagem oficial 0.18.1 fixada por digest, bridge IPv4, filesystem somente leitura, senha montada somente para leitura, sem capabilities e com limites de memória/CPU. Não altera a rede das aplicações nem amplia a permissão do token. Se o bridge passar a usar IPv6, o script falha explicitamente.

## Evidência da ativação

- Repositório inicializado pela própria VPS com a credencial restrita.
- Snapshot inicial `3dd0360b`, em 24/09/2026 às 08:01 UTC: dump da produção corrente enviado e verificado sem erros.
- Dump recuperado do R2 e restaurado com `pg_restore --exit-on-error` em PostgreSQL descartável, sem rede, portas ou volumes de produção. Tabelas de identidade e finanças consultadas com sucesso.
- Retenção de 14 diários, 8 semanais e 12 mensais; recuperação de espaço após a restauração semanal bem-sucedida.
- Senha de criptografia copiada para fora da VPS e protegida com DPAPI do usuário Windows. Nenhuma credencial está no repositório ou no relatório.

## Operação

Os scripts em `/srv/portal-financeiro` são executados como `portal`. O serviço de backup roda diariamente pelo `portal-backup.timer`; `portal-restore-check.timer` agenda a restauração aos domingos. Ambos usam o diretório de trabalho explícito para que a execução não dependa do diretório da sessão SSH.

```bash
systemctl status portal-backup.timer portal-restore-check.timer
systemctl show portal-backup.service portal-restore-check.service -p Result -p ExecMainStatus
cat /srv/portal-financeiro/backups/offsite-last-success
cat /srv/portal-financeiro/backups/restore-last-success
```

Os marcadores só avançam após sucesso. O workflow `Production availability` verifica a aplicação e exige backup com menos de 26 horas e restauração com menos de 8 dias. Falhas aparecem no GitHub Actions; entrega de notificações depende das preferências da conta GitHub.

O próximo script de release exige cópia externa verificada do dump exato anterior à migração; falha de R2 impede avançar para a migração. A publicação da aplicação não é necessária para operar os timers instalados.

## Recuperação e limites

Em uma nova VPS, recuperar a senha do cofre externo, criar/ajustar uma credencial restrita ao novo IP e configurar `restic.env`. Usar `restic.sh snapshots` para escolher o ponto e testar a restauração isolada antes de recuperar produção em manutenção. Não executar `init` sobre um repositório já existente e não sobrescrever a senha original.

A cópia DPAPI local depende do usuário/perfil Windows original. O proprietário deve também guardar a senha em seu gerenciador de senhas ou cofre de recuperação independente antes de descartar esse computador/perfil. A senha não é recuperável pelo Cloudflare.

O token tem escrita e pode remover objetos: esta solução não é backup imutável nem protege contra todo comprometimento da VPS. Tokens antigos abrangentes ainda precisam ser inventariados e revogados após confirmar seus consumidores. A infraestrutura continua sem alta disponibilidade.
