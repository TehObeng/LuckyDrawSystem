import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { SimpleLuckyDrawWorkspace } from "@/components/admin/simple-lucky-draw-workspace";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import {
  simpleCancelPendingRollAction,
  simpleCreateDrawSessionAction,
  simpleDeleteWinnerAction,
  simpleInvalidateWinnerAction,
  simpleRedrawWinnerRandomAction,
  simpleRevealNextWinnerAction,
  simpleResetDrawAction,
  simpleRollRandomWinnerBatchAction,
  simpleUpdateBoardSettingsAction,
  simpleValidateWinnerAction,
} from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { defaultPrizeBoardSettings, prizeBoardSettingsSchema } from "@/modules/shared/types/contracts";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

function resolvePrizeBoardSettings(value: unknown) {
  const parsed = prizeBoardSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPrizeBoardSettings;
}

export default async function SimpleLuckyDrawPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Create or select an event before opening the simple lucky draw workspace.</SurfaceCopy>
      </Surface>
    );
  }

  if (selectedEvent.prizeCategories.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Simple Lucky Draw"
          title="Create a prize category first"
          description="The simple draw console needs at least one prize category so it can attach sessions and winners to the right prize."
        />
        <Surface className="space-y-4">
          <SurfaceTitle>No prize categories</SurfaceTitle>
          <SurfaceCopy>Add a prize category on the advanced Lucky Draw page, then return here for the focused live workflow.</SurfaceCopy>
          <Button asChild variant="secondary">
            <Link href={`/admin/lucky-draw?event=${selectedEvent.id}`}>Open Lucky Draw Setup</Link>
          </Button>
        </Surface>
      </div>
    );
  }

  const sessions = await prisma.drawSession.findMany({
    where: {
      eventId: selectedEvent.id,
    },
    orderBy: {
      sessionOrder: "asc",
    },
    include: {
      prizeCategory: {
        select: {
          id: true,
          name: true,
        },
      },
      winners: {
        orderBy: {
          revealOrder: "desc",
        },
        take: 80,
      },
    },
  });
  const luckyScreen = selectedEvent.displayScreens.find((screen) => screen.moduleType === "lucky_draw" && screen.isPrimary)
    ?? selectedEvent.displayScreens.find((screen) => screen.moduleType === "lucky_draw");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Simple Lucky Draw"
        title="Roll, reveal, and validate winners"
        description="A focused live-event page for digital random batch draws and a clean main-screen card board."
      />

      <SimpleLuckyDrawWorkspace
        eventId={selectedEvent.id}
        eventSlug={selectedEvent.slug}
        eventName={selectedEvent.name}
        prizes={selectedEvent.prizeCategories.map((prize) => ({
          id: prize.id,
          name: prize.name,
          quantity: prize.quantity,
          animationPreset: prize.animationPreset,
          animationSpeed: prize.animationSpeed,
          boardSettings: resolvePrizeBoardSettings(prize.boardSettings),
        }))}
        sessions={sessions.map((session) => ({
          id: session.id,
          name: session.name,
          prizeCategoryId: session.prizeCategoryId,
          prizeName: session.prizeCategory.name,
          plannedWinnerCount: session.plannedWinnerCount,
          actualWinnerCount: session.actualWinnerCount,
          gridItemCount: session.gridItemCount,
          gridRows: session.gridRows,
          gridCols: session.gridCols,
          status: session.status,
          winners: session.winners.map((winner) => ({
            id: winner.id,
            ticketNumber: winner.ticketNumber,
            revealOrder: winner.revealOrder,
            status: winner.status,
            notes: winner.notes,
          })),
        }))}
        initialDesignWidth={luckyScreen?.designWidth ?? 1920}
        initialDesignHeight={luckyScreen?.designHeight ?? 1080}
        createSessionAction={simpleCreateDrawSessionAction}
        rollAction={simpleRollRandomWinnerBatchAction}
        updateBoardSettingsAction={simpleUpdateBoardSettingsAction}
        revealNextAction={simpleRevealNextWinnerAction}
        resetDrawAction={simpleResetDrawAction}
        validateAction={simpleValidateWinnerAction}
        deleteAction={simpleDeleteWinnerAction}
        invalidateAction={simpleInvalidateWinnerAction}
        redrawAction={simpleRedrawWinnerRandomAction}
        cancelPendingAction={simpleCancelPendingRollAction}
      />
    </div>
  );
}
