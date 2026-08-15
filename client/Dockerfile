# ==============================================================================
# ORA Frontend Dashboard (Next.js 16+ Standalone) - Multi-Stage Dockerfile
# ==============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS dependencies
WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Pass build arguments for client-side environment variables if needed
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api/v1}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js with standalone output
RUN pnpm build

# --- Stage 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

LABEL maintainer="ORA Team <dev@ora.ai>"
LABEL description="ORA Frontend Dashboard & Merchant Admin UI"

RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public static assets
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# Copy standalone server and static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set permissions
USER nextjs

EXPOSE 3000

# Health check against root page
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
# Handle both root server.js and monorepo client/server.js paths if generated
CMD ["sh", "-c", "if [ -f ./client/server.js ]; then node client/server.js; else node server.js; fi"]
