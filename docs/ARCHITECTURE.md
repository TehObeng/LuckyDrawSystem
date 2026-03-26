# Live Event Platform Architecture

## Workstream Breakdown

1. **Product Architecture Agent**
   - Established modular split between shared systems and domain modules.
   - Defined route-level boundaries for `admin`, `display/lucky-draw`, `display/auction`, and `api`.
2. **Database and Schema Agent**
   - Designed robust Prisma schema for shared and module-specific entities.
3. **Backend/API Agent**
   - Implemented typed services for lucky draw reveals and auction bids with audit logging.
4. **Realtime Agent**
   - Implemented SSE stream and in-process realtime bus.
5. **Lucky Draw Agent**
   - Added reveal flow with duplicate prevention and display payload generation.
6. **Auction Agent**
   - Added bid flow with higher-bid validation and previous-bid tracking.
7. **Admin Dashboard Agent**
   - Built keyboard-first operator dashboard.
8. **Public Display Agent**
   - Built presentation routes with animation support (Framer Motion).
9. **Import/Export Agent**
   - Added CSV import/export utilities.
10. **QA/Hardening Agent**
   - Added strict typing and validation guards.

## Folder Structure

- `app/`
  - `admin/`: operator console.
  - `display/`: public fullscreen renderers.
  - `api/`: reveal, bid, realtime and hydration endpoints.
- `modules/shared/`: contracts, validation schemas, generic utilities.
- `modules/lucky-draw/`: lucky draw services and display components.
- `modules/auction/`: auction services and display components.
- `lib/`: Prisma client, display persistence, realtime bus.
- `prisma/`: relational schema and seed.

## Realtime Strategy

- Server-Sent Events stream endpoint for low-overhead one-to-many updates.
- Display pages subscribe via `EventSource`.
- Persistent `DisplayState` table allows reconnect hydration and crash recovery.

## Reliability Features

- Event-level duplicate policy enforcement.
- Audit log entries for reveal and bid actions.
- Persistent display state snapshots.
- Keyboard-first admin operation for low-latency stage usage.
