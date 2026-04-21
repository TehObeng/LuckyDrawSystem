import type { Route } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { parseEventSettings } from "@/modules/shared/services/display-state-service";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

export default async function DebugPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;
  const localDbReady = existsSync(join(process.cwd(), "prisma", "local.db"));
  const uploadsReady = existsSync(join(process.cwd(), "public", "uploads"));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diagnostics"
        title="Health checks and QA shortcuts"
        description="Use this page as the in-app debugging loop: verify environment readiness, jump to routes and APIs, and inspect the latest synced display states without leaving the workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Surface>
          <Badge variant={localDbReady ? "success" : "warning"}>{localDbReady ? "ready" : "missing"}</Badge>
          <SurfaceTitle className="mt-4 text-2xl">Local DB</SurfaceTitle>
          <SurfaceCopy>SQLite file used by Prisma for events, live state, and audit history.</SurfaceCopy>
        </Surface>
        <Surface>
          <Badge variant={uploadsReady ? "success" : "warning"}>{uploadsReady ? "ready" : "missing"}</Badge>
          <SurfaceTitle className="mt-4 text-2xl">Local Uploads</SurfaceTitle>
          <SurfaceCopy>Local media library stored under the app&apos;s public uploads directory.</SurfaceCopy>
        </Surface>
        <Surface>
          <Badge variant={selectedEvent ? "success" : "neutral"}>{selectedEvent ? "selected" : "idle"}</Badge>
          <SurfaceTitle className="mt-4 text-2xl">Active Event</SurfaceTitle>
          <SurfaceCopy>{selectedEvent ? selectedEvent.name : "Choose an event from the sidebar switcher."}</SurfaceCopy>
        </Surface>
        <Surface>
          <Badge variant="accent">{workspace.displayStates.length}</Badge>
          <SurfaceTitle className="mt-4 text-2xl">Display Snapshots</SurfaceTitle>
          <SurfaceCopy>Latest synchronized display states available to the public routes.</SurfaceCopy>
        </Surface>
      </div>

      {!selectedEvent ? (
        <Surface className="space-y-3">
          <SurfaceTitle>No event selected</SurfaceTitle>
          <SurfaceCopy>Select an event to unlock route, API, and state diagnostics.</SurfaceCopy>
        </Surface>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Surface className="space-y-5">
              <SurfaceTitle>Route quick launch</SurfaceTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  `/admin?event=${selectedEvent.id}`,
                  `/admin/live?event=${selectedEvent.id}`,
                  `/admin/themes?event=${selectedEvent.id}`,
                  `/admin/settings?event=${selectedEvent.id}`,
                  `/display/lucky-draw/${selectedEvent.slug}`,
                  `/display/lucky-draw-all/${selectedEvent.slug}`,
                  `/display/auction/${selectedEvent.slug}`,
                  `/display/master/${selectedEvent.slug}`,
                ].map((href) => (
                  <Link key={href} href={href as Route} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                    {href}
                  </Link>
                ))}
              </div>
            </Surface>

            <Surface className="space-y-5">
              <SurfaceTitle>API quick checks</SurfaceTitle>
              <div className="space-y-3 text-sm">
                {[
                  `/api/events/${selectedEvent.id}/display-state`,
                  `/api/display/lucky_draw/${selectedEvent.slug}`,
                  `/api/display/auction/${selectedEvent.slug}`,
                  `/api/display/master/${selectedEvent.slug}`,
                  `/api/export/winners/${selectedEvent.id}`,
                  `/api/export/auction-results/${selectedEvent.id}`,
                  `/api/export/ticket-pool/${selectedEvent.id}`,
                  "/api/realtime/stream",
                  "/api/uploads/local",
                ].map((href) => (
                  <div key={href} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="font-medium text-slate-100">{href}</p>
                    <p className="mt-1 text-slate-500">Use browser devtools or the smoke script to validate status and payload shape.</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Surface className="space-y-5">
              <SurfaceTitle>Display state revisions</SurfaceTitle>
              <div className="space-y-3">
                {workspace.displayStates.map((state) => {
                  const payload = state.payload as { scene?: string; publishedAt?: string };

                  return (
                    <div key={state.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-100">{state.screen.name}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{state.moduleType}</p>
                        </div>
                        <Badge variant="accent">rev {state.revision}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">Scene: {payload.scene ?? state.status}</p>
                      <p className="text-sm text-slate-500">Published: {String(payload.publishedAt ?? state.syncedAt)}</p>
                    </div>
                  );
                })}
              </div>
            </Surface>

            <Surface className="space-y-5">
              <SurfaceTitle>Recent audit + settings snapshot</SurfaceTitle>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-300">
                  {JSON.stringify(parseEventSettings(selectedEvent.settings), null, 2)}
                </pre>
              </div>
              <div className="space-y-3">
                {selectedEvent.auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-100">{log.actionType.replace(/_/g, " ")}</p>
                      <Badge>{log.moduleType ?? "shared"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{log.actor}</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{log.createdAt.toISOString()}</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </>
      )}
    </div>
  );
}
