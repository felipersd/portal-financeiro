# Convenções do projeto

## Entrega das alterações

Por orientação do usuário, a entrega padrão termina após commit e push.

- Não abra pull requests nem acompanhe PRs ou execuções do CI automaticamente. Faça essas ações somente quando o usuário pedir explicitamente.
- Execute as verificações locais pertinentes à mudança antes do commit e push, sem monitoramento remoto posterior por padrão.
- Informe brevemente o que mudou e o resultado do commit/push.
- A regra de versão abaixo continua válida quando o usuário solicitar a abertura de um PR.

## Versão em cada pull request

Por orientação do usuário, todo novo PR deve incluir a atualização do arquivo `VERSION`, para facilitar a publicação.

- Compare a versão da branch base e as tags existentes antes de escolher a próxima versão.
- Use versionamento semântico: patch para correções, minor para novas funcionalidades e major para mudanças incompatíveis da interface pública.
- Faça a atualização no próprio PR antes de abri-lo. Ao atualizar o mesmo PR, mantenha a versão escolhida, salvo se ela já tiver sido publicada ou o escopo exigir outra versão.
- A versão de publicação é definida pelo arquivo `VERSION` da raiz; não altere versões dos pacotes internos apenas para espelhá-la.
- Atualizar `VERSION` não significa criar a tag, integrar o PR ou publicar em produção. Siga a autorização do usuário para essas ações.
