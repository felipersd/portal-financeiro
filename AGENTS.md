# Convenções do projeto

## Entrega das alterações

Por orientação do usuário, trabalhar diretamente em `main`, sem criar branches ou pull requests por padrão.

- Sincronize `main` com o remoto sem sobrescrever alterações existentes e execute as verificações pertinentes.
- Atualize `VERSION`, faça commit e push direto em `main`; depois crie uma tag anotada `vX.Y.Z` para esse mesmo commit e envie a tag.
- Compare a versão e as tags existentes antes de escolher a próxima versão. Use semver: patch para correções, minor para funcionalidades e major para incompatibilidades públicas.
- Não mova nem sobrescreva tags publicadas. A versão de publicação é `VERSION`; não espelhe automaticamente nos pacotes internos.
- Não abra PRs nem acompanhe execuções do CI automaticamente, salvo pedido explícito.
- O envio da tag autoriza testes e preparação de imagens, nunca o deploy. A produção é publicada somente por execução manual de `Deploy production`, iniciada pelo usuário ou mediante pedido explícito dele.
- Informe o commit enviado, a versão/tag e as verificações realizadas. Não dispare o deploy ao terminar a entrega.

## Compatibilidade de publicação

- O deploy blue/green prepara o slot inativo e preserva a aplicação ativa. Não reintroduza `compose down` ou migrações automáticas no deploy de aplicação.
- Mudanças de banco exigem plano separado de expansão/contração, compatibilidade com a versão ativa e validação em banco descartável. Migrações pendentes bloqueiam a publicação por padrão.
- Preserve compatibilidade das APIs e dos dados durante a janela de rollback, inclusive com abas usando o frontend anterior. Consulte `docs/blue-green.md` antes de alterar os scripts de publicação.
