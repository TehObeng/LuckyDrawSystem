import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { importAuctionLotsAction, importTicketPoolAction } from "@/app/admin/actions";
import { withBasePath } from "@/lib/public-path";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Select an event to import ticket pools or auction lots and to access CSV exports.</SurfaceCopy>
      </Surface>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Imports & Exports"
        title="Move structured stage data in and out"
        description="Paste CSVs directly for ticket pool and lot imports, then export winners and final auction results from deterministic server routes."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface className="space-y-5">
          <SurfaceTitle>Import ticket pool CSV</SurfaceTitle>
          <SurfaceCopy>Expected columns: `ticket_number, series, participant_name, participant_phone`.</SurfaceCopy>
          <form action={importTicketPoolAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <Textarea name="csvText" placeholder={'ticket_number,series,participant_name,participant_phone\n000123,A,John Doe,555-0001'} className="min-h-[240px]" />
            <Button type="submit" className="w-full">
              Import Ticket Pool
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-5">
          <SurfaceTitle>Import auction lots CSV</SurfaceTitle>
          <SurfaceCopy>Expected columns: `lot_number, title, description, opening_bid, order_index`.</SurfaceCopy>
          <form action={importAuctionLotsAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="space-y-2">
              <Label>Auction session</Label>
              <Select name="auctionSessionId" defaultValue="">
                <option value="">No session assignment</option>
                {selectedEvent.auctionSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea name="csvText" placeholder={'lot_number,title,description,opening_bid,order_index\n01,Signed jersey,VIP silent lot,1000,1'} className="min-h-[240px]" />
            <Button type="submit" variant="secondary" className="w-full">
              Import Auction Lots
            </Button>
          </form>
        </Surface>
      </div>

      <Surface className="space-y-5">
        <SurfaceTitle>Exports</SurfaceTitle>
        <SurfaceCopy>Use server-side CSV routes for operational backups, reconciliation, or sponsor reports.</SurfaceCopy>
        <div className="grid gap-4 md:grid-cols-3">
          <Button asChild variant="secondary">
            <a href={withBasePath(`/api/export/ticket-pool/${selectedEvent.id}`)}>Download Ticket Pool CSV</a>
          </Button>
          <Button asChild variant="secondary">
            <a href={withBasePath(`/api/export/winners/${selectedEvent.id}`)}>Download Winners CSV</a>
          </Button>
          <Button asChild variant="secondary">
            <a href={withBasePath(`/api/export/auction-results/${selectedEvent.id}`)}>Download Auction Results CSV</a>
          </Button>
        </div>
      </Surface>
    </div>
  );
}
