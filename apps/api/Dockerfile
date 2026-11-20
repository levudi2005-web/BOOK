FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @bff/api build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV API_PORT=3001
WORKDIR /app
COPY apps/api/package.json ./package.json
RUN npm install --omit=dev
COPY --from=build /workspace/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
