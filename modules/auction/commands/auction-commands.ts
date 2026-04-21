import type { AuditActionType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildIdleAuctionDisplay, ensurePrimaryDisplayScreen, mapThemePresetToConfig, publishDisplayState } from "@/modules/shared/services/display-state-service";
import { auctionDisplaySchema, type AuctionDisplayEnvelope, type AuctionScene } from "@/modules/shared/schemas/display";
import { toNumber } from "@/modules/shared/utils/formatters";

type DbClient = Prisma.TransactionClient | typeof prisma;

const auctionSessionSchema = z.object({
  eventId: z.string(),
  name: z.string().min(2),
});

const auctionLotSchema = z.object({
  eventId: z.string(),
  auctionSessionId: z.string().optional(),
  lotNumber: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  displayImageUrl: z.string().optional(),
  openingBid: z.number().nonnegative().default(0),
  orderIndex: z.number().int().min(0).optional(),
  themeOverrideId: z.string().optional(),
  displayTitle: z.string().optional(),
  incrementRule: z
    .object({
      minIncrement: z.number().nonnegative().optional(),
      freeInput: z.boolean().default(true),
    })
    .default({ freeInput: true }),
});

const bidCommandSchema = z.object({
  eventId: z.string(),
  lotId: z.string(),
  amount: z.number().positive(),
  bidderLabel: z.string().optional(),
  note: z.string().optional(),
});

const lotStatusSchema = z.object({
  lotId: z.string(),
  winnerLabel: z.string().optional(),
});

async function audit(tx: DbClient, input: {
  eventId: string;
  actionType: AuditActionType;
  actor: string;
  targetType: string;
  targetId: string;
  payload?: Prisma.InputJsonValue;
  undoOfId?: string;
}) {
  return tx.auditLog.create({
    data: {
      eventId: input.eventId,
      moduleType: "auction",
      actionType: input.actionType,
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payload,
      undoOfId: input.undoOfId,
    },
  });
}

async function buildAuctionState(
  tx: DbClient,
  input: {
    eventId: string;
    lotId: string;
    scene?: AuctionScene;
    cue?: string;
  },
) {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: input.eventId },
    include: {
      defaultTheme: true,
    },
  });
  const lot = await tx.auctionLot.findUniqueOrThrow({
    where: { id: input.lotId },
    include: {
      themeOverride: true,
      bids: {
        where: {
          voidedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 2,
      },
    },
  });
  const screen = await ensurePrimaryDisplayScreen(tx, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "auction",
    themePresetId: lot.themeOverrideId ?? event.defaultThemeId,
  });

  const latestBid = lot.bids[0];
  const previousBid = latestBid?.previousAmount ? Number(latestBid.previousAmount) : lot.bids[1] ? Number(lot.bids[1].amount) : undefined;

  let scene: AuctionScene =
    input.scene ??
    (lot.status === "sold"
      ? "sold"
      : lot.status === "passed"
        ? "passed"
        : !latestBid
          ? "lot_intro"
          : latestBid.isOpeningBid
            ? "opening_bid"
            : "live_bid");

  if (scene === "lot_intro" && lot.status === "live" && latestBid) {
    scene = latestBid.isOpeningBid ? "opening_bid" : "live_bid";
  }

  return auctionDisplaySchema.parse({
    eventId: event.id,
    eventSlug: event.slug,
    screenKey: screen.screenKey,
    moduleType: "auction",
    revision: 0,
    displayMode: screen.displayMode,
    theme: mapThemePresetToConfig(lot.themeOverride ?? event.defaultTheme),
    publishedAt: new Date().toISOString(),
    scene,
    auctionSessionId: lot.auctionSessionId ?? undefined,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    lotTitle: lot.displayTitle ?? lot.title,
    lotImageUrl: lot.displayImageUrl ?? undefined,
    currencyCode: event.currencyCode,
    currentBid: lot.currentBid ? Number(lot.currentBid) : undefined,
    previousBid,
    bidderLabel: latestBid?.bidderLabel ?? undefined,
    openingLabel: latestBid?.isOpeningBid ? "Opening bid" : "Current bid",
    statusLabel: lot.status === "sold" ? "Sold" : lot.status === "passed" ? "Passed" : "Live",
    note: input.cue ?? latestBid?.note ?? undefined,
    cue: input.cue ?? (scene === "lot_intro" ? "Cue the opening call from the MC." : "Live bid synced to display."),
  });
}

