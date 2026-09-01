# ==============================================================================
# ORA Backend (NestJS 11+) - Multi-Stage Production Dockerfile
# ==============================================================================

# --- Stage 1: Base & Dependencies ---
FROM node:22-alpine AS dependencies
WORKDIR /app

# Install build essentials for native addons (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Copy package manifests
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile || pnpm install

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build production distribution
RUN pnpm build

# Prune devDependencies to keep image lean
RUN pnpm prune --prod

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

LABEL maintainer="ORA Team <dev@ora.ai>"
LABEL description="ORA Backend API & Voice Proxy Gateway Service"

# Security: Install dumb-init for proper PID 1 signal forwarding and wget for healthchecks
RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV PORT=5000

# Create application user and set ownership
USER node

# Copy production node_modules from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
# Copy compiled application
COPY --chown=node:node --from=builder /app/dist ./dist
# Copy package manifest
COPY --chown=node:node --from=builder /app/package.json ./package.json
# Copy email templates explicitly to ensure availability in production runner
COPY --chown=node:node --from=builder /app/src/mail/templates ./dist/mail/templates
COPY --chown=node:node --from=builder /app/src/mail/templates ./src/mail/templates

EXPOSE 5000

# Health check against the health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1

# Launch using dumb-init for graceful shutdown of WebSocket & DB connections
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then node dist/src/main.js; else node dist/main.js; fi"]
