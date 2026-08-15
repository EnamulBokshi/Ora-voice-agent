# 🚀 ORA Production Deployment & Dockerization Guide

This guide provides complete, production-ready instructions for deploying **ORA** (Next.js 16+ Dashboard, NestJS 11+ Backend, MongoDB 7.0, and Redis 7) using Docker and Docker Compose on any VPS (DigitalOcean, AWS EC2, Hetzner, Linode, GCP, etc.) or container platform.

---

## 🏗️ Architecture Overview

```
                          Internet (Clients & Storefronts)
                                         │
                                         ▼ (HTTPS :443 / WSS)
                   ┌───────────────────────────────────────────┐
                   │  Reverse Proxy (Nginx / Caddy / Cloudflare)│
                   └─────────────────────┬─────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         / (Dashboard & Static)                    /api/v1 & /ws/voice
                   │                                           │
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │       ora-client        │ ──(Proxy /api)─▶│       ora-server        │
      │   (Next.js 16 Standalone│                 │   (NestJS 11 + WebSocket│
      │        Port 3000)       │                 │        Port 5000)       │
      └─────────────────────────┘                 └────────────┬────────────┘
                                                               │
                                       ┌───────────────────────┴───────────────────────┐
                                       │                                               │
                                       ▼                                               ▼
                          ┌─────────────────────────┐                     ┌─────────────────────────┐
                          │       ora-mongodb       │                     │        ora-redis        │
                          │       (Mongo 7.0)       │                     │     (Redis 7 Alpine)    │
                          └─────────────────────────┘                     └─────────────────────────┘
```

---

## 📋 Prerequisites

1. **Linux VPS:** Ubuntu 22.04 / 24.04 LTS (recommended: minimum 2 vCPU, 4GB RAM).
2. **Docker Engine & Compose:**
   ```bash
   # Install Docker & Docker Compose plugin on Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```
3. **Domain Name:** Point your DNS records (A/CNAME) to your VPS IP address (e.g., `ora.yourdomain.com`).

---

## ⚡ Quickstart Deployment (Production)

### 1. Clone the Repository
```bash
git clone https://github.com/hypedev1/ora.git /opt/ora
cd /opt/ora
```

### 2. Configure Environment Variables
Copy the production environment example and fill in your secrets:
```bash
cp .env.example .env
nano .env
```

**Critical values to configure:**
- `NODE_ENV=production`
- `FRONTEND_URL=https://ora.yourdomain.com`
- `NEXT_PUBLIC_WS_URL=wss://ora.yourdomain.com`
- `MONGO_INITDB_ROOT_PASSWORD` (Generate a secure 32+ character password)
- `JWT_SECRET` (Generate with `openssl rand -base64 32`)
- `ENCRYPTION_SECRET` (Must be exactly 32 bytes for AES-256 field encryption)
- `GEMINI_API_KEY` (Google AI Studio API key)
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (If accepting card billing)
- `RESEND_API_KEY` (For OTP and merchant verification emails)

### 3. Build & Launch with Docker Compose
```bash
# Build and start all 4 services in the background
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Verify Service Health
```bash
# Check container statuses
docker compose -f docker-compose.prod.yml ps

# Inspect logs
docker compose -f docker-compose.prod.yml logs -f --tail 50
```

### 5. Seed the Initial SuperAdmin User
To create the root platform SuperAdmin account:
```bash
docker compose -f docker-compose.prod.yml exec ora-server npm run seed:admin
```
Follow the interactive prompt or pass environment variables to seed the initial operator credentials.

---

## 🌐 Reverse Proxy & SSL Setup

### Option A: Caddy (Recommended — Automatic Free SSL)

1. Install Caddy:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```
2. Copy the template from `deploy/caddy/Caddyfile`:
   ```bash
   sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
   sudo nano /etc/caddy/Caddyfile # Update your domain name
   sudo systemctl restart caddy
   ```

### Option B: Nginx with Let's Encrypt Certbot

1. Install Nginx and Certbot:
   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
   ```
2. Copy the Nginx config template:
   ```bash
   sudo cp deploy/nginx/ora.conf /etc/nginx/sites-available/ora.conf
   sudo nano /etc/nginx/sites-available/ora.conf # Replace yourdomain.com
   sudo ln -s /etc/nginx/sites-available/ora.conf /etc/nginx/sites-enabled/
   ```
3. Issue SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d app.yourdomain.com
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## 🔄 Zero-Downtime Updates & Rolling Restarts

When deploying new commits or releases:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild images with no downtime interruption
docker compose -f docker-compose.prod.yml build

# 3. Recreate updated containers
docker compose -f docker-compose.prod.yml up -d --no-deps ora-server ora-client

# 4. Clean up old dangling images
docker image prune -f
```

---

## 💾 Database Backup & Disaster Recovery

### Automated MongoDB Backup (Cron)
```bash
# Create backup directory
mkdir -p /opt/ora/backups/mongodb

# Dump MongoDB database to archive
docker compose -f docker-compose.prod.yml exec -T ora-mongodb \
  mongodump --username ora_prod_admin --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db ora_production --archive --gzip > /opt/ora/backups/mongodb/ora_backup_$(date +%F_%T).gz
```

### Restore from Backup
```bash
docker compose -f docker-compose.prod.yml exec -i ora-mongodb \
  mongorestore --username ora_prod_admin --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --nsInclude="ora_production.*" --archive --gzip < /opt/ora/backups/mongodb/ora_backup_2026-08-15.gz
```

---

## 🛡️ Security Best Practices Checklist

- [x] **Firewall:** Open only ports 80, 443, and 22 (SSH) on the host (`sudo ufw allow 80,443,22/tcp && sudo ufw enable`).
- [x] **Database Isolation:** MongoDB (`27017`) and Redis (`6379`) are strictly bound within Docker internal bridge networks and never exposed to the public internet.
- [x] **Non-Root Containers:** Backend and frontend run under dedicated unprivileged users (`node` / `nextjs`).
- [x] **Log Rotation:** Docker log driver configured to max 50MB per file with 5 rotations to prevent disk exhaustion.
- [x] **Health Checks:** Native HTTP probes configured on all services for automated container auto-healing.
