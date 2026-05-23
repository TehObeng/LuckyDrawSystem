import type { AuditActionType, DuplicatePolicy, WinnerStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildIdleLuckyDrawDisplay, ensurePrimaryDisplayScreen, mapThemePresetToConfig, publishDisplayState } from "@/modules/shared/services/display-state-service";
import { luckyDrawDisplaySchema, type LuckyDrawDisplayEnvelope, type LuckyDrawScene } from "@/modules/shared/schemas/display";
import { defaultPrizeBoardSettings, layoutModeSchema, luckyDrawAnimationPresetSchema, prizeBoardSettingsSchema, ticketFormatSchema } from "@/modules/shared/schemas/platform";
import { validateTicketNumber } from "@/modules/shared/utils/ticket-format";

const ACTIVE_WINNER_STATUSES: WinnerStatus[] = ["revealed", "confirmed"];
const RESERVED_WINNER_STATUSES: WinnerStatus[] = ["draft", "revealed", "confirmed"];

function isSimpleDrawPrizeCategoryId(prizeCategoryId: string) {
  return prizeCategoryId.startsWith("simple-draw-prize-");
}

function normalizeSimpleDrawNumber(rawValue: string) {
  return rawValue.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}
type DbClient = Prisma.TransactionClient | typeof prisma;

function clampBoardNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function calculateCleanBoard(input: {
  designWidth: number;
  designHeight: number;
  displayAmount: number;
  gridCols?: number;
  gridRows?: number;
}) {
  const designWidth = clampBoardNumber(input.designWidth, 320, 7680);
  const designHeight = clampBoardNumber(input.designHeight, 240, 4320);
  const displayAmount = clampBoardNumber(input.displayAmount, 1, 120);
  const manualColumns = input.gridCols ? clampBoardNumber(input.gridCols, 1, 120) : null;
  const manualRows = input.gridRows ? clampBoardNumber(input.gridRows, 1, 120) : null;
  let columns = manualColumns ?? clampBoardNumber(Math.ceil(Math.sqrt(displayAmount * (designWidth / designHeight))), 1, displayAmount);
  let rows = manualRows ?? clampBoardNumber(Math.ceil(displayAmount / columns), 1, displayAmount);

  if (!manualRows) {
    rows = clampBoardNumber(Math.ceil(displayAmount / columns), 1, 120);
  }

  if (!manualColumns) {
    columns = clampBoardNumber(Math.ceil(displayAmount / rows), 1, 120);
  }

  if (rows * columns < displayAmount) {
    rows = clampBoardNumber(Math.ceil(displayAmount / columns), 1, 120);
  }

  return {
    designWidth,
    designHeight,
    displayAmount,
    columns,
    rows,
  };
}

function shuffleTickets<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function resolveDrawSessionStatus(input: {
  activeCount: number;
  draftCount: number;
  plannedWinnerCount: number;
}) {
  if (input.activeCount === 0 && input.draftCount === 0) {
    return "draft" as const;
  }

  if (input.draftCount === 0 && input.activeCount >= input.plannedWinnerCount) {
    return "completed" as const;
  }

  return "active" as const;
}

