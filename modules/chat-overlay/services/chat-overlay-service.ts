import { createHash } from "crypto";
import type { PrismaClient, Event, ThemePreset } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildIdleChatOverlayDisplay,
  ensurePrimaryDisplayScreen,
  mapThemePresetToConfig,
  parseEventSettings,
  publishDisplayState,
} from "@/modules/shared/services/display-state-service";
import { chatOverlayDisplaySchema } from "@/modules/shared/schemas/display";
import { classifyMessageContent } from "@/modules/chat-overlay/lib/filter";

const publicMessageSchema = z.object({
  senderName: z.string().trim().max(60).optional().transform((value) => (value ? value : undefined)),
  content: z.string().trim().min(1).max(500),
});

const messageActionSchema = z.object({
  messageId: z.string().min(1),
  actor: z.string().trim().min(1),
});

const banInputSchema = z.object({
  messageId: z.string().min(1),
  actor: z.string().trim().min(1),
  reason: z.string().trim().max(160).optional(),
});

const clearInputSchema = z.object({
  eventId: z.string().min(1),
  actor: z.string().trim().min(1),
});

const testInputSchema = z.object({
  eventId: z.string().min(1),
  actor: z.string().trim().min(1),
  senderName: z.string().trim().max(60).optional(),
  content: z.string().trim().min(1).max(160).optional(),
});

const cooldownBySource = new Map<string, number>();

type DbClient = Prisma.TransactionClient | PrismaClient;

type EventWithTheme = Event & { defaultTheme: ThemePreset | null };

async function audit(
  db: DbClient,
  input: {
    eventId: string;
    actionType:
      | "chat_message_received"
      | "chat_message_approved"
      | "chat_message_rejected"
      | "chat_message_deleted"
      | "chat_sender_banned"
      | "chat_overlay_cleared"
      | "chat_test_message_created";
    actor: string;
    targetType: string;
    targetId: string;
    payload?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      eventId: input.eventId,
      moduleType: "chat_overlay",
      actionType: input.actionType,
      actor: input.actor,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payload,
    },
  });
}

function hashSource(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex");
}

export function getRequestSourceHash(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim();
  return hashSource([forwardedFor, realIp, userAgent, "chat-overlay"]);
}

async function resolveEventByPublicIdentifier(db: DbClient, eventOrScreen: string) {
  const screen = await db.displayScreen.findFirst({
    where: {
      moduleType: "chat_overlay",
      screenKey: eventOrScreen,
    },
    include: {
      event: {
        include: {
          defaultTheme: true,
        },
      },
    },
  });

  if (screen) {
    return {
      event: screen.event as EventWithTheme,
      screenKey: screen.screenKey,
    };
  }

  const event = await db.event.findFirst({
    where: {
      slug: eventOrScreen,
      archivedAt: null,
    },
    include: {
      defaultTheme: true,
    },
  });

  if (!event) {
    return null;
  }

  const ensuredScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "chat_overlay",
    themePresetId: event.defaultThemeId,
    displayMode: "overlay",
  });

  return {
    event: event as EventWithTheme,
    screenKey: ensuredScreen.screenKey,
  };
}

async function resolveEventById(db: DbClient, eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      defaultTheme: true,
    },
  });

  if (!event) {
    throw new Error("Event was not found.");
  }

  const screen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "chat_overlay",
    themePresetId: event.defaultThemeId,
    displayMode: "overlay",
  });

  return {
    event: event as EventWithTheme,
    screenKey: screen.screenKey,
  };
}

async function buildPublishedChatOverlayState(
  db: DbClient,
  event: EventWithTheme,
  screenKey: string,
  options?: {
    clear?: boolean;
    clearNote?: string;
  },
) {
  const settings = parseEventSettings(event.settings);
  const screen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "chat_overlay",
    themePresetId: event.defaultThemeId,
    displayMode: "overlay",
  });
  const [approvedMessages, pendingCount, approvedCount] = await Promise.all([
    db.chatMessage.findMany({
      where: {
        eventId: event.id,
        status: "approved",
      },
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
      take: settings.audienceChatOverlay.maxVisibleMessages,
    }),
    db.chatMessage.count({
      where: {
        eventId: event.id,
        status: "pending",
      },
    }),
    db.chatMessage.count({
      where: {
        eventId: event.id,
        status: "approved",
      },
    }),
  ]);

  const orderedMessages = [...approvedMessages].reverse().map((message) => ({
    id: message.id,
    senderName: message.senderName ?? undefined,
    content: message.content,
    approvedAt: message.approvedAt?.toISOString(),
  }));

  const baseState = buildIdleChatOverlayDisplay({
    eventId: event.id,
    eventSlug: event.slug,
    screenKey,
    displayMode: screen.displayMode,
    theme: event.defaultTheme,
    prompt: settings.audienceChatPrompt,
    submissionEnabled: settings.audienceChatSubmissionEnabled,
    autoApproveSafeMessages: settings.audienceChatAutoApproveSafeMessages,
  });

  return chatOverlayDisplaySchema.parse({
    ...baseState,
    theme: mapThemePresetToConfig(event.defaultTheme),
    scene: options?.clear ? "cleared" : orderedMessages.length > 0 ? "live" : "idle",
    note: options?.clear
      ? options.clearNote ?? "Audience chat overlay cleared by operator."
      : orderedMessages.length > 0
        ? `${approvedCount} approved messages ready for the live overlay.`
        : "Audience chat is standing by.",
    approvedCount,
    pendingCount,
    messages: options?.clear ? [] : orderedMessages,
    overlayConfig: settings.audienceChatOverlay,
  });
}

export async function publishChatOverlayState(db: DbClient, eventId: string, options?: { clear?: boolean; clearNote?: string }) {
  const { event, screenKey } = await resolveEventById(db, eventId);
  const state = await buildPublishedChatOverlayState(db, event, screenKey, options);
  return publishDisplayState(db, state);
}

export async function getPublicChatContext(eventOrScreen: string) {
  const resolved = await resolveEventByPublicIdentifier(prisma, eventOrScreen);
  if (!resolved) {
    return null;
  }

  const settings = parseEventSettings(resolved.event.settings);
  return {
    eventId: resolved.event.id,
    eventName: resolved.event.name,
    eventSlug: resolved.event.slug,
    eventOrScreen,
    screenKey: resolved.screenKey,
    prompt: settings.audienceChatPrompt,
    submissionEnabled: settings.audienceChatEnabled && settings.audienceChatSubmissionEnabled,
    requireName: settings.audienceChatRequireName,
    maxLength: settings.audienceChatMaxLength,
    cooldownSeconds: settings.audienceChatCooldownSeconds,
    overlayPath: `/overlay/${eventOrScreen}`,
    displayPath: `/display/chat-overlay/${eventOrScreen}`,
  };
}

export async function submitPublicChatMessage(input: {
  eventOrScreen: string;
  senderName?: string;
  content: string;
  sourceHash: string;
}) {
  const payload = publicMessageSchema.parse({
    senderName: input.senderName,
    content: input.content,
  });

  const resolved = await resolveEventByPublicIdentifier(prisma, input.eventOrScreen);
  if (!resolved) {
    throw new Error("Event was not found.");
  }

  const settings = parseEventSettings(resolved.event.settings);
  if (!settings.audienceChatEnabled || !settings.audienceChatSubmissionEnabled) {
    throw new Error("Audience chat is not accepting new messages right now.");
  }

  if (settings.audienceChatRequireName && !payload.senderName) {
    throw new Error("Display name is required for this event.");
  }

  if (payload.content.length > settings.audienceChatMaxLength) {
    throw new Error(`Messages are limited to ${settings.audienceChatMaxLength} characters.`);
  }

  const cooldownKey = `${resolved.event.id}:${input.sourceHash}`;
  const lastSubmittedAt = cooldownBySource.get(cooldownKey);
  if (lastSubmittedAt && settings.audienceChatCooldownSeconds > 0 && Date.now() - lastSubmittedAt < settings.audienceChatCooldownSeconds * 1000) {
    throw new Error(`Please wait ${settings.audienceChatCooldownSeconds} seconds before sending another message.`);
  }

  const classification = classifyMessageContent(payload.content);

  return prisma.$transaction(async (tx) => {
    const existingBan = await tx.chatBan.findUnique({
      where: {
        eventId_sourceHash: {
          eventId: resolved.event.id,
          sourceHash: input.sourceHash,
        },
      },
    });

    if (existingBan) {
      throw new Error("This sender is blocked for the current event.");
    }

    const status =
      classification.riskLevel === "blocked"
        ? "rejected"
        : classification.riskLevel === "safe" && settings.audienceChatAutoApproveSafeMessages
          ? "approved"
          : "pending";

    const message = await tx.chatMessage.create({
      data: {
        eventId: resolved.event.id,
        senderName: payload.senderName ?? null,
        content: payload.content,
        normalizedContent: classification.normalizedContent,
        riskLevel: classification.riskLevel,
        status,
        sourceHash: input.sourceHash,
        approvedAt: status === "approved" ? new Date() : null,
        rejectedAt: status === "rejected" ? new Date() : null,
      },
    });

    await audit(tx, {
      eventId: resolved.event.id,
      actionType: "chat_message_received",
      actor: payload.senderName ?? "public-audience",
      targetType: "chat_message",
      targetId: message.id,
      payload: {
        status,
        riskLevel: classification.riskLevel,
      },
    });

    if (status === "approved") {
      await audit(tx, {
        eventId: resolved.event.id,
        actionType: "chat_message_approved",
        actor: "system-auto-approve",
        targetType: "chat_message",
        targetId: message.id,
        payload: {
          riskLevel: classification.riskLevel,
        },
      });
    }

    if (status === "rejected") {
      await audit(tx, {
        eventId: resolved.event.id,
        actionType: "chat_message_rejected",
        actor: "system-filter",
        targetType: "chat_message",
        targetId: message.id,
        payload: {
          riskLevel: classification.riskLevel,
          reason: classification.reason ?? null,
        },
      });
    }

    await publishChatOverlayState(tx, resolved.event.id);
    cooldownBySource.set(cooldownKey, Date.now());

    return {
      ok: status !== "rejected",
      moderationStatus: status,
      message: status === "approved"
        ? "Message approved and sent to the live overlay."
        : status === "pending"
          ? "Message received and waiting for operator approval."
          : classification.reason ?? "Message could not be displayed.",
    };
  });
}

export async function approveChatMessage(input: { messageId: string; actor: string }) {
  const payload = messageActionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.update({
      where: { id: payload.messageId },
      data: {
        status: "approved",
        rejectedAt: null,
        approvedAt: new Date(),
      },
    });

    await audit(tx, {
      eventId: message.eventId,
      actionType: "chat_message_approved",
      actor: payload.actor,
      targetType: "chat_message",
      targetId: message.id,
      payload: {
        senderName: message.senderName,
      },
    });

    await publishChatOverlayState(tx, message.eventId);
    return message;
  });
}

export async function rejectChatMessage(input: { messageId: string; actor: string }) {
  const payload = messageActionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.update({
      where: { id: payload.messageId },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedAt: null,
      },
    });

    await audit(tx, {
      eventId: message.eventId,
      actionType: "chat_message_rejected",
      actor: payload.actor,
      targetType: "chat_message",
      targetId: message.id,
      payload: {
        senderName: message.senderName,
      },
    });

    await publishChatOverlayState(tx, message.eventId);
    return message;
  });
}

export async function deleteChatMessage(input: { messageId: string; actor: string }) {
  const payload = messageActionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.delete({
      where: { id: payload.messageId },
    });

    await audit(tx, {
      eventId: message.eventId,
      actionType: "chat_message_deleted",
      actor: payload.actor,
      targetType: "chat_message",
      targetId: message.id,
      payload: {
        senderName: message.senderName,
      },
    });

    await publishChatOverlayState(tx, message.eventId);
    return message;
  });
}

export async function createTestChatMessage(input: {
  eventId: string;
  actor: string;
  senderName?: string;
  content?: string;
}) {
  const payload = testInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const { event } = await resolveEventById(tx, payload.eventId);
    const message = await tx.chatMessage.create({
      data: {
        eventId: event.id,
        senderName: payload.senderName ?? "Test Operator",
        content: payload.content ?? "This is a test message for the integrated audience overlay.",
        normalizedContent: payload.content?.toLowerCase() ?? "this is a test message for the integrated audience overlay",
        riskLevel: "safe",
        status: "approved",
        isTest: true,
        sourceHash: hashSource([event.id, payload.actor, "test-message"]),
        approvedAt: new Date(),
      },
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "chat_test_message_created",
      actor: payload.actor,
      targetType: "chat_message",
      targetId: message.id,
      payload: {
        senderName: message.senderName,
      },
    });

    await publishChatOverlayState(tx, event.id);
    return message;
  });
}

export async function banChatSender(input: { messageId: string; actor: string; reason?: string }) {
  const payload = banInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.findUnique({
      where: { id: payload.messageId },
    });

    if (!message) {
      throw new Error("Message was not found.");
    }

    if (!message.sourceHash) {
      throw new Error("This message does not have a sender fingerprint to ban.");
    }

    const ban = await tx.chatBan.upsert({
      where: {
        eventId_sourceHash: {
          eventId: message.eventId,
          sourceHash: message.sourceHash,
        },
      },
      create: {
        eventId: message.eventId,
        sourceHash: message.sourceHash,
        label: message.senderName ?? null,
        reason: payload.reason ?? null,
        createdBy: payload.actor,
      },
      update: {
        label: message.senderName ?? null,
        reason: payload.reason ?? null,
        createdBy: payload.actor,
      },
    });

    await tx.chatMessage.updateMany({
      where: {
        eventId: message.eventId,
        sourceHash: message.sourceHash,
        status: {
          in: ["pending", "approved"],
        },
      },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        approvedAt: null,
      },
    });

    await audit(tx, {
      eventId: message.eventId,
      actionType: "chat_sender_banned",
      actor: payload.actor,
      targetType: "chat_ban",
      targetId: ban.id,
      payload: {
        sourceHash: message.sourceHash,
        senderName: message.senderName,
      },
    });

    await publishChatOverlayState(tx, message.eventId);
    return ban;
  });
}

export async function clearChatOverlayScreen(input: { eventId: string; actor: string }) {
  const payload = clearInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const { event } = await resolveEventById(tx, payload.eventId);
    await publishChatOverlayState(tx, event.id, {
      clear: true,
      clearNote: "Audience chat overlay cleared by operator.",
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "chat_overlay_cleared",
      actor: payload.actor,
      targetType: "display_state",
      targetId: `${event.id}:chat_overlay`,
    });

    return event;
  });
}
