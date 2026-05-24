import { PageHeader } from "@/components/admin/page-header";
import { SimpleLuckyDrawWorkspace } from "@/components/admin/simple-lucky-draw-workspace";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import {
  simpleAddWinningNumberAction,
  simpleDeleteWinnerAction,
  simpleEditWinningNumberAction,
  simpleResetDrawAction,
  simpleUpdateBoardSettingsAction,
  simpleClearDisplayAction,
} from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { defaultPrizeBoardSettings, prizeBoardSettingsSchema } from "@/modules/shared/types/contracts";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";

function resolvePrizeBoardSettings(value: unknown) {
  const parsed = prizeBoardSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPrizeBoardSettings;
}

async function ensureSimpleLuckyDrawWorkspace(eventId: string) {
  const prize = await prisma.prizeCategory.upsert({
    where: {
      id: `simple-draw-prize-${eventId}`,
    },
    update: {},
    create: {
      id: `simple-draw-prize-${eventId}`,
      eventId,
      name: "Winning Numbers",
      quantity: 9999,
      displayMode: "grid",
      animationPreset: "fade_pop",
      animationSpeed: 1,
      boardSettings: defaultPrizeBoardSettings,
      sortOrder: -999,
    },
  });

  const existingSession = await prisma.drawSession.findFirst({
    where: {
      eventId,
      prizeCategoryId: prize.id,
      name: "Fast Draw",
    },
    orderBy: {
      sessionOrder: "asc",
    },
  });

  if (existingSession) {
    return { prize, session: existingSession };
  }

  const currentMaxOrder = await prisma.drawSession.aggregate({
    where: { eventId },
    _max: { sessionOrder: true },
  });
  const session = await prisma.drawSession.create({
    data: {
      eventId,
      prizeCategoryId: prize.id,
      name: "Fast Draw",
      sessionOrder: (currentMaxOrder._max.sessionOrder ?? 0) + 1,
      plannedWinnerCount: 9999,
      layoutMode: "grid",
      gridItemCount: 12,
      gridRows: 3,
      gridCols: 4,
      revealMode: "manual",
      status: "active",
    },
  });

  return { prize, session };
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

  const { prize: simplePrize, session: simpleSession } = await ensureSimpleLuckyDrawWorkspace(selectedEvent.id);
  const session = await prisma.drawSession.findUniqueOrThrow({
    where: { id: simpleSession.id },
    include: {
      winners: {
        orderBy: {
          revealOrder: "desc",
        },
        take: 200,
      },
    },
  });
  const luckyScreen = selectedEvent.displayScreens.find((screen) => screen.moduleType === "lucky_draw" && screen.isPrimary)
    ?? selectedEvent.displayScreens.find((screen) => screen.moduleType === "lucky_draw");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Simple Lucky Draw"
        title="Fast display controls and winning numbers"
        description="A separated simple draw page for fast-changing draws: screen size, margins, colours, reset, and direct winning-number CRUD."
      />

      <SimpleLuckyDrawWorkspace
        eventId={selectedEvent.id}
        eventSlug={selectedEvent.slug}
        eventName={selectedEvent.name}
        prize={{
          id: simplePrize.id,
          name: simplePrize.name,
          quantity: simplePrize.quantity,
          animationPreset: simplePrize.animationPreset,
          animationSpeed: simplePrize.animationSpeed,
          boardSettings: resolvePrizeBoardSettings(simplePrize.boardSettings),
        }}
        session={{
          id: session.id,
          name: session.name,
          prizeCategoryId: session.prizeCategoryId,
          prizeName: simplePrize.name,
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
        }}
        initialDesignWidth={luckyScreen?.designWidth ?? 1920}
        initialDesignHeight={luckyScreen?.designHeight ?? 1080}
        addWinnerAction={simpleAddWinningNumberAction}
        editWinnerAction={simpleEditWinningNumberAction}
        updateBoardSettingsAction={simpleUpdateBoardSettingsAction}
        resetDrawAction={simpleResetDrawAction}
        clearDisplayAction={simpleClearDisplayAction}
        deleteAction={simpleDeleteWinnerAction}
      />
    </div>
  );
}
