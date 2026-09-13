#!/usr/bin/env bash
set -e

# ==============================================================================
# ORA — SuperAdmin Docker Seeder & Provisioning Tool
# Runs entirely inside the running ora-server Docker container.
# No host-level Node.js, pnpm, or dependencies required.
# ==============================================================================

COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  # Fall back to docker-compose.yml if prod file isn't present
  if [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
  else
    echo "❌ Error: Neither docker-compose.prod.yml nor docker-compose.yml found."
    exit 1
  fi
fi

# Check if ora-server container is running
if ! docker compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | grep -q "ora-server"; then
  echo "⚠️  ora-server is not currently running. Starting it with docker compose run..."
  docker compose -f "$COMPOSE_FILE" run --rm ora-server node dist/scripts/seed-admin.js "$@"
  exit 0
fi

echo "⚡ Provisioning SuperAdmin inside running ora-server container..."
docker compose -f "$COMPOSE_FILE" exec -T ora-server node dist/scripts/seed-admin.js "$@"