const prizeCategorySchema = z.object({
  eventId: z.string(),
  name: z.string().min(2),
  quantity: z.number().int().min(1),
  description: z.string().optional(),
  displayImageUrl: z.string().optional(),
  boardSettings: prizeBoardSettingsSchema.default(defaultPrizeBoardSettings),
  displayMode: layoutModeSchema.default("grid"),
  animationPreset: luckyDrawAnimationPresetSchema.default("fade_pop"),
  animationSpeed: z.number().min(0.25).max(3).default(1),
  specialThemeId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const prizeBoardSettingsCommandSchema = z.object({
  prizeCategoryId: z.string(),
  boardSettings: prizeBoardSettingsSchema.default(defaultPrizeBoardSettings),
});

const prizeCategoryUpdateSchema = z.object({
  prizeCategoryId: z.string(),
  name: z.string().min(2),
  quantity: z.number().int().min(1),
  description: z.string().optional(),
  displayImageUrl: z.string().optional(),
  displayMode: layoutModeSchema.default("grid"),
  animationPreset: luckyDrawAnimationPresetSchema.default("fade_pop"),
  animationSpeed: z.number().min(0.25).max(3).default(1),
  specialThemeId: z.string().optional(),
});

const drawSessionSchema = z.object({
  eventId: z.string(),
  prizeCategoryId: z.string(),
  name: z.string().min(2),
  plannedWinnerCount: z.number().int().min(1),
  layoutMode: layoutModeSchema.default("grid"),
  gridItemCount: z.number().int().min(1).max(120).default(12),
  gridRows: z.number().int().min(1).max(120).optional(),
  gridCols: z.number().int().min(1).max(120).optional(),
  animationPresetOverride: luckyDrawAnimationPresetSchema.optional(),
  animationSpeedOverride: z.number().min(0.25).max(3).optional(),
  revealMode: z.enum(["manual", "digital_random"]).default("manual"),
});

const drawSessionUpdateSchema = z.object({
  drawSessionId: z.string(),
  prizeCategoryId: z.string(),
  name: z.string().min(2),
  plannedWinnerCount: z.number().int().min(1),
  layoutMode: layoutModeSchema.default("grid"),
  gridItemCount: z.number().int().min(1).max(120).default(12),
  gridRows: z.number().int().min(1).max(120).optional(),
  gridCols: z.number().int().min(1).max(120).optional(),
  animationPresetOverride: luckyDrawAnimationPresetSchema.optional(),
  animationSpeedOverride: z.number().min(0.25).max(3).optional(),
  revealMode: z.enum(["manual", "digital_random"]).default("manual"),
});

const revealSchema = z.object({
  eventId: z.string(),
  prizeCategoryId: z.string(),
  drawSessionId: z.string(),
  ticketNumber: z.string().min(1).optional(),
  revealSource: z.enum(["manual", "digital_random"]).default("manual"),
  note: z.string().optional(),
  redrawOfId: z.string().optional(),
});

const winnerMutationSchema = z.object({
  winnerId: z.string(),
  ticketNumber: z.string().optional(),
  note: z.string().optional(),
});

const simpleBoardCommandSchema = z.object({
  drawSessionId: z.string(),
  displayAmount: z.number().int().min(1).max(120).default(12),
  designWidth: z.number().int().min(320).max(7680).default(1920),
  designHeight: z.number().int().min(240).max(4320).default(1080),
  gridRows: z.number().int().min(1).max(120).optional(),
  gridCols: z.number().int().min(1).max(120).optional(),
});

const rollRandomWinnerBatchSchema = simpleBoardCommandSchema.extend({
  eventId: z.string(),
  prizeCategoryId: z.string(),
  drawAmount: z.number().int().min(1).max(100),
});

const drawSessionOnlySchema = z.object({
  drawSessionId: z.string(),
});

const winnerBoardMutationSchema = winnerMutationSchema.extend({
  displayAmount: z.number().int().min(1).max(120).default(12),
  designWidth: z.number().int().min(320).max(7680).default(1920),
  designHeight: z.number().int().min(240).max(4320).default(1080),
  gridRows: z.number().int().min(1).max(120).optional(),
  gridCols: z.number().int().min(1).max(120).optional(),
});

const simpleBoardSettingsSchema = simpleBoardCommandSchema.extend({
  prizeCategoryId: z.string(),
  animationPreset: luckyDrawAnimationPresetSchema.default("fade_pop"),
  animationSpeed: z.number().min(0.25).max(3).default(1),
  boardSettings: prizeBoardSettingsSchema,
});

async function publishLatestPrizeStateIfPresent(tx: DbClient, prizeCategoryId: string, eventId: string) {
  const activeSession = await tx.drawSession.findFirst({
    where: {
      prizeCategoryId,
      winners: {
        some: {
          status: {
            in: ACTIVE_WINNER_STATUSES,
          },
        },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
      { sessionOrder: "desc" },
    ],
  });

  if (!activeSession) {
    return null;
  }

  const state = await buildLuckyDrawState(tx, {
    eventId,
    prizeCategoryId,
    drawSessionId: activeSession.id,
  });

  await publishDisplayState(tx, state);
  return state;
}

async function audit(tx: DbClient, input: {
  eventId: string;
  actionType: AuditActionType;
  actor: string;
  targetType: string;
  targetId: string;
  payload?: Prisma.InputJsonValue;
  correlationId?: string;
  undoOfId?: string;
}) {
  return tx.auditLog.create({
    data: {
      eventId: input.eventId,
      moduleType: "lucky_draw",
      actionType: input.actionType,
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payload,
      correlationId: input.correlationId,
      undoOfId: input.undoOfId,
    },
  });
}

async function assertDuplicatePolicy(
  tx: DbClient,
  input: {
    eventId: string;
    prizeCategoryId: string;
    ticketNumber: string;
    ignoreWinnerId?: string;
  },
) {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: input.eventId },
  });

  const baseWhere = {
    eventId: input.eventId,
    ticketNumber: input.ticketNumber,
    status: {
      in: RESERVED_WINNER_STATUSES,
    },
    ...(input.ignoreWinnerId ? { id: { not: input.ignoreWinnerId } } : {}),
  } satisfies Prisma.WinnerWhereInput;

  if (event.duplicatePolicy === "event") {
    const duplicate = await tx.winner.findFirst({
      where: baseWhere,
    });

    if (duplicate) {
      throw new Error("This ticket number has already been used in the event.");
    }
  }

  if (event.duplicatePolicy === "category") {
    const duplicate = await tx.winner.findFirst({
      where: {
        ...baseWhere,
        prizeCategoryId: input.prizeCategoryId,
      },
    });

    if (duplicate) {
      throw new Error("This ticket number has already been used in this prize category.");
    }
  }

  return event;
}

async function selectRandomTickets(
  tx: DbClient,
  input: {
    eventId: string;
    prizeCategoryId: string;
    duplicatePolicy: DuplicatePolicy;
    count: number;
    excludeTicketNumbers?: string[];
  },
) {
  const candidates = await tx.ticketPool.findMany({
    where: {
      eventId: input.eventId,
      eligible: true,
    },
    select: {
      ticketNumber: true,
    },
    take: 20000,
  });

  if (candidates.length === 0) {
    throw new Error("No eligible tickets are available for digital random draw.");
  }

  const reservedWinners = await tx.winner.findMany({
    where: {
      eventId: input.eventId,
      status: {
        in: RESERVED_WINNER_STATUSES,
      },
    },
    select: {
      ticketNumber: true,
      prizeCategoryId: true,
    },
  });

  const eventLockedTickets = new Set(reservedWinners.map((winner) => winner.ticketNumber));
  const categoryLockedTickets = new Set(
    reservedWinners
      .filter((winner) => winner.prizeCategoryId === input.prizeCategoryId)
      .map((winner) => winner.ticketNumber),
  );
  const extraExcludedTickets = new Set(input.excludeTicketNumbers ?? []);
  const uniqueCandidateTickets = Array.from(new Set(candidates.map((candidate) => candidate.ticketNumber)));
  const availableCandidates = shuffleTickets(uniqueCandidateTickets).filter((ticketNumber) => {
    if (extraExcludedTickets.has(ticketNumber)) {
      return false;
    }

    if (input.duplicatePolicy === "event") {
      return !eventLockedTickets.has(ticketNumber);
    }

    if (input.duplicatePolicy === "category") {
      return !categoryLockedTickets.has(ticketNumber);
    }

    return true;
  });

  if (availableCandidates.length < input.count) {
    throw new Error(`Only ${availableCandidates.length} eligible ticket(s) remain for this draw.`);
  }

  return availableCandidates.slice(0, input.count);
}

