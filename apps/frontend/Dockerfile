FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_MODE=production
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_URL=/api
ARG APP_REVISION=development
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -- --mode $VITE_MODE
RUN printf '{"revision":"%s"}\n' "$APP_REVISION" > dist/version.json

FROM nginx:stable-alpine AS final
LABEL org.opencontainers.image.source="https://github.com/felipersd/portal-financeiro"
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
