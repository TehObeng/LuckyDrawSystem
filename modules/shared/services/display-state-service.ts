import type { DisplayMode, DisplayScreen, ModuleType, PrismaClient, ThemePreset, Event } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  auctionDisplaySchema,
  liveDisplayEnvelopeSchema,
  luckyDrawDisplaySchema,
  masterDisplaySchema,
  type AuctionDisplayEnvelope,
  type LiveDisplayEnvelope,
  type LuckyDrawDisplayEnvelope,
  type MasterDisplayEnvelope,
} from "@/modules/shared/schemas/display";
import { defaultEventSettings, defaultPrizeBoardSettings, defaultThemeSettings, eventSettingsSchema, themeSettingsSchema, type EventSettings } from "@/modules/shared/schemas/platform";

type DbClient = Prisma.TransactionClient | PrismaClient;

interface ResolvedDisplayScreen extends DisplayScreen {
  event: Event & { defaultTheme: ThemePreset | null };
  themePreset: ThemePreset | null;
}

function createScreenKey(eventSlug: string, moduleType: ModuleType) {
  switch (moduleType) {
    case "lucky_draw":
      return `${eventSlug}-lucky-draw`;
    case "auction":
      return `${eventSlug}-auction`;
    case "master":
      return `${eventSlug}-master`;
  }
}

function sceneToStatus(scene: LiveDisplayEnvelope["scene"]) {
  if (scene === "blank") {
    return "cleared";
  }

  if (scene === "lucky_draw" || scene === "auction") {
    return "ready";
  }

  return scene;
}

export function parseEventSettings(value: unknown): EventSettings {
  if (!value || typeof value !== "object") {
    return defaultEventSettings;
  }

  return eventSettingsSchema.parse({
    ...defaultEventSettings,
    ...(value as Record<string, unknown>),
  });
}

export function mapThemePresetToConfig(themePreset?: ThemePreset | null) {
  if (!themePreset) {
    return defaultThemeSettings;
  }

  const textColorSettings =
    typeof themePreset.textColorSettings === "object" && themePreset.textColorSettings
      ? (themePreset.textColorSettings as Record<string, string>)
      : {};
  const layoutPreferences =
    typeof themePreset.layoutPreferences === "object" && themePreset.layoutPreferences
      ? (themePreset.layoutPreferences as Record<string, unknown>)
      : {};

  return themeSettingsSchema.parse({
    backgroundType: themePreset.backgroundType,
    backgroundImageUrl: themePreset.backgroundImageUrl ?? undefined,
    logoUrl: themePreset.logoUrl ?? undefined,
    backgroundColorStart: getLayoutPreference(layoutPreferences, "backgroundColorStart", defaultThemeSettings.backgroundColorStart),
    backgroundColorEnd: getLayoutPreference(layoutPreferences, "backgroundColorEnd", defaultThemeSettings.backgroundColorEnd),
    backgroundColorMode: getLayoutPreference(layoutPreferences, "backgroundColorMode", defaultThemeSettings.backgroundColorMode),
    accentColor: themePreset.accentColor,
    textColor: textColorSettings.primary ?? defaultThemeSettings.textColor,
    mutedTextColor: textColorSettings.muted ?? defaultThemeSettings.mutedTextColor,
    surfaceTint: textColorSettings.surfaceTint ?? defaultThemeSettings.surfaceTint,
    overlayMode: themePreset.overlayMode,
    displayStyle: getLayoutPreference(layoutPreferences, "displayStyle", defaultThemeSettings.displayStyle),
    motionProfile: getLayoutPreference(layoutPreferences, "motionProfile", defaultThemeSettings.motionProfile),
    backgroundFit: getLayoutPreference(layoutPreferences, "backgroundFit", defaultThemeSettings.backgroundFit),
    backgroundPosition: getLayoutPreference(layoutPreferences, "backgroundPosition", defaultThemeSettings.backgroundPosition),
    overlayOpacity: getLayoutPreference(layoutPreferences, "overlayOpacity", defaultThemeSettings.overlayOpacity),
    logoScale: getLayoutPreference(layoutPreferences, "logoScale", defaultThemeSettings.logoScale),
    logoPosition: getLayoutPreference(layoutPreferences, "logoPosition", defaultThemeSettings.logoPosition),
    contentAlignment: getLayoutPreference(layoutPreferences, "contentAlignment", defaultThemeSettings.contentAlignment),
    showMetaPanel: getLayoutPreference(layoutPreferences, "showMetaPanel", defaultThemeSettings.showMetaPanel),
    showSceneLabel: getLayoutPreference(layoutPreferences, "showSceneLabel", defaultThemeSettings.showSceneLabel),
    panelStyle: getLayoutPreference(layoutPreferences, "panelStyle", defaultThemeSettings.panelStyle),
    heroImageBehavior: getLayoutPreference(layoutPreferences, "heroImageBehavior", defaultThemeSettings.heroImageBehavior),
  });
}