async function buildLuckyDrawState(
  tx: DbClient,
  input: {
    eventId: string;
    prizeCategoryId: string;
    drawSessionId: string;
    latestWinningNumber?: string;
    cue?: string;
    scene?: LuckyDrawScene;
    replayToken?: number;
  },
) {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: input.eventId },
    include: {
      defaultTheme: true,
    },
  });
  const prize = await tx.prizeCategory.findUniqueOrThrow({
    where: { id: input.prizeCategoryId },
    include: {
      specialTheme: true,
    },
  });
  const session = await tx.drawSession.findUniqueOrThrow({
    where: { id: input.drawSessionId },
  });
  const screen = await ensurePrimaryDisplayScreen(tx, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "lucky_draw",
    themePresetId: prize.specialThemeId ?? event.defaultThemeId,
  });

  const winners = await tx.winner.findMany({
    where: {
      drawSessionId: session.id,
      status: {
        in: ACTIVE_WINNER_STATUSES,
      },
    },
    orderBy: {
      revealOrder: "asc",
    },
    select: {
      id: true,
      ticketNumber: true,
    },
  });
  const visibleSessionWinners = winners.slice(-session.gridItemCount);
  const board = calculateCleanBoard({
    designWidth: screen.designWidth,
    designHeight: screen.designHeight,
    displayAmount: session.gridItemCount,
    gridRows: session.gridRows ?? undefined,
    gridCols: session.gridCols ?? undefined,
  });
  const boardWinners = await tx.winner.findMany({
    where: {
      drawSessionId: session.id,
      status: {
        in: RESERVED_WINNER_STATUSES,
      },
    },
    orderBy: {
      revealOrder: "asc",
    },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
    },
  });
  const visibleCards = boardWinners.slice(-board.displayAmount).map((winner) => ({
    id: winner.id,
    ticketNumber: winner.status === "draft" ? undefined : winner.ticketNumber,
    status:
      winner.status === "draft"
        ? "rolling"
        : winner.status === "confirmed"
          ? "confirmed"
          : "revealed",
  }));
  const cards = [
    ...visibleCards,
    ...Array.from({ length: Math.max(0, board.displayAmount - visibleCards.length) }).map(() => ({
      status: "empty" as const,
    })),
  ];

  const allPrizeWinners = await tx.winner.findMany({
    where: {
      prizeCategoryId: prize.id,
      status: {
        in: ACTIVE_WINNER_STATUSES,
      },
    },
    orderBy: [
      { createdAt: "asc" },
      { revealOrder: "asc" },
    ],
    select: {
      id: true,
      ticketNumber: true,
    },
  });

  const categoryWinnerCount = await tx.winner.count({
    where: {
      prizeCategoryId: prize.id,
      status: {
        in: ACTIVE_WINNER_STATUSES,
      },
    },
  });

  let scene: LuckyDrawScene;
  if (input.scene) {
    scene = input.scene;
  } else {
    scene = winners.length === 0 ? "ready" : "revealed";
    if (categoryWinnerCount >= prize.quantity && winners.length > 0) {
      scene = "prize_complete";
    } else if (session.actualWinnerCount >= session.plannedWinnerCount && winners.length > 0) {
      scene = "session_complete";
    }
  }

  return luckyDrawDisplaySchema.parse({
    eventId: event.id,
    eventSlug: event.slug,
    screenKey: screen.screenKey,
    moduleType: "lucky_draw",
    revision: 0,
    displayMode: screen.displayMode,
    theme: mapThemePresetToConfig(prize.specialTheme ?? event.defaultTheme),
    publishedAt: new Date().toISOString(),
    scene,
    prizeCategoryId: prize.id,
    drawSessionId: session.id,
    prizeName: prize.name,
    prizeImageUrl: prize.displayImageUrl ?? undefined,
    latestWinningNumber: input.latestWinningNumber ?? winners.at(-1)?.ticketNumber,
    winners: visibleSessionWinners.map((winner, index) => ({
      id: winner.id,
      ticketNumber: winner.ticketNumber,
      emphasis: index === visibleSessionWinners.length - 1 ? "latest" : "standard",
    })),
    allPrizeWinners: allPrizeWinners.map((winner, index) => ({
      id: winner.id,
      ticketNumber: winner.ticketNumber,
      emphasis: index === allPrizeWinners.length - 1 ? "latest" : "standard",
    })),
    layoutMode: session.layoutMode,
    animationPreset: session.animationPresetOverride ?? prize.animationPreset,
    animationSpeed: session.animationSpeedOverride ?? prize.animationSpeed,
    grid: {
      itemCount: session.gridItemCount,
      rows: session.gridRows ?? undefined,
      cols: session.gridCols ?? undefined,
    },
    board,
    cards,
    progress: {
      planned: session.plannedWinnerCount,
      actual: session.actualWinnerCount,
    },
    prizeProgress: {
      planned: prize.quantity,
      actual: categoryWinnerCount,
    },
    prizeBoardSettings: prizeBoardSettingsSchema.parse(prize.boardSettings ?? defaultPrizeBoardSettings),
    cue: input.cue ?? (scene === "ready" ? "Stage manual reveal is ready." : "Winner synced to public display."),
    replayToken: input.replayToken ?? Date.now(),
  });
}

async function revealWinnerTx(
  tx: DbClient,
  input: z.infer<typeof revealSchema> & { actor: string },
) {
  const sessionBefore = await tx.drawSession.findUniqueOrThrow({
    where: { id: input.drawSessionId },
  });

  if (sessionBefore.actualWinnerCount >= sessionBefore.plannedWinnerCount) {
    throw new Error("This session already reached its planned winner count.");
  }

  const event = await assertDuplicatePolicy(tx, {
    eventId: input.eventId,
    prizeCategoryId: input.prizeCategoryId,
    ticketNumber: input.ticketNumber!,
  });

  const simpleDrawNumber = isSimpleDrawPrizeCategoryId(input.prizeCategoryId) ? normalizeSimpleDrawNumber(input.ticketNumber!) : null;
  const ticketFormat = ticketFormatSchema.parse(event.ticketFormat);
  const validatedTicket = simpleDrawNumber
    ? { normalized: simpleDrawNumber, valid: Boolean(simpleDrawNumber), issues: ["Ticket number is required."] }
    : validateTicketNumber(input.ticketNumber!, ticketFormat);
  if (!validatedTicket.valid) {
    throw new Error(validatedTicket.issues[0] ?? "Invalid ticket number.");
  }

  const session = await tx.drawSession.update({
    where: { id: input.drawSessionId },
    data: {
      actualWinnerCount: {
        increment: 1,
      },
      lastRevealOrder: {
        increment: 1,
      },
      revision: {
        increment: 1,
      },
      status: sessionBefore.actualWinnerCount + 1 >= sessionBefore.plannedWinnerCount ? "completed" : "active",
    },
  });

  const winner = await tx.winner.create({
    data: {
      eventId: input.eventId,
      prizeCategoryId: input.prizeCategoryId,
      drawSessionId: input.drawSessionId,
      ticketNumber: validatedTicket.normalized,
      revealOrder: session.lastRevealOrder,
      status: "revealed",
      revealSource: input.revealSource,
      notes: input.note || null,
      redrawOfId: input.redrawOfId || null,
    },
  });

  await audit(tx, {
    eventId: input.eventId,
    actionType: "winner_revealed",
    actor: input.actor,
    targetType: "winner",
    targetId: winner.id,
    payload: {
      drawSessionId: winner.drawSessionId,
      prizeCategoryId: winner.prizeCategoryId,
      ticketNumber: winner.ticketNumber,
      revealSource: winner.revealSource,
    },
  });

  const state = await buildLuckyDrawState(tx, {
    eventId: input.eventId,
    prizeCategoryId: input.prizeCategoryId,
    drawSessionId: input.drawSessionId,
    latestWinningNumber: winner.ticketNumber,
    scene: "revealed",
  });

  await publishDisplayState(tx, state);

  return {
    winner,
    state,
  };
}

