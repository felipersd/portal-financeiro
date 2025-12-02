# #!/bin/bash
# # deploy.sh
# echo "Deploy started..."

# cd /app || exit 1

# git pull origin main

# export PROJECT_ROOT="${HOST_PROJECT_ROOT}"
# docker-compose --env-file .env.production down
# docker-compose --env-file .env.production up -d --build --force-recreate api web

# echo "Deploy finished!"