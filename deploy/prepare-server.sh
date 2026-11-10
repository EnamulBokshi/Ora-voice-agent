#!/bin/bash
set -euo pipefail

# ==============================================================================
# ORA & Multi-App VPS Initialization Script
# Target: Ubuntu / Debian LTS (Contabo VPS)
# ==============================================================================

echo "=========================================================="
echo "🚀 Initializing Multi-App Production VPS..."
echo "=========================================================="

export DEBIAN_FRONTEND=noninteractive

# 1. Update and Upgrade Packages
echo "🔄 [1/7] Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  rsync \
  ufw \
  fail2ban \
  htop \
  ncdu \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common \
  build-essential \
  jq

# 2. Configure 4GB Swap Space (Essential for builds & multi-container stability)
echo "💾 [2/7] Checking and configuring swap space..."
if [ ! -f /swapfile ]; then
  echo "Creating 4GB swapfile..."
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "✅ 4GB Swap enabled."
else
  echo "ℹ️ Swapfile already exists."
fi

# Set optimal swappiness for server
sysctl vm.swappiness=10
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# 3. Install Docker CE and Docker Compose Plugin
echo "🐳 [3/7] Installing Docker Engine & Compose plugin..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed: $(docker --version)"
else
  echo "ℹ️ Docker already installed: $(docker --version)"
fi

# 4. Install Node.js LTS (v20) & PNPM / PM2
echo "📦 [4/7] Installing Node.js LTS, pnpm, and pm2..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pnpm pm2
echo "✅ Node: $(node -v), npm: $(npm -v), pnpm: $(pnpm -v)"

# 5. Install Nginx and Certbot for Multi-App Reverse Proxy
echo "🌐 [5/7] Installing Nginx & Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx

# Prepare certbot webroot
mkdir -p /var/www/certbot
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# 6. Configure UFW Firewall & Fail2ban
echo "🛡️  [6/7] Configuring UFW Firewall and Fail2ban..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

systemctl enable fail2ban
systemctl restart fail2ban

# 7. Prepare Directory Structure for Multi-App Hosting
echo "📂 [7/7] Creating application directories..."
mkdir -p /root/ora
mkdir -p /root/apps
mkdir -p /var/log/nginx

echo "=========================================================="
echo "🎉 Server preparation complete!"
echo "• Docker & Docker Compose: Ready"
echo "• Host Nginx & Certbot: Ready"
echo "• Node.js & PNPM: Ready"
echo "• UFW Firewall & 4GB Swap: Enabled"
echo "• ORA App directory: /root/ora"
echo "• Multi-app root: /root/apps"
echo "=========================================================="
