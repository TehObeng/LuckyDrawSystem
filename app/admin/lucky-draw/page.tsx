import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import {
  createDrawSessionAction,
  createPrizeAction,
  deleteDrawSessionAction,
  deletePrizeAction,
  editWinnerAction,
  invalidateWinnerAction,
  redrawWinnerAction,
  updateDrawSessionAction,
  updatePrizeAction,
  updatePrizeBoardSettingsAction,
} from "@/app/admin/actions";
import { defaultPrizeBoardSettings, prizeBoardSettingsSchema } from "@/modules/shared/types/contracts";
import { withBasePath } from "@/lib/public-path";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

function resolvePrizeBoardSettings(boardSettings: unknown) {
  const parsed = prizeBoardSettingsSchema.safeParse(boardSettings);
  return parsed.success ? parsed.data : defaultPrizeBoardSettings;
}

export default async function LuckyDrawAdminPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;
  const supportingAssets = selectedEvent?.mediaAssets.filter((asset) => asset.kind === "supporting") ?? [];

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Choose an event before creating prize categories, draw sessions, and winner correction flows.</SurfaceCopy>
      </Surface>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lucky Draw Module"
        title="Configure prizes, split sessions, and correct winners"
        description="Manual stage-driven reveal stays primary. This page now lets you create, edit, and remove prize categories and draw sessions from one place."
      />

      <div className="grid gap-6 xl:grid-cols-[0.72fr_0.72fr_1.06fr]">
        <Surface className="space-y-5">
          <SurfaceTitle>Create prize category</SurfaceTitle>
          <form action={createPrizeAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" placeholder="Grand Prize SUV" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select name="displayMode" defaultValue="grid">
                  <option value="grid">Grid</option>
                  <option value="exclusive">Exclusive</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Animation</Label>
                <Select name="animationPreset" defaultValue="fade_pop">
                  <option value="scramble">Scramble</option>
                  <option value="rolling">Rolling</option>
                  <option value="slot">Slot</option>
                  <option value="flip">Flip</option>
                  <option value="zoom">Zoom</option>
                  <option value="fade_pop">Fade + pop</option>
                  <option value="celebration_burst">Celebration burst</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Speed</Label>
                <Input name="animationSpeed" type="number" step="0.1" min={0.25} max={3} defaultValue={1} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" placeholder="MC script note, sponsor mention, or on-stage presentation guidance." />
            </div>
            <div className="space-y-2">
              <Label>Prize image URL</Label>
              <Input name="displayImageUrl" list="supporting-asset-options" placeholder="/demo-media/prize-scooter.svg or /uploads/event-assets/prize.jpg" />
            </div>
            <div className="space-y-2">
              <Label>Special theme</Label>
              <Select name="specialThemeId" defaultValue="">
                <option value="">Use event default</option>
                {selectedEvent.themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Add Prize Category
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-5">
          <SurfaceTitle>Create draw session</SurfaceTitle>
          <form action={createDrawSessionAction} className="space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="space-y-2">
              <Label>Prize category</Label>
              <Select name="prizeCategoryId">
                {selectedEvent.prizeCategories.map((prize) => (
                  <option key={prize.id} value={prize.id}>
                    {prize.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session name</Label>
              <Input name="name" placeholder="Session A / Heat 1" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Planned winners</Label>
                <Input name="plannedWinnerCount" type="number" min={1} defaultValue={1} />
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select name="layoutMode" defaultValue="grid">
                  <option value="grid">Grid</option>
                  <option value="exclusive">Exclusive</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Live overlay visible slots</Label>
                <Input name="gridItemCount" type="number" min={1} max={120} defaultValue={12} />
                <p className="text-xs text-slate-500">Example: set 33 planned winners and 11 visible slots to keep the live board showing only the latest 11 numbers.</p>
              </div>
              <div className="space-y-2">
                <Label>Reveal mode</Label>
                <Select name="revealMode" defaultValue="manual">
                  <option value="manual">Manual stage-driven</option>
                  <option value="digital_random">Digital random available</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Animation override</Label>
                <Select name="animationPresetOverride" defaultValue="">
                  <option value="">Use category animation</option>
                  <option value="scramble">Scramble</option>
                  <option value="rolling">Rolling</option>
                  <option value="slot">Slot</option>
                  <option value="flip">Flip</option>
                  <option value="zoom">Zoom</option>
                  <option value="fade_pop">Fade + pop</option>
                  <option value="celebration_burst">Celebration burst</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Speed override</Label>
                <Input name="animationSpeedOverride" type="number" step="0.1" min={0.25} max={3} placeholder="Use category speed" />
              </div>
              <div className="space-y-2">
                <Label>Grid rows</Label>
                <Input name="gridRows" type="number" min={1} max={12} />
              </div>
              <div className="space-y-2">
                <Label>Grid cols</Label>
                <Input name="gridCols" type="number" min={1} max={12} />
              </div>
            </div>
            <Button type="submit" variant="secondary" className="w-full">
              Add Draw Session
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          {selectedEvent.prizeCategories.map((prize) => {
            const boardSettings = resolvePrizeBoardSettings(prize.boardSettings);
            const canDeletePrize = prize.drawSessions.every((session) => session.actualWinnerCount === 0) && prize.winners.length === 0;

            return (
              <Surface key={prize.id} className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SurfaceTitle>{prize.name}</SurfaceTitle>
                    <SurfaceCopy>{prize.quantity} planned winners | {prize.displayMode} display | {prize.animationPreset}</SurfaceCopy>
                  </div>
                  <Badge variant={prize.displayMode === "exclusive" ? "warning" : "success"}>{prize.displayMode}</Badge>
                </div>

                {prize.displayImageUrl ? (
                  <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.03]">
                    <img src={withBasePath(prize.displayImageUrl)} alt={prize.name} className="h-48 w-full object-cover" />
                  </div>
                ) : null}

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Category settings</p>
                      <p className="mt-2 text-sm text-slate-400">Edit the category name, total winners, theme override, and display behavior here.</p>
                    </div>
                    {!canDeletePrize ? (
                      <p className="text-xs text-amber-300">Remove is locked once winners have been revealed.</p>
                    ) : null}
                  </div>

                  <form action={updatePrizeAction} className="mt-4 space-y-4">
                    <input type="hidden" name="prizeCategoryId" value={prize.id} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input name="name" defaultValue={prize.name} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Total winners</Label>
                        <Input name="quantity" type="number" min={1} defaultValue={prize.quantity} />
                      </div>
                      <div className="space-y-2">
                        <Label>Display mode</Label>
                        <Select name="displayMode" defaultValue={prize.displayMode}>
                          <option value="grid">Grid</option>
                          <option value="exclusive">Exclusive</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Animation</Label>
                        <Select name="animationPreset" defaultValue={prize.animationPreset}>
                          <option value="scramble">Scramble</option>
                          <option value="rolling">Rolling</option>
                          <option value="slot">Slot</option>
                          <option value="flip">Flip</option>
                          <option value="zoom">Zoom</option>
                          <option value="fade_pop">Fade + pop</option>
                          <option value="celebration_burst">Celebration burst</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Animation speed</Label>
                        <Input name="animationSpeed" type="number" min={0.25} max={3} step="0.1" defaultValue={prize.animationSpeed} />
                      </div>
                      <div className="space-y-2">
                        <Label>Special theme</Label>
                        <Select name="specialThemeId" defaultValue={prize.specialThemeId ?? ""}>
                          <option value="">Use event default</option>
                          {selectedEvent.themes.map((theme) => (
                            <option key={theme.id} value={theme.id}>
                              {theme.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Prize image URL</Label>
                        <Input name="displayImageUrl" list="supporting-asset-options" defaultValue={prize.displayImageUrl ?? ""} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea name="description" defaultValue={prize.description ?? ""} />
                      </div>
                    </div>
                    <Button type="submit" variant="secondary">
                      Save Category
                    </Button>
                  </form>

                  <form action={deletePrizeAction} className="mt-3">
                    <input type="hidden" name="prizeCategoryId" value={prize.id} />
                    <Button type="submit" variant="danger" disabled={!canDeletePrize}>
                      Remove Category
                    </Button>
                  </form>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Draw sessions</p>
                    <p className="text-xs text-slate-500">Edit timing and layout per session, or remove empty ones.</p>
                  </div>

                  {prize.drawSessions.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                      No draw sessions yet for this category.
                    </div>
                  ) : (
                    prize.drawSessions.map((session) => {
                      const canDeleteSession = session.actualWinnerCount === 0 && session.winners.length === 0;

                      return (
                        <div key={session.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-100">{session.name}</p>
                              <p className="text-sm text-slate-400">{session.actualWinnerCount}/{session.plannedWinnerCount} winners | {session.revealMode}</p>
                            </div>
                            <Badge variant="accent">{session.status}</Badge>
                          </div>

                          <form action={updateDrawSessionAction} className="mt-4 space-y-4">
                            <input type="hidden" name="drawSessionId" value={session.id} />
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-2">
                                <Label>Session name</Label>
                                <Input name="name" defaultValue={session.name} required />
                              </div>
                              <div className="space-y-2">
                                <Label>Prize category</Label>
                                <Select name="prizeCategoryId" defaultValue={session.prizeCategoryId}>
                                  {selectedEvent.prizeCategories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Planned winners</Label>
                                <Input name="plannedWinnerCount" type="number" min={1} defaultValue={session.plannedWinnerCount} />
                              </div>
                              <div className="space-y-2">
                                <Label>Live visible slots</Label>
                                <Input name="gridItemCount" type="number" min={1} max={120} defaultValue={session.gridItemCount} />
                              </div>
                              <div className="space-y-2">
                                <Label>Layout</Label>
                                <Select name="layoutMode" defaultValue={session.layoutMode}>
                                  <option value="grid">Grid</option>
                                  <option value="exclusive">Exclusive</option>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Reveal mode</Label>
                                <Select name="revealMode" defaultValue={session.revealMode}>
                                  <option value="manual">Manual stage-driven</option>
                                  <option value="digital_random">Digital random available</option>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Grid rows</Label>
                                <Input name="gridRows" type="number" min={1} max={12} defaultValue={session.gridRows ?? ""} />
                              </div>
                              <div className="space-y-2">
                                <Label>Grid cols</Label>
                                <Input name="gridCols" type="number" min={1} max={12} defaultValue={session.gridCols ?? ""} />
                              </div>
                              <div className="space-y-2">
                                <Label>Animation override</Label>
                                <Select name="animationPresetOverride" defaultValue={session.animationPresetOverride ?? ""}>
                                  <option value="">Use category animation</option>
                                  <option value="scramble">Scramble</option>
                                  <option value="rolling">Rolling</option>
                                  <option value="slot">Slot</option>
                                  <option value="flip">Flip</option>
                                  <option value="zoom">Zoom</option>
                                  <option value="fade_pop">Fade + pop</option>
                                  <option value="celebration_burst">Celebration burst</option>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Speed override</Label>
                                <Input name="animationSpeedOverride" type="number" step="0.1" min={0.25} max={3} defaultValue={session.animationSpeedOverride ?? ""} />
                              </div>
                            </div>
                            <Button type="submit" variant="secondary" size="sm">
                              Save Session
                            </Button>
                          </form>

                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <form action={deleteDrawSessionAction}>
                              <input type="hidden" name="drawSessionId" value={session.id} />
                              <Button type="submit" variant="danger" size="sm" disabled={!canDeleteSession}>
                                Remove Session
                              </Button>
                            </form>
                            {!canDeleteSession ? (
                              <p className="text-xs text-amber-300">Remove is locked once winners are revealed in this session.</p>
                            ) : null}
                          </div>

                          {session.winners.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {session.winners.map((winner) => (
                                <span key={winner.id} className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-200">
                                  {winner.ticketNumber}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-slate-500">No revealed winners yet.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Full winners overlay settings</p>
                      <p className="mt-2 text-sm text-slate-400">This controls the separate all-winners page for this prize category. Use it to tune the grid and typography live.</p>
                    </div>
                    <div className="text-xs uppercase tracking-[0.22em] text-emerald-300">
                      /display/lucky-draw-all/{selectedEvent.slug}
                    </div>
                  </div>
                  <form action={updatePrizeBoardSettingsAction} className="mt-4 space-y-4">
                    <input type="hidden" name="prizeCategoryId" value={prize.id} />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Columns</Label>
                        <Input name="columns" type="number" min={1} max={12} defaultValue={boardSettings.columns} />
                      </div>
                      <div className="space-y-2">
                        <Label>Min card width</Label>
                        <Input name="minItemWidth" type="number" min={120} max={640} defaultValue={boardSettings.minItemWidth} />
                      </div>
                      <div className="space-y-2">
                        <Label>Card height</Label>
                        <Input name="cardMinHeight" type="number" min={64} max={320} defaultValue={boardSettings.cardMinHeight} />
                      </div>
                      <div className="space-y-2">
                        <Label>Board max width</Label>
                        <Input name="boardMaxWidth" type="number" min={480} max={3200} defaultValue={boardSettings.boardMaxWidth} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gap</Label>
                        <Input name="gap" type="number" min={4} max={48} defaultValue={boardSettings.gap} />
                      </div>
                      <div className="space-y-2">
                        <Label>Font family</Label>
                        <Input name="fontFamily" defaultValue={boardSettings.fontFamily} placeholder="inherit, Oswald, Montserrat" />
                      </div>
                      <div className="space-y-2">
                        <Label>Winner label size</Label>
                        <Input name="winnerLabelFontSize" type="number" min={8} max={72} defaultValue={boardSettings.winnerLabelFontSize} />
                      </div>
                      <div className="space-y-2">
                        <Label>Base font size</Label>
                        <Input name="fontSize" type="number" min={16} max={160} defaultValue={boardSettings.fontSize} />
                      </div>
                      <div className="space-y-2">
                        <Label>Number size</Label>
                        <Input name="numberFontSize" type="number" min={16} max={200} defaultValue={boardSettings.numberFontSize} />
                      </div>
                      <div className="space-y-2">
                        <Label>Font weight</Label>
                        <Input name="fontWeight" type="number" min={400} max={900} step={100} defaultValue={boardSettings.fontWeight} />
                      </div>
                    </div>
                    <Button type="submit" variant="secondary" className="w-full">
                      Save Full Overlay Settings
                    </Button>
                  </form>
                </div>

                {prize.winners.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recent winners</p>
                    {prize.winners.map((winner) => (
                      <div key={winner.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="font-medium text-slate-100">{winner.ticketNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{winner.status}</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <form action={editWinnerAction} className="space-y-2">
                            <input type="hidden" name="winnerId" value={winner.id} />
                            <Input name="ticketNumber" defaultValue={winner.ticketNumber} />
                            <Button type="submit" variant="secondary" size="sm" className="w-full">
                              Edit
                            </Button>
                          </form>
                          <form action={redrawWinnerAction} className="space-y-2">
                            <input type="hidden" name="winnerId" value={winner.id} />
                            <Input name="ticketNumber" placeholder="New redraw ticket" />
                            <Button type="submit" variant="secondary" size="sm" className="w-full">
                              Redraw
                            </Button>
                          </form>
                          <form action={invalidateWinnerAction} className="space-y-2">
                            <input type="hidden" name="winnerId" value={winner.id} />
                            <Input name="note" placeholder="Reason / note" />
                            <Button type="submit" variant="danger" size="sm" className="w-full">
                              Invalidate
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Surface>
            );
          })}
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
