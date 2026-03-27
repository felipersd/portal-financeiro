# FASE 1: BUILD (Compilação do Frontend)
# ----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de configuração de dependências
COPY package*.json ./
COPY . .

# Instala as dependências e executa o build (cria a pasta 'dist')
# Como estamos rodando em produção, o Vite vai pegar automaticamente o .env.production
RUN npm install
RUN npm run build 

# ----------------------------------------
# FASE 2: RUNTIME (Servir com Nginx)
# ----------------------------------------
# Usa uma imagem Nginx minimalista, ideal para servir HTML/CSS/JS
FROM nginx:alpine AS final

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d

# Copia a pasta de build gerada pelo Vite (geralmente 'dist')
# 🚨 Ajuste 'dist' se o seu framework Vite usar outro nome (ex: 'build')
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a sua configuração customizada do Nginx (se você tiver uma)
# Se você não tiver, o Nginx usará as configurações padrão para o html acima
COPY nginx.conf /etc/nginx/conf.d/default.conf

# A porta 80 é a porta padrão do Nginx
EXPOSE 80