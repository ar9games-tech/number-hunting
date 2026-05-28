FROM node:24-alpine AS builder
WORKDIR /app
ENV npm_config_user_agent=pnpm/11.4.0
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/artifacts/api-server/dist ./dist
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