function getLayoutPreference<T>(layoutPreferences: Record<string, unknown>, key: string, fallback: T) {
  const value = layoutPreferences[key];
  return value === undefined || value === null ? fallback : (value as T);
}

function upgradeLuckyDrawPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const payload = value as Record<string, unknown>;
  const grid =
    payload.grid && typeof payload.grid === "object" && !Array.isArray(payload.grid)
      ? (payload.grid as Record<string, unknown>)
      : { itemCount: 12 };
  const displayAmount = Number(grid.itemCount ?? 12);
  const board =
    payload.board && typeof payload.board === "object" && !Array.isArray(payload.board)
      ? (payload.board as Record<string, unknown>)
      : {};
  const progress =
    payload.progress && typeof payload.progress === "object" && !Array.isArray(payload.progress)
      ? (payload.progress as Record<string, unknown>)
      : { planned: 0, actual: 0 };

  return {
    ...payload,
    board: {
      designWidth: Number(board.designWidth ?? 1920),
      designHeight: Number(board.designHeight ?? 1080),
      displayAmount: Number(board.displayAmount ?? displayAmount),
      columns: Number(board.columns ?? Math.max(1, Math.ceil(Math.sqrt(displayAmount * (1920 / 1080))))),
      rows: Number(board.rows ?? Math.max(1, Math.ceil(displayAmount / Math.max(1, Math.ceil(Math.sqrt(displayAmount * (1920 / 1080))))))),
    },
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    allPrizeWinners: Array.isArray(payload.allPrizeWinners) ? payload.allPrizeWinners : Array.isArray(payload.winners) ? payload.winners : [],
    prizeProgress:
      payload.prizeProgress && typeof payload.prizeProgress === "object" && !Array.isArray(payload.prizeProgress)
        ? payload.prizeProgress
        : {
            planned: Number(progress.planned ?? 0),
            actual: Number(progress.actual ?? 0),
          },
    prizeBoardSettings:
      payload.prizeBoardSettings && typeof payload.prizeBoardSettings === "object" && !Array.isArray(payload.prizeBoardSettings)
        ? payload.prizeBoardSettings
        : defaultPrizeBoardSettings,
  };
}

function upgradePersistedDisplayPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const payload = value as Record<string, unknown>;
  if (payload.moduleType === "lucky_draw") {
    return upgradeLuckyDrawPayload(payload);
  }

  if (payload.moduleType === "master") {
    return {
      ...payload,
      luckyDrawState: upgradeLuckyDrawPayload(payload.luckyDrawState),
    };
  }

  return payload;
}

function buildMasterDisplayFromSource(input: {
  eventId: string;
  eventSlug: string;
  screenKey: string;
  displayMode: DisplayMode;
  theme?: ThemePreset | null;
  note?: string;
  revision?: number;
  source: "blank" | "lucky_draw" | "auction";
  luckyDrawState?: LuckyDrawDisplayEnvelope;
  auctionState?: AuctionDisplayEnvelope;
  activeScreenKey?: string;
}): MasterDisplayEnvelope {
  return masterDisplaySchema.parse({
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    screenKey: input.screenKey,
    moduleType: "master",
    revision: input.revision ?? 0,
    displayMode: input.displayMode,
    theme:
      input.source === "lucky_draw"
        ? input.luckyDrawState?.theme ?? mapThemePresetToConfig(input.theme)
        : input.source === "auction"
          ? input.auctionState?.theme ?? mapThemePresetToConfig(input.theme)
          : mapThemePresetToConfig(input.theme),
    publishedAt: new Date().toISOString(),
    scene: input.source,
    activeScreenKey: input.activeScreenKey,
    note:
      input.note ??
      (input.source === "blank"
        ? "Master output is blank."
        : input.source === "lucky_draw"
          ? "Master output is mirroring Lucky Draw."
          : "Master output is mirroring Auction."),
    luckyDrawState: input.source === "lucky_draw" ? input.luckyDrawState : undefined,
    auctionState: input.source === "auction" ? input.auctionState : undefined,
  });
}

