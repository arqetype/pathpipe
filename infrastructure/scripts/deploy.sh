#!/bin/sh

set -e

echo "Pulling latest changes..."
git pull

echo "Installing dependencies..."
pnpm install

echo "Building applications..."
pnpm build

echo "Starting containers..."
docker compose \
  -f infrastructure/docker/production/docker-compose.yml \
  --env-file .env.production.local \
  up -d --build

echo "Deployment completed."
