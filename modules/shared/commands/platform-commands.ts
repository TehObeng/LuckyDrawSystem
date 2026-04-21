import type { AuditActionType, ModuleType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { createDefaultDisplayStates, ensurePrimaryDisplayScreen, parseEventSettings, publishMasterDisplaySelection } from "@/modules/shared/services/display-state-service";
import { defaultEventSettings, defaultThemeSettings, defaultTicketFormat, duplicatePolicySchema, eventSettingsSchema, moduleTypeSchema, themeSettingsSchema, ticketFormatSchema } from "@/modules/shared/schemas/platform";

const eventCommandSchema = z.object({
  eventId: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().trim().optional(),
  date: z.string().min(1),
  locale: z.string().min(2).default("en-US"),
  currencyCode: z.string().min(3).max(3).default("USD"),
  description: z.string().optional(),
  supportsLuckyDraw: z.boolean().default(true),
  supportsAuction: z.boolean().default(true),
  duplicatePolicy: duplicatePolicySchema.default("event"),
  ticketFormat: ticketFormatSchema.default(defaultTicketFormat),
  defaultThemeId: z.string().optional(),
});

const themeCommandSchema = z.object({
  themeId: z.string().optional(),
  eventId: z.string().optional(),
  name: z.string().min(2),
  settings: themeSettingsSchema.default(defaultThemeSettings),
  setAsDefault: z.boolean().default(false),
});

const eventSettingsCommandSchema = z.object({
  eventId: z.string(),
  settings: eventSettingsSchema.default(defaultEventSettings),
  publishMaster: z.boolean().default(true),
  masterDisplayMode: z.enum(["fullscreen", "overlay"]).optional(),
});

const mediaAssetCommandSchema = z.object({
  eventId: z.string().optional(),
  mediaAssetId: z.string().optional(),
  kind: z.enum(["background", "logo", "supporting"]),
  publicUrl: z.string().min(1),
  bucket: z.string().optional(),
  path: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.object({
    title: z.string().optional(),
    altText: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    focalPoint: z.object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    }).optional(),
  }).default({ tags: [] }),
});

