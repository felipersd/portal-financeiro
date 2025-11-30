#!/bin/bash
# deploy.sh
echo "Deploy started..."

cd /app || exit 1

git pull origin main

docker compose down
docker compose up -d --build

echo "Deploy finished!"