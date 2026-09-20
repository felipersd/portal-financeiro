FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build && chmod +x entrypoint.sh

FROM builder AS production-dependencies
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ARG APP_REVISION=development
ENV APP_REVISION=$APP_REVISION
LABEL org.opencontainers.image.source="https://github.com/felipersd/portal-financeiro"
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json /app/entrypoint.sh /app/prisma.config.ts ./
USER node
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server/server.js"]