const screenCommandSchema = z.object({
  eventId: z.string(),
  moduleType: moduleTypeSchema,
  name: z.string().min(2),
  displayMode: z.enum(["fullscreen", "overlay"]),
  themePresetId: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

async function audit(tx: Prisma.TransactionClient, input: {
  eventId: string;
  moduleType?: ModuleType;
  actionType: AuditActionType;
  actor: string;
  targetType?: string;
  targetId?: string;
  correlationId?: string;
  undoOfId?: string;
  payload?: Prisma.InputJsonValue;
}) {
  return tx.auditLog.create({
    data: input,
  });
}

function buildThemePayload(settings: z.infer<typeof themeSettingsSchema>) {
  return {
    backgroundType: settings.backgroundType,
    backgroundImageUrl: settings.backgroundImageUrl ?? null,
    logoUrl: settings.logoUrl ?? null,
    accentColor: settings.accentColor,
    overlayMode: settings.overlayMode,
    fontSettings: {
      heading: "Space Grotesk",
      body: "Manrope",
    },
    textColorSettings: {
      primary: settings.textColor,
      muted: settings.mutedTextColor,
      surfaceTint: settings.surfaceTint,
    },
    layoutPreferences: {
      displayStyle: settings.displayStyle,
      motionProfile: settings.motionProfile,
      backgroundColorStart: settings.backgroundColorStart,
      backgroundColorEnd: settings.backgroundColorEnd,
      backgroundColorMode: settings.backgroundColorMode,
      backgroundFit: settings.backgroundFit,
      backgroundPosition: settings.backgroundPosition,
      overlayOpacity: settings.overlayOpacity,
      logoScale: settings.logoScale,
      logoPosition: settings.logoPosition,
      contentAlignment: settings.contentAlignment,
      showMetaPanel: settings.showMetaPanel,
      showSceneLabel: settings.showSceneLabel,
      panelStyle: settings.panelStyle,
      heroImageBehavior: settings.heroImageBehavior,
    },
  };
}

export async function createEvent(input: z.input<typeof eventCommandSchema>, actor: string) {
  const payload = eventCommandSchema.parse(input);
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  return prisma.$transaction(async (tx) => {
    const theme = await tx.themePreset.create({
      data: {
        eventId: null,
        name: `${payload.name} Default`,
        ...buildThemePayload(defaultThemeSettings),
      },
    });

    const event = await tx.event.create({
      data: {
        name: payload.name,
        slug,
        date: new Date(payload.date),
        locale: payload.locale,
        currencyCode: payload.currencyCode.toUpperCase(),
        description: payload.description || null,
        supportsLuckyDraw: payload.supportsLuckyDraw,
        supportsAuction: payload.supportsAuction,
        duplicatePolicy: payload.duplicatePolicy,
        ticketFormat: payload.ticketFormat,
        settings: defaultEventSettings,
        defaultThemeId: theme.id,
      },
    });

    await tx.themePreset.update({
      where: { id: theme.id },
      data: {
        eventId: event.id,
      },
    });

    await createDefaultDisplayStates(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      currencyCode: event.currencyCode,
      themePresetId: theme.id,
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "event_created",
      actor,
      targetType: "event",
      targetId: event.id,
      payload: {
        slug: event.slug,
        name: event.name,
      },
    });

    return event;
  });
}

export async function updateEvent(input: z.input<typeof eventCommandSchema>, actor: string) {
  const payload = eventCommandSchema.extend({ eventId: z.string() }).parse(input);

  return prisma.$transaction(async (tx) => {
    const currentEvent = await tx.event.findUniqueOrThrow({
      where: { id: payload.eventId },
      select: {
        settings: true,
      },
    });

    const event = await tx.event.update({
      where: { id: payload.eventId },
      data: {
        name: payload.name,
        slug: payload.slug ? slugify(payload.slug) : slugify(payload.name),
        date: new Date(payload.date),
        locale: payload.locale,
        currencyCode: payload.currencyCode.toUpperCase(),
        description: payload.description || null,
        supportsLuckyDraw: payload.supportsLuckyDraw,
        supportsAuction: payload.supportsAuction,
        duplicatePolicy: payload.duplicatePolicy,
        ticketFormat: payload.ticketFormat,
        settings: parseEventSettings(currentEvent.settings),
        defaultThemeId: payload.defaultThemeId || null,
      },
    });

    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "lucky_draw",
      themePresetId: event.defaultThemeId,
    });
    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "auction",
      themePresetId: event.defaultThemeId,
    });
    await ensurePrimaryDisplayScreen(tx, {
      eventId: event.id,
      eventSlug: event.slug,
      moduleType: "master",
      themePresetId: event.defaultThemeId,
    });

    await audit(tx, {
      eventId: event.id,
      actionType: "event_updated",
      actor,
      targetType: "event",
      targetId: event.id,
      payload: {
        slug: event.slug,
        name: event.name,
      },
    });

    return event;
  });
}

export async function archiveEvent(eventId: string, actor: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.update({
      where: { id: eventId },
      data: {
        archivedAt: new Date(),
      },
    });

    await audit(tx, {
      eventId,
      actionType: "event_archived",
      actor,
      targetType: "event",
      targetId: eventId,
      payload: {
        archivedAt: event.archivedAt?.toISOString(),
      },
    });

    return event;
  });
}

export async function createThemePreset(input: z.input<typeof themeCommandSchema>, actor: string) {
  const payload = themeCommandSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const theme = await tx.themePreset.create({
      data: {
        eventId: payload.eventId || null,
        name: payload.name,
        ...buildThemePayload(payload.settings),
      },
    });

    if (payload.setAsDefault && payload.eventId) {
      await tx.event.update({
        where: { id: payload.eventId },
        data: {
          defaultThemeId: theme.id,
        },
      });
    }

    await audit(tx, {
      eventId: payload.eventId ?? "",
      actionType: "theme_created",
      actor,
      targetType: "theme_preset",
      targetId: theme.id,
      payload: {
        name: theme.name,
        eventId: payload.eventId ?? null,
      },
    });

    return theme;
  });
}

export async function updateThemePreset(input: z.input<typeof themeCommandSchema>, actor: string) {
  const payload = themeCommandSchema.extend({ themeId: z.string() }).parse(input);

  return prisma.$transaction(async (tx) => {
    const theme = await tx.themePreset.update({
      where: { id: payload.themeId },
      data: {
        eventId: payload.eventId || null,
        name: payload.name,
        ...buildThemePayload(payload.settings),
      },
    });

    if (payload.setAsDefault && payload.eventId) {
      await tx.event.update({
        where: { id: payload.eventId },
        data: {
          defaultThemeId: theme.id,
        },
      });
    }

    await audit(tx, {
      eventId: payload.eventId ?? "",
      actionType: "theme_updated",
      actor,
      targetType: "theme_preset",
      targetId: theme.id,
      payload: {
        name: theme.name,
      },
    });

    return theme;
  });
}

