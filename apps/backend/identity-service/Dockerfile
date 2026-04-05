# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN --mount=type=cache,target=/root/.npm npm install

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["/bin/sh", "-c", "npx prisma db push --accept-data-loss && exec node dist/server/server.js"]
