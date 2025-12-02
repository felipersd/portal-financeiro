# 1. Fase de Build (para instalar dependências)
FROM node:20-alpine AS builder

# Variável de ambiente (para garantir que o npm funcione em prod)
ENV NODE_ENV production

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências de produção
RUN npm install --only=production
RUN npx prisma generate

# 2. Fase Final (Runtime)
# Usa uma imagem menor e mais segura
FROM node:20-alpine AS final

# Define o diretório de trabalho
WORKDIR /app

# Copia o código fonte (apenas o que é necessário para a produção)
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Comando para iniciar o servidor de PRODUÇÃO
# 🚨 AJUSTE ESTE COMANDO CONFORME SEU SCRIPT DE INICIALIZAÇÃO DE PROD
CMD ["npm", "run", "start"]