export async function createPrizeCategory(input: z.input<typeof prizeCategorySchema>, actor: string) {
  const payload = prizeCategorySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const currentMaxSort = await tx.prizeCategory.aggregate({
      where: { eventId: payload.eventId },
      _max: {
        sortOrder: true,
      },
    });

    const prize = await tx.prizeCategory.create({
      data: {
        eventId: payload.eventId,
        name: payload.name,
        quantity: payload.quantity,
        displayImageUrl: payload.displayImageUrl || null,
        boardSettings: JSON.parse(JSON.stringify(payload.boardSettings)) as Prisma.InputJsonValue,
        description: payload.description || null,
        displayMode: payload.displayMode,
        animationPreset: payload.animationPreset,
        animationSpeed: payload.animationSpeed,
        specialThemeId: payload.specialThemeId || null,
        sortOrder: payload.sortOrder ?? (currentMaxSort._max.sortOrder ?? -1) + 1,
      },
    });

    await audit(tx, {
      eventId: payload.eventId,
      actionType: "prize_created",
      actor,
      targetType: "prize_category",
      targetId: prize.id,
      payload: {
        quantity: prize.quantity,
        displayMode: prize.displayMode,
        displayImageUrl: prize.displayImageUrl,
        boardSettings: payload.boardSettings,
      },
    });

    return prize;
  });
}

export async function updatePrizeBoardSettings(input: z.input<typeof prizeBoardSettingsCommandSchema>, actor: string) {
  const payload = prizeBoardSettingsCommandSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const prize = await tx.prizeCategory.update({
      where: { id: payload.prizeCategoryId },
      data: {
        boardSettings: JSON.parse(JSON.stringify(payload.boardSettings)) as Prisma.InputJsonValue,
      },
    });

    await audit(tx, {
      eventId: prize.eventId,
      actionType: "prize_updated",
      actor,
      targetType: "prize_category",
      targetId: prize.id,
      payload: {
        boardSettings: payload.boardSettings,
      },
    });

    await publishLatestPrizeStateIfPresent(tx, prize.id, prize.eventId);

    return prize;
  });
}

export async function updatePrizeCategory(input: z.input<typeof prizeCategoryUpdateSchema>, actor: string) {
  const payload = prizeCategoryUpdateSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: payload.prizeCategoryId },
    });

    const winnerCount = await tx.winner.count({
      where: {
        prizeCategoryId: prize.id,
        status: {
          in: ACTIVE_WINNER_STATUSES,
        },
      },
    });

    if (payload.quantity < winnerCount) {
      throw new Error(`This category already has ${winnerCount} revealed winner(s). Increase the quantity or reduce winners first.`);
    }

    const updatedPrize = await tx.prizeCategory.update({
      where: { id: payload.prizeCategoryId },
      data: {
        name: payload.name,
        quantity: payload.quantity,
        description: payload.description || null,
        displayImageUrl: payload.displayImageUrl || null,
        displayMode: payload.displayMode,
        animationPreset: payload.animationPreset,
        animationSpeed: payload.animationSpeed,
        specialThemeId: payload.specialThemeId || null,
      },
    });

    await audit(tx, {
      eventId: updatedPrize.eventId,
      actionType: "prize_updated",
      actor,
      targetType: "prize_category",
      targetId: updatedPrize.id,
      payload: {
        name: updatedPrize.name,
        quantity: updatedPrize.quantity,
        displayMode: updatedPrize.displayMode,
        animationPreset: updatedPrize.animationPreset,
        animationSpeed: updatedPrize.animationSpeed,
        specialThemeId: updatedPrize.specialThemeId,
      },
    });

    await publishLatestPrizeStateIfPresent(tx, updatedPrize.id, updatedPrize.eventId);

    return updatedPrize;
  });
}

export async function deletePrizeCategory(prizeCategoryId: string, actor: string) {
  return prisma.$transaction(async (tx) => {
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: prizeCategoryId },
      include: {
        drawSessions: {
          select: {
            id: true,
            actualWinnerCount: true,
          },
        },
      },
    });

    const winnerCount = await tx.winner.count({
      where: {
        prizeCategoryId,
        status: {
          in: ACTIVE_WINNER_STATUSES,
        },
      },
    });

    if (winnerCount > 0 || prize.drawSessions.some((session) => session.actualWinnerCount > 0)) {
      throw new Error("This category already has revealed winners. Clear those winners first before deleting the category.");
    }

    await tx.prizeCategory.delete({
      where: { id: prizeCategoryId },
    });

    await audit(tx, {
      eventId: prize.eventId,
      actionType: "prize_updated",
      actor,
      targetType: "prize_category",
      targetId: prize.id,
      payload: {
        deleted: true,
        name: prize.name,
      },
    });

    return prize;
  });
}

export async function createDrawSession(input: z.input<typeof drawSessionSchema>, actor: string) {
  const payload = drawSessionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const currentMaxOrder = await tx.drawSession.aggregate({
      where: { eventId: payload.eventId },
      _max: {
        sessionOrder: true,
      },
    });

    const session = await tx.drawSession.create({
      data: {
        eventId: payload.eventId,
        prizeCategoryId: payload.prizeCategoryId,
        name: payload.name,
        sessionOrder: (currentMaxOrder._max.sessionOrder ?? 0) + 1,
        plannedWinnerCount: payload.plannedWinnerCount,
        layoutMode: payload.layoutMode,
        gridItemCount: payload.gridItemCount,
        gridRows: payload.gridRows ?? null,
        gridCols: payload.gridCols ?? null,
        animationPresetOverride: payload.animationPresetOverride,
        animationSpeedOverride: payload.animationSpeedOverride,
        revealMode: payload.revealMode,
      },
    });

    await audit(tx, {
      eventId: payload.eventId,
      actionType: "session_created",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        plannedWinnerCount: session.plannedWinnerCount,
        layoutMode: session.layoutMode,
      },
    });

    return session;
  });
}

