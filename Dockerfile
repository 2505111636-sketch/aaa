FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:standalone

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/route-rescue.sqlite
COPY --from=build /app/dist-standalone ./dist-standalone
COPY server/node.mjs ./server/node.mjs
COPY drizzle ./drizzle
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server/node.mjs"]
