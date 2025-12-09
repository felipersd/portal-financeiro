FROM alpine:3.18

# Instala PostgreSQL client (pg_dump) e AWS CLI
RUN apk add --no-cache postgresql-client aws-cli bash

WORKDIR /app

COPY backup.sh .
RUN sed -i 's/\r$//' backup.sh && chmod +x backup.sh

# Executa o script de backup e depois dorme por 24h (loop infinito)
# Ou pode ser configurado via cron. Aqui faremos um loop simples.
CMD ["sh", "-c", "while true; do ./backup.sh; echo 'Sleeping for 24h...'; sleep 86400; done"]
