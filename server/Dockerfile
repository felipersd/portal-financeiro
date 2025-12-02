# ----------------------------------------
# FASE 1: BUILD (Compilação e Preparação)
# ----------------------------------------
FROM node:20-alpine AS builder

# Configura o ambiente de build
ENV NODE_ENV production
WORKDIR /app

# Copia os arquivos necessários para instalação
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências (apenas as de produção)
RUN npm install --only=production

# Gera o cliente Prisma (Isso não toca no banco, só cria o código cliente)
RUN npx prisma generate

# ----------------------------------------
# FASE 2: RUNTIME (Imagem Final)
# ----------------------------------------
FROM node:20-alpine AS final

# Configura o ambiente de execução
WORKDIR /app
ENV NODE_ENV production

# Copia o código fonte (o restante dos arquivos .js ou .ts compilados)
COPY . . 

# Copia os node_modules e o cliente Prisma gerados na fase de build
COPY --from=builder /app/node_modules ./node_modules

# O CMD é o que o container irá executar quando for iniciado
# 🚨 IMPORTANTE: O comando de migração/push é movido para o docker-compose!
# Aqui, apenas iniciamos o servidor.
CMD ["npm", "run", "start"]