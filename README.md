# Live Event Control & Display Platform

Production-oriented modular event operations platform with two core modules:

- Lucky Draw
- Auction

## Stack

- Next.js + TypeScript + React
- Tailwind CSS + Framer Motion
- Prisma ORM on local SQLite
- Local operator sessions, local media storage, and polling-based live display sync
- Zod-validated display and configuration contracts

## Key Capabilities

- Admin/operator dashboard for live stage control
- Dedicated clean public display routes
- Lucky draw manual reveal flow (default), digital random fallback, and duplicate prevention
- Auction bid flow with crossed-out previous bid plus sold/passed workflows
- Shared event/theme/display-state/audit architecture
- CSV import/export utility services and local upload endpoint
- Keyboard-first control patterns
- Reconnect-safe public display hydration with persisted display state

## Routes

- `/admin`
- `/login`
- `/display/lucky-draw/[eventOrScreen]`
- `/display/auction/[eventOrScreen]`

## API

- `POST /api/lucky-draw/reveal`
- `POST /api/auction/bid`
- `GET /api/display/[moduleType]/[eventOrScreen]`
- `GET /api/events/:eventId/display-state`
- `GET /api/export/ticket-pool/:eventId`
- `GET /api/export/winners/:eventId`
- `GET /api/export/auction-results/:eventId`
- `POST /api/uploads/local`

## Setup

```bash
npm install
npm run setup:local
npm run dev
```

The app is configured to run entirely on the local machine:

- SQLite database file: `prisma/local.db`
- Uploaded media: `public/uploads/...`
- Operator auth: local session cookie
- Public display sync: local polling against `/api/display/...`

## Notes

Detailed architecture/workstream and integration notes are in `docs/ARCHITECTURE.md`.
