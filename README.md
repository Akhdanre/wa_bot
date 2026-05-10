# WhatsApp Bot (TypeScript)

A minimal WhatsApp bot using `whatsapp-web.js` with TypeScript.

## Features

- QR code login in terminal
- Persists session with LocalAuth
- Commands: `!ping` and `!echo <text>`

## Prerequisites

- Node.js 18+ recommended
- On Linux, Puppeteer may need extra system libs. If Chromium fails to launch, try:

```bash
sudo apt-get update
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
  libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
  libxss1 libxtst6 ca-certificates fonts-liberation lsb-release \
  xdg-utils wget
```

## Setup

```bash
npm install
```

## Develop

Run in watch mode (displays QR in terminal on first run):

```bash
npm run dev
```

## Build and Start

```bash
npm run build
npm start
```

## Commands

- `!ping` → replies `pong`
- `!echo <text>` → replies with `<text>`

## Session Notes

- Auth data is stored in `.wwebjs_auth/` (git-ignored). Delete this folder to force re-login.
