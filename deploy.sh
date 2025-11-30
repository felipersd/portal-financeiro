#!/bin/bash
cd /Users/felipediniz/Documents/Projetos/portal-financeiro

git pull

docker compose down
docker compose pull
docker compose up -d