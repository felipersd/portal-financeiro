# 1. Fase de Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Instala todas as dependências (pode precisar de devDependencies para o build)
RUN npm install

# Copia o restante do código
COPY . .

# Comando de Build do Frontend (gera os arquivos estáticos)
RUN npm run build

# 2. Fase Final (Runtime - Servir os arquivos estáticos)
# Usamos o Nginx, que é muito mais leve e rápido para servir HTML/CSS/JS
FROM nginx:alpine AS final

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d

# Copia a pasta de build gerada pelo frontend para o local de servir do Nginx
# 🚨 AJUSTE O CAMINHO /dist ou /build CONFORME SEU FRAMEWORK (Next, React, Vue)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração customizada do Nginx (opcional, mas recomendado)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx expõe a porta 80 por padrão
EXPOSE 80

# O CMD padrão do Nginx já inicia o servidor.