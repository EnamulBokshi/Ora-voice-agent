# ==============================================================================
# ORA Shopify Embedded App (Next.js Standalone) - Multi-Stage Dockerfile
#
# Mirrors client/Dockerfile. Built with its own build context (this directory),
# not the repo root, so the workspace lockfile is not available — dependencies
# resolve from this package's own package.json.
# ==============================================================================

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS dependencies
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile || pnpm install

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Relative by default: the app is served from the same origin as the API, so
# same-origin calls need no absolute URL and no CORS.
ARG NEXT_PUBLIC_ORA_API_URL
ENV NEXT_PUBLIC_ORA_API_URL=${NEXT_PUBLIC_ORA_API_URL:-/api/v1}

# Inlined into the shopify-api-key meta tag at build time, because the page is
# statically prerendered. App Bridge will not initialize without it, and a
# mismatch with the app's Client ID makes idToken() hang rather than fail.
ARG NEXT_PUBLIC_SHOPIFY_API_KEY
ENV NEXT_PUBLIC_SHOPIFY_API_KEY=${NEXT_PUBLIC_SHOPIFY_API_KEY}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# --- Stage 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

LABEL maintainer="ORA Team <dev@ora.ai>"
LABEL description="ORA Shopify Embedded App (Shopify Admin iframe)"

RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next places the standalone entrypoint under the path from its file-tracing
# root to the package. With this build context that root is the package itself,
# so the output is flat — but building from the repo root instead yields
# `packages/shopify-app/server.js`. Both static locations are populated and the
# CMD probes for either, the same defence client/Dockerfile uses.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./packages/shopify-app/.next/static

USER nextjs

EXPOSE 3000

# basePath is /shopify, so the app does not answer on `/`.
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/shopify || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "if [ -f ./packages/shopify-app/server.js ]; then node packages/shopify-app/server.js; else node server.js; fi"]