async function loadResolvedScreen(moduleType: ModuleType, eventOrScreen: string) {
  let screen = await prisma.displayScreen.findFirst({
    where: {
      moduleType,
      screenKey: eventOrScreen,
    },
    include: {
      event: {
        include: {
          defaultTheme: true,
        },
      },
      themePreset: true,
    },
  });

  if (!screen) {
    screen = await prisma.displayScreen.findFirst({
      where: {
        moduleType,
        isPrimary: true,
        event: {
          slug: eventOrScreen,
        },
      },
      include: {
        event: {
          include: {
            defaultTheme: true,
          },
        },
        themePreset: true,
      },
    });
  }

  return screen;
}

export async function ensurePrimaryDisplayScreen(
  db: DbClient,
  input: {
    eventId: string;
    eventSlug: string;
    moduleType: ModuleType;
    themePresetId?: string | null;
    displayMode?: DisplayMode;
    designWidth?: number;
    designHeight?: number;
  },
) {
  const existing = await db.displayScreen.findFirst({
    where: {
      eventId: input.eventId,
      moduleType: input.moduleType,
      isPrimary: true,
    },
  });

  if (existing) {
    if (
      (input.designWidth && existing.designWidth !== input.designWidth) ||
      (input.designHeight && existing.designHeight !== input.designHeight) ||
      (input.displayMode && existing.displayMode !== input.displayMode)
    ) {
      return db.displayScreen.update({
        where: { id: existing.id },
        data: {
          designWidth: input.designWidth ?? existing.designWidth,
          designHeight: input.designHeight ?? existing.designHeight,
          displayMode: input.displayMode ?? existing.displayMode,
        },
      });
    }

    return existing;
  }

  return db.displayScreen.create({
    data: {
      eventId: input.eventId,
      moduleType: input.moduleType,
      name:
        input.moduleType === "lucky_draw"
          ? "Lucky Draw Main Screen"
          : input.moduleType === "auction"
            ? "Auction Main Screen"
            : "Master Overlay Screen",
      screenKey: createScreenKey(input.eventSlug, input.moduleType),
      isPrimary: true,
      themePresetId: input.themePresetId ?? null,
      displayMode: input.displayMode ?? "fullscreen",
      designWidth: input.designWidth ?? 1920,
      designHeight: input.designHeight ?? 1080,
    },
  });
}

export function buildIdleLuckyDrawDisplay(input: {
  eventId: string;
  eventSlug: string;
  screenKey: string;
  displayMode: DisplayMode;
  theme?: ThemePreset | null;
  prizeName?: string;
  revision?: number;
}): LuckyDrawDisplayEnvelope {
  return luckyDrawDisplaySchema.parse({
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    screenKey: input.screenKey,
    moduleType: "lucky_draw",
    revision: input.revision ?? 0,
    displayMode: input.displayMode,
    theme: mapThemePresetToConfig(input.theme),
    publishedAt: new Date().toISOString(),
    scene: "idle",
    prizeName: input.prizeName ?? "Awaiting prize cue",
    winners: [],
    layoutMode: "grid",
    animationPreset: "fade_pop",
    animationSpeed: 1,
    grid: {
      itemCount: 12,
    },
    board: {
      designWidth: 1920,
      designHeight: 1080,
      displayAmount: 12,
      columns: 5,
      rows: 3,
    },
    cards: [],
    progress: {
      planned: 0,
      actual: 0,
    },
    prizeProgress: {
      planned: 0,
      actual: 0,
    },
    cue: "Select a session and reveal the next winner.",
    replayToken: 0,
  });
}

export function buildIdleAuctionDisplay(input: {
  eventId: string;
  eventSlug: string;
  screenKey: string;
  displayMode: DisplayMode;
  theme?: ThemePreset | null;
  currencyCode?: string;
  revision?: number;
}): AuctionDisplayEnvelope {
  return auctionDisplaySchema.parse({
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    screenKey: input.screenKey,
    moduleType: "auction",
    revision: input.revision ?? 0,
    displayMode: input.displayMode,
    theme: mapThemePresetToConfig(input.theme),
    publishedAt: new Date().toISOString(),
    scene: "idle",
    currencyCode: input.currencyCode ?? "USD",
    note: "Select a lot to move into live bidding.",
  });
}

export function buildIdleMasterDisplay(input: {
  eventId: string;
  eventSlug: string;
  screenKey: string;
  displayMode: DisplayMode;
  theme?: ThemePreset | null;
  revision?: number;
  note?: string;
}): MasterDisplayEnvelope {
  return buildMasterDisplayFromSource({
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    screenKey: input.screenKey,
    displayMode: input.displayMode,
    theme: input.theme,
    revision: input.revision,
    source: "blank",
    note: input.note ?? "Choose Lucky Draw or Auction to send the master output live.",
  });
}

async function persistDisplayState(
  db: DbClient,
  screen: Pick<DisplayScreen, "id" | "screenKey">,
  state: Omit<LiveDisplayEnvelope, "revision" | "publishedAt"> & Partial<Pick<LiveDisplayEnvelope, "publishedAt">>,
) {
  const previous = await db.displayState.findUnique({
    where: { screenId: screen.id },
  });

  const nextState = liveDisplayEnvelopeSchema.parse({
    ...state,
    revision: (previous?.revision ?? 0) + 1,
    publishedAt: state.publishedAt ?? new Date().toISOString(),
  });

  const persistedPayload = JSON.parse(JSON.stringify(nextState)) as Prisma.InputJsonValue;

  await db.displayState.upsert({
    where: {
      screenId: screen.id,
    },
    create: {
      eventId: nextState.eventId,
      screenId: screen.id,
      moduleType: nextState.moduleType,
      routeKey: screen.screenKey,
      revision: nextState.revision,
      payload: persistedPayload,
      displayMode: nextState.displayMode,
      status: sceneToStatus(nextState.scene),
      syncedAt: new Date(),
    },
    update: {
      revision: nextState.revision,
      payload: persistedPayload,
      displayMode: nextState.displayMode,
      status: sceneToStatus(nextState.scene),
      syncedAt: new Date(),
    },
  });

  return nextState;
}

async function resolveModuleDisplayStateForEvent(
  db: DbClient,
  input: {
    event: Event & { defaultTheme: ThemePreset | null };
    moduleType: "lucky_draw" | "auction";
  },
) {
  const screen = await ensurePrimaryDisplayScreen(db, {
    eventId: input.event.id,
    eventSlug: input.event.slug,
    moduleType: input.moduleType,
    themePresetId: input.event.defaultThemeId,
  });

  const persistedState = await db.displayState.findUnique({
    where: {
      screenId: screen.id,
    },
  });

  if (persistedState) {
    const payload = liveDisplayEnvelopeSchema.parse(persistedState.payload);
    if (payload.moduleType === input.moduleType) {
      return {
        screen,
        state: payload,
      };
    }
  }

  if (input.moduleType === "lucky_draw") {
    return {
      screen,
      state: buildIdleLuckyDrawDisplay({
        eventId: input.event.id,
        eventSlug: input.event.slug,
        screenKey: screen.screenKey,
        displayMode: screen.displayMode,
        theme: input.event.defaultTheme,
      }),
    };
  }

  return {
    screen,
    state: buildIdleAuctionDisplay({
      eventId: input.event.id,
      eventSlug: input.event.slug,
      screenKey: screen.screenKey,
      displayMode: screen.displayMode,
      theme: input.event.defaultTheme,
      currencyCode: input.event.currencyCode,
    }),
  };
}

async function syncMasterDisplayForEvent(db: DbClient, eventId: string, preferredSource?: "blank" | "lucky_draw" | "auction") {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      defaultTheme: true,
    },
  });

  if (!event) {
    return null;
  }

  const settings = parseEventSettings(event.settings);
  const source = preferredSource ?? settings.activeMasterSource ?? settings.defaultMasterSource;
  const masterScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "master",
    themePresetId: event.defaultThemeId,
  });

  if (source === "blank") {
    return persistDisplayState(
      db,
      masterScreen,
      buildIdleMasterDisplay({
        eventId: event.id,
        eventSlug: event.slug,
        screenKey: masterScreen.screenKey,
        displayMode: masterScreen.displayMode,
        theme: event.defaultTheme,
      }),
    );
  }

  if (source === "lucky_draw") {
    const luckyDisplay = await resolveModuleDisplayStateForEvent(db, {
      event,
      moduleType: "lucky_draw",
    });

    return persistDisplayState(
      db,
      masterScreen,
      buildMasterDisplayFromSource({
        eventId: event.id,
        eventSlug: event.slug,
        screenKey: masterScreen.screenKey,
        displayMode: masterScreen.displayMode,
        theme: event.defaultTheme,
        source,
        luckyDrawState: luckyDisplay.state as LuckyDrawDisplayEnvelope,
        activeScreenKey: luckyDisplay.screen.screenKey,
      }),
    );
  }

  const auctionDisplay = await resolveModuleDisplayStateForEvent(db, {
    event,
    moduleType: "auction",
  });

  return persistDisplayState(
    db,
    masterScreen,
    buildMasterDisplayFromSource({
      eventId: event.id,
      eventSlug: event.slug,
      screenKey: masterScreen.screenKey,
      displayMode: masterScreen.displayMode,
      theme: event.defaultTheme,
      source,
      auctionState: auctionDisplay.state as AuctionDisplayEnvelope,
      activeScreenKey: auctionDisplay.screen.screenKey,
    }),
  );
}

