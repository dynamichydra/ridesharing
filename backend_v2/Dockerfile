# ── Production API image ──────────────────────────────────────────────────────
#   docker build -t rideshare-api .
#   docker run --env-file .env.production -p 3000:3000 rideshare-api
#
# Migrations run as a one-off job before rolling out a new API version:
#   docker build --target migrate -t rideshare-migrate .
#   docker run --env-file .env.production rideshare-migrate

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# drizzle-kit is a dev dependency, so the migration image carries the full install.
FROM node:22-alpine AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY drizzle.config.js ./
COPY drizzle ./drizzle
USER node
CMD ["npx", "drizzle-kit", "migrate"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY drizzle ./drizzle
# Local-disk uploads only exist when ALLOW_LOCAL_STORAGE=true (no S3); keep it writable.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