export async function updateDrawSession(input: z.input<typeof drawSessionUpdateSchema>, actor: string) {
  const payload = drawSessionUpdateSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: payload.drawSessionId },
    });

    if (payload.plannedWinnerCount < session.actualWinnerCount) {
      throw new Error(`This session already has ${session.actualWinnerCount} revealed winner(s). Increase the planned winners or reduce the session history first.`);
    }

    const winnerCount = await tx.winner.count({
      where: {
        drawSessionId: session.id,
        status: {
          in: ACTIVE_WINNER_STATUSES,
        },
      },
    });

    if (winnerCount > 0 && payload.prizeCategoryId !== session.prizeCategoryId) {
      throw new Error("This session already has revealed winners, so its prize category cannot be changed.");
    }

    const updatedSession = await tx.drawSession.update({
      where: { id: payload.drawSessionId },
      data: {
        prizeCategoryId: payload.prizeCategoryId,
        name: payload.name,
        plannedWinnerCount: payload.plannedWinnerCount,
        layoutMode: payload.layoutMode,
        gridItemCount: payload.gridItemCount,
        gridRows: payload.gridRows ?? null,
        gridCols: payload.gridCols ?? null,
        animationPresetOverride: payload.animationPresetOverride ?? null,
        animationSpeedOverride: payload.animationSpeedOverride ?? null,
        revealMode: payload.revealMode,
        status:
          session.actualWinnerCount === 0
            ? "draft"
            : session.actualWinnerCount >= payload.plannedWinnerCount
              ? "completed"
              : "active",
      },
    });

    await audit(tx, {
      eventId: updatedSession.eventId,
      actionType: "session_updated",
      actor,
      targetType: "draw_session",
      targetId: updatedSession.id,
      payload: {
        name: updatedSession.name,
        plannedWinnerCount: updatedSession.plannedWinnerCount,
        layoutMode: updatedSession.layoutMode,
        gridItemCount: updatedSession.gridItemCount,
        prizeCategoryId: updatedSession.prizeCategoryId,
      },
    });

    if (winnerCount > 0) {
      const state = await buildLuckyDrawState(tx, {
        eventId: updatedSession.eventId,
        prizeCategoryId: updatedSession.prizeCategoryId,
        drawSessionId: updatedSession.id,
      });

      await publishDisplayState(tx, state);
    }

    return updatedSession;
  });
}

export async function deleteDrawSession(drawSessionId: string, actor: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: drawSessionId },
    });

    const winnerCount = await tx.winner.count({
      where: {
        drawSessionId,
        status: {
          in: ACTIVE_WINNER_STATUSES,
        },
      },
    });

    if (winnerCount > 0 || session.actualWinnerCount > 0) {
      throw new Error("This session already has revealed winners. Clear those winners first before deleting the session.");
    }

    await tx.drawSession.delete({
      where: { id: drawSessionId },
    });

    await audit(tx, {
      eventId: session.eventId,
      actionType: "session_updated",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        deleted: true,
        name: session.name,
      },
    });

    return session;
  });
}

export async function revealWinner(input: z.input<typeof revealSchema>, actor: string) {
  const payload = revealSchema.extend({ ticketNumber: z.string().min(1) }).parse(input);

  return revealWinnerTx(prisma, {
    ...payload,
    actor,
  });
}

export async function drawRandomWinner(input: Omit<z.input<typeof revealSchema>, "ticketNumber">, actor: string) {
  const payload = revealSchema.omit({ ticketNumber: true }).parse(input);

  const event = await prisma.event.findUniqueOrThrow({
    where: { id: payload.eventId },
  });
  const candidates = await prisma.ticketPool.findMany({
    where: {
      eventId: payload.eventId,
      eligible: true,
    },
    select: {
      ticketNumber: true,
    },
    take: 5000,
  });

  if (candidates.length === 0) {
    throw new Error("No eligible tickets are available for digital random draw.");
  }

  const activeWinners = await prisma.winner.findMany({
    where: {
      eventId: payload.eventId,
      status: {
        in: RESERVED_WINNER_STATUSES,
      },
    },
    select: {
      ticketNumber: true,
      prizeCategoryId: true,
    },
  });
  const eventLockedTickets = new Set(activeWinners.map((winner) => winner.ticketNumber));
  const categoryLockedTickets = new Set(
    activeWinners
      .filter((winner) => winner.prizeCategoryId === payload.prizeCategoryId)
      .map((winner) => winner.ticketNumber),
  );

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const availableCandidates = shuffled.filter((candidate) => {
    if (event.duplicatePolicy === "event") {
      return !eventLockedTickets.has(candidate.ticketNumber);
    }

    if (event.duplicatePolicy === "category") {
      return !categoryLockedTickets.has(candidate.ticketNumber);
    }

    return true;
  });
  const selectedTicket = availableCandidates[0]?.ticketNumber ?? null;

  if (!selectedTicket) {
    throw new Error("No eligible tickets remain under the current duplicate policy.");
  }

  return revealWinner(
    {
      ...payload,
      ticketNumber: selectedTicket,
      revealSource: "digital_random",
    },
    actor,
  );
}

export async function rollRandomWinnerBatch(input: z.input<typeof rollRandomWinnerBatchSchema>, actor: string) {
  const payload = rollRandomWinnerBatchSchema.parse(input);
  const board = calculateCleanBoard({
    ...payload,
    displayAmount: Math.max(payload.displayAmount, payload.drawAmount),
  });

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({
      where: { id: payload.eventId },
    });
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: payload.prizeCategoryId },
    });
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: payload.drawSessionId },
    });

    if (prize.eventId !== event.id || session.eventId !== event.id || session.prizeCategoryId !== prize.id) {
      throw new Error("The selected event, prize, and session do not match.");
    }

    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "lucky_draw",
      themePresetId: prize.specialThemeId ?? event.defaultThemeId,
      displayMode: "fullscreen",
      designWidth: board.designWidth,
      designHeight: board.designHeight,
    });

    const selectedTickets = await selectRandomTickets(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      duplicatePolicy: event.duplicatePolicy,
      count: payload.drawAmount,
    });
    const [reservedSessionCount, reservedPrizeCount] = await Promise.all([
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: {
            in: RESERVED_WINNER_STATUSES,
          },
        },
      }),
      tx.winner.count({
        where: {
          prizeCategoryId: prize.id,
          status: {
            in: RESERVED_WINNER_STATUSES,
          },
        },
      }),
    ]);

    const nextSessionPlannedCount = Math.max(session.plannedWinnerCount, reservedSessionCount + selectedTickets.length);
    const nextPrizeQuantity = Math.max(prize.quantity, reservedPrizeCount + selectedTickets.length);

    if (nextPrizeQuantity !== prize.quantity) {
      await tx.prizeCategory.update({
        where: { id: prize.id },
        data: {
          quantity: nextPrizeQuantity,
        },
      });
    }

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        plannedWinnerCount: nextSessionPlannedCount,
        gridItemCount: board.displayAmount,
        gridRows: board.rows,
        gridCols: board.columns,
        lastRevealOrder: {
          increment: selectedTickets.length,
        },
        revision: {
          increment: 1,
        },
        status: "active",
      },
    });

    const winners = [];
    for (const [index, ticketNumber] of selectedTickets.entries()) {
      winners.push(
        await tx.winner.create({
          data: {
            eventId: event.id,
            prizeCategoryId: prize.id,
            drawSessionId: session.id,
            ticketNumber,
            revealOrder: session.lastRevealOrder + index + 1,
            status: "draft",
            revealSource: "digital_random",
          },
        }),
      );
    }

    await audit(tx, {
      eventId: event.id,
      actionType: "display_published",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        action: "roll_random_winner_batch",
        drawAmount: winners.length,
        displayAmount: board.displayAmount,
        designWidth: board.designWidth,
        designHeight: board.designHeight,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      drawSessionId: session.id,
      scene: "revealing",
      cue: `${winners.length} winning card${winners.length === 1 ? "" : "s"} rolling.`,
    });

    await publishDisplayState(tx, state);

    return {
      winners,
      state,
    };
  });
}

