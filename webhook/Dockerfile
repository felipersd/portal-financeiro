# # webhook/Dockerfile
# FROM python:3.11-alpine

# # Instala dependências do sistema
# RUN apk add --no-cache bash git docker-cli docker-cli-compose

# # Instala Flask
# RUN pip install flask

# # Define o diretório de trabalho
# WORKDIR /app

# # Copia os arquivos do webhook para a pasta webhook/ para manter a estrutura do repo
# COPY webhook.py webhook/
# COPY deploy.sh webhook/

# # Dá permissão de execução para o deploy.sh
# RUN chmod +x webhook/deploy.sh

# # Comando para iniciar o webhook
# CMD ["python", "webhook/webhook.py"]
