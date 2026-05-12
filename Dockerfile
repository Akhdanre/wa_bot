FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

CMD ["sh", "-c", "find /app/.wwebjs_auth -name 'SingletonLock' -delete 2>/dev/null; npx prisma migrate deploy && npm start"]
