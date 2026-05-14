# WhatsApp Bot (TypeScript)

A minimal WhatsApp bot using `whatsapp-web.js` with TypeScript.

## Features

- QR code login in terminal
- Persists session with LocalAuth
- Group message tracking (yapping, toxic, sticker stats)
- Level system
- Fish It minigame with coins, inventory, selling, and rod upgrades

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
- `akr-fish` → show a 9-box fishing spot
- `akr-catch <1-9>` → catch the fish from the selected box
- `akr-fish inv` → show coins, rod, and fish inventory
- `akr-fish sell all` → sell all fish for coins
- `akr-fish sell <fish-key>` → sell one fish type
- `akr-fish tank` → show saved fish that are protected from selling
- `akr-fish save <fish-key>` → move a fish from bag to tank
- `akr-fish release <fish-key>` → move a fish from tank back to bag
- `akr-fish shop` → show rod upgrade cost
- `akr-fish upgrade` → spend coins to improve catch chance and rare fish odds
- `akr-fish repair` → repair a damaged or broken rod
- `akr-help` → show all available commands

## Session Notes

- Auth data is stored in `.wwebjs_auth/` (git-ignored). Delete this folder (or the Docker volume) to force re-login.
- On auth failure or disconnect, errors are logged automatically.
