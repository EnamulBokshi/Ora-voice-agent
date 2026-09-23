#!/bin/bash
set -e

# ==============================================================================
# ORA Production One-Shot Deployment Script
# Domain: https://tryora.live
# Backend Port:  4000 (127.0.0.1:4000 -> container:5000)
# Frontend Port: 4080 (127.0.0.1:4080 -> container:3000)
# ==============================================================================

LOCAL_DIR="/home/nullpointer/Documents/work/hype_corporation/ORA/"
REMOTE_HOST="contabo"
REMOTE_DIR="/root/ora"

echo "=========================================================="
echo "🚀 Starting ORA Production Deployment ($REMOTE_HOST)"
echo "=========================================================="

echo "📦 [1/2] Syncing codebase to VPS ($REMOTE_HOST:$REMOTE_DIR)..."
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
  --exclude '*.tsbuildinfo' \
  --exclude '.agents' \
  --exclude 'agent' \
  --exclude '.agent' \
  --exclude 'client/.agent' \
  --exclude '.claude' \
  --exclude 'CLAUDE.md' \
  --exclude '.codex' \
  --exclude 'codex' \
  --exclude '.commandcode' \
  --exclude 'client/.commandcode' \
  --exclude 'server/.commandcode' \
  --exclude '.impeccable' \
  --exclude 'client/.impeccable' \
  --exclude 'impeccable' \
  --exclude 'agent-docs' \
  --exclude '.antigravity*' \
  --exclude '.gemini' \
  --exclude '.vscode' \
  --exclude '.idea' \
  --exclude '.postman' \
  --exclude 'graphify-out' \
  --exclude 'graphify' \
  --exclude 'docs' \
  --exclude 'storefront-theme' \
  --exclude 'landing_page_design' \
  --exclude 'client/landing_page_design' \
  --exclude 'erd.pdf' \
  --exclude 'crawlers.zip' \
  --exclude 'scratch' \
  --exclude 'future-work.txt' \
  --exclude 'improve.txt' \
  --exclude 'issues.txt' \
  --exclude 'skills-lock.json' \
  --exclude 'test-voice-client.html' \
  "$LOCAL_DIR" "$REMOTE_HOST:$REMOTE_DIR/"

echo "🔧 [2/2] Running production deployment on VPS..."
ssh "$REMOTE_HOST" "bash -s" << 'EOF'
set -e
REMOTE_DIR="/root/ora"
cd "$REMOTE_DIR"

echo "🔍 Verifying production environment configuration..."
if [ ! -f "$REMOTE_DIR/.env" ]; then
  echo "⚠️  No .env found on VPS. Creating initial .env from .env.example..."
  cp "$REMOTE_DIR/.env.example" "$REMOTE_DIR/.env"
  echo "👉 Please verify secrets in $REMOTE_DIR/.env on the VPS!"
fi

# Pre-flight check for unconfigured default placeholders
if grep -q "replace_with_a_super_strong_random_jwt_secret" "$REMOTE_DIR/.env" 2>/dev/null; then
  echo "⚠️  WARNING: Default JWT_SECRET detected in $REMOTE_DIR/.env. Consider generating a production secret."
fi
if grep -q "AIzaSy_your_gemini_api_key_here" "$REMOTE_DIR/.env" 2>/dev/null; then
  echo "⚠️  WARNING: Default GEMINI_API_KEY placeholder detected in $REMOTE_DIR/.env. AI Voice & RAG features require a valid key."
fi
if grep -q "replace_with_a_super_strong_admin_password" "$REMOTE_DIR/.env" 2>/dev/null; then
  echo "⚠️  WARNING: Default ADMIN_PASSWORD detected in $REMOTE_DIR/.env. Consider setting a secure password in .env."
fi

# Update Host Nginx Configuration if Nginx is installed
if [ -d "/etc/nginx/sites-available" ]; then
  echo "🌐 Updating Host Nginx reverse proxy configuration..."
  cp "$REMOTE_DIR/deploy/nginx/ora.conf" /etc/nginx/sites-available/ora.conf
  mkdir -p /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/ora.conf /etc/nginx/sites-enabled/
  if nginx -t > /dev/null 2>&1; then
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully."
  else
    echo "⚠️  Nginx config test failed (pending SSL certificates or syntax). Preserving running Nginx config."
  fi
fi

echo "🔨 Building and launching ORA production containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo ""
echo "📊 Production Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🌱 Verifying & provisioning SuperAdmin inside container..."
# Wait for container node runtime
sleep 3
docker compose -f docker-compose.prod.yml exec -T ora-server node dist/scripts/seed-admin.js || {
  echo "ℹ️  AdminService auto-seed on module init maintains SuperAdmin state."
}

ADMIN_EMAIL_VAL=$(grep "^ADMIN_EMAIL=" "$REMOTE_DIR/.env" 2>/dev/null | cut -d '=' -f2 | tr -d '"\r\n' || echo "")

echo ""
echo "🎉 ORA production stack deployed successfully!"
echo "🌐 Frontend URL:  https://tryora.live"
echo "👑 Admin Portal:  https://tryora.live/admin"
echo "🔑 SuperAdmin:    ${ADMIN_EMAIL_VAL:-ora.admin@tryora.live}"
EOF

