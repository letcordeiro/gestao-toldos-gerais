# syntax=docker/dockerfile:1

# ---- deps: instala node_modules (com toolchain p/ compilar better-sqlite3) ----
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build standalone do Next ----
FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: imagem final enxuta ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/toldos.db

RUN groupadd -r nodejs && useradd -r -g nodejs -m nextjs

# Saída standalone (inclui server.js + node_modules traçadas)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migrations + script de init + dados de seed
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Garante o módulo nativo e o drizzle-orm completos para o script de init
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Volume persistente do banco (montar em /data no Dokploy)
RUN mkdir -p /data && chown -R nextjs:nodejs /data /app
VOLUME ["/data"]

USER nextjs
EXPOSE 3000

# Aplica migrations + seed e sobe o servidor
CMD ["sh", "-c", "node scripts/init-db.mjs && node server.js"]
