# --- Build ---
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY server/package*.json ./
RUN npm install --omit=dev --no-fund --no-audit

COPY server/ ./
RUN node scripts/install-ytdlp.js

# --- Runtime ---
FROM node:20-bookworm-slim

ENV NODE_ENV=production PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app ./
COPY web/ ./web/

RUN chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "index.js"]