# ⚡️ Otimização do Prisma (Connection Pooling) para Celular

Para evitar o estrangulamento de conexões no PostgreSQL e o esgotamento da CPU quando rodado no celular, o Prisma precisa de ajustes precisos na string de conexão do Banco de Dados.

## O Que Fazer

Edite o seu arquivo `.env.production` (ou o arquivo onde você define as variáveis de ambiente em produção) para que o `DATABASE_URL` inclua três parâmetros cruciais de otimização:

```env
# Antes (Padrão Nuvem):
DATABASE_URL="postgresql://user:password@db:5432/finance_db"

# DEPOIS (Otimizado para Celular/Dispositivos com Baixos Recursos):
DATABASE_URL="postgresql://user:password@db:5432/finance_db?connection_limit=2&pool_timeout=0&socket_timeout=10000"
```

## Entenda os Parâmetros (O Porquê)

1. **`connection_limit=2`**: Um celular ou plaquinha ARM sofre com *Context Switching* se tentar manter abrir 15-30 conexões paralelas no banco (o Prisma tenta abrir 10+ conexões por padrão dependendo do # de CPUs). Limitar a `2` ou no máximo `3` forçará a aplicação a esperar ordenadamente, melhorando o Throughput Global incrivelmente ao não travar a I/O do banco.

2. **`pool_timeout=0`**: Se acabar havendo espera nas requisições, `0` diz pro Prisma aguardar o tempo que for necessário ao invés de abortar e jogar no seu log `Error: Timed out fetching connection from the pool.`. Em ambientes lentos, o delay é preferível a um erro seco.

3. **`socket_timeout=10000`** (Opcional, 10 segundos): Se a conexão à rede for perdida em standby, ele descarta conexões "fantasmas" passados 10 segundos inativas, otimizando o Pool.

Aplique as mudanças subindo ou editando sua base Docker usando os `.env` atualizados.
