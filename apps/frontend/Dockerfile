# FASE 1: BUILD (Compilação do Frontend)
# ----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de configuração de dependências
COPY package*.json ./
COPY . .

# Modo de build padrão (production na nuvem, sobrescrevido no docker-compose local)
ARG VITE_MODE=production

# Instala as dependências e executa o build (cria a pasta 'dist')
# O Vite usará o .env.production ou outro dependendo da flag --mode
RUN --mount=type=cache,target=/root/.npm npm install
RUN npm run build -- --mode $VITE_MODE 

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