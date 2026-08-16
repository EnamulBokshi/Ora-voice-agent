#!/bin/bash
set -e

# ==============================================================================
# ORA Production One-Shot Deployment Script
# Domain: https://tryora.live
# Backend Port:  4000 (127.0.0.1:4000:5000)
# Frontend Port: 4080 (127.0.0.1:4080:3000)
# ==============================================================================

LOCAL_DIR="/home/nullpointer/Documents/work/hype_corporation/ORA/"
REMOTE_HOST="contabo"
REMOTE_DIR="/root/ora"

echo "🚀 [1/4] Syncing ORA codebase to VPS ($REMOTE_HOST:$REMOTE_DIR)..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude '.git' \
  --exclude '.next' \
  --exclude 'client/.next' \
  --exclude 'server/dist' \
  --exclude '.turbo' \
  --exclude '.env' \
  --exclude '.antigravity*' \
  --exclude 'erd.pdf' \
  "$LOCAL_DIR" "$REMOTE_HOST:$REMOTE_DIR/"

echo "🔧 [2/4] Verifying production .env on VPS..."
ssh "$REMOTE_HOST" "
  if [ ! -f $REMOTE_DIR/.env ]; then
    echo '⚠️  No .env found on VPS. Creating initial .env from .env.example...'
    cp $REMOTE_DIR/.env.example $REMOTE_DIR/.env
    echo '👉 Please verify and update secrets in $REMOTE_DIR/.env on the VPS!'
  fi
"

echo "🌐 [3/4] Updating Host Nginx configuration..."
ssh "$REMOTE_HOST" "
  cp $REMOTE_DIR/deploy/nginx/ora.conf /etc/nginx/sites-available/ora.conf
  ln -sf /etc/nginx/sites-available/ora.conf /etc/nginx/sites-enabled/
  if nginx -t > /dev/null 2>&1; then
    systemctl reload nginx
    echo '✅ Nginx reloaded successfully.'
  else
    echo '⚠️  Nginx config test failed (likely pending Certbot SSL certs). Keeping current config.'
  fi
"

echo "🔨 [4/4] Building and launching ORA production containers..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml up -d --build --remove-orphans"

echo ""
echo "📊 Current Container Status:"
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml ps"

echo ""
echo "🎉 ORA deployment finished! Visit: https://tryora.live"