export async function updateSimpleDrawBoardSettings(input: z.input<typeof simpleBoardSettingsSchema>, actor: string) {
  const payload = simpleBoardSettingsSchema.parse(input);
  const board = calculateCleanBoard(payload);

  return prisma.$transaction(async (tx) => {
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: payload.drawSessionId },
    });
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: payload.prizeCategoryId },
    });
    const event = await tx.event.findUniqueOrThrow({
      where: { id: session.eventId },
    });

    if (session.prizeCategoryId !== prize.id) {
      throw new Error("The selected session does not belong to this prize.");
    }

    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "lucky_draw",
      themePresetId: prize.specialThemeId ?? event.defaultThemeId,
      displayMode: "fullscreen",
      designWidth: board.designWidth,
      designHeight: board.designHeight,
    });

    await tx.prizeCategory.update({
      where: { id: prize.id },
      data: {
        animationPreset: payload.animationPreset,
        animationSpeed: payload.animationSpeed,
        boardSettings: JSON.parse(JSON.stringify(payload.boardSettings)) as Prisma.InputJsonValue,
      },
    });

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        gridItemCount: board.displayAmount,
        gridRows: board.rows,
        gridCols: board.columns,
        animationPresetOverride: payload.animationPreset,
        animationSpeedOverride: payload.animationSpeed,
        revision: {
          increment: 1,
        },
      },
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "display_published",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        action: "update_simple_draw_board_settings",
        displayAmount: board.displayAmount,
        designWidth: board.designWidth,
        designHeight: board.designHeight,
        animationPreset: payload.animationPreset,
        animationSpeed: payload.animationSpeed,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      drawSessionId: session.id,
      cue: "Clean board settings updated.",
      replayToken: Date.now(),
    });

    await publishDisplayState(tx, state);
    return state;
  });
}

export async function resetSimpleDrawSession(input: z.input<typeof simpleBoardCommandSchema>, actor: string) {
  const payload = simpleBoardCommandSchema.parse(input);
  const board = calculateCleanBoard(payload);

  return prisma.$transaction(async (tx) => {
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: payload.drawSessionId },
    });
    const event = await tx.event.findUniqueOrThrow({
      where: { id: session.eventId },
    });
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: session.prizeCategoryId },
    });

    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "lucky_draw",
      themePresetId: prize.specialThemeId ?? event.defaultThemeId,
      displayMode: "fullscreen",
      designWidth: board.designWidth,
      designHeight: board.designHeight,
    });

    const deletedCount = await tx.winner.count({
      where: {
        drawSessionId: session.id,
      },
    });

    await tx.winner.deleteMany({
      where: {
        drawSessionId: session.id,
      },
    });

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: 0,
        lastRevealOrder: 0,
        gridItemCount: board.displayAmount,
        gridRows: board.rows,
        gridCols: board.columns,
        revision: {
          increment: 1,
        },
        status: "draft",
      },
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "display_published",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        action: "reset_simple_draw_session",
        deletedCount,
        displayAmount: board.displayAmount,
        designWidth: board.designWidth,
        designHeight: board.designHeight,
        gridRows: board.rows,
        gridCols: board.columns,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      drawSessionId: session.id,
      scene: "ready",
      cue: "Draw reset. The board is clear.",
      replayToken: Date.now(),
    });

    await publishDisplayState(tx, state);
    return state;
  });
}

export async function revealNextDraftWinner(input: z.input<typeof drawSessionOnlySchema>, actor: string) {
  const payload = drawSessionOnlySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findFirst({
      where: {
        drawSessionId: payload.drawSessionId,
        status: "draft",
      },
      orderBy: {
        revealOrder: "asc",
      },
    });

    if (!winner) {
      throw new Error("There are no rolling winners waiting to reveal.");
    }

    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: winner.drawSessionId },
    });

    const updatedWinner = await tx.winner.update({
      where: { id: winner.id },
      data: {
        status: "revealed",
      },
    });
    const [activeCount, draftCount] = await Promise.all([
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: {
            in: ACTIVE_WINNER_STATUSES,
          },
        },
      }),
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: "draft",
        },
      }),
    ]);

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: activeCount,
        revision: {
          increment: 1,
        },
        status: resolveDrawSessionStatus({
          activeCount,
          draftCount,
          plannedWinnerCount: session.plannedWinnerCount,
        }),
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_revealed",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        drawSessionId: winner.drawSessionId,
        prizeCategoryId: winner.prizeCategoryId,
        ticketNumber: winner.ticketNumber,
        revealSource: winner.revealSource,
        batchReveal: true,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      latestWinningNumber: updatedWinner.ticketNumber,
      scene: "revealed",
      cue: draftCount > 0 ? `${draftCount} rolling card${draftCount === 1 ? "" : "s"} still waiting.` : "All rolling cards have been revealed.",
    });

    await publishDisplayState(tx, state);

    return {
      winner: updatedWinner,
      state,
    };
  });
}

export async function validateWinner(input: z.input<typeof winnerMutationSchema>, actor: string) {
  const payload = winnerMutationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });

    if (winner.status === "draft") {
      throw new Error("Reveal this rolling card before validating it.");
    }

    if (winner.status !== "revealed" && winner.status !== "confirmed") {
      throw new Error("Only revealed winners can be validated.");
    }

    const updatedWinner = await tx.winner.update({
      where: { id: winner.id },
      data: {
        status: "confirmed",
        notes: payload.note || winner.notes,
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_edited",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        ticketNumber: winner.ticketNumber,
        status: "confirmed",
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      latestWinningNumber: winner.ticketNumber,
      cue: "Winner validated.",
    });

    await publishDisplayState(tx, state);
    return updatedWinner;
  });
}

export async function deleteWinner(input: z.input<typeof winnerMutationSchema>, actor: string) {
  const payload = winnerMutationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: winner.drawSessionId },
    });

    await tx.winner.delete({
      where: { id: winner.id },
    });

    const [activeCount, draftCount] = await Promise.all([
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: {
            in: ACTIVE_WINNER_STATUSES,
          },
        },
      }),
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: "draft",
        },
      }),
    ]);

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: activeCount,
        revision: {
          increment: 1,
        },
        status: resolveDrawSessionStatus({
          activeCount,
          draftCount,
          plannedWinnerCount: session.plannedWinnerCount,
        }),
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_deleted",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        ticketNumber: winner.ticketNumber,
        previousStatus: winner.status,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      cue: "Winner deleted from the live board.",
    });

    await publishDisplayState(tx, state);
    return state;
  });
}

export async function redrawWinnerRandom(input: z.input<typeof winnerBoardMutationSchema>, actor: string) {
  const payload = winnerBoardMutationSchema.parse(input);
  const board = calculateCleanBoard(payload);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: winner.drawSessionId },
    });
    const event = await tx.event.findUniqueOrThrow({
      where: { id: winner.eventId },
    });
    const prize = await tx.prizeCategory.findUniqueOrThrow({
      where: { id: winner.prizeCategoryId },
    });

    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "lucky_draw",
      themePresetId: prize.specialThemeId ?? event.defaultThemeId,
      displayMode: "fullscreen",
      designWidth: board.designWidth,
      designHeight: board.designHeight,
    });

    await tx.winner.update({
      where: { id: winner.id },
      data: {
        status: "redrawn",
        notes: payload.note || winner.notes,
      },
    });

    const selectedTickets = await selectRandomTickets(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      duplicatePolicy: event.duplicatePolicy,
      count: 1,
      excludeTicketNumbers: [winner.ticketNumber],
    });
    const replacementTicket = selectedTickets[0];
    const reservedSessionCount = await tx.winner.count({
      where: {
        drawSessionId: session.id,
        status: {
          in: RESERVED_WINNER_STATUSES,
        },
      },
    });
    const reservedPrizeCount = await tx.winner.count({
      where: {
        prizeCategoryId: prize.id,
        status: {
          in: RESERVED_WINNER_STATUSES,
        },
      },
    });
    const nextSessionPlannedCount = Math.max(session.plannedWinnerCount, reservedSessionCount + 1);
    const nextPrizeQuantity = Math.max(prize.quantity, reservedPrizeCount + 1);

    if (nextPrizeQuantity !== prize.quantity) {
      await tx.prizeCategory.update({
        where: { id: prize.id },
        data: {
          quantity: nextPrizeQuantity,
        },
      });
    }

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        plannedWinnerCount: nextSessionPlannedCount,
        gridItemCount: board.displayAmount,
        gridRows: board.rows,
        gridCols: board.columns,
        lastRevealOrder: {
          increment: 1,
        },
        actualWinnerCount: await tx.winner.count({
          where: {
            drawSessionId: session.id,
            status: {
              in: ACTIVE_WINNER_STATUSES,
            },
          },
        }),
        revision: {
          increment: 1,
        },
        status: "active",
      },
    });

    const replacementWinner = await tx.winner.create({
      data: {
        eventId: event.id,
        prizeCategoryId: prize.id,
        drawSessionId: session.id,
        ticketNumber: replacementTicket,
        revealOrder: session.lastRevealOrder + 1,
        status: "draft",
        revealSource: "digital_random",
        redrawOfId: winner.id,
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_redrawn",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        previousTicketNumber: winner.ticketNumber,
        replacementWinnerId: replacementWinner.id,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: event.id,
      prizeCategoryId: prize.id,
      drawSessionId: session.id,
      scene: "revealing",
      cue: "Replacement card is rolling.",
    });

    await publishDisplayState(tx, state);

    return {
      winner: replacementWinner,
      state,
    };
  });
}

export async function cancelPendingRoll(input: z.input<typeof drawSessionOnlySchema>, actor: string) {
  const payload = drawSessionOnlySchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: payload.drawSessionId },
    });
    const pendingWinners = await tx.winner.findMany({
      where: {
        drawSessionId: session.id,
        status: "draft",
      },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    if (pendingWinners.length === 0) {
      throw new Error("There are no rolling cards to cancel.");
    }

    await tx.winner.updateMany({
      where: {
        id: {
          in: pendingWinners.map((winner) => winner.id),
        },
      },
      data: {
        status: "deleted",
      },
    });

    const [activeCount, draftCount] = await Promise.all([
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: {
            in: ACTIVE_WINNER_STATUSES,
          },
        },
      }),
      tx.winner.count({
        where: {
          drawSessionId: session.id,
          status: "draft",
        },
      }),
    ]);

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: activeCount,
        revision: {
          increment: 1,
        },
        status: resolveDrawSessionStatus({
          activeCount,
          draftCount,
          plannedWinnerCount: session.plannedWinnerCount,
        }),
      },
    });

    await audit(tx, {
      eventId: session.eventId,
      actionType: "display_published",
      actor,
      targetType: "draw_session",
      targetId: session.id,
      payload: {
        action: "cancel_pending_roll",
        cancelledCount: pendingWinners.length,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: session.eventId,
      prizeCategoryId: session.prizeCategoryId,
      drawSessionId: session.id,
      cue: "Pending rolling cards were cancelled.",
    });

    await publishDisplayState(tx, state);
    return state;
  });
}

