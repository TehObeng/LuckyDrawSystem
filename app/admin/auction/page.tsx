import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { createAuctionLotAction, createAuctionSessionAction } from "@/app/admin/actions";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";
import { formatCurrency } from "@/modules/shared/utils/formatters";

export default async function AuctionAdminPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;
  const supportingAssets = selectedEvent?.mediaAssets.filter((asset) => asset.kind === "supporting") ?? [];

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Select an event before configuring lots, auction blocks, and bid history.</SurfaceCopy>
      </Surface>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Auction Module"
        title="Stage lots, bid rules, and sale states"
        description="Prepare lots for live bidding, define opening numbers, attach hero imagery, and keep recent bid history visible before the operator takes over."
      />

      <div className="grid gap-6 xl:grid-cols-[0.68fr_0.76fr_1.1fr]">
        <Surface className="space-y-5">
          <SurfaceTitle>Create auction session</SurfaceTitle>
          <form action={createAuctionSessionAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" placeholder="Main auction block" />
            </div>
            <Button type="submit" className="w-full">
              Add Session
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-5">
          <SurfaceTitle>Create auction lot</SurfaceTitle>
          <form action={createAuctionLotAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Lot number</Label>
                <Input name="lotNumber" placeholder="01" />
              </div>
              <div className="space-y-2">
                <Label>Opening bid</Label>
                <Input name="openingBid" type="number" min={0} defaultValue={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input name="title" placeholder="Signed guitar bundle" />
            </div>
            <div className="space-y-2">
              <Label>Display title</Label>
              <Input name="displayTitle" placeholder="Lot 01 • Signed Guitar" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" placeholder="Sponsor notes, provenance, and stage callouts." />
            </div>
            <div className="space-y-2">
              <Label>Lot image URL</Label>
              <Input name="displayImageUrl" list="supporting-asset-options" placeholder="/demo-media/auction-guitar.svg or /uploads/event-assets/lot.jpg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Session</Label>
                <Select name="auctionSessionId" defaultValue="">
                  <option value="">No session grouping</option>
                  {selectedEvent.auctionSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme override</Label>
                <Select name="themeOverrideId" defaultValue="">
                  <option value="">Use event theme</option>
                  {selectedEvent.themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order index</Label>
                <Input name="orderIndex" type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Min increment</Label>
                <Input name="minIncrement" type="number" min={0} placeholder="Optional" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="freeInput" defaultChecked className="size-4 rounded border-white/10 bg-transparent" />
              Free input mode
            </label>
            <Button type="submit" variant="secondary" className="w-full">
              Add Lot
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          {selectedEvent.auctionLots.map((lot) => (
            <Surface key={lot.id} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SurfaceTitle>Lot {lot.lotNumber} • {lot.title}</SurfaceTitle>
                  <SurfaceCopy>
                    Opening {formatCurrency(Number(lot.openingBid), selectedEvent.locale, selectedEvent.currencyCode)} • current {formatCurrency(lot.currentBid ? Number(lot.currentBid) : null, selectedEvent.locale, selectedEvent.currencyCode)}
                  </SurfaceCopy>
                </div>
                <Badge variant={lot.status === "sold" ? "success" : lot.status === "passed" ? "danger" : "warning"}>{lot.status}</Badge>
              </div>

              {lot.displayImageUrl ? (
                <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.03]">
                  <img src={lot.displayImageUrl} alt={lot.title} className="h-48 w-full object-cover" />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lot details</p>
                  <p className="mt-3 text-sm text-slate-300">{lot.description ?? "No description"}</p>
                  <p className="mt-3 text-sm text-slate-500">Session: {lot.auctionSession?.name ?? "Unassigned"}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent bids</p>
                  <div className="mt-3 space-y-2">
                    {lot.bids.length === 0 ? (
                      <p className="text-sm text-slate-500">No live bids yet.</p>
                    ) : (
                      lot.bids.map((bid) => (
                        <div key={bid.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                          <span>{formatCurrency(Number(bid.amount), selectedEvent.locale, selectedEvent.currencyCode)}</span>
                          <span className="text-slate-500">{bid.bidderLabel ?? "Bidder"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </div>

      <datalist id="supporting-asset-options">
        {supportingAssets.map((asset) => (
          <option key={asset.id} value={asset.publicUrl}>
            {String((asset.metadata as { title?: string } | null)?.title ?? asset.publicUrl)}
          </option>
        ))}
      </datalist>
    </div>
  );
}
