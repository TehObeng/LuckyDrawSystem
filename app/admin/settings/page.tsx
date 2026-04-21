import type { Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { updateEventSettingsAction } from "@/app/admin/actions";
import { parseEventSettings } from "@/modules/shared/services/display-state-service";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Select an event before editing master-output and operator workspace settings.</SurfaceCopy>
      </Surface>
    );
  }

  const settings = parseEventSettings(selectedEvent.settings);
  const masterScreen = selectedEvent.displayScreens.find((screen) => screen.moduleType === "master");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operational Settings"
        title="Tune master output and operator defaults"
        description="Keep the live console ergonomic, control how the master overlay behaves, and set safer defaults for the team running the room."
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Surface className="space-y-5">
          <div>
            <SurfaceTitle>Display behavior</SurfaceTitle>
            <SurfaceCopy>These settings affect the shared operator workspace and the master display route for the selected event.</SurfaceCopy>
          </div>

          <form action={updateEventSettingsAction} className="space-y-5">
            <input type="hidden" name="eventId" value={selectedEvent.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultMasterSource">Default master source</Label>
                <Select id="defaultMasterSource" name="defaultMasterSource" defaultValue={settings.defaultMasterSource}>
                  <option value="blank">Blank</option>
                  <option value="lucky_draw">Lucky Draw</option>
                  <option value="auction">Auction</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activeMasterSource">Current master source</Label>
                <Select id="activeMasterSource" name="activeMasterSource" defaultValue={settings.activeMasterSource}>
                  <option value="blank">Blank</option>
                  <option value="lucky_draw">Lucky Draw</option>
                  <option value="auction">Auction</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="masterDisplayMode">Master display mode</Label>
                <Select id="masterDisplayMode" name="masterDisplayMode" defaultValue={masterScreen?.displayMode ?? "overlay"}>
                  <option value="overlay">Overlay</option>
                  <option value="fullscreen">Fullscreen</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fallbackPollingIntervalMs">Fallback polling interval (ms)</Label>
                <Input id="fallbackPollingIntervalMs" name="fallbackPollingIntervalMs" type="number" min={1000} max={30000} step={250} defaultValue={settings.fallbackPollingIntervalMs} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <input type="checkbox" name="requireActionConfirmations" defaultChecked={settings.requireActionConfirmations} className="size-4 rounded border-white/10 bg-transparent" />
                  Confirm destructive actions
                </span>
                <span className="mt-2 block text-slate-500">Protect pass, sold, undo, and clear actions during the show.</span>
              </label>
              <label className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <input type="checkbox" name="persistLiveSelections" defaultChecked={settings.persistLiveSelections} className="size-4 rounded border-white/10 bg-transparent" />
                  Persist live selections
                </span>
                <span className="mt-2 block text-slate-500">Keep the last chosen session and lot when the live page refreshes.</span>
              </label>
              <label className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <input type="checkbox" name="showRouteCopyButtons" defaultChecked={settings.showRouteCopyButtons} className="size-4 rounded border-white/10 bg-transparent" />
                  Show route copy buttons
                </span>
                <span className="mt-2 block text-slate-500">Expose open/copy helpers for stage and output routes around the UI.</span>
              </label>
            </div>

            <Button type="submit" className="w-full">
              Save Settings
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          <Surface className="space-y-5">
            <SurfaceTitle>Output map</SurfaceTitle>
            <SurfaceCopy>Use these route shortcuts during setup and rehearsal. The master route mirrors the selected source rather than running its own business logic.</SurfaceCopy>

            <div className="grid gap-4 md:grid-cols-3">
              <Link href={`/display/lucky-draw/${selectedEvent.slug}` as Route} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.05]">
                <p className="font-medium text-slate-50">Lucky Draw</p>
                <p className="mt-2 text-sm text-slate-400">/display/lucky-draw/{selectedEvent.slug}</p>
              </Link>
              <Link href={`/display/auction/${selectedEvent.slug}` as Route} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-300/30 hover:bg-white/[0.05]">
                <p className="font-medium text-slate-50">Auction</p>
                <p className="mt-2 text-sm text-slate-400">/display/auction/{selectedEvent.slug}</p>
              </Link>
              <Link href={`/display/master/${selectedEvent.slug}` as Route} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-300/30 hover:bg-white/[0.05]">
                <p className="font-medium text-slate-50">Master Overlay</p>
                <p className="mt-2 text-sm text-slate-400">/display/master/{selectedEvent.slug}</p>
              </Link>
            </div>
          </Surface>

          <Surface className="space-y-5">
            <SurfaceTitle>Current event baseline</SurfaceTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Theme presets</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{selectedEvent.themes.length}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Media assets</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{selectedEvent.mediaAssets.length}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Display screens</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{selectedEvent.displayScreens.length}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Active master source</p>
                <p className="mt-3 text-3xl font-semibold capitalize text-slate-50">{settings.activeMasterSource.replace("_", " ")}</p>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
