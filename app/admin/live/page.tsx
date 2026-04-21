import { PageHeader } from "@/components/admin/page-header";
import { LiveControlWorkspace } from "@/components/admin/live-control-workspace";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { clearAuctionDisplayAction, clearLuckyDrawDisplayAction, cueAuctionLotAction, digitalRandomWinnerAction, liveBidAction, liveRevealWinnerAction, passedLotAction, replayLuckyDrawAction, soldLotAction, undoBidAction, undoRevealAction, updateMasterDisplayAction } from "@/app/admin/actions";
import { parseEventSettings } from "@/modules/shared/services/display-state-service";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

export default async function LiveControlPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Create or select an event before opening the live control workspace.</SurfaceCopy>
      </Surface>
    );
  }

  const settings = parseEventSettings(selectedEvent.settings);
  const luckySessions = selectedEvent.prizeCategories.flatMap((prize) =>
    prize.drawSessions.map((session) => ({
      id: session.id,
      name: session.name,
      prizeCategoryId: prize.id,
      prizeName: prize.name,
      revealMode: session.revealMode,
    })),
  );
  const auctionLots = selectedEvent.auctionLots.map((lot) => ({
    id: lot.id,
    title: lot.title,
    lotNumber: lot.lotNumber,
    status: lot.status,
  }));
  const masterScreen = selectedEvent.displayScreens.find((screen) => screen.moduleType === "master");
  const displayStates = Array.from(
    new Map(
      workspace.displayStates
        .map((state) => {
          const payload = state.payload as { scene?: string };
          if (state.moduleType !== "lucky_draw" && state.moduleType !== "auction" && state.moduleType !== "master") {
            return null;
          }

          return [
            state.moduleType,
            {
              moduleType: state.moduleType,
              scene: payload.scene ?? state.status,
              screenKey: state.screen.screenKey,
              displayMode: state.displayMode,
              revision: state.revision,
              syncedAt: state.syncedAt.toISOString(),
            },
          ] as const;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Control"
        title="Stage-speed operator workspace"
        description="This page is optimized for fast inputs, correction flows, and real-time public display sync. Keep it on the operator monitor while the public routes run fullscreen elsewhere."
      />

      <LiveControlWorkspace
        eventId={selectedEvent.id}
        eventSlug={selectedEvent.slug}
        eventSettings={settings}
        masterSource={settings.activeMasterSource}
        masterDisplayMode={masterScreen?.displayMode ?? "overlay"}
        displayStates={displayStates}
        luckySessions={luckySessions}
        auctionLots={auctionLots}
        revealAction={liveRevealWinnerAction}
        randomAction={digitalRandomWinnerAction}
        undoRevealAction={undoRevealAction}
        replayAction={replayLuckyDrawAction}
        clearLuckyDrawAction={clearLuckyDrawDisplayAction}
        cueAuctionLotAction={cueAuctionLotAction}
        bidAction={liveBidAction}
        undoBidAction={undoBidAction}
        soldAction={soldLotAction}
        passedAction={passedLotAction}
        clearAuctionAction={clearAuctionDisplayAction}
        updateMasterAction={updateMasterDisplayAction}
      />
    </div>
  );
}
