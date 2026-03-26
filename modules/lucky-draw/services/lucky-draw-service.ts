import { prisma } from "@/lib/prisma";
import { persistDisplayState } from "@/lib/display-state";
import { realtimeBus } from "@/lib/realtime-bus";
import { luckyDrawRevealSchema, type LuckyDrawRevealInput } from "@/modules/lucky-draw/schemas/reveal";
import type { LuckyDrawPublicState } from "@/modules/shared/types/contracts";

const defaultTheme = {
  backgroundType: "color" as const,
  accentColor: "#22d3ee",
  textColor: "#ffffff",
  overlayMode: false,
};

export async function revealWinner(input: LuckyDrawRevealInput) {
  const payload = luckyDrawRevealSchema.parse(input);

  const event = await prisma.event.findUniqueOrThrow({ where: { id: payload.eventId } });

  if (event.duplicatePolicy === "event") {
    const duplicate = await prisma.winner.findFirst({
      where: { eventId: payload.eventId, ticketNumber: payload.ticketNumber, status: { in: ["revealed", "confirmed"] } },
    });
    if (duplicate) throw new Error("Ticket number already used in this event.");
  }

  if (event.duplicatePolicy === "category") {
    const duplicate = await prisma.winner.findFirst({
      where: {
        eventId: payload.eventId,
        prizeCategoryId: payload.prizeCategoryId,
        ticketNumber: payload.ticketNumber,
        status: { in: ["revealed", "confirmed"] },
      },
    });
    if (duplicate) throw new Error("Ticket number already used in this prize category.");
  }

  const revealOrder = (await prisma.winner.count({ where: { drawSessionId: payload.drawSessionId } })) + 1;

  const winner = await prisma.winner.create({
    data: {
      eventId: payload.eventId,
      prizeCategoryId: payload.prizeCategoryId,
      drawSessionId: payload.drawSessionId,
      ticketNumber: payload.ticketNumber,
      revealOrder,
      revealSource: payload.revealSource,
      status: "revealed",
    },
  });

  await prisma.auditLog.create({
    data: {
      eventId: payload.eventId,
      moduleType: "lucky_draw",
      actionType: "winner.revealed",
      actor: payload.actor,
      payload: winner,
    },
  });

  const session = await prisma.drawSession.findUniqueOrThrow({ where: { id: payload.drawSessionId } });
  const prize = await prisma.prizeCategory.findUniqueOrThrow({ where: { id: payload.prizeCategoryId } });
  const winners = await prisma.winner.findMany({
    where: { drawSessionId: payload.drawSessionId, status: { in: ["revealed", "confirmed"] } },
    orderBy: { revealOrder: "asc" },
  });

  const state: LuckyDrawPublicState = {
    moduleType: "lucky_draw",
    eventSlug: event.slug,
    prizeName: prize.name,
    latestWinningNumber: payload.ticketNumber,
    winners: winners.map((w) => w.ticketNumber),
    layoutMode: session.layoutMode,
    animationPreset: session.animationPresetOverride ?? prize.animationPreset,
    status: "revealed",
    updatedAt: new Date().toISOString(),
    theme: defaultTheme,
  };

  await persistDisplayState(payload.eventId, "lucky_draw", state);
  realtimeBus.publish(state);
  return winner;
}
