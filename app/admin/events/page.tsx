import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { archiveEventAction, createEventAction, updateEventAction } from "@/app/admin/actions";
import { defaultTicketFormat, ticketFormatSchema } from "@/modules/shared/types/contracts";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Event Setup"
        title="Create and configure live event profiles"
        description="Define ticket rules, duplicate policy, locale, currency, and module support before the operator opens the live control workspace."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface className="space-y-5">
          <SurfaceTitle>Create event</SurfaceTitle>
          <SurfaceCopy>Every event gets default lucky draw and auction display screens plus a starter theme preset.</SurfaceCopy>
          <form action={createEventAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event name</Label>
              <Input id="name" name="name" placeholder="Annual Gala 2026" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" placeholder="annual-gala-2026" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Event date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locale">Locale</Label>
                <Input id="locale" name="locale" defaultValue="en-US" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input id="currencyCode" name="currencyCode" defaultValue="USD" maxLength={3} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Venue, MC cues, sponsor notes, or on-stage context." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicatePolicy">Duplicate policy</Label>
              <Select id="duplicatePolicy" name="duplicatePolicy" defaultValue="event">
                <option value="event">No duplicates across the whole event</option>
                <option value="category">No duplicates within the same prize category</option>
                <option value="allow">Duplicates allowed</option>
              </Select>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ticket format</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ticketMode">Mode</Label>
                  <Select id="ticketMode" name="ticketMode" defaultValue={defaultTicketFormat.mode}>
                    <option value="numeric">Numeric</option>
                    <option value="alphanumeric">Alphanumeric</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixedLength">Fixed length</Label>
                  <Input id="fixedLength" name="fixedLength" type="number" min={1} placeholder="6" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minLength">Min length</Label>
                  <Input id="minLength" name="minLength" type="number" defaultValue={defaultTicketFormat.minLength} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Max length</Label>
                  <Input id="maxLength" name="maxLength" type="number" defaultValue={defaultTicketFormat.maxLength} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketPrefix">Prefix</Label>
                  <Input id="ticketPrefix" name="ticketPrefix" placeholder="VIP" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketRegex">Regex</Label>
                  <Input id="ticketRegex" name="ticketRegex" placeholder="^[0-9]{6}$" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="allowSeries" className="size-4 rounded border-white/10 bg-transparent" />
                  Allow series / prefix
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="preserveLeadingZeros" defaultChecked className="size-4 rounded border-white/10 bg-transparent" />
                  Preserve leading zeros
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="supportsLuckyDraw" defaultChecked className="size-4 rounded border-white/10 bg-transparent" />
                Enable lucky draw
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="supportsAuction" defaultChecked className="size-4 rounded border-white/10 bg-transparent" />
                Enable auction
              </label>
            </div>

            <Button type="submit" className="w-full">
              Create Event
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-5">
          <SurfaceTitle>Existing events</SurfaceTitle>
          <div className="space-y-5">
            {workspace.events.length === 0 ? (
              <SurfaceCopy>No events yet. Create the first show profile to begin.</SurfaceCopy>
            ) : (
              workspace.events.map((eventItem) => {
                const ticketFormat = ticketFormatSchema.parse(eventItem.ticketFormat);
                return (
                  <div key={eventItem.id} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
                    <form action={updateEventAction} className="space-y-4">
                      <input type="hidden" name="eventId" value={eventItem.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input name="name" defaultValue={eventItem.name} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Slug</Label>
                          <Input name="slug" defaultValue={eventItem.slug} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input name="date" type="date" defaultValue={eventItem.date.toISOString().slice(0, 10)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Default theme</Label>
                          <Select name="defaultThemeId" defaultValue={eventItem.defaultThemeId ?? ""}>
                            <option value="">No default theme</option>
                            {workspace.selectedEvent?.id === eventItem.id
                              ? workspace.selectedEvent.themes.map((theme) => (
                                  <option key={theme.id} value={theme.id}>
                                    {theme.name}
                                  </option>
                                ))
                              : null}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Locale</Label>
                          <Input name="locale" defaultValue={eventItem.locale} />
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Input name="currencyCode" defaultValue={eventItem.currencyCode} maxLength={3} />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Duplicate policy</Label>
                          <Select name="duplicatePolicy" defaultValue={eventItem.duplicatePolicy}>
                            <option value="event">Event-wide lock</option>
                            <option value="category">Category-only lock</option>
                            <option value="allow">Duplicates allowed</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ticket mode</Label>
                          <Select name="ticketMode" defaultValue={ticketFormat.mode}>
                            <option value="numeric">Numeric</option>
                            <option value="alphanumeric">Alphanumeric</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Fixed length</Label>
                          <Input name="fixedLength" type="number" defaultValue={ticketFormat.fixedLength ?? undefined} />
                        </div>
                        <div className="space-y-2">
                          <Label>Regex</Label>
                          <Input name="ticketRegex" defaultValue={ticketFormat.regex} />
                        </div>
                        <div className="space-y-2">
                          <Label>Min length</Label>
                          <Input name="minLength" type="number" defaultValue={ticketFormat.minLength} />
                        </div>
                        <div className="space-y-2">
                          <Label>Max length</Label>
                          <Input name="maxLength" type="number" defaultValue={ticketFormat.maxLength} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prefix</Label>
                          <Input name="ticketPrefix" defaultValue={ticketFormat.prefix} />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea name="description" defaultValue={eventItem.description ?? ""} className="min-h-[90px]" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" name="allowSeries" defaultChecked={ticketFormat.allowSeries} className="size-4 rounded border-white/10 bg-transparent" />
                          Allow series
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" name="preserveLeadingZeros" defaultChecked={ticketFormat.preserveLeadingZeros} className="size-4 rounded border-white/10 bg-transparent" />
                          Preserve leading zeros
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" name="supportsLuckyDraw" defaultChecked={eventItem.supportsLuckyDraw} className="size-4 rounded border-white/10 bg-transparent" />
                          Lucky draw enabled
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" name="supportsAuction" defaultChecked={eventItem.supportsAuction} className="size-4 rounded border-white/10 bg-transparent" />
                          Auction enabled
                        </label>
                      </div>

                      <Button type="submit" variant="secondary">
                        Save Event
                      </Button>
                    </form>

                    <form action={archiveEventAction} className="mt-3">
                      <input type="hidden" name="eventId" value={eventItem.id} />
                      <Button type="submit" variant="danger">
                        Archive
                      </Button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