export async function createAuctionSession(input: z.input<typeof auctionSessionSchema>, actor: string) {
  const payload = auctionSessionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const currentMax = await tx.auctionSession.aggregate({
      where: { eventId: payload.eventId },
      _max: {
        orderIndex: true,
      },
    });

    const session = await tx.auctionSession.create({
      data: {
        eventId: payload.eventId,
        name: payload.name,
        orderIndex: (currentMax._max.orderIndex ?? 0) + 1,
      },
    });

    await audit(tx, {
      eventId: payload.eventId,
      actionType: "auction_session_created",
      actor,
      targetType: "auction_session",
      targetId: session.id,
      payload: {
        name: session.name,
      },
    });

    return session;
  });
}

export async function createAuctionLot(input: z.input<typeof auctionLotSchema>, actor: string) {
  const payload = auctionLotSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const currentMax = await tx.auctionLot.aggregate({
      where: { eventId: payload.eventId },
      _max: {
        orderIndex: true,
      },
    });

    const lot = await tx.auctionLot.create({
      data: {
        eventId: payload.eventId,
        auctionSessionId: payload.auctionSessionId || null,
        lotNumber: payload.lotNumber,
        title: payload.title,
        description: payload.description || null,
        displayImageUrl: payload.displayImageUrl || null,
        openingBid: payload.openingBid,
        orderIndex: payload.orderIndex ?? (currentMax._max.orderIndex ?? -1) + 1,
        themeOverrideId: payload.themeOverrideId || null,
        displayTitle: payload.displayTitle || null,
        incrementRule: payload.incrementRule,
      },
    });

    await audit(tx, {
      eventId: payload.eventId,
      actionType: "auction_lot_created",
      actor,
      targetType: "auction_lot",
      targetId: lot.id,
      payload: {
        lotNumber: lot.lotNumber,
        openingBid: lot.openingBid.toString(),
        displayImageUrl: lot.displayImageUrl,
      },
    });

    return lot;
  });
}

export async function cueAuctionLot(lotId: string, actor: string) {
  const lot = await prisma.auctionLot.findUniqueOrThrow({
    where: { id: lotId },
  });

  await prisma.auctionLot.update({
    where: { id: lotId },
    data: {
      status: "pending",
      revision: {
        increment: 1,
      },
    },
  });

  const state = await buildAuctionState(prisma, {
    eventId: lot.eventId,
    lotId,
    scene: "lot_intro",
    cue: "Lot intro is live. Await the opening bid.",
  });

  await publishDisplayState(prisma, state);
  await audit(prisma, {
    eventId: lot.eventId,
    actionType: "display_published",
    actor,
    targetType: "auction_lot",
    targetId: lotId,
    payload: {
      scene: "lot_intro",
    },
  });

  return state;
}

export async function placeBid(input: z.input<typeof bidCommandSchema>, actor: string) {
  const payload = bidCommandSchema.parse(input);

  const lot = await prisma.auctionLot.findUniqueOrThrow({
    where: { id: payload.lotId },
  });

  const minIncrement =
    typeof lot.incrementRule === "object" && lot.incrementRule && "minIncrement" in (lot.incrementRule as Record<string, unknown>)
      ? Number((lot.incrementRule as Record<string, unknown>).minIncrement ?? 0)
      : 0;

  const currentBid = lot.currentBid ? Number(lot.currentBid) : null;
  const isOpeningBid = currentBid === null;

  if (!isOpeningBid && payload.amount <= currentBid!) {
    throw new Error("New bids must be higher than the current bid.");
  }

  if (!isOpeningBid && minIncrement > 0 && payload.amount - currentBid! < minIncrement) {
    throw new Error(`The next bid must be at least ${minIncrement} higher than the current bid.`);
  }

  const bidEntry = await prisma.bidEntry.create({
    data: {
      lotId: payload.lotId,
      eventId: payload.eventId,
      amount: payload.amount,
      previousAmount: currentBid,
      bidderLabel: payload.bidderLabel || null,
      note: payload.note || null,
      isOpeningBid,
      enteredBy: actor,
    },
  });

  const updatedLot = await prisma.auctionLot.update({
    where: { id: payload.lotId },
    data: {
      openingBid: isOpeningBid ? payload.amount : lot.openingBid,
      currentBid: payload.amount,
      status: "live",
      revision: {
        increment: 1,
      },
    },
  });

  await audit(prisma, {
    eventId: payload.eventId,
    actionType: isOpeningBid ? "auction_bid_opened" : "auction_bid_placed",
    actor,
    targetType: "auction_lot",
    targetId: payload.lotId,
    payload: {
      amount: payload.amount,
      bidderLabel: payload.bidderLabel ?? null,
    },
  });

  const state = await buildAuctionState(prisma, {
    eventId: payload.eventId,
    lotId: payload.lotId,
    scene: isOpeningBid ? "opening_bid" : "live_bid",
    cue: isOpeningBid ? "Opening bid is live." : "New bid accepted and synced.",
  });

  await publishDisplayState(prisma, state);
  return {
    lot: updatedLot,
    bidEntry,
    state,
  };
}