export async function publishMasterDisplaySelection(
  db: DbClient,
  input: {
    eventId: string;
    source: "blank" | "lucky_draw" | "auction";
    displayMode?: DisplayMode;
    note?: string;
  },
) {
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    include: {
      defaultTheme: true,
    },
  });

  if (!event) {
    throw new Error("Event was not found.");
  }

  const settings = parseEventSettings(event.settings);
  const nextSettings: EventSettings = {
    ...settings,
    activeMasterSource: input.source,
  };

  await db.event.update({
    where: { id: event.id },
    data: {
      settings: JSON.parse(JSON.stringify(nextSettings)) as Prisma.InputJsonValue,
    },
  });

  const masterScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: event.id,
    eventSlug: event.slug,
    moduleType: "master",
    themePresetId: event.defaultThemeId,
    displayMode: input.displayMode,
  });

  if (input.displayMode && masterScreen.displayMode !== input.displayMode) {
    await db.displayScreen.update({
      where: { id: masterScreen.id },
      data: {
        displayMode: input.displayMode,
      },
    });
  }

  const state = await syncMasterDisplayForEvent(db, event.id, input.source);
  if (!state) {
    throw new Error("Unable to publish master display.");
  }

  if (!input.note || state.scene === "blank") {
    return state;
  }

  const notedState = masterDisplaySchema.parse({
    ...state,
    note: input.note,
  });

  return persistDisplayState(
    db,
    masterScreen,
    notedState,
  );
}

export async function createDefaultDisplayStates(
  db: DbClient,
  input: {
    eventId: string;
    eventSlug: string;
    currencyCode: string;
    themePresetId?: string | null;
  },
) {
  const luckyScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    moduleType: "lucky_draw",
    themePresetId: input.themePresetId,
  });
  const auctionScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    moduleType: "auction",
    themePresetId: input.themePresetId,
  });
  const masterScreen = await ensurePrimaryDisplayScreen(db, {
    eventId: input.eventId,
    eventSlug: input.eventSlug,
    moduleType: "master",
    themePresetId: input.themePresetId,
  });

  await publishDisplayState(
    db,
    buildIdleLuckyDrawDisplay({
      eventId: input.eventId,
      eventSlug: input.eventSlug,
      screenKey: luckyScreen.screenKey,
      displayMode: luckyScreen.displayMode,
    }),
  );

  await publishDisplayState(
    db,
    buildIdleAuctionDisplay({
      eventId: input.eventId,
      eventSlug: input.eventSlug,
      screenKey: auctionScreen.screenKey,
      displayMode: auctionScreen.displayMode,
      currencyCode: input.currencyCode,
    }),
  );
  await publishDisplayState(
    db,
    buildIdleMasterDisplay({
      eventId: input.eventId,
      eventSlug: input.eventSlug,
      screenKey: masterScreen.screenKey,
      displayMode: masterScreen.displayMode,
    }),
  );
}

export async function publishDisplayState(db: DbClient, state: Omit<LiveDisplayEnvelope, "revision" | "publishedAt"> & Partial<Pick<LiveDisplayEnvelope, "publishedAt">>) {
  const screen = await db.displayScreen.findFirst({
    where: {
      moduleType: state.moduleType,
      screenKey: state.screenKey,
    },
  });

  if (!screen) {
    throw new Error(`Display screen ${state.screenKey} was not found.`);
  }

  const nextState = await persistDisplayState(db, screen, state);

  if (nextState.moduleType === "master") {
    return nextState;
  }

  const event = await db.event.findUnique({
    where: { id: nextState.eventId },
    select: {
      settings: true,
    },
  });

  const settings = parseEventSettings(event?.settings);
  if (settings.activeMasterSource === nextState.moduleType) {
    await syncMasterDisplayForEvent(db, nextState.eventId, nextState.moduleType);
  }

  return nextState;
}

