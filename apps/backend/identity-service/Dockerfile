# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (required for Prisma) - openssl is typically included in verified node-slim images, 
# but apt-get installing ensures we have the libraries if missing.
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "start"]
