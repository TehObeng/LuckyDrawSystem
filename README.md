# Live Event Control & Display Platform

Production-oriented modular event operations platform with two core modules:

- Lucky Draw
- Auction

## Stack

- Next.js + TypeScript + React
- Tailwind CSS + Framer Motion
- Prisma ORM (SQLite by default)
- SSE realtime sync for admin -> display updates

## Key Capabilities

- Admin/operator dashboard for live stage control
- Dedicated clean public display routes
- Lucky draw manual reveal flow (default) + duplicate prevention
- Auction bid flow with crossed-out previous bid
- Shared event/theme/display-state/audit architecture
- CSV import/export utility services
- Keyboard-first control patterns

## Routes

- `/admin`
- `/display/lucky-draw/[eventOrScreen]`
- `/display/auction/[eventOrScreen]`

## API

- `POST /api/lucky-draw/reveal`
- `POST /api/auction/bid`
- `GET /api/realtime/stream` (SSE)
- `GET /api/events/:eventId/display-state`

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Build & Security

Run these in order to avoid common first-run issues:

```bash
npm install
npm run typecheck
npm run build
npm run security:audit
```

Notes:
- If `next` is not recognized, dependencies are not installed yet (or install failed).
- This project pins to patched Next.js `^15.5.6`.
- Use Node `>=20.11.0`.

## Notes

Detailed architecture/workstream and integration notes are in `docs/ARCHITECTURE.md`.