export async function createDisplayScreen(input: z.input<typeof screenCommandSchema>, actor: string) {
  const payload = screenCommandSchema.parse(input);
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: payload.eventId },
  });

  return prisma.$transaction(async (tx) => {
    const screen = await tx.displayScreen.create({
      data: {
        eventId: payload.eventId,
        moduleType: payload.moduleType,
        name: payload.name,
        screenKey: `${slugify(event.slug)}-${payload.moduleType}-${Date.now()}`,
        displayMode: payload.displayMode,
        themePresetId: payload.themePresetId || null,
        isPrimary: payload.isPrimary,
      },
    });

    await audit(tx, {
      eventId: payload.eventId,
      moduleType: payload.moduleType,
      actionType: "screen_created",
      actor,
      targetType: "display_screen",
      targetId: screen.id,
      payload: {
        screenKey: screen.screenKey,
      },
    });

    return screen;
  });
}

export async function updateEventSettings(input: z.input<typeof eventSettingsCommandSchema>, actor: string) {
  const payload = eventSettingsCommandSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({
      where: { id: payload.eventId },
    });
    const nextSettings = eventSettingsSchema.parse({
      ...parseEventSettings(event.settings),
      ...payload.settings,
    });

    const updatedEvent = await tx.event.update({
      where: { id: payload.eventId },
      data: {
        settings: JSON.parse(JSON.stringify(nextSettings)) as Prisma.InputJsonValue,
      },
    });

    if (payload.publishMaster) {
      await publishMasterDisplaySelection(tx, {
        eventId: payload.eventId,
        source: nextSettings.activeMasterSource,
        displayMode: payload.masterDisplayMode,
      });
    }

    await audit(tx, {
      eventId: payload.eventId,
      moduleType: "master",
      actionType: "event_updated",
      actor,
      targetType: "event_settings",
      targetId: updatedEvent.id,
      payload: JSON.parse(JSON.stringify(nextSettings)) as Prisma.InputJsonValue,
    });

    return updatedEvent;
  });
}

export async function createMediaAssetRecord(input: z.input<typeof mediaAssetCommandSchema>, actor: string) {
  const payload = mediaAssetCommandSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.create({
      data: {
        eventId: payload.eventId ?? null,
        kind: payload.kind,
        bucket: payload.bucket ?? null,
        path: payload.path ?? null,
        publicUrl: payload.publicUrl,
        mimeType: payload.mimeType ?? null,
        metadata: JSON.parse(JSON.stringify(payload.metadata)) as Prisma.InputJsonValue,
      },
    });

    if (payload.eventId) {
      await audit(tx, {
        eventId: payload.eventId,
        actionType: "theme_updated",
        actor,
        targetType: "media_asset",
        targetId: asset.id,
        payload: {
          kind: asset.kind,
          publicUrl: asset.publicUrl,
        },
      });
    }

    return asset;
  });
}

export async function updateMediaAssetRecord(input: z.input<typeof mediaAssetCommandSchema>, actor: string) {
  const payload = mediaAssetCommandSchema.extend({ mediaAssetId: z.string() }).parse(input);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.update({
      where: { id: payload.mediaAssetId },
      data: {
        kind: payload.kind,
        bucket: payload.bucket ?? null,
        path: payload.path ?? null,
        publicUrl: payload.publicUrl,
        mimeType: payload.mimeType ?? null,
        metadata: JSON.parse(JSON.stringify(payload.metadata)) as Prisma.InputJsonValue,
      },
    });

    if (asset.eventId) {
      await audit(tx, {
        eventId: asset.eventId,
        actionType: "theme_updated",
        actor,
        targetType: "media_asset",
        targetId: asset.id,
        payload: {
          kind: asset.kind,
          publicUrl: asset.publicUrl,
        },
      });
    }

    return asset;
  });
}

export { eventCommandSchema, eventSettingsCommandSchema, mediaAssetCommandSchema, themeCommandSchema };
