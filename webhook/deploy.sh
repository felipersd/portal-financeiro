#!/bin/bash
# deploy.sh
echo "Deploy started..."

cd /app || exit 1

git pull origin main

export PROJECT_ROOT="${HOST_PROJECT_ROOT}"
docker compose -p portal-financeiro up -d --build --force-recreate api web

echo "Deploy finished!"