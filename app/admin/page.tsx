import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, LayoutTemplate, MonitorPlay, Sparkles, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { parseEventSettings } from "@/modules/shared/services/display-state-service";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";
import { formatDateTime } from "@/modules/shared/utils/formatters";
export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;
  const settings = selectedEvent ? parseEventSettings(selectedEvent.settings) : null;
  const luckyDrawSessionCount = selectedEvent
    ? selectedEvent.prizeCategories.reduce((total, prize) => total + prize.drawSessions.length, 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations Workspace"
        title="Control the room from a single surface"
        description="Monitor event state, jump into live control, and keep both public displays synchronized for projector, LED wall, and browser-source output."
      />

      {!selectedEvent ? (
        <Surface className="space-y-4">
          <SurfaceTitle>No active event yet</SurfaceTitle>
          <SurfaceCopy>Create the first event to unlock the live control workspace, themed public displays, and import/export tools.</SurfaceCopy>
          <Button asChild>
            <Link href={"/admin/events" as Route}>Open Event Setup</Link>
          </Button>
        </Surface>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Surface>
              <Badge variant="accent">Prizes</Badge>
              <SurfaceTitle className="mt-4 text-3xl">{selectedEvent.prizeCategories.length}</SurfaceTitle>
              <SurfaceCopy>Configured lucky draw prize categories</SurfaceCopy>
            </Surface>
            <Surface>
              <Badge variant="success">Sessions</Badge>
              <SurfaceTitle className="mt-4 text-3xl">{luckyDrawSessionCount + selectedEvent.auctionSessions.length}</SurfaceTitle>
              <SurfaceCopy>Draw sessions and auction blocks ready for stage flow</SurfaceCopy>
            </Surface>
            <Surface>
              <Badge variant="warning">Active Lots</Badge>
              <SurfaceTitle className="mt-4 text-3xl">{selectedEvent.auctionLots.filter((lot) => lot.status === "live").length}</SurfaceTitle>
              <SurfaceCopy>Auction lots currently in live or pending status</SurfaceCopy>
            </Surface>
            <Surface>
              <Badge variant="neutral">Audit</Badge>
              <SurfaceTitle className="mt-4 text-3xl">{workspace.displayStates.length}</SurfaceTitle>
              <SurfaceCopy>Tracked display outputs and last-known revisions</SurfaceCopy>
            </Surface>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Surface className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Badge variant="success">Selected Event</Badge>
                  <SurfaceTitle>{selectedEvent.name}</SurfaceTitle>
                  <SurfaceCopy>
                    {formatDateTime(selectedEvent.date, selectedEvent.locale)} | {selectedEvent.currencyCode} | Duplicate policy {selectedEvent.duplicatePolicy}
                  </SurfaceCopy>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/admin/live?event=${selectedEvent.id}` as Route}>
                    Open Live Control
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 text-slate-200">
                    <Sparkles className="size-4 text-emerald-300" />
                    <span className="font-medium">Lucky Draw Display</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Clean public route for projector or OBS browser source.</p>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200" href={`/display/lucky-draw/${selectedEvent.slug}` as Route}>
                    /display/lucky-draw/{selectedEvent.slug}
                  </Link>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 text-slate-200">
                    <MonitorPlay className="size-4 text-amber-300" />
                    <span className="font-medium">Auction Display</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Stage-safe live auction layout with bid transitions and sold/passed states.</p>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-amber-300 hover:text-amber-200" href={`/display/auction/${selectedEvent.slug}` as Route}>
                    /display/auction/{selectedEvent.slug}
                  </Link>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 text-slate-200">
                    <LayoutTemplate className="size-4 text-sky-300" />
                    <span className="font-medium">Master Overlay</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Switchable output that mirrors lucky draw or auction for OBS, LED processors, or stage confidence monitors.</p>
                  <Link className="mt-4 inline-flex text-sm font-semibold text-sky-300 hover:text-sky-200" href={`/display/master/${selectedEvent.slug}` as Route}>
                    /display/master/{selectedEvent.slug}
                  </Link>
                </div>
              </div>
            </Surface>

            <Surface className="space-y-5">
              <SurfaceTitle>Output health</SurfaceTitle>
              <div className="space-y-3">
                {workspace.displayStates.length === 0 ? (
                  <SurfaceCopy>No display state snapshots have been published for this event yet.</SurfaceCopy>
                ) : (
                  workspace.displayStates.map((state) => {
                    const payload = state.payload as { scene?: string; publishedAt?: string };
                    return (
                      <div key={state.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-100">{state.screen.name}</p>
                            <p className="text-sm text-slate-400">{state.screen.screenKey}</p>
                          </div>
                          <Badge variant="accent">rev {state.revision}</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
                          <Clock3 className="size-4" />
                          <span>{payload.scene ?? state.status}</span>
                          <span>|</span>
                          <span>{formatDateTime(payload.publishedAt ?? state.syncedAt, selectedEvent.locale)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Surface>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Surface className="space-y-5">
              <div className="flex items-center gap-3">
                <TimerReset className="size-4 text-emerald-300" />
                <SurfaceTitle>Recent audit</SurfaceTitle>
              </div>
              <div className="space-y-3">
                {selectedEvent.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-100">{log.actionType.replace(/_/g, " ")}</p>
                      <Badge>{log.moduleType ?? "shared"}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{log.actor}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{formatDateTime(log.createdAt, selectedEvent.locale)}</p>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface className="space-y-5">
              <SurfaceTitle>Next actions</SurfaceTitle>
              {settings ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Master source: <span className="font-semibold capitalize text-slate-50">{settings.activeMasterSource.replace("_", " ")}</span> | Confirmations:{" "}
                  <span className="font-semibold text-slate-50">{settings.requireActionConfirmations ? "on" : "off"}</span> | Route copy buttons:{" "}
                  <span className="font-semibold text-slate-50">{settings.showRouteCopyButtons ? "on" : "off"}</span>
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <Link href={`/admin/themes?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Tune branding</p>
                  <p className="mt-2 text-sm text-slate-400">Assign background imagery, overlay-safe treatments, and typography colors.</p>
                </Link>
                <Link href={`/admin/settings?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Set output defaults</p>
                  <p className="mt-2 text-sm text-slate-400">Choose the master overlay source, operator safeguards, and stage ergonomics.</p>
                </Link>
                <Link href={`/admin/imports?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Import stage data</p>
                  <p className="mt-2 text-sm text-slate-400">Load ticket pool CSVs or auction lot lists before rehearsal and show time.</p>
                </Link>
                <Link href={`/admin/lucky-draw?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Prepare draw sessions</p>
                  <p className="mt-2 text-sm text-slate-400">Split categories into stage-ready sessions and set exclusive or grid scenes.</p>
                </Link>
                <Link href={`/admin/auction?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Sequence lots</p>
                  <p className="mt-2 text-sm text-slate-400">Order live lots, assign display titles, and define opening bids or increments.</p>
                </Link>
                <Link href={`/admin/debug?event=${selectedEvent.id}` as Route} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-300/30 hover:bg-white/[0.05]">
                  <p className="font-medium text-slate-50">Run diagnostics</p>
                  <p className="mt-2 text-sm text-slate-400">Verify route health, recent display revisions, and API smoke targets.</p>
                </Link>
              </div>
            </Surface>
          </div>
        </>
      )}
    </div>
  );
}