export async function undoLastBid(lotId: string, actor: string) {
  const lot = await prisma.auctionLot.findUniqueOrThrow({
    where: { id: lotId },
  });
  const lastBid = await prisma.bidEntry.findFirst({
    where: {
      lotId,
      voidedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!lastBid) {
    throw new Error("There is no live bid to undo.");
  }

  await prisma.bidEntry.update({
    where: { id: lastBid.id },
    data: {
      voidedAt: new Date(),
    },
  });

  const remainingLatestBid = await prisma.bidEntry.findFirst({
    where: {
      lotId,
      voidedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  await prisma.auctionLot.update({
    where: { id: lotId },
    data: {
      currentBid: remainingLatestBid ? remainingLatestBid.amount : null,
      status: remainingLatestBid ? "live" : "pending",
      finalBid: null,
      revision: {
        increment: 1,
      },
    },
  });

  await audit(prisma, {
    eventId: lot.eventId,
    actionType: "auction_bid_undone",
    actor,
    targetType: "bid_entry",
    targetId: lastBid.id,
    undoOfId: lastBid.id,
    payload: {
      amount: lastBid.amount.toString(),
    },
  });

  const state = remainingLatestBid
    ? await buildAuctionState(prisma, {
        eventId: lot.eventId,
        lotId,
        scene: remainingLatestBid.isOpeningBid ? "opening_bid" : "live_bid",
        cue: "Last bid removed. Live state rolled back.",
      })
    : await buildAuctionState(prisma, {
        eventId: lot.eventId,
        lotId,
        scene: "lot_intro",
        cue: "Opening bid removed. Lot is back in intro state.",
      });

  await publishDisplayState(prisma, state);
  return state;
}

export async function markLotSold(input: z.input<typeof lotStatusSchema>, actor: string) {
  const payload = lotStatusSchema.parse(input);

  const currentLot = await prisma.auctionLot.findUniqueOrThrow({
    where: { id: payload.lotId },
  });

  const updatedLot = await prisma.auctionLot.update({
    where: { id: payload.lotId },
    data: {
      status: "sold",
      finalBid: currentLot.currentBid ?? currentLot.finalBid,
      winnerLabel: payload.winnerLabel || currentLot.winnerLabel,
      revision: {
        increment: 1,
      },
    },
  });

  await audit(prisma, {
    eventId: updatedLot.eventId,
    actionType: "auction_lot_sold",
    actor,
    targetType: "auction_lot",
    targetId: updatedLot.id,
    payload: {
      finalBid: updatedLot.finalBid?.toString() ?? null,
      winnerLabel: updatedLot.winnerLabel ?? null,
    },
  });

  const state = await buildAuctionState(prisma, {
    eventId: updatedLot.eventId,
    lotId: updatedLot.id,
    scene: "sold",
    cue: "Sold.",
  });

  await publishDisplayState(prisma, state);
  return state;
}

export async function markLotPassed(lotId: string, actor: string) {
  const lot = await prisma.auctionLot.update({
    where: { id: lotId },
    data: {
      status: "passed",
      finalBid: null,
      revision: {
        increment: 1,
      },
    },
  });

  await audit(prisma, {
    eventId: lot.eventId,
    actionType: "auction_lot_passed",
    actor,
    targetType: "auction_lot",
    targetId: lot.id,
    payload: {
      lotNumber: lot.lotNumber,
    },
  });

  const state = await buildAuctionState(prisma, {
    eventId: lot.eventId,
    lotId,
    scene: "passed",
    cue: "Passed.",
  });

  await publishDisplayState(prisma, state);
  return state;
}

export async function clearAuctionDisplay(eventId: string, actor: string) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      defaultTheme: true,
    },
  });
  const screen = await ensurePrimaryDisplayScreen(prisma, {
    eventId,
    eventSlug: event.slug,
    moduleType: "auction",
    themePresetId: event.defaultThemeId,
  });

  const state = buildIdleAuctionDisplay({
    eventId,
    eventSlug: event.slug,
    screenKey: screen.screenKey,
    displayMode: screen.displayMode,
    theme: event.defaultTheme,
    currencyCode: event.currencyCode,
  });

  await publishDisplayState(prisma, state);
  await audit(prisma, {
    eventId,
    actionType: "display_published",
    actor,
    targetType: "display_screen",
    targetId: screen.id,
    payload: {
      scene: "idle",
    },
  });

  return state;
}

export function parseBidAmount(value: string | number) {
  return toNumber(value);
}

export type { AuctionDisplayEnvelope };
