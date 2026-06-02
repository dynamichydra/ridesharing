# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

FROM base AS development

ENV NODE_ENV=development

RUN npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]

FROM base AS production-deps

RUN npm ci --omit=dev && npm cache clean --force

FROM base AS production

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules
COPY . .

USER node

EXPOSE 5000

CMD ["npm", "start"]