async function resolveLuckyDrawTheme(
  screen: ResolvedDisplayScreen,
  state: LuckyDrawDisplayEnvelope,
) {
  if (state.prizeCategoryId) {
    const prize = await prisma.prizeCategory.findUnique({
      where: { id: state.prizeCategoryId },
      include: {
        specialTheme: true,
      },
    });

    if (prize?.specialTheme) {
      return mapThemePresetToConfig(prize.specialTheme);
    }
  }

  return mapThemePresetToConfig(screen.themePreset ?? screen.event.defaultTheme);
}

async function resolveAuctionTheme(
  screen: ResolvedDisplayScreen,
  state: AuctionDisplayEnvelope,
) {
  if (state.lotId) {
    const lot = await prisma.auctionLot.findUnique({
      where: { id: state.lotId },
      include: {
        themeOverride: true,
      },
    });

    if (lot?.themeOverride) {
      return mapThemePresetToConfig(lot.themeOverride);
    }
  }

  return mapThemePresetToConfig(screen.themePreset ?? screen.event.defaultTheme);
}

async function applyCurrentThemeToState(
  screen: ResolvedDisplayScreen,
  state: LiveDisplayEnvelope,
): Promise<LiveDisplayEnvelope> {
  if (state.moduleType === "lucky_draw") {
    return luckyDrawDisplaySchema.parse({
      ...state,
      theme: await resolveLuckyDrawTheme(screen, state),
    });
  }

  if (state.moduleType === "auction") {
    return auctionDisplaySchema.parse({
      ...state,
      theme: await resolveAuctionTheme(screen, state),
    });
  }

  if (state.scene === "lucky_draw" && state.luckyDrawState) {
    const luckyTheme = await resolveLuckyDrawTheme(screen, state.luckyDrawState);
    return masterDisplaySchema.parse({
      ...state,
      theme: luckyTheme,
      luckyDrawState: luckyDrawDisplaySchema.parse({
        ...state.luckyDrawState,
        theme: luckyTheme,
      }),
    });
  }

  if (state.scene === "auction" && state.auctionState) {
    const auctionTheme = await resolveAuctionTheme(screen, state.auctionState);
    return masterDisplaySchema.parse({
      ...state,
      theme: auctionTheme,
      auctionState: auctionDisplaySchema.parse({
        ...state.auctionState,
        theme: auctionTheme,
      }),
    });
  }

  return masterDisplaySchema.parse({
    ...state,
    theme: mapThemePresetToConfig(screen.themePreset ?? screen.event.defaultTheme),
  });
}

export async function getPublicDisplayState(moduleType: ModuleType, eventOrScreen: string) {
  const screen = await loadResolvedScreen(moduleType, eventOrScreen);
  if (!screen) {
    return null;
  }

  const persistedState = await prisma.displayState.findUnique({
    where: {
      screenId: screen.id,
    },
  });

  if (persistedState) {
    const payload = liveDisplayEnvelopeSchema.parse(upgradePersistedDisplayPayload(persistedState.payload));
    return applyCurrentThemeToState(screen as ResolvedDisplayScreen, payload);
  }

  if (moduleType === "lucky_draw") {
    return buildIdleLuckyDrawDisplay({
      eventId: screen.eventId,
      eventSlug: screen.event.slug,
      screenKey: screen.screenKey,
      displayMode: screen.displayMode,
      theme: screen.themePreset ?? screen.event.defaultTheme,
    });
  }

  if (moduleType === "auction") {
    return buildIdleAuctionDisplay({
      eventId: screen.eventId,
      eventSlug: screen.event.slug,
      screenKey: screen.screenKey,
      displayMode: screen.displayMode,
      theme: screen.themePreset ?? screen.event.defaultTheme,
      currencyCode: screen.event.currencyCode,
    });
  }

  return buildIdleMasterDisplay({
    eventId: screen.eventId,
    eventSlug: screen.event.slug,
    screenKey: screen.screenKey,
    displayMode: screen.displayMode,
    theme: screen.themePreset ?? screen.event.defaultTheme,
  });
}

export async function getResolvedDisplayScreen(moduleType: ModuleType, eventOrScreen: string) {
  return loadResolvedScreen(moduleType, eventOrScreen) as Promise<ResolvedDisplayScreen | null>;
}