export async function invalidateWinner(input: z.input<typeof winnerMutationSchema>, actor: string) {
  const payload = winnerMutationSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });

    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: winner.drawSessionId },
    });

    await tx.winner.update({
      where: { id: winner.id },
      data: {
        status: "invalid",
        notes: payload.note || winner.notes,
      },
    });

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: {
          decrement: session.actualWinnerCount > 0 ? 1 : 0,
        },
        revision: {
          increment: 1,
        },
        status: session.actualWinnerCount > 1 ? "active" : "draft",
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_invalidated",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        ticketNumber: winner.ticketNumber,
        note: payload.note ?? null,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      scene: "revealed",
      cue: "Winner invalidated. Grid and history were refreshed.",
    });

    await publishDisplayState(tx, state);
    return state;
  });
}

export async function editWinnerTicket(input: z.input<typeof winnerMutationSchema>, actor: string) {
  const payload = winnerMutationSchema.extend({ ticketNumber: z.string().min(1) }).parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });
    const event = await tx.event.findUniqueOrThrow({
      where: { id: winner.eventId },
    });
    const simpleDrawNumber = isSimpleDrawPrizeCategoryId(winner.prizeCategoryId) ? normalizeSimpleDrawNumber(payload.ticketNumber) : null;
    const ticketFormat = ticketFormatSchema.parse(event.ticketFormat);
    const validatedTicket = simpleDrawNumber
      ? { normalized: simpleDrawNumber, valid: Boolean(simpleDrawNumber), issues: ["Ticket number is required."] }
      : validateTicketNumber(payload.ticketNumber, ticketFormat);
    if (!validatedTicket.valid) {
      throw new Error(validatedTicket.issues[0] ?? "Invalid ticket number.");
    }

    await assertDuplicatePolicy(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      ticketNumber: validatedTicket.normalized,
      ignoreWinnerId: winner.id,
    });

    const updatedWinner = await tx.winner.update({
      where: { id: winner.id },
      data: {
        ticketNumber: validatedTicket.normalized,
        notes: payload.note || winner.notes,
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_edited",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        ticketNumber: updatedWinner.ticketNumber,
      },
    });

    const state = await buildLuckyDrawState(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      latestWinningNumber: updatedWinner.ticketNumber,
      cue: "Winner record edited and synced.",
    });

    await publishDisplayState(tx, state);
    return updatedWinner;
  });
}

export async function redrawWinner(input: z.input<typeof winnerMutationSchema> & { ticketNumber: string }, actor: string) {
  const payload = winnerMutationSchema.extend({ ticketNumber: z.string().min(1) }).parse(input);

  return prisma.$transaction(async (tx) => {
    const winner = await tx.winner.findUniqueOrThrow({
      where: { id: payload.winnerId },
    });
    const session = await tx.drawSession.findUniqueOrThrow({
      where: { id: winner.drawSessionId },
    });

    await tx.winner.update({
      where: { id: winner.id },
      data: {
        status: "redrawn",
        notes: payload.note || winner.notes,
      },
    });

    await tx.drawSession.update({
      where: { id: session.id },
      data: {
        actualWinnerCount: {
          decrement: session.actualWinnerCount > 0 ? 1 : 0,
        },
        revision: {
          increment: 1,
        },
        status: "active",
      },
    });

    await audit(tx, {
      eventId: winner.eventId,
      actionType: "winner_redrawn",
      actor,
      targetType: "winner",
      targetId: winner.id,
      payload: {
        previousTicketNumber: winner.ticketNumber,
      },
    });

    return revealWinnerTx(tx, {
      eventId: winner.eventId,
      prizeCategoryId: winner.prizeCategoryId,
      drawSessionId: winner.drawSessionId,
      ticketNumber: payload.ticketNumber,
      revealSource: "manual",
      actor,
      redrawOfId: winner.id,
    });
  });
}

export async function undoLastReveal(drawSessionId: string, actor: string) {
  const winner = await prisma.winner.findFirst({
    where: {
      drawSessionId,
      status: {
        in: ACTIVE_WINNER_STATUSES,
      },
    },
    orderBy: {
      revealOrder: "desc",
    },
  });

  if (!winner) {
    throw new Error("There is no reveal to undo for this session.");
  }

  const session = await prisma.drawSession.findUniqueOrThrow({
    where: { id: drawSessionId },
  });

  await prisma.winner.update({
    where: { id: winner.id },
    data: {
      status: "deleted",
    },
  });

  await prisma.drawSession.update({
    where: { id: drawSessionId },
    data: {
      actualWinnerCount: {
        decrement: session.actualWinnerCount > 0 ? 1 : 0,
      },
      revision: {
        increment: 1,
      },
      status: session.actualWinnerCount > 1 ? "active" : "draft",
    },
  });

  await audit(prisma, {
    eventId: winner.eventId,
    actionType: "winner_deleted",
    actor,
    targetType: "winner",
    targetId: winner.id,
    payload: {
      ticketNumber: winner.ticketNumber,
    },
  });

  const state = await buildLuckyDrawState(prisma, {
    eventId: winner.eventId,
    prizeCategoryId: winner.prizeCategoryId,
    drawSessionId: winner.drawSessionId,
    cue: "Last reveal was undone.",
  });

  await publishDisplayState(prisma, state);
  return state;
}

export async function replayLuckyDrawAnimation(drawSessionId: string, actor: string) {
  const session = await prisma.drawSession.findUniqueOrThrow({
    where: { id: drawSessionId },
  });
  const prize = await prisma.prizeCategory.findUniqueOrThrow({
    where: { id: session.prizeCategoryId },
  });

  const state = await buildLuckyDrawState(prisma, {
    eventId: session.eventId,
    prizeCategoryId: prize.id,
    drawSessionId,
    scene: "revealing",
    cue: "Replay animation triggered.",
    replayToken: Date.now(),
  });

  await publishDisplayState(prisma, state);
  await audit(prisma, {
    eventId: session.eventId,
    actionType: "display_published",
    actor,
    targetType: "draw_session",
    targetId: drawSessionId,
    payload: {
      scene: "revealing",
      replay: true,
    },
  });

  return state;
}

export async function clearLuckyDrawDisplay(eventId: string, actor: string) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      defaultTheme: true,
    },
  });
  const screen = await ensurePrimaryDisplayScreen(prisma, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "lucky_draw",
    themePresetId: event.defaultThemeId,
  });

  const state = buildIdleLuckyDrawDisplay({
    eventId: event.id,
    eventSlug: event.slug,
    screenKey: screen.screenKey,
    displayMode: screen.displayMode,
    theme: event.defaultTheme,
  });

  await publishDisplayState(prisma, {
    ...state,
    scene: "idle",
  });

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

export type { LuckyDrawDisplayEnvelope };
