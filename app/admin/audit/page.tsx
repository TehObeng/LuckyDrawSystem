import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";
import { formatDateTime } from "@/modules/shared/utils/formatters";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Select an event to review audit history, display revisions, and latest synchronized states.</SurfaceCopy>
      </Surface>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit & Recovery"
        title="Inspect what happened and what is on screen"
        description="Audit logs capture operator actions, while display state snapshots record the latest route output for reconnect-safe recovery."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-5">
          <SurfaceTitle>Display revisions</SurfaceTitle>
          <div className="space-y-3">
            {workspace.displayStates.map((state) => {
              const payload = state.payload as { scene?: string; publishedAt?: string };
              return (
                <div key={state.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{state.screen.name}</p>
                      <p className="text-sm text-slate-500">{state.routeKey}</p>
                    </div>
                    <Badge variant="accent">rev {state.revision}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{payload.scene ?? state.status}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{formatDateTime(payload.publishedAt ?? state.syncedAt, selectedEvent.locale)}</p>
                </div>
              );
            })}
          </div>
        </Surface>

        <Surface className="space-y-5">
          <SurfaceTitle>Action journal</SurfaceTitle>
          <div className="space-y-3">
            {selectedEvent.auditLogs.map((log) => (
              <div key={log.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{log.actionType.replace(/_/g, " ")}</p>
                    <p className="text-sm text-slate-400">{log.actor}</p>
                  </div>
                  <Badge>{log.moduleType ?? "shared"}</Badge>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{formatDateTime(log.createdAt, selectedEvent.locale)}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

