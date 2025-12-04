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
# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install --include=dev

# Gera o cliente Prisma
RUN npx prisma generate

# Copia o restante do código fonte (src, tsconfig.json, etc)
COPY . .

# Compila o TypeScript
RUN npm run build

# ----------------------------------------
# FASE 2: RUNTIME (Imagem Final)
# ----------------------------------------
FROM node:20-alpine AS final

# Configura o ambiente de execução
WORKDIR /app
ENV NODE_ENV production

# Instala dependências do sistema necessárias (OpenSSL para o Prisma)
RUN apk add --no-cache openssl

# Copia o código compilado da fase de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Instala apenas dependências de produção na imagem final
RUN npm install --only=production

# Copia o cliente Prisma gerado
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# O CMD é o que o container irá executar quando for iniciado
# 🚨 IMPORTANTE: O comando de migração/push é movido para o docker-compose!
# Aqui, apenas iniciamos o servidor.
CMD ["npm", "run", "start"]