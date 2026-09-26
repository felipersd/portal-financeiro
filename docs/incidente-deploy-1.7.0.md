# Falha de inicialização no deploy 1.7.0

As migrações de identidade e financeiro concluíram. O serviço financeiro, porém, reiniciou com `EACCES` ao ler `/run/secrets/vapid_keys`: o deploy criou o arquivo com modo 0600 e proprietário `portal` (UID 1001), enquanto a imagem executa como `node` (UID 1000).

Os segredos do Docker Compose usam arquivos montados do host, preservando suas permissões. O build, os testes unitários e as migrações não exercitavam essa leitura com usuários distintos. O guard bloqueou corretamente o rollback para o contrato financeiro anterior e o gateway foi interrompido.

## Recuperação aplicada

O arquivo existente recebeu leitura somente pelo grupo do runtime, mantendo o proprietário do deploy e o modo 0640. O diretório do host continua privado (0700). A chave não foi recriada ou divulgada. A leitura e a validação foram confirmadas com a própria imagem, sem privilégios adicionais, e o financeiro foi reiniciado.

A etapa de deploy da mesma release foi reexecutada pelo GitHub Actions e concluiu com sucesso: [execução 36221718707](https://github.com/felipersd/portal-financeiro/actions/runs/36221718707). O endpoint público de versão confirmou a revisão `343ae9117fefd8034ccd9afb691e5eecd8ee22bf`. Não houve restauração do banco nem reversão das migrações.

## Prevenção na versão 1.7.1

- O script de preparação identifica o grupo da imagem, preserva a identidade VAPID e ajusta somente o arquivo montado. O helper usa o UID do deploy e o grupo do runtime, sem root adicional e sem capabilities.
- A preparação valida o diretório privado, rejeita links simbólicos e valida leitura/formato com o usuário padrão da imagem antes de iniciar banco, backup ou migrações.
- O caminho vem da configuração efetiva do Compose, respeitando `SECRETS_DIR`.
- O CI constrói a imagem de produção e reproduz a diferença de UIDs e a falha de permissão 0600. Verifica recuperação idempotente sem trocar as chaves, rejeição de diretório permissivo e rejeição de conteúdo inválido.

O reparo operacional já recuperou 1.7.0. O PR de 1.7.1 torna essa correção permanente nas próximas instalações e publicações.
