# WhatsApp Bot (TypeScript)

A minimal WhatsApp bot using `whatsapp-web.js` with TypeScript.

## Features

- QR code login in terminal
- Persists session with LocalAuth
- Group message tracking (yapping, toxic, sticker stats)
- Level system

## Prerequisites

- Node.js 18+ recommended
- Docker & Docker Compose (for deployment)

## Setup

```bash
npm install
```

## Develop

Run in watch mode (displays QR in terminal on first run):

```bash
npm run dev
```

## Docker Deployment

```bash
docker compose up --build
```

### Check QR Code for Authentication

On first run (or after session reset), you need to scan the QR code from the container logs:

```bash
docker compose logs -f app
```

Look for the QR code output in the terminal and scan it with your WhatsApp app.

### Reset Session

If the bot is stuck (no "Client is ready!" log, no QR shown), the session is likely stale. Reset it:

```bash
docker compose down
docker volume rm whatsapp_bot_wwebjs_auth
docker compose up --build
```

Then scan the new QR code from the logs.

## Commands

- `akr-ping` → replies `Pong!`
- `akr-echo <text>` → replies with `<text>`
- `akr-top-yapping` → top chatters leaderboard
- `akr-top-toxic` → top toxic users leaderboard
- `akr-top-sticker` → top sticker senders leaderboard
- `akr-level` → check your level
- `akr-help` → show all available commands

## Session Notes

- Auth data is stored in `.wwebjs_auth/` (git-ignored). Delete this folder (or the Docker volume) to force re-login.
- On auth failure or disconnect, errors are logged automatically.
