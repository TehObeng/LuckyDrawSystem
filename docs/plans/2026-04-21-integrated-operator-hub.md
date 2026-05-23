# Integrated Operator Hub Implementation Plan

> For Hermes: use subagent-driven-development and test-driven-development principles while implementing this plan.

Goal: Turn LuckyDrawSystem into a single local-first event operations app that combines lucky draw, auction, and audience chat / overlay moderation workflows from LiveEventOverlay.

Architecture:
- Keep LuckyDrawSystem as the canonical app shell, data model foundation, and operator workflow baseline.
- Port LiveEventOverlay concepts into LuckyDrawSystem as a third module: `chat_overlay`.
- Use Prisma/SQLite and existing display-state persistence instead of maintaining a separate Supabase-backed overlay app.
- Redesign admin surfaces so operators manage master output, lucky draw, auction, and audience chat from one coherent workspace.

Tech stack:
- Next.js App Router
- Prisma + SQLite
- Tailwind + existing UI primitives
- Local-first server actions + route handlers
- Gemini CLI for UI/UX layout guidance and selected component refactors

---

### Task 1: Stabilize the LuckyDrawSystem baseline
Objective: Fix existing build/seed breakages before layering in new features.
Files:
- Modify: `modules/lucky-draw/services/lucky-draw-service.ts`
- Modify: `modules/shared/services/display-state-service.ts`
- Modify: `prisma/seed.ts` if needed
Verification:
- `npm run setup:local`
- `npm run build`

### Task 2: Add shared contracts and data model for audience chat / overlay
Objective: Extend the platform schema to support moderated audience messages and chat overlay display state.
Files:
- Modify: `prisma/schema.prisma`
- Modify: `modules/shared/schemas/platform.ts`
- Modify: `modules/shared/schemas/display.ts`
- Modify: `modules/shared/types/contracts.ts`
- Modify: `modules/shared/services/display-state-service.ts`
- Modify: `modules/shared/services/workspace-query-service.ts`
Verification:
- `npx prisma db push`
- `npm run build`

### Task 3: Implement audience chat backend flows
Objective: Create public submission, moderation, bans, test-message, clear-screen, and master-output integration.
Files:
- Create: `modules/chat-overlay/*`
- Create: `app/api/chat/public/[eventOrScreen]/route.ts`
- Create: `app/api/chat/public/[eventOrScreen]/submit/route.ts`
- Modify: `app/admin/actions.ts`
Verification:
- targeted route smoke checks
- `npm run build`

### Task 4: Implement public audience surfaces
Objective: Add the public chat form plus OBS/browser-source-friendly chat overlay routes and aliases.
Files:
- Create: `app/chat/[eventOrScreen]/page.tsx`
- Create: `app/overlay/[eventOrScreen]/page.tsx`
- Create: `app/display/chat-overlay/[eventOrScreen]/page.tsx`
- Create: `modules/chat-overlay/components/*`
Verification:
- `npm run build`
- browser/manual smoke test

### Task 5: Redesign admin UI into an integrated operator hub
Objective: Create an operator-first admin IA and live control workspace that includes audience moderation and chat overlay control.
Files:
- Modify: `components/admin/sidebar-nav.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/live/page.tsx`
- Modify: `components/admin/live-control-workspace.tsx`
- Create: `app/admin/chat/page.tsx`
- Modify: settings / theme pages where needed for overlay config
Verification:
- `npm run build`
- manual route checks for overview, live control, admin chat, public display routes

### Task 6: Final verification and documentation
Objective: Ensure the integrated app boots cleanly and core routes work.
Files:
- Update docs as needed in `README.md`
Verification:
- `npm run setup:local`
- `npm run build`
- optional local `npm run dev` smoke checks